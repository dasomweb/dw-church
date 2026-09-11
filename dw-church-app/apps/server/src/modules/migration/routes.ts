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
import { collectWpModules } from './extractors/wp-rest.js';
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

    // Create a job so the wizard can later look up history / retry.
    const job = await createJob(
      tenantSlug,
      sourceUrl,
      body.youtubeChannelUrl ?? null,
      request.user?.id ?? null,
    );

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

      // STEP 2 — WP REST bulk-collect the dynamic archive when the source is
      // WordPress. Deterministic + fully paginated: the agent's tool-loop can't
      // pull a whole post archive (it summarises ~30 items/call, hard turn cap),
      // which is why migrations came back "완료" with almost nothing. Detection
      // is a cheap /wp-json probe. When WP fills the dynamics, the agent focuses
      // on static LAYOUT only (no duplicate posts, more reliable).
      const wantsDynamic = includeList.some((k) => DYNAMIC_INCLUDE.includes(k));
      let wpPostCount = 0;
      let wpIsWordPress = false;
      let wpModules: Awaited<ReturnType<typeof collectWpModules>> | null = null;
      if (useLlm && wantsDynamic) {
        wpModules = await collectWpModules(sourceUrl, (msg) => request.log.info({ migrationStep: 'wp-rest' }, msg));
        wpIsWordPress = wpModules.isWordPress;
        wpPostCount = wpModules.postCount;
      }

      if (useLlm) {
        const agentStart = Date.now();
        // Agent focus: static LAYOUT only when we don't need it to crawl posts
        // (static-only import, OR WordPress where WP REST already has dynamics);
        // else 'all' so a non-WordPress source's list pages still get crawled.
        const agentFocus: MigrationFocus = (!wantsDynamic || wpIsWordPress) ? 'static' : 'all';
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

      // STEP 2 — merge the WP REST bulk archive into the module arrays (only the
      // types the operator included). In 'static' focus the agent left these
      // EMPTY, so this is the real dynamic content and there's no duplication.
      if (wpModules?.isWordPress) {
        const inc = new Set(includeList);
        if (inc.has('bulletins')) classified.bulletins.push(...wpModules.bulletins);
        if (inc.has('sermons'))   classified.sermons.push(...wpModules.sermons);
        if (inc.has('albums'))    classified.albums.push(...wpModules.albums);
        if (inc.has('columns'))   classified.columns.push(...wpModules.columns);
        if (inc.has('events'))    classified.events.push(...wpModules.events);
        if (inc.has('boards'))    classified.boards.push(...wpModules.boards);
        classified.images.push(...wpModules.images);
      }

      // STEP 3 — tag each page static vs dynamic (+ which module a dynamic page
      // feeds) so the review screen can group them. Derived from block types.
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

      // Surface the same fields the dialog used to read so its UI stays
      // backwards-compatible.
      const llmStats = {
        pagesProcessed: agentIterations,
        llmAdded: 0,
        breakdown: Object.fromEntries(
          agentToolCalls.reduce<Map<string, number>>((acc, t) => {
            acc.set(t.name, (acc.get(t.name) ?? 0) + 1);
            return acc;
          }, new Map()).entries(),
        ),
        warnings: agentWarnings,
      };

      // Sitemap (네비게이션) — the migrated tenant's nav must mirror the
      // source site, not the generic default seed menu. The agent extracts
      // the source nav into classified.menus; if it came back empty, derive
      // a flat nav from the pages we actually migrated so the nav still
      // reflects this church rather than the default template.
      if (includeList.includes('menus') && classified.menus.length === 0) {
        classified.menus = deriveMenusFromPages(classified.pageContents);
      }

      await updateJobClassifiedData(job.id, classified);

      const youtubeCount = body.youtubeChannelUrl ? classified.sermons.filter((s) => s.youtubeUrl).length : 0;
      const classifiedCounts = buildClassifiedCounts(classified, youtubeCount, llmStats, wpPostCount);

      // STEP 4 — dry-run (apply:false): stop here and return the classified data
      // for the REVIEW screen. classifiedData is persisted on the job, so the
      // subsequent POST /jobs/:id/apply commits WITHOUT re-crawling.
      if (body.apply === false) {
        await updateJobStatus(job.id, 'classified');
        return reply.send({
          data: {
            jobId: job.id,
            applied: false,
            wordpress: wpIsWordPress,
            classifiedData: classified,
            classifiedCounts,
            warnings: (llmStats.warnings ?? []).slice(0, 10),
          },
        });
      }

      // 3. Apply — selective per `include`.
      await updateJobStatus(job.id, 'applying');
      const result = await applyAll(tenantSlug, classified, { include: includeList });
      await updateJobApplyResult(job.id, result);
      await updateJobStatus(job.id, 'done');

      return reply.send({
        data: {
          jobId: job.id,
          applied: true,
          wordpress: wpIsWordPress,
          applyResult: result,
          classifiedCounts,
          // Phase 12-γ.5 — echo back what was actually applied vs skipped.
          appliedTypes: includeList,
          usedLlm: useLlm,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Migration failed';
      await updateJobStatus(job.id, 'failed', msg);
      throw new AppError('INTERNAL_ERROR', 500, msg);
    } finally {
      // Release the shared headless-chromium so it doesn't linger in memory
      // after the crawl finishes.
      await closeBrowser().catch(() => {});
    }
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

    await updateJobStatus(job.id, 'applying');

    try {
      const result = await applyAll(job.tenantSlug, data, { include: includeList });
      await updateJobApplyResult(job.id, result);
      await updateJobStatus(job.id, 'done');
      const youtubeCount = data.sermons.filter((s) => s.youtubeUrl).length;
      return reply.send({
        data: {
          jobId: job.id,
          applied: true,
          applyResult: result,
          appliedTypes: includeList,
          classifiedCounts: buildClassifiedCounts(data, youtubeCount, { pagesProcessed: 0, llmAdded: 0, breakdown: {}, warnings: [] }, 0),
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Apply failed';
      await updateJobStatus(job.id, 'failed', msg);
      throw new AppError('INTERNAL_ERROR', 500, msg);
    }
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

/**
 * Count of SEO-derived ChurchInfo fields that got filled.
 * Used by MigrationDialog to tell operator at-a-glance whether the
 * source site had usable head metadata. See project_migration_seo_extraction.
 */
function countSeoFields(info: ClassifiedData['churchInfo']): number {
  const fields: (keyof ClassifiedData['churchInfo'])[] = [
    'seoTitle', 'seoDescription', 'seoKeywords',
    'ogImageUrl', 'logoUrl', 'locale', 'slogan',
  ];
  return fields.filter((k) => Boolean(info[k])).length;
}

/**
 * Build the classifiedCounts object the dialog reads. "탐지(detected)" figures —
 * distinct from applyResult, which is what was actually written. Shared by the
 * dry-run response, the one-shot apply response, and /jobs/:id/apply so the
 * three stay in sync. Adds static/dynamic page split + WP post count for the
 * review screen (STEP 3/5).
 */
function buildClassifiedCounts(
  classified: ClassifiedData,
  youtubeVideos: number,
  llm: { pagesProcessed: number; llmAdded: number; breakdown: Record<string, number>; warnings: string[] },
  wpPostCount: number,
): Record<string, unknown> {
  return {
    sermons: classified.sermons.length,
    bulletins: classified.bulletins.length,
    columns: classified.columns.length,
    events: classified.events.length,
    albums: classified.albums.length,
    staff: classified.staff.length,
    history: classified.history.length,
    boards: classified.boards.length,
    boardPosts: classified.boards.reduce((s, b) => s + b.posts.length, 0),
    menus: classified.menus.length,
    pages: classified.pageContents.length,
    staticPages: classified.pageContents.filter((p) => p.pageKind === 'static').length,
    dynamicPages: classified.pageContents.filter((p) => p.pageKind === 'dynamic').length,
    images: classified.images.length,
    youtubeVideos,
    wpPostCount,
    seoFieldsFilled: countSeoFields(classified.churchInfo),
    llmPagesAnalyzed: llm.pagesProcessed,
    llmItemsAdded: llm.llmAdded,
    llmBreakdown: llm.breakdown ?? {},
    llmWarnings: (llm.warnings ?? []).slice(0, 10),
  };
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
