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
  const { exportRoutes } = await import('./modules/export/routes.js');
  const { cellRoutes } = await import('./modules/cells/routes.js');
  const { newcomerRoutes } = await import('./modules/newcomers/routes.js');
  const { applicationRoutes } = await import('./modules/applications/routes.js');
  const { referenceDenominationRoutes } = await import('./modules/reference-denominations/routes.js');
  const { supportRoutes } = await import('./modules/support/routes.js');
  const { pricingRoutes } = await import('./modules/pricing/routes.js');
  const { emailSettingsRoutes } = await import('./modules/email-settings/routes.js');
  const { intakeRoutes } = await import('./modules/intake/routes.js');
  const { emailTemplateRoutes } = await import('./modules/email-templates/routes.js');
  const { promoRoutes } = await import('./modules/promo/routes.js');
  const { formRoutes } = await import('./modules/forms/routes.js');
  const { formBuilderRoutes } = await import('./modules/form-builder/routes.js');
  const { designSetRoutes } = await import('./modules/design-sets/routes.js');
  const { demoRequestRoutes } = await import('./modules/demo-requests/routes.js');
  const { demoTenantRoutes } = await import('./modules/demo-tenant/routes.js');
  const { marketingRoutes } = await import('./modules/marketing/routes.js');
  const { caseStudyRoutes } = await import('./modules/case-studies/routes.js');

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(tenantRoutes, { prefix: '/api/v1/admin' });

  // Stripe webhook — needs the RAW request bytes for signature verification.
  // Fastify's global JSON parser would hand handleWebhook a parsed object;
  // re-stringifying it changes the bytes so constructEvent ALWAYS fails (the
  // classic Stripe "#1 gotcha"). Register the webhook in its OWN encapsulated
  // scope with a buffer parser so ONLY this route gets the raw Buffer — every
  // other route keeps normal JSON parsing. Must be registered before/separate
  // from billingRoutes (which no longer owns /webhook).
  await app.register(async (webhookScope) => {
    webhookScope.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer' },
      (_req, body, done) => done(null, body),
    );
    const { handleWebhook } = await import('./modules/billing/service.js');
    webhookScope.post('/webhook', async (request, reply) => {
      const signature = request.headers['stripe-signature'] as string | undefined;
      if (!signature) {
        return reply.status(400).send({ error: { code: 'MISSING_SIGNATURE', message: 'Missing stripe-signature header' } });
      }
      try {
        await handleWebhook(request.body as Buffer, signature);
        return reply.send({ received: true });
      } catch (err) {
        // Return non-2xx so Stripe retries delivery.
        const msg = err instanceof Error ? err.message : 'webhook error';
        request.log.warn(`Stripe webhook failed: ${msg}`);
        return reply.status(400).send({ error: { code: 'WEBHOOK_ERROR', message: msg } });
      }
    });
  }, { prefix: '/api/v1/billing' });

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
  await app.register(exportRoutes, { prefix: '/api/v1' }); // /export
  await app.register(cellRoutes, { prefix: '/api/v1' }); // /cells (목장, Plus/Pro)
  await app.register(newcomerRoutes, { prefix: '/api/v1' }); // /newcomers (새가족, Pro)
  await app.register(applicationRoutes, { prefix: '/api/v1' }); // /applications + /admin/applications
  await app.register(referenceDenominationRoutes, { prefix: '/api/v1' }); // /admin/reference-denominations
  await app.register(supportRoutes, { prefix: '/api/v1' }); // /support-tickets + /admin/support-tickets
  await app.register(pricingRoutes, { prefix: '/api/v1' }); // /pricing + /admin/pricing
  await app.register(emailSettingsRoutes, { prefix: '/api/v1' }); // /admin/email-settings
  await app.register(intakeRoutes, { prefix: '/api/v1' }); // /intake + /admin/intake
  await app.register(emailTemplateRoutes, { prefix: '/api/v1' }); // /admin/email-templates + /admin/email-broadcast
  await app.register(promoRoutes, { prefix: '/api/v1' }); // /promo/validate + /admin/promo
  await app.register(formRoutes, { prefix: '/api/v1' }); // /forms/:type (public) + /admin/forms/submissions
  await app.register(formBuilderRoutes, { prefix: '/api/v1' }); // /form-defs/* (admin) + /forms/:slug/schema|submit (public)
  await app.register(designSetRoutes, { prefix: '/api/v1' }); // /design-sets (saved color/font sets)
  await app.register(demoRequestRoutes, { prefix: '/api/v1' }); // /demo-requests (public) + /admin/demo-requests + /admin/demo-config
  await app.register(demoTenantRoutes, { prefix: '/api/v1' }); // /admin/demo-tenant/* (snapshot/reset/status)
  await app.register(marketingRoutes, { prefix: '/api/v1' }); // /marketing-config (public) + /admin/marketing-config
  await app.register(caseStudyRoutes, { prefix: '/api/v1' }); // /case-studies (public) + /admin/case-studies (포트폴리오)

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

  // --- Public: storefront site meta (plan + feature flags). Used by the tenant
  //     site to enable Pro-only features like the mobile app (PWA). Resolved
  //     from the X-Tenant-Slug header via tenantMiddleware. ---
  app.get('/api/v1/site-meta', async (request, reply) => {
    const { planAllowsFeature, normalizePlan } = await import('./config/plan-limits.js');
    const slug = request.tenant?.slug;
    if (!slug) return reply.status(400).send({ error: 'Tenant not resolved' });
    const plan = request.tenant?.plan ?? '';
    return reply.send({
      data: {
        slug,
        name: request.tenant?.name ?? slug,
        plan: normalizePlan(plan),
        features: { pwa: planAllowsFeature(plan, 'pwa') },
      },
    });
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

      // 0d. cells — 목장(셀) content module (Plus/Pro). Created here so existing
      //     tenants gain the table on deploy.
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".cells (
            "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "name"         VARCHAR(200) NOT NULL,
            "leader_name"  VARCHAR(100),
            "leader_role"  VARCHAR(100),
            "region"       VARCHAR(100),
            "meeting_day"  VARCHAR(50),
            "meeting_time" VARCHAR(50),
            "location"     VARCHAR(255),
            "contact"      VARCHAR(50),
            "description"  TEXT,
            "photo_url"    TEXT,
            "sort_order"   INT DEFAULT 0,
            "is_visible"   BOOLEAN DEFAULT true,
            "created_at"   TIMESTAMPTZ DEFAULT NOW(),
            "updated_at"   TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        createHits++;
      } catch { /* skip on error */ }

      // 0e. newcomer_registrations — 새가족 등록·관리 content module (Pro). Public
      //     intake form writes here; admins manage status/memo.
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".newcomer_registrations (
            "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "name"           VARCHAR(100) NOT NULL,
            "phone"          VARCHAR(50),
            "email"          VARCHAR(200),
            "address"        VARCHAR(500),
            "birth_date"     VARCHAR(40),
            "gender"         VARCHAR(20),
            "prev_church"    VARCHAR(200),
            "visit_path"     VARCHAR(300),
            "faith_status"   VARCHAR(100),
            "family_info"    TEXT,
            "prayer_request" TEXT,
            "status"         VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','contacted','registered','archived')),
            "memo"           TEXT,
            "created_at"     TIMESTAMPTZ DEFAULT NOW(),
            "updated_at"     TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "newcomers_status_idx" ON "${schema}".newcomer_registrations ("status", "created_at" DESC)`,
        );
        createHits++;
      } catch { /* skip on error */ }

      // 0f. form_submissions — generic form content module. ONE table backs
      //     every storefront form (contact / cell_report / newcomer / custom);
      //     form_type discriminates. payload holds the raw key/value answers.
      //     Foundation for the future 교적관리 (membership) system.
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".form_submissions (
            "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "form_type"         VARCHAR(60) NOT NULL,
            "submitter_name"    VARCHAR(300),
            "submitter_contact" VARCHAR(300),
            "payload"           JSONB NOT NULL DEFAULT '{}'::jsonb,
            "status"            VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','read','done','archived')),
            "memo"              TEXT,
            "created_at"        TIMESTAMPTZ DEFAULT NOW(),
            "updated_at"        TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "form_submissions_type_idx" ON "${schema}".form_submissions ("form_type", "status", "created_at" DESC)`,
        );
        createHits++;
      } catch { /* skip on error */ }

      // 0g. design_sets — saved per-tenant design token snapshots (color set +
      //     font set). AI builder saves each generated design here; operator
      //     can apply/edit/delete. Applying copies tokens → themes.tokensV2.
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".design_sets (
            "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "name"       VARCHAR(200) NOT NULL,
            "source"     VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ai','preset')),
            "tokens"     JSONB NOT NULL DEFAULT '{}'::jsonb,
            "created_at" TIMESTAMPTZ DEFAULT NOW(),
            "updated_at" TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "design_sets_created_idx" ON "${schema}".design_sets ("created_at" DESC)`,
        );
        createHits++;
      } catch { /* skip on error */ }

      // 0h. forms + form_fields — operator-built custom forms (폼 빌더). The
      //     operator designs a form (목장보고서 / 새가족 / 문의 …) and its fields;
      //     submissions reuse the generic form_submissions table (form_type = slug)
      //     so they land in the existing 폼 제출 inbox. slug matches formTypeSchema
      //     (^[a-z][a-z0-9_]{1,39}$) so it can be used directly as the form_type.
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".forms (
            "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "name"            VARCHAR(200) NOT NULL,
            "slug"            VARCHAR(60)  NOT NULL,
            "description"     TEXT        DEFAULT '',
            "submit_label"    VARCHAR(100) DEFAULT '제출',
            "success_message" TEXT        DEFAULT '제출해 주셔서 감사합니다.',
            "is_active"       BOOLEAN     DEFAULT true,
            "sort_order"      INT         DEFAULT 0,
            "created_at"      TIMESTAMPTZ DEFAULT NOW(),
            "updated_at"      TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT "forms_slug_uniq" UNIQUE ("slug")
          )
        `);
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "${schema}".form_fields (
            "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "form_id"     UUID NOT NULL REFERENCES "${schema}".forms("id") ON DELETE CASCADE,
            "sort_order"  INT          DEFAULT 0,
            "field_key"   VARCHAR(50)  NOT NULL,
            "field_type"  VARCHAR(30)  NOT NULL,
            "label"       VARCHAR(200) NOT NULL,
            "placeholder" VARCHAR(200) DEFAULT '',
            "help_text"   VARCHAR(500) DEFAULT '',
            "is_required" BOOLEAN      DEFAULT false,
            "options"     JSONB        NOT NULL DEFAULT '[]'::jsonb,
            "created_at"  TIMESTAMPTZ  DEFAULT NOW(),
            "updated_at"  TIMESTAMPTZ  DEFAULT NOW(),
            CONSTRAINT "form_fields_key_uniq" UNIQUE ("form_id", "field_key")
          )
        `);
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "form_fields_form_idx" ON "${schema}".form_fields ("form_id", "sort_order")`,
        );
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

  // --- service_applications table (platform-wide build-request inbox) ---
  //     Prospects submit the public 개발 신청서 before they have a tenant, so
  //     this lives in the public schema like shared_images / ai_jobs.
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "service_applications" (
        "id"             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "church_name"    VARCHAR(200) NOT NULL,
        "contact_name"   VARCHAR(100),
        "email"          VARCHAR(200) NOT NULL,
        "phone"          VARCHAR(50),
        "church_address" VARCHAR(500),
        "denomination"   VARCHAR(200),
        "plan"           VARCHAR(20),
        "billing_period" VARCHAR(20),
        "existing_url"   VARCHAR(500),
        "desired_domain" VARCHAR(255),
        "message"        TEXT,
        "status"         VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','approved','paid','converted','rejected')),
        "admin_note"     TEXT,
        "payment_link"   VARCHAR(1000),
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "service_applications_status_idx" ON "service_applications" ("status", "created_at" DESC)`,
    );
    // Columns added after the table shipped — backfill on existing prod table.
    await prisma.$executeRawUnsafe(`ALTER TABLE "service_applications" ADD COLUMN IF NOT EXISTS "church_address" VARCHAR(500)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "service_applications" ADD COLUMN IF NOT EXISTS "denomination" VARCHAR(200)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "service_applications" ADD COLUMN IF NOT EXISTS "denomination_verified" BOOLEAN DEFAULT false`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "service_applications" ADD COLUMN IF NOT EXISTS "faith_affirmed" BOOLEAN DEFAULT false`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "service_applications" ADD COLUMN IF NOT EXISTS "terms_accepted" BOOLEAN DEFAULT false`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "service_applications" ADD COLUMN IF NOT EXISTS "planting_type" VARCHAR(50)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "service_applications" ADD COLUMN IF NOT EXISTS "member_profile" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "service_applications" ADD COLUMN IF NOT EXISTS "local_context" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "service_applications" ADD COLUMN IF NOT EXISTS "coupon_code" VARCHAR(40)`);
    // Link to the provisioned tenant (set when payment auto-creates the tenant).
    // Doubles as the idempotency guard so a re-delivered webhook never double-provisions.
    await prisma.$executeRawUnsafe(`ALTER TABLE "service_applications" ADD COLUMN IF NOT EXISTS "tenant_slug" VARCHAR(255)`);
  } catch (err) {
    app.log.warn(`service_applications table migration skipped: ${err}`);
  }

  // --- 포트폴리오 / 케이스 스터디 (public schema) — operator-curated showcase of
  //     churches we've built; the public marketing /portfolio page reads published ones. ---
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.case_studies (
        "id"             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "church_name"    VARCHAR(200) NOT NULL,
        "tagline"        VARCHAR(300),
        "screenshot_url" VARCHAR(2000),
        "live_url"       VARCHAR(500),
        "tags"           JSONB        NOT NULL DEFAULT '[]'::jsonb,
        "sort_order"     INTEGER      NOT NULL DEFAULT 0,
        "is_published"   BOOLEAN      NOT NULL DEFAULT false,
        "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "case_studies_pub_idx" ON public.case_studies ("is_published", "sort_order", "created_at" DESC)`,
    );
  } catch (err) {
    app.log.warn(`case_studies table migration skipped: ${err}`);
  }

  // --- demo tenant: 체험 신청 CRM + 야간 스냅샷 메타 + 공유 접속 계정 설정 ---
  //     All platform-level (public schema) — the demo tenant lets prospects test.
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "demo_requests" (
        "id"          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"        VARCHAR(100) NOT NULL,
        "church_name" VARCHAR(200),
        "email"       VARCHAR(200) NOT NULL,
        "phone"       VARCHAR(50),
        "message"     TEXT,
        "status"      VARCHAR(20)  NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','sent','archived')),
        "memo"        TEXT,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "demo_requests_status_idx" ON "demo_requests" ("status", "created_at" DESC)`,
    );
    // Snapshot metadata (one row per demo tenant slug).
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "demo_snapshots" (
        "slug"        TEXT        PRIMARY KEY,
        "table_count" INT,
        "taken_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // last_admin_edit_at: timestamp of the most recent super-admin write to the demo
    // tenant (stamped by edit-tracker.ts). When it is newer than taken_at, the
    // snapshot is stale and the super-admin UI warns to re-capture.
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "demo_snapshots" ADD COLUMN IF NOT EXISTS "last_admin_edit_at" TIMESTAMPTZ`,
    );
    // Shared demo-account access info the super-admin sends to applicants (singleton).
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "demo_config" (
        "id"             INT         PRIMARY KEY DEFAULT 1,
        "login_url"      VARCHAR(500),
        "login_email"    VARCHAR(200),
        "login_password" VARCHAR(200),
        "message_body"   TEXT,
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "demo_config" ("id", "login_url") VALUES (1, 'https://admin.truelight.app/t/dasom/login') ON CONFLICT ("id") DO NOTHING`,
    );
    // Platform marketing config (KakaoTalk inquiry link, etc.) — singleton.
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "marketing_config" (
        "id"         INT         PRIMARY KEY DEFAULT 1,
        "kakao_url"  VARCHAR(500),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(`INSERT INTO "marketing_config" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING`);
    // Site branding fields added after marketing_config shipped.
    await prisma.$executeRawUnsafe(`ALTER TABLE "marketing_config" ADD COLUMN IF NOT EXISTS "logo_url" VARCHAR(1000)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "marketing_config" ADD COLUMN IF NOT EXISTS "logo_height" INT DEFAULT 32`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "marketing_config" ADD COLUMN IF NOT EXISTS "favicon_url" VARCHAR(1000)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "marketing_config" ADD COLUMN IF NOT EXISTS "site_name" VARCHAR(200)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "marketing_config" ADD COLUMN IF NOT EXISTS "tagline" VARCHAR(300)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "marketing_config" ADD COLUMN IF NOT EXISTS "contact_email" VARCHAR(200)`);
    // SEO / SNS 링크 미리보기(Open Graph) — set in 슈퍼어드민 사이트 설정.
    await prisma.$executeRawUnsafe(`ALTER TABLE "marketing_config" ADD COLUMN IF NOT EXISTS "og_image_url" VARCHAR(2000)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "marketing_config" ADD COLUMN IF NOT EXISTS "seo_title" VARCHAR(200)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "marketing_config" ADD COLUMN IF NOT EXISTS "seo_description" VARCHAR(500)`);
    // truelight.app marketing header/footer vertical padding (px). Defaults match
    // the current hard-coded values (header py-3 ≈ 12px, footer py-12 ≈ 48px).
    await prisma.$executeRawUnsafe(`ALTER TABLE "marketing_config" ADD COLUMN IF NOT EXISTS "header_padding_y" INT DEFAULT 12`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "marketing_config" ADD COLUMN IF NOT EXISTS "footer_padding_y" INT DEFAULT 48`);
    // Operator-editable home hero slides (JSONB array) + marketing base font size.
    await prisma.$executeRawUnsafe(`ALTER TABLE "marketing_config" ADD COLUMN IF NOT EXISTS "hero_slides" JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "marketing_config" ADD COLUMN IF NOT EXISTS "base_font_px" INT DEFAULT 16`);
  } catch (err) {
    app.log.warn(`demo tables migration skipped: ${err}`);
  }

  // --- reference_denominations (이단 필터 보조 데이터, 슈퍼어드민 관리) ---
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "reference_denominations" (
        "id"         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"       VARCHAR(200) NOT NULL,
        "country"    VARCHAR(8)  NOT NULL DEFAULT '',
        "status"     VARCHAR(20) NOT NULL DEFAULT 'recognized' CHECK (status IN ('recognized','watch','cult')),
        "note"       TEXT        NOT NULL DEFAULT '',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "reference_denominations_name_key" ON "reference_denominations" (lower(name))`,
    );
    // Seed a starter reference set ONCE (only if empty). Operators curate it
    // afterward. cult/watch entries are widely, publicly designated; the app
    // only FLAGS — the super admin makes the final call.
    const countRows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT COUNT(*)::bigint AS count FROM "reference_denominations"`);
    if (Number(countRows[0]?.count ?? 0) === 0) {
      const seed: [string, string, string][] = [
        // 정규 (KR)
        ['예장합동', 'KR', 'recognized'], ['예장통합', 'KR', 'recognized'], ['예장고신', 'KR', 'recognized'],
        ['예장합신', 'KR', 'recognized'], ['기독교대한감리회', 'KR', 'recognized'], ['기독교한국침례회', 'KR', 'recognized'],
        ['기독교대한성결교회', 'KR', 'recognized'], ['기독교대한하나님의성회', 'KR', 'recognized'], ['대한예수교장로회', 'KR', 'recognized'],
        // 정규 (US)
        ['PCA', 'US', 'recognized'], ['PCUSA', 'US', 'recognized'], ['Southern Baptist', 'US', 'recognized'],
        ['United Methodist', 'US', 'recognized'], ['Assemblies of God', 'US', 'recognized'], ['KAPC', 'US', 'recognized'],
        ['Presbyterian', 'US', 'recognized'], ['Methodist', 'US', 'recognized'], ['Baptist', 'US', 'recognized'],
        // 이단/사이비 (널리 규정됨)
        ['신천지', '', 'cult'], ['신천지예수교 증거장막성전', '', 'cult'], ['통일교', '', 'cult'], ['세계평화통일가정연합', '', 'cult'],
        ['하나님의교회', '', 'cult'], ['안상홍', '', 'cult'], ['World Mission Society Church of God', '', 'cult'],
        ['여호와의증인', '', 'cult'], ["Jehovah's Witnesses", '', 'cult'], ['몰몬교', '', 'cult'], ['후기성도', '', 'cult'],
        ['구원파', '', 'cult'], ['전능신교', '', 'cult'], ['JMS', '', 'cult'], ['기독교복음선교회', '', 'cult'], ['다미선교회', '', 'cult'],
      ];
      for (const [name, country, status] of seed) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "reference_denominations" (name, country, status) VALUES ($1, $2, $3) ON CONFLICT (lower(name)) DO NOTHING`,
          name, country, status,
        );
      }
    }

    // Always-run idempotent backfill (ON CONFLICT DO NOTHING). The one-time seed
    // above only runs on an EMPTY table, so denominations added to this list after
    // a tenant DB was first populated (e.g. the full US set + acronyms) would never
    // reach existing prod. This block ensures the canonical list is present on every
    // DB without duplicating. Covers major US/Korean-American bodies AND their common
    // acronyms, since applicants type "SBC"/"PCA"/"PCUSA" as often as the full name.
    const backfill: [string, string, string][] = [
      // Presbyterian (US)
      ['SBC', 'US', 'recognized'], ['Southern Baptist Convention', 'US', 'recognized'],
      ['PCA', 'US', 'recognized'], ['Presbyterian Church in America', 'US', 'recognized'],
      ['PCUSA', 'US', 'recognized'], ['PC(USA)', 'US', 'recognized'], ['Presbyterian Church (USA)', 'US', 'recognized'],
      ['EPC', 'US', 'recognized'], ['Evangelical Presbyterian Church', 'US', 'recognized'],
      ['OPC', 'US', 'recognized'], ['Orthodox Presbyterian Church', 'US', 'recognized'],
      ['ARP', 'US', 'recognized'], ['ECO', 'US', 'recognized'],
      // Baptist (US)
      ['American Baptist', 'US', 'recognized'], ['Converge', 'US', 'recognized'],
      ['Reformed Baptist', 'US', 'recognized'], ['Independent Baptist', 'US', 'recognized'],
      // Methodist / Holiness / Wesleyan
      ['UMC', 'US', 'recognized'], ['Global Methodist', 'US', 'recognized'], ['Free Methodist', 'US', 'recognized'],
      ['Wesleyan', 'US', 'recognized'], ['Church of the Nazarene', 'US', 'recognized'], ['Nazarene', 'US', 'recognized'],
      // Lutheran
      ['LCMS', 'US', 'recognized'], ['Lutheran Church–Missouri Synod', 'US', 'recognized'],
      ['ELCA', 'US', 'recognized'], ['WELS', 'US', 'recognized'], ['Lutheran', 'US', 'recognized'],
      // Reformed
      ['CRC', 'US', 'recognized'], ['Christian Reformed Church', 'US', 'recognized'],
      ['RCA', 'US', 'recognized'], ['Reformed Church in America', 'US', 'recognized'], ['URCNA', 'US', 'recognized'],
      // Pentecostal / Charismatic
      ['AG', 'US', 'recognized'], ['Foursquare', 'US', 'recognized'], ['Church of God', 'US', 'recognized'],
      ['Vineyard', 'US', 'recognized'], ['Calvary Chapel', 'US', 'recognized'],
      // Evangelical / Non-denominational / Anglican
      ['EFCA', 'US', 'recognized'], ['Evangelical Free Church', 'US', 'recognized'],
      ['CMA', 'US', 'recognized'], ['Christian and Missionary Alliance', 'US', 'recognized'],
      ['Acts 29', 'US', 'recognized'], ['Non-denominational', 'US', 'recognized'], ['Evangelical', 'US', 'recognized'],
      ['ACNA', 'US', 'recognized'], ['Anglican Church in North America', 'US', 'recognized'],
      ['Anglican', 'US', 'recognized'], ['Episcopal', 'US', 'recognized'],
      // Korean-American
      ['KPCA', 'US', 'recognized'], ['미주한인예수교장로회', 'US', 'recognized'],
      ['Korean Presbyterian', 'US', 'recognized'], ['미주성결교회', 'US', 'recognized'],
    ];
    for (const [name, country, status] of backfill) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "reference_denominations" (name, country, status) VALUES ($1, $2, $3) ON CONFLICT (lower(name)) DO NOTHING`,
        name, country, status,
      );
    }
  } catch (err) {
    app.log.warn(`reference_denominations table migration skipped: ${err}`);
  }

  // --- support_tickets (고객지원 티켓, 슈퍼어드민 관리) ---
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "support_tickets" (
        "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_slug" VARCHAR(100) NOT NULL DEFAULT '',
        "name"        VARCHAR(100) NOT NULL DEFAULT '',
        "email"       VARCHAR(200) NOT NULL DEFAULT '',
        "subject"     VARCHAR(300) NOT NULL,
        "message"     TEXT        NOT NULL DEFAULT '',
        "status"      VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
        "admin_reply" TEXT        NOT NULL DEFAULT '',
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets" ("status", "created_at" DESC)`,
    );
  } catch (err) {
    app.log.warn(`support_tickets table migration skipped: ${err}`);
  }

  // --- plan_pricing (가격 단일 출처, 슈퍼어드민 관리) — Stripe/landing read this ---
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "plan_pricing" (
        "id"         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "plan_key"   VARCHAR(20) NOT NULL UNIQUE,
        "label"      VARCHAR(50) NOT NULL DEFAULT '',
        "monthly"    INT         NOT NULL DEFAULT 0,
        "yearly"     INT         NOT NULL DEFAULT 0,
        "setup_fee"  INT         NOT NULL DEFAULT 0,
        "sort_order" INT         NOT NULL DEFAULT 0,
        "is_active"  BOOLEAN     NOT NULL DEFAULT true,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Seed the 4 tiers ONCE (whole-dollar amounts; super admin edits afterward).
    const pricingSeed: [string, string, number, number, number, number][] = [
      ['light', '라이트', 59, 49, 300, 0],
      ['basic', '기본', 99, 79, 500, 1],
      ['plus', '플러스', 149, 119, 700, 2],
      ['pro', '프로', 199, 159, 1000, 3],
    ];
    for (const [key, label, monthly, yearly, setupFee, sort] of pricingSeed) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "plan_pricing" (plan_key, label, monthly, yearly, setup_fee, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (plan_key) DO NOTHING`,
        key, label, monthly, yearly, setupFee, sort,
      );
    }
  } catch (err) {
    app.log.warn(`plan_pricing table migration skipped: ${err}`);
  }

  // --- promo_settings (단일 행 프로모션 — 기간 한정 쿠폰, 슈퍼어드민 관리) ---
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "promo_settings" (
        "id"               INT          PRIMARY KEY,
        "active"           BOOLEAN      NOT NULL DEFAULT false,
        "code"             VARCHAR(40),
        "label"            VARCHAR(200),
        "discount_percent" INT          NOT NULL DEFAULT 30,
        "target_plans"     JSONB        NOT NULL DEFAULT '["light","basic"]',
        "starts_at"        TIMESTAMPTZ,
        "ends_at"          TIMESTAMPTZ,
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "promo_singleton" CHECK (id = 1)
      )
    `);
    // Seed the row disabled — super admin reviews the code/dates then activates.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "promo_settings" (id, active, code, label, discount_percent, target_plans, ends_at)
       VALUES (1, false, 'OPEN30', '오픈 기념 — 디자인 셋업비 30% 할인', 30, '["light","basic"]'::jsonb, '2026-07-31T23:59:59Z')
       ON CONFLICT (id) DO NOTHING`,
    );
  } catch (err) {
    app.log.warn(`promo_settings table migration skipped: ${err}`);
  }

  // --- email_settings (SMTP + from-addresses, 슈퍼어드민 관리, single row) ---
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "email_settings" (
        "id"           INT         PRIMARY KEY DEFAULT 1,
        "smtp_host"    VARCHAR(255) NOT NULL DEFAULT '',
        "smtp_port"    INT          NOT NULL DEFAULT 587,
        "smtp_secure"  BOOLEAN      NOT NULL DEFAULT false,
        "smtp_user"    VARCHAR(255) NOT NULL DEFAULT '',
        "smtp_pass"    VARCHAR(500) NOT NULL DEFAULT '',
        "from_info"    VARCHAR(255) NOT NULL DEFAULT '',
        "from_order"   VARCHAR(255) NOT NULL DEFAULT '',
        "from_support" VARCHAR(255) NOT NULL DEFAULT '',
        "from_name"    VARCHAR(100) NOT NULL DEFAULT 'TRUE LIGHT',
        "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "email_settings_single_row" CHECK (id = 1)
      )
    `);
    // Seed the single row with the operator's intended from-addresses.
    await prisma.$executeRawUnsafe(
      `INSERT INTO "email_settings" (id, from_info, from_order, from_support, from_name)
       VALUES (1, 'info@dasomweb.com', 'order@dasomweb.com', 'support@dasomweb.com', 'TRUE LIGHT')
       ON CONFLICT (id) DO NOTHING`,
    );
  } catch (err) {
    app.log.warn(`email_settings table migration skipped: ${err}`);
  }

  // --- email_templates (편집 가능한 알림 메일 템플릿, 슈퍼어드민 관리) ---
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "email_templates" (
        "key"        VARCHAR(64)  PRIMARY KEY,
        "name"       VARCHAR(100) NOT NULL DEFAULT '',
        "subject"    VARCHAR(300) NOT NULL DEFAULT '',
        "body"       TEXT         NOT NULL DEFAULT '',
        "vars"       VARCHAR(300) NOT NULL DEFAULT '',
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    const { DEFAULT_TEMPLATES } = await import('./modules/email-templates/service.js');
    for (const t of DEFAULT_TEMPLATES) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "email_templates" (key, name, subject, body, vars)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO NOTHING`,
        t.key, t.name, t.subject, t.body, t.vars,
      );
    }
  } catch (err) {
    app.log.warn(`email_templates table migration skipped: ${err}`);
  }

  // --- site_intake (결제 후 고객이 작성하는 사이트 콘텐츠, 중간저장/제출) ---
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "site_intake" (
        "id"          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_slug" VARCHAR(100) NOT NULL UNIQUE,
        "plan"        VARCHAR(20) NOT NULL DEFAULT '',
        "data"        JSONB       NOT NULL DEFAULT '{}',
        "status"      VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','built')),
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "site_intake_status_idx" ON "site_intake" ("status", "updated_at" DESC)`,
    );
    // Build pipeline stage shown to the church: input → developing → review → live.
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "site_intake" ADD COLUMN IF NOT EXISTS "build_stage" VARCHAR(20) NOT NULL DEFAULT 'input'`,
    );
  } catch (err) {
    app.log.warn(`site_intake table migration skipped: ${err}`);
  }

  // --- Stripe billing columns on public.tenants ---
  //     The Prisma schema declares tenants.stripe_customer_id /
  //     stripe_subscription_id, but this project applies schema changes via
  //     raw SQL at boot (not prisma migrate). Ensure the columns exist so the
  //     billing service's selects/updates don't 500 on a DB that predates them.
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "stripe_customer_id" VARCHAR(255)`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" VARCHAR(255)`,
    );
  } catch (err) {
    app.log.warn(`tenants stripe columns migration skipped: ${err}`);
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

  // Track super-admin edits to the demo tenant (marks the golden snapshot stale).
  // Must be registered BEFORE listen — Fastify rejects hooks added after boot.
  const { registerDemoEditTracker } = await import('./modules/demo-tenant/edit-tracker.js');
  registerDemoEditTracker(app);

  // --- Start ---
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);

  // Nightly reset of the demo tenant (03:00 America/New_York) — wipes tester garbage.
  const { startDemoResetScheduler } = await import('./modules/demo-tenant/scheduler.js');
  startDemoResetScheduler();

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
