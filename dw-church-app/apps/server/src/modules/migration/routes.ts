/**
 * Migration System Routes — Job-based workflow.
 * See MIGRATION.md for full architecture documentation.
 *
 * Endpoints:
 *   POST   /jobs              — create new migration job
 *   GET    /jobs              — list jobs
 *   GET    /jobs/:id          — get job detail
 *   PUT    /jobs/:id          — update classified data (admin review)
 *   DELETE /jobs/:id          — delete job
 *   POST   /jobs/:id/extract  — run extraction
 *   POST   /jobs/:id/classify — run classification
 *   POST   /jobs/:id/apply    — run apply
 *   GET    /tenant-pages/:slug — get tenant pages for reference
 *   GET    /health            — health check
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { validateSchemaName } from '../../utils/validate-schema.js';
import {
  ensureMigrationJobsTable,
  createJob,
  getJob,
  listJobs,
  updateJobStatus,
  updateJobRawData,
  updateJobClassifiedData,
  updateJobApplyResult,
  deleteJob,
} from './job.js';
import { extractFromHtml } from './extractors/html-scraper.js';
import { closeBrowser } from './extractors/browser-render.js';
import { extractFromYouTubeChannel } from './extractors/youtube.js';
import { classify } from './classifier.js';
import { runMigrationAgent } from './migration-agent.js';
import type { MigrationFocus } from './migration-agent.js';
import { applyAll, STATIC_INCLUDE, DYNAMIC_INCLUDE, ALL_INCLUDE } from './appliers/index.js';
import type { IncludeKey } from './appliers/index.js';
import { deriveMenusFromPages } from './appliers/config.js';
import type { ClassifiedData, ClassifiedPageContent, PageModuleType, RawExtractedData } from './types.js';

// ─── Auth ──────────────────────────────────────���────────────

async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  const isSuperByRole = request.user?.role === 'super_admin';
  const isSuperByEnv = !!request.user?.email && env.SUPER_ADMIN_EMAILS.includes(request.user.email);
  if (!isSuperByRole && !isSuperByEnv) {
    throw new AppError('FORBIDDEN', 403, 'Super admin access required');
  }
}

// ─── Routes ─────────────────────────────────────────────────

export default async function migrationRoutes(app: FastifyInstance): Promise<void> {
  // Ensure migration_jobs table exists on startup (non-blocking)
  try {
    await ensureMigrationJobsTable();
  } catch (err) {
    console.error('[migration] Failed to create migration_jobs table:', err instanceof Error ? err.message : err);
  }

  // Health check (no auth)
  app.get('/health', async () => ({ status: 'migration-ok' }));

  // NOTE: the one-time unauthenticated /bootstrap route (hardcoded secret →
  // could create/reset ANY account as super_admin) was removed as a critical
  // security hole. Super-admins are provisioned only via SUPER_ADMIN_EMAILS
  // bootstrap or an existing super-admin. Do NOT reintroduce an unauthenticated
  // account-creation endpoint.

  // Auth hook — everything here requires super admin (health is public above).
  app.addHook('preHandler', async (request, reply) => {
    const url = request.url;
    if (url.endsWith('/health')) return;
    await requireSuperAdmin(request, reply);
  });

  // ── Create Job ──
  app.post('/jobs', async (request, reply) => {
    const { tenantSlug, sourceUrl, youtubeChannelUrl } = request.body as {
      tenantSlug: string;
      sourceUrl?: string;
      youtubeChannelUrl?: string;
    };
    if (!tenantSlug) throw new AppError('VALIDATION_ERROR', 400, 'tenantSlug required');
    if (!sourceUrl && !youtubeChannelUrl) {
      throw new AppError('VALIDATION_ERROR', 400, 'sourceUrl or youtubeChannelUrl required');
    }

    const job = await createJob(
      tenantSlug,
      sourceUrl || '',
      youtubeChannelUrl || null,
      request.user?.id || null,
    );
    return reply.send({ data: job });
  });

  // ── List Jobs ──
  app.get('/jobs', async (request, reply) => {
    const { tenantSlug } = request.query as { tenantSlug?: string };
    const jobs = await listJobs(tenantSlug);
    return reply.send({ data: jobs });
  });

  // ── Get Job ──
  app.get<{ Params: { id: string } }>('/jobs/:id', async (request, reply) => {
    const job = await getJob(request.params.id);
    if (!job) throw new AppError('NOT_FOUND', 404, 'Job not found');
    return reply.send({ data: job });
  });

  // ── Update classified data (admin review/edit) ──
  app.put<{ Params: { id: string } }>('/jobs/:id', async (request, reply) => {
    const job = await getJob(request.params.id);
    if (!job) throw new AppError('NOT_FOUND', 404, 'Job not found');

    const { classifiedData } = request.body as { classifiedData: ClassifiedData };
    if (!classifiedData) throw new AppError('VALIDATION_ERROR', 400, 'classifiedData required');

    await updateJobClassifiedData(request.params.id, classifiedData);
    await updateJobStatus(request.params.id, 'approved');
    const updated = await getJob(request.params.id);
    return reply.send({ data: updated });
  });

  // ── Delete Job ──
  app.delete<{ Params: { id: string } }>('/jobs/:id', async (request, reply) => {
    await deleteJob(request.params.id);
    return reply.send({ success: true });
  });

  // ── Extract ──
  app.post<{ Params: { id: string } }>('/jobs/:id/extract', async (request, reply) => {
    const job = await getJob(request.params.id);
    if (!job) throw new AppError('NOT_FOUND', 404, 'Job not found');

    await updateJobStatus(job.id, 'extracting');

    try {
      let rawData: RawExtractedData = {
        source: { url: job.sourceUrl || '', type: 'html', scrapedAt: new Date().toISOString() },
        pages: [],
        youtubeVideos: [],
      };

      // HTML scraping
      if (job.sourceUrl) {
        rawData = await extractFromHtml(job.sourceUrl, 30);
      }

      // YouTube channel
      if (job.youtubeChannelUrl) {
        const videos = await extractFromYouTubeChannel(job.youtubeChannelUrl, 100);
        rawData.youtubeVideos = videos;
        rawData.source.type = job.sourceUrl ? 'html' : 'youtube';
      }

      await updateJobRawData(job.id, rawData);
      const updated = await getJob(job.id);
      return reply.send({ data: updated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Extraction failed';
      await updateJobStatus(job.id, 'failed', msg);
      throw new AppError('INTERNAL_ERROR', 500, msg);
    }
  });

  // ── Classify ──
  app.post<{ Params: { id: string } }>('/jobs/:id/classify', async (request, reply) => {
    const job = await getJob(request.params.id);
    if (!job) throw new AppError('NOT_FOUND', 404, 'Job not found');
    if (!job.rawData?.pages?.length && !job.rawData?.youtubeVideos?.length) {
      throw new AppError('VALIDATION_ERROR', 400, 'No raw data to classify. Run extract first.');
    }

    await updateJobStatus(job.id, 'classifying');

    try {
      const classified = classify(job.rawData);
      await updateJobClassifiedData(job.id, classified);
      const updated = await getJob(job.id);
      return reply.send({ data: updated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Classification failed';
      await updateJobStatus(job.id, 'failed', msg);
      throw new AppError('INTERNAL_ERROR', 500, msg);
    }
  });

  // ── Phase 12-γ: One-shot URL migration ──
  // The wizard's "Existing Site" step calls this single endpoint with
  // just a URL + target tenant slug. Server runs the full pipeline
  // (extract → classify → apply) end-to-end and returns the result
  // counts. Operator gets a single spinner instead of 4 round-trips.
  //
  // Body: { sourceUrl: string, tenantSlug: string, youtubeChannelUrl?: string }
  // Response: { jobId, applyResult, classifiedCounts }
  app.post('/migrate-url', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const body = request.body as {
      sourceUrl?: string;
      tenantSlug?: string;
      youtubeChannelUrl?: string;
      // Phase 12-γ.5 — selective import. Pass any subset of:
      //   settings, pages, worshipTimes, history, menus  (static)
      //   sermons, bulletins, columns, events, albums, staff, boards  (dynamic)
      // Or use preset string 'static' | 'dynamic' | 'all'. Default: 'static'.
      include?: IncludeKey[] | 'static' | 'dynamic' | 'all';
      // Optional speed lever — skip the LLM enrichment pass when operator
      // just wants a fast structural import. Defaults to true.
      useLlm?: boolean;
      // STEP 4 — 3단계(분류→리뷰→적용). apply:false runs extract+classify only,
      // persists classifiedData to the job, and returns it for the review
      // screen WITHOUT applying. The operator then confirms the include set and
      // POST /jobs/:id/apply commits it. Defaults to true (one-shot, back-compat).
      apply?: boolean;
    };
    const sourceUrl = (body.sourceUrl ?? '').trim();
    const tenantSlug = (body.tenantSlug ?? '').trim();
    if (!sourceUrl || !tenantSlug) {
      throw new AppError('VALIDATION_ERROR', 400, 'sourceUrl + tenantSlug required');
    }

    // Resolve include list.
    let includeList: IncludeKey[];
    if (body.include === 'all') includeList = ALL_INCLUDE;
    else if (body.include === 'dynamic') includeList = DYNAMIC_INCLUDE;
    else if (body.include === 'static' || body.include === undefined) includeList = STATIC_INCLUDE;
    else includeList = body.include;

    const useLlm = body.useLlm !== false;

    // Confirm the tenant exists before running anything expensive.
    const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) throw new AppError('NOT_FOUND', 404, `Tenant "${tenantSlug}" not found`);

    // Create a job so the dialog can poll it while the crawl runs.
    const job = await createJob(
      tenantSlug,
      sourceUrl,
      body.youtubeChannelUrl ?? null,
      request.user?.id ?? null,
    );

    // Fire-and-forget: a Chromium crawl of a whole site takes minutes, which
    // exceeds HTTP client/edge timeouts (the request dies but the crawl keeps
    // running). So we DON'T hold the request — kick the crawl off in the
    // background (it updates the job's status + classifiedData as it goes) and
    // return the jobId immediately. The dialog polls GET /jobs/:id until status
    // is 'classified' (dry-run done) / 'done' (applied) / 'failed'. Every error
    // is caught here so this detached task can never crash the process.
    void (async () => {
     try {
      // Phase 12-γ.6 (2026-06-04) — AGENT-DRIVEN migration.
      // User mandate: AI orchestrates, crawler is a tool. Gemini receives
      // the URL + goal, then chooses among fetch_url / fetch_sitemap /
      // try_wp_rest / try_youtube_channel / commit_result tools to
      // investigate the site and extract content. The agent decides
      // strategy + when to stop.
      await updateJobStatus(job.id, 'extracting');

      let classified: ClassifiedData;
      let agentIterations = 0;
      let agentToolCalls: { name: string; ok: boolean }[] = [];
      let agentWarnings: string[] = [];

      if (useLlm) {
        const agentStart = Date.now();
        // Main migration = page STRUCTURE + design only (platform-agnostic —
        // Chromium renders any CMS). The agent judges each page: STATIC pages →
        // layout blocks; DYNAMIC list pages (주보·앨범·설교·칼럼·행사·교역자·
        // 게시판) → a single matching data-block SHELL placed at the right spot
        // (recent_bulletins / album_gallery / …). The dynamic DATA itself is
        // NOT fetched here — each content module's own "📥 URL에서 가져오기"
        // (/migrate-content) imports its data on demand and it renders through
        // the shell placed here. So the agent runs 'static' focus for a
        // static-only import (the dialog always sends 'static'); 'all' only if
        // the caller explicitly opted dynamic types in (legacy/uncommon).
        const staticOnly = includeList.every((k) => STATIC_INCLUDE.includes(k));
        const agentFocus: MigrationFocus = staticOnly ? 'static' : 'all';
        const agentResult = await runMigrationAgent(
          sourceUrl,
          body.youtubeChannelUrl ?? null,
          (msg) => request.log.info({ migrationStep: 'agent' }, msg),
          agentFocus,
        );
        classified = agentResult.data;
        agentIterations = agentResult.iterations;
        agentToolCalls = agentResult.toolCalls.map(({ name, ok }) => ({ name, ok }));
        agentWarnings = agentResult.warnings;
        request.log.info({
          migrationStep: 'agent-done',
          tookMs: Date.now() - agentStart,
          iterations: agentIterations,
          toolCallCount: agentToolCalls.length,
          warningCount: agentWarnings.length,
        }, 'Migration: agent complete');
        for (const w of agentWarnings.slice(0, 20)) {
          request.log.warn({ migrationStep: 'agent-warn' }, w);
        }
      } else {
        // Legacy crawler+LLM path — kept for the useLlm=false case so
        // the operator can still get a fast structural import without
        // AI. With useLlm=true (default) we go through the agent.
        const extractStart = Date.now();
        const rawData: RawExtractedData = await extractFromHtml(sourceUrl, 30);
        request.log.info({ migrationStep: 'extract', tookMs: Date.now() - extractStart, pagesFound: rawData.pages.length, sourceUrl }, 'Migration: HTML crawl complete');
        if (body.youtubeChannelUrl) {
          rawData.youtubeVideos = await extractFromYouTubeChannel(body.youtubeChannelUrl, 100);
        }
        await updateJobRawData(job.id, rawData);
        classified = classify(rawData);
        // Skip LLM enrichment when explicitly off.
      }

      // Tag each page static vs dynamic (+ which module a dynamic page's data
      // block feeds) so the review screen can show the classification and the
      // "이 페이지 → 이 모듈" placement. Derived from block types.
      annotatePageKinds(classified.pageContents);

      // Still pull the YouTube channel videos via the dedicated extractor
      // — the agent can't realistically walk a channel's RSS, and the
      // operator-supplied channel URL is reliable when set.
      if (body.youtubeChannelUrl) {
        try {
          const videos = await extractFromYouTubeChannel(body.youtubeChannelUrl, 100);
          for (const v of videos) {
            classified.sermons.push({
              title: v.title,
              scripture: '',
              preacher: '',
              date: v.date,
              youtubeUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
              thumbnailUrl: v.thumbnailUrl,
            });
          }
        } catch (err) {
          request.log.warn(`YouTube channel extract failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Sitemap (네비게이션) — the migrated tenant's nav must mirror the
      // source site, not the generic default seed menu. The agent extracts
      // the source nav into classified.menus; if it came back empty, derive
      // a flat nav from the pages we actually migrated so the nav still
      // reflects this church rather than the default template.
      if (includeList.includes('menus') && classified.menus.length === 0) {
        classified.menus = deriveMenusFromPages(classified.pageContents);
      }

      // Persist the classified structure so the polling dialog can read it.
      await updateJobClassifiedData(job.id, classified);

      if (body.apply === false) {
        // Dry-run: stop at 'classified'. The dialog reads job.classifiedData for
        // the review, then POST /jobs/:id/apply commits it (no re-crawl).
        await updateJobStatus(job.id, 'classified');
      } else {
        // One-shot apply (legacy/back-compat; the dialog uses the 2-step flow).
        await updateJobStatus(job.id, 'applying');
        const result = await applyAll(tenantSlug, classified, { include: includeList });
        await updateJobApplyResult(job.id, result);
        await updateJobStatus(job.id, 'done');
      }
     } catch (err) {
       const msg = err instanceof Error ? err.message : 'Migration failed';
       request.log.error({ migrationStep: 'migrate-url-bg', jobId: job.id }, msg);
       await updateJobStatus(job.id, 'failed', msg).catch(() => {});
     } finally {
       // Release the shared headless-chromium so it doesn't linger in memory.
       await closeBrowser().catch(() => {});
     }
    })();

    // Return immediately — the dialog polls GET /jobs/:id for progress/result.
    return reply.send({ data: { jobId: job.id, async: true } });
  });

  // NOTE: the manual WordPress WXR (.xml) upload import was RETIRED in the
  // migration redesign — replaced by automatic WP REST bulk collection
  // (extractors/wp-rest.ts) which pulls the same posts/media without asking the
  // operator to export and upload a file. Do NOT reintroduce a WXR upload path.

  // ── Per-content migration (per-module) ──
  // Migrate ONE dynamic content type (sermons/bulletins/columns/albums/…) from
  // a source site, triggered from that module's admin page. The agent is scoped
  // to just this type → small, reliable extraction. Re-import is idempotent via
  // each item's source_url.
  app.post('/migrate-content', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as { sourceUrl?: string; tenantSlug?: string; contentType?: string };
    const sourceUrl = (body.sourceUrl ?? '').trim();
    const tenantSlug = (body.tenantSlug ?? '').trim();
    const contentType = (body.contentType ?? '').trim() as IncludeKey;
    if (!sourceUrl || !tenantSlug || !contentType) {
      throw new AppError('VALIDATION_ERROR', 400, 'sourceUrl + tenantSlug + contentType required');
    }
    // Triggered from a content module's admin page → tenant admins (admin /
    // owner / support) may migrate into THEIR OWN tenant; super_admin → any.
    const role = request.user?.role ?? '';
    if (role !== 'super_admin') {
      if (!['admin', 'owner', 'support'].includes(role)) {
        throw new AppError('FORBIDDEN', 403, 'Admin access required');
      }
      if (request.user?.tenantSlug !== tenantSlug) {
        throw new AppError('FORBIDDEN', 403, '본인 교회의 콘텐츠만 가져올 수 있습니다');
      }
    }
    if (!DYNAMIC_INCLUDE.includes(contentType)) {
      throw new AppError('VALIDATION_ERROR', 400, `contentType must be one of: ${DYNAMIC_INCLUDE.join(', ')}`);
    }
    const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) throw new AppError('NOT_FOUND', 404, `Tenant "${tenantSlug}" not found`);

    const agentStart = Date.now();
    const agentResult = await runMigrationAgent(
      sourceUrl,
      null,
      (msg) => request.log.info({ migrationStep: 'agent-content' }, msg),
      { content: contentType },
    );
    request.log.info({
      migrationStep: 'agent-content-done',
      tookMs: Date.now() - agentStart,
      iterations: agentResult.iterations,
      contentType,
    }, 'Migration(content): agent complete');
    for (const w of agentResult.warnings.slice(0, 20)) {
      request.log.warn({ migrationStep: 'agent-content-warn' }, w);
    }
    // Crawl done — release the shared headless chromium.
    await closeBrowser().catch(() => {});

    const result = await applyAll(tenantSlug, agentResult.data, { include: [contentType] });
    return reply.send({
      data: {
        contentType,
        applyResult: result,
        applied: (result as unknown as Record<string, number>)[contentType] ?? 0,
        iterations: agentResult.iterations,
        warnings: agentResult.warnings.slice(0, 10),
      },
    });
  });

  // ── Apply ──
  app.post<{ Params: { id: string } }>('/jobs/:id/apply', async (request, reply) => {
    const job = await getJob(request.params.id);
    if (!job) throw new AppError('NOT_FOUND', 404, 'Job not found');

    const data = job.classifiedData;
    if (!data?.churchInfo && !data?.sermons?.length && !data?.pageContents?.length) {
      throw new AppError('VALIDATION_ERROR', 400, 'No classified data to apply. Run classify first.');
    }

    // STEP 4 — the review screen sends the confirmed include set. Resolve the
    // same way /migrate-url does. Default ALL (this is an explicit apply of an
    // already-reviewed job, so applying everything classified is the right
    // default here — unlike the cheap-first STATIC default of a fresh run).
    const body = (request.body ?? {}) as { include?: IncludeKey[] | 'static' | 'dynamic' | 'all' };
    let includeList: IncludeKey[];
    if (body.include === 'static') includeList = STATIC_INCLUDE;
    else if (body.include === 'dynamic') includeList = DYNAMIC_INCLUDE;
    else if (Array.isArray(body.include)) includeList = body.include;
    else includeList = ALL_INCLUDE;

    // Fire-and-forget: apply includes R2 image uploads (resize + upload each),
    // which can take minutes → don't hold the request. The dialog polls
    // GET /jobs/:id until status is 'done' / 'failed' and reads job.applyResult.
    void (async () => {
      try {
        await updateJobStatus(job.id, 'applying');
        const result = await applyAll(job.tenantSlug, data, { include: includeList });
        await updateJobApplyResult(job.id, result);
        await updateJobStatus(job.id, 'done');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Apply failed';
        request.log.error({ migrationStep: 'apply-bg', jobId: job.id }, msg);
        await updateJobStatus(job.id, 'failed', msg).catch(() => {});
      }
    })();

    return reply.send({ data: { jobId: job.id, async: true } });
  });

  // ── Tenant Pages Reference (kept from old routes) ──
  app.get<{ Params: { slug: string } }>('/tenant-pages/:slug', async (request, reply) => {
    const schema = validateSchemaName(`tenant_${request.params.slug}`);
    try {
      const pages = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT id, title, slug, sort_order FROM "${schema}".pages ORDER BY sort_order`,
      );
      for (const page of pages) {
        const sections = await prisma.$queryRawUnsafe<{ block_type: string; sort_order: number }[]>(
          `SELECT block_type, sort_order FROM "${schema}".page_sections WHERE page_id = $1::uuid ORDER BY sort_order`,
          page.id,
        );
        (page as Record<string, unknown>).blocks = sections.map((s) => s.block_type);
      }
      return reply.send({ data: pages });
    } catch {
      return reply.send({ data: [] });
    }
  });
}

/** Data-block type → the Content Module it displays. A page carrying one of
 *  these is a DYNAMIC list page; anything else is STATIC. */
const DATA_BLOCK_MODULE: Record<string, PageModuleType> = {
  recent_bulletins: 'bulletins',
  recent_sermons: 'sermons',
  sermon_magazine: 'sermons',
  recent_columns: 'columns',
  album_gallery: 'albums',
  event_grid: 'events',
  staff_grid: 'staff',
  history_timeline: 'history',
  board: 'boards',
};

/**
 * STEP 3 — tag each classified page static vs dynamic (and, for dynamic pages,
 * which Content Module its data block feeds) so the review screen can group
 * them and show "이 페이지 → 이 모듈". Derived from the page's block types
 * (robust — doesn't depend on the LLM emitting the field). Mutates in place;
 * leaves an already-set pageKind untouched.
 */
function annotatePageKinds(pages: ClassifiedPageContent[]): void {
  for (const page of pages) {
    if (page.pageKind) continue;
    const dataBlock = page.blocks.find((b) => DATA_BLOCK_MODULE[b.blockType]);
    if (dataBlock) {
      page.pageKind = 'dynamic';
      page.moduleType = DATA_BLOCK_MODULE[dataBlock.blockType];
    } else {
      page.pageKind = 'static';
    }
  }
}
