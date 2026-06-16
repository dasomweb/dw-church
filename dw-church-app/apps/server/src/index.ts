import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { prisma, disconnectAllTenants } from './config/database.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimitConfig } from './middleware/rate-limit.js';
import { initMonitoring } from './config/monitoring.js';
import { initSentry } from './config/sentry.js';

/* ------------------------------------------------------------------
 * Fastify type augmentation
 * ----------------------------------------------------------------*/
declare module 'fastify' {
  interface FastifyRequest {
    tenant?: { id: string; slug: string; name: string; plan: string };
    tenantSchema?: string;
    user?: {
      id: string;
      email: string;
      tenantId: string;
      tenantSlug: string;
      role: string;
    };
  }
}

/* ------------------------------------------------------------------
 * Bootstrap
 * ----------------------------------------------------------------*/
const serverStartTime = Date.now();

async function main(): Promise<void> {
  initSentry();
  initMonitoring();

  const app = Fastify({
    logger: env.NODE_ENV === 'production'
      ? { level: 'info' }
      : { level: 'debug' },
  });

  // --- Plugins ---
  const { corsOptions } = await import('./cors.js');
  await app.register(cors, corsOptions);
  // 25MB to match MAX_DOCUMENT_SIZE in files/service.ts — scanned 주보 PDFs
  // can be 10–20MB. Images are still capped at 5MB by the service.
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });
  await app.register(rateLimit, rateLimitConfig);

  // --- Error handler ---
  app.setErrorHandler(errorHandler);

  // --- Tenant resolution for API routes ---
  // Skip auth, admin, billing, migration routes — they handle tenant themselves
  app.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/api/v1/') &&
        !request.url.startsWith('/api/v1/auth/') &&
        !request.url.startsWith('/api/v1/admin') &&
        !request.url.startsWith('/api/v1/billing') &&
        !request.url.startsWith('/api/v1/migration')) {
      await tenantMiddleware(request, reply);
    }
  });

  // --- Module routes ---
  const { default: authRoutes } = await import('./modules/auth/routes.js');
  const { default: tenantRoutes } = await import('./modules/tenants/routes.js');
  const { default: pageRoutes } = await import('./modules/pages/routes.js');
  const { default: menuRoutes } = await import('./modules/menus/routes.js');
  const { default: themeRoutes } = await import('./modules/themes/routes.js');
  const { default: themeSetsRoutes } = await import('./modules/theme-sets/routes.js');
  // Phase 11-A2 — b2bsmart AI 빌더 서버 모듈 포트. b2bsmart 의 routes 파일들이
  // named exports (aiPlannerProxyRoutes 등) 라 default 가 아님. 이전엔 default
  // 로 destructure 해서 TS2339 build error 발생 (2026-06-03 fix).
  const { aiPlannerProxyRoutes } = await import('./modules/ai/planner-proxy/routes.js');
  const { aiBuildPagesRoutes } = await import('./modules/ai/build-pages/routes.js');
  const { aiBuilderRoutes } = await import('./modules/ai/builder-routes/routes.js');
  const { aiJobsRoutes } = await import('./modules/ai/jobs/routes.js');

  const { sermonRoutes } = await import('./modules/sermons/routes.js');
  const { bulletinRoutes } = await import('./modules/bulletins/routes.js');
  const { columnRoutes } = await import('./modules/columns/routes.js');
  const { albumRoutes } = await import('./modules/albums/routes.js');
  const { videoRoutes } = await import('./modules/videos/routes.js');
  const { scheduleRoutes } = await import('./modules/schedules/routes.js');
  const { bannerRoutes } = await import('./modules/banners/routes.js');
  const { eventRoutes } = await import('./modules/events/routes.js');
  const { staffRoutes } = await import('./modules/staff/routes.js');
  const { historyRoutes } = await import('./modules/history/routes.js');
  const { categoryRoutes } = await import('./modules/categories/routes.js');
  const { settingsRoutes } = await import('./modules/settings/routes.js');
  const { fileRoutes } = await import('./modules/files/routes.js');
  const { contentEntryRoutes } = await import('./modules/content-entries/routes.js');
  const { boardRoutes } = await import('./modules/boards/routes.js');
  const { domainRoutes } = await import('./modules/domains/routes.js');

  const { aiRoutes } = await import('./modules/ai/routes.js');
  const { default: billingRoutes } = await import('./modules/billing/routes.js');
  const { default: migrationRoutes } = await import('./modules/migration/routes.js');
  const { default: sharedImageRoutes } = await import('./modules/shared-images/routes.js');

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(tenantRoutes, { prefix: '/api/v1/admin' });
  await app.register(billingRoutes, { prefix: '/api/v1/billing' });
  await app.register(pageRoutes, { prefix: '/api/v1/pages' });
  await app.register(menuRoutes, { prefix: '/api/v1/menus' });
  await app.register(themeRoutes, { prefix: '/api/v1/theme' });
  await app.register(themeSetsRoutes, { prefix: '/api/v1' });
  // Phase 11-A2 — AI 빌더 서버 routes. 모두 super_admin gate (각 route 안에서).
  await app.register(aiPlannerProxyRoutes, { prefix: '/api/v1' }); // /ai/planner/*
  await app.register(aiBuildPagesRoutes,   { prefix: '/api/v1' }); // /ai/build-pages
  await app.register(aiBuilderRoutes,      { prefix: '/api/v1' }); // /ai/builder/*
  await app.register(aiJobsRoutes,         { prefix: '/api/v1' }); // /ai/jobs/*
  await app.register(sermonRoutes, { prefix: '/api/v1' });
  await app.register(bulletinRoutes, { prefix: '/api/v1' });
  await app.register(columnRoutes, { prefix: '/api/v1' });
  await app.register(albumRoutes, { prefix: '/api/v1' });
  await app.register(videoRoutes, { prefix: '/api/v1' });
  await app.register(scheduleRoutes, { prefix: '/api/v1' });
  await app.register(bannerRoutes, { prefix: '/api/v1' });
  await app.register(eventRoutes, { prefix: '/api/v1' });
  await app.register(staffRoutes, { prefix: '/api/v1' });
  await app.register(historyRoutes, { prefix: '/api/v1' });
  await app.register(categoryRoutes, { prefix: '/api/v1' });
  await app.register(settingsRoutes, { prefix: '/api/v1' });
  await app.register(fileRoutes, { prefix: '/api/v1' });
  await app.register(contentEntryRoutes, { prefix: '/api/v1' }); // /content-entries
  await app.register(aiRoutes, { prefix: '/api/v1' });
  await app.register(boardRoutes, { prefix: '/api/v1' });
  await app.register(domainRoutes, { prefix: '/api/v1' });
  await app.register(migrationRoutes, { prefix: '/api/v1/migration' });
  await app.register(sharedImageRoutes, { prefix: '/api/v1' });

  // --- Internal: resolve custom domain to tenant slug (used by Next.js middleware) ---
  app.get('/api/v1/admin/tenants/resolve-domain', async (request, reply) => {
    const { domain } = request.query as { domain?: string };
    if (!domain) return reply.status(400).send({ error: 'domain query parameter required' });
    const rows = await prisma.$queryRawUnsafe<{ slug: string }[]>(
      `SELECT slug FROM public.tenants WHERE custom_domain = $1 AND is_active = true LIMIT 1`,
      domain,
    );
    if (rows.length === 0) return reply.status(404).send({ error: 'Domain not found' });
    return reply.send({ slug: rows[0]!.slug });
  });

  // --- Health check ---
  app.get('/health', async () => ({
    status: 'ok',
    version: '5.2.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
  }));

  // --- One-time migration: fix hero banner props ---
  try {
    const { fixHeroBanners } = await import('./utils/fix-hero-banners.js');
    const fixed = await fixHeroBanners();
    if (fixed > 0) app.log.info(`Fixed ${fixed} hero banner section(s)`);
  } catch (err) {
    app.log.warn(`Hero banner migration skipped: ${err}`);
  }

  // --- One-time migration: add password_expires_at column to users table ---
  // Must run BEFORE any Prisma query against User — the generated client
  // includes the column in SELECT statements and would fail on an older DB.
  // Safe to run repeatedly (IF NOT EXISTS).
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_expires_at" TIMESTAMPTZ`,
    );
  } catch (err) {
    app.log.warn(`password_expires_at column migration skipped: ${err}`);
  }

  // --- Phase 10-α: selected_theme_set_id on tenants (theme-set system) ---
  // Tenants pick one ThemeSet from @dw-church/theme-sets; that drives
  // tokens + layout + page templates. Column is plain VARCHAR (no FK to
  // a theme_sets table yet — theme sets are code-defined in v1).
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "selected_theme_set_id" VARCHAR(64)`,
    );
  } catch (err) {
    app.log.warn(`selected_theme_set_id column migration skipped: ${err}`);
  }

  // --- Tenant schema drift repair ---
  // The tenant_template.sql shipped with a few tables in shapes that the
  // service code doesn't match. Rather than rewrite the services (which
  // encode more structure than the raw tables currently do), create the
  // missing/mismatched tables via raw SQL across every tenant_* schema.
  // All statements are idempotent (IF NOT EXISTS), so this runs safely on
  // every deploy.
  try {
    const schemas = await prisma.$queryRawUnsafe<{ schema_name: string }[]>(
      `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name = 'tenant_template'
          OR schema_name LIKE 'tenant_%'`,
    );

    let alterHits = 0;
    let createHits = 0;

    for (const s of schemas) {
      const schema = s.schema_name;

      // 0. videos + video_categories — 영상 게시판 content module. Cloned from
      //    the albums module shape (youtube_url + video_date date instead of an
      //    images gallery). Created here so existing tenants gain the tables on
      //    deploy; the source_url ALTER below (1b) then attaches dedup support.
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".video_categories (
            "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "name"       VARCHAR(100) NOT NULL,
            "slug"       VARCHAR(100) NOT NULL UNIQUE,
            "created_at" TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".videos (
            "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "title"         VARCHAR(500) NOT NULL,
            "youtube_url"   TEXT,
            "video_date"    DATE,
            "thumbnail_url" TEXT,
            "category_id"   UUID REFERENCES "${schema}".video_categories(id) ON DELETE SET NULL,
            "status"        VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
            "source_url"    TEXT,
            "created_at"    TIMESTAMPTZ DEFAULT NOW(),
            "updated_at"    TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "videos_date_idx" ON "${schema}".videos ("video_date" DESC)`,
        );
        createHits++;
      } catch { /* skip on error */ }

      // 0b. boards + board_posts — some older tenants (e.g. lagrangechurch)
      //     were cloned before these existed and migrateBoards missed them, so
      //     creating a board 500'd with 42P01. This loop covers EVERY tenant
      //     schema, so it heals them reliably.
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".boards (
            "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "title"       VARCHAR(255) NOT NULL,
            "slug"        VARCHAR(255) NOT NULL,
            "description" TEXT DEFAULT '',
            "sort_order"  INT DEFAULT 0,
            "is_active"   BOOLEAN DEFAULT true,
            "created_at"  TIMESTAMPTZ DEFAULT NOW(),
            "updated_at"  TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".board_posts (
            "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "board_id"    UUID NOT NULL REFERENCES "${schema}".boards(id) ON DELETE CASCADE,
            "title"       VARCHAR(500) NOT NULL,
            "author_name" VARCHAR(100) NOT NULL DEFAULT '',
            "content"     TEXT DEFAULT '',
            "attachments" JSONB DEFAULT '[]',
            "view_count"  INT DEFAULT 0,
            "is_pinned"   BOOLEAN DEFAULT false,
            "status"      VARCHAR(20) DEFAULT 'published',
            "created_at"  TIMESTAMPTZ DEFAULT NOW(),
            "updated_at"  TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        createHits++;
      } catch { /* skip on error */ }

      // 0c. schedules — 예배 및 모임 content module. Each row is a titled GROUP
      //     ({ title, columns, rows }) rendered as a table by the schedule_board
      //     Data Block. Created here so existing tenants gain the table on deploy.
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".schedules (
            "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "title"       VARCHAR(255) NOT NULL,
            "columns"     JSONB DEFAULT '["예배","시간","장소"]',
            "rows"        JSONB DEFAULT '[]',
            "sort_order"  INT DEFAULT 0,
            "status"      VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
            "created_at"  TIMESTAMPTZ DEFAULT NOW(),
            "updated_at"  TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        createHits++;
      } catch { /* skip on error */ }

      // 1. preachers.title — code INSERTs (name, title, is_default)
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${schema}".preachers ADD COLUMN IF NOT EXISTS "title" VARCHAR(200)`,
        );
        alterHits++;
      } catch { /* preachers table may not exist; skip */ }

      // 1b. source_url — per-module content migration dedup. Each migrated item
      //     records its original source post URL so a re-import UPDATEs the same
      //     row instead of inserting a duplicate (true idempotency).
      for (const tbl of ['columns_pastoral', 'sermons', 'albums', 'bulletins', 'events', 'staff', 'history', 'videos']) {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE "${schema}".${tbl} ADD COLUMN IF NOT EXISTS "source_url" TEXT`,
          );
          await prisma.$executeRawUnsafe(
            `CREATE UNIQUE INDEX IF NOT EXISTS "${tbl}_source_url_key" ON "${schema}".${tbl} ("source_url") WHERE "source_url" IS NOT NULL`,
          );
          alterHits++;
        } catch { /* table may not exist; skip */ }
      }

      // 1c. pages.kind — content-detail templates. 'static' (default) is a
      //     normal page; 'sermon_detail' / 'column_detail' / 'bulletin_detail'
      //     mark a page as the builder-designed layout for that content type's
      //     detail view, where blocks bind fields to the current item via
      //     DynamicSource (resolveDynamicProps on the public detail route).
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${schema}".pages ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'static'`,
        );
        alterHits++;
      } catch { /* pages table may not exist; skip */ }

      // 1d. files.kind / tags — reference-photo support. 'upload' (default)
      //     is a normal media file; 'reference' marks an operator-uploaded
      //     reference photo the AI builder reads (kind='reference') to match
      //     generated images. tags/description drive that matching. Without
      //     these columns the AI auto-generate query (WHERE kind='reference')
      //     errors and the Reference Photos page has nowhere to store kind.
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".files ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'upload'`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".files ADD COLUMN IF NOT EXISTS "description" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".files ADD COLUMN IF NOT EXISTS "tag" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".files ADD COLUMN IF NOT EXISTS "tags" TEXT[]`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "${schema}".files ADD COLUMN IF NOT EXISTS "entity_type" TEXT`);
        alterHits++;
      } catch { /* files table may not exist; skip */ }

      // 1e. content_entries — the CONTENT layer, separated from page_sections
      //     (DESIGN layer). Reusable content bags a Static Block section can
      //     reference via props.contentEntryId. Additive: existing sections
      //     that inline content keep working untouched.
      try {
        await prisma.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS "${schema}".content_entries (
             id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
             type       TEXT NOT NULL,
             name       TEXT NOT NULL,
             data       JSONB NOT NULL DEFAULT '{}'::jsonb,
             created_at TIMESTAMPTZ DEFAULT NOW(),
             updated_at TIMESTAMPTZ DEFAULT NOW()
           )`,
        );
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "content_entries_type_idx" ON "${schema}".content_entries ("type")`,
        );
        alterHits++;
      } catch { /* skip on error */ }

      // 2. categories — unified table for sermon + album (code references
      //    `categories` with a `type` discriminator, not the separate
      //    sermon_categories / album_categories tables in the template).
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".categories (
            "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "name"       VARCHAR(200) NOT NULL,
            "slug"       VARCHAR(200) NOT NULL,
            "type"       VARCHAR(50)  NOT NULL,
            "sort_order" INT          NOT NULL DEFAULT 0,
            "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            UNIQUE ("type", "slug")
          )
        `);
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "categories_type_idx" ON "${schema}".categories ("type")`,
        );
        createHits++;
      } catch { /* skip */ }

      // 3. themes — code reads (id, name, is_active, settings JSONB) but the
      //    template defined a `theme` (singular) with a different shape.
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".themes (
            "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "name"       VARCHAR(100) NOT NULL DEFAULT 'modern',
            "is_active"  BOOLEAN      NOT NULL DEFAULT TRUE,
            "settings"   JSONB        NOT NULL DEFAULT '{}'::jsonb,
            "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
          )
        `);
        createHits++;
      } catch { /* skip */ }

      // 4. custom_domains — per-tenant record of registered custom domains.
      //    Service writes/reads (domain, status, verification_token,
      //    verified_at, created_at, updated_at).
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".custom_domains (
            "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "domain"             VARCHAR(255) NOT NULL UNIQUE,
            "status"             VARCHAR(20)  NOT NULL DEFAULT 'pending',
            "verification_token" VARCHAR(64),
            "verified_at"        TIMESTAMPTZ,
            "created_at"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            "updated_at"         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
          )
        `);
        // Older tenants may have the table without verification_token — add it
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${schema}".custom_domains ADD COLUMN IF NOT EXISTS "verification_token" VARCHAR(64)`,
        );
        // Railway-side domain id, populated after Railway customDomainCreate
        // succeeds — lets us look up SSL state and remove the domain later.
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${schema}".custom_domains ADD COLUMN IF NOT EXISTS "railway_domain_id" VARCHAR(64)`,
        );
        // Cloudflare for SaaS — Custom Hostname id. Phase 12-δ migration
        // (2026-06-03): becomes the authoritative pointer for per-tenant
        // SSL + routing. railway_domain_id kept for rollback safety.
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${schema}".custom_domains ADD COLUMN IF NOT EXISTS "cf_hostname_id" VARCHAR(64)`,
        );
        createHits++;
      } catch { /* skip */ }
    }
    if (alterHits || createHits) {
      app.log.info(`Tenant schema drift repair — ALTER: ${alterHits}, CREATE: ${createHits}`);
    }
  } catch (err) {
    app.log.warn(`Tenant schema drift repair skipped: ${err}`);
  }

  // --- shared_images table (platform-wide gallery curated by super admin) ---
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "shared_images" (
        "id"         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "url"        VARCHAR(500) NOT NULL,
        "r2_key"     VARCHAR(500),
        "title"      VARCHAR(200) NOT NULL DEFAULT '',
        "category"   VARCHAR(50)  NOT NULL DEFAULT 'nature',
        "tags"       TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
        "is_active"  BOOLEAN      NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "shared_images_category_active_idx" ON "shared_images" ("category", "is_active")`,
    );
  } catch (err) {
    app.log.warn(`shared_images table migration skipped: ${err}`);
  }

  // --- ai_jobs table (platform-wide async AI jobs: content-map,
  //     marketing-insight, design-system, sitemap, …). Backs /ai/jobs so
  //     long planner calls survive Cloudflare's 100s proxy limit. This was
  //     missing in prod — createJob 500'd with 42P01 ("relation ai_jobs does
  //     not exist") and the wizard showed "AI 콘텐츠 생성 실패: A database error
  //     occurred". Created here (public schema) like shared_images. ---
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ai_jobs" (
        "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"     UUID        NOT NULL,
        "kind"        VARCHAR(64) NOT NULL,
        "status"      VARCHAR(20) NOT NULL DEFAULT 'queued',
        "input"       JSONB       NOT NULL DEFAULT '{}',
        "output"      JSONB,
        "error"       TEXT,
        "progress"    JSONB       NOT NULL DEFAULT '{}',
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "started_at"  TIMESTAMPTZ,
        "finished_at" TIMESTAMPTZ
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "ai_jobs_user_status_idx" ON "ai_jobs" ("user_id", "status")`,
    );
  } catch (err) {
    app.log.warn(`ai_jobs table migration skipped: ${err}`);
  }

  // --- Ensure super_admin users are always active ---
  try {
    await prisma.user.updateMany({
      where: { role: 'super_admin' },
      data: { isActive: true },
    });
  } catch { /* ignore */ }

  // --- Backfill support user for any tenant that's missing one ---
  try {
    const { ensureSupportUser } = await import('./modules/tenants/support-user.js');
    const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
    let created = 0;
    for (const t of tenants) {
      const before = await prisma.user.count({ where: { email: `support-${t.slug}@truelight.app` } });
      if (before === 0) {
        await ensureSupportUser(t.id, t.slug);
        created++;
      }
    }
    if (created > 0) app.log.info(`Support user backfilled for ${created} tenant(s)`);
  } catch (err) {
    app.log.warn(`Support user backfill skipped: ${err}`);
  }

  // --- Ensure settings.key has UNIQUE constraint ---
  try {
    const schemas = await prisma.$queryRawUnsafe<{ schema_name: string }[]>(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'"
    );
    for (const s of schemas) {
      await prisma.$queryRawUnsafe(
        `ALTER TABLE "${s.schema_name}".settings ADD CONSTRAINT IF NOT EXISTS settings_key_unique UNIQUE (key)`
      ).catch(() => {});
    }
  } catch { /* ignore */ }

  // NOTE: the old migrateBoards() utility was removed here. It put two CREATE
  // TABLE statements in ONE prisma.$executeRawUnsafe() call, which Prisma's raw
  // exec rejects ("Invalid invocation" — single statement only), so it errored
  // on EVERY startup for every schema. The per-tenant self-heal loop above
  // (block 0b) already creates boards + board_posts as SEPARATE statements for
  // every schema, so migrateBoards was both redundant and broken. Deleted.

  // --- Start ---
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);

  // --- Graceful shutdown ---
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal} — shutting down`);
    await app.close();
    await prisma.$disconnect();
    await disconnectAllTenants();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
