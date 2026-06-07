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
import { extractFromYouTubeChannel } from './extractors/youtube.js';
import { classify } from './classifier.js';
import { runMigrationAgent } from './migration-agent.js';
import { applyAll, STATIC_INCLUDE, DYNAMIC_INCLUDE, ALL_INCLUDE } from './appliers/index.js';
import type { IncludeKey } from './appliers/index.js';
import type { ClassifiedData, RawExtractedData } from './types.js';

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

  // One-time bootstrap: reset password for any account (remove after use)
  app.post('/bootstrap', async (request, reply) => {
    const { secret, email: targetEmail, password: targetPassword, role: targetRole } = request.body as {
      secret?: string; email?: string; password?: string; role?: string;
    };
    if (secret !== 'truelight-bootstrap-2026') {
      throw new AppError('FORBIDDEN', 403, 'Invalid bootstrap secret');
    }
    const bcrypt = await import('bcryptjs');
    const email = targetEmail || 'superadmin@truelight.app';
    const password = targetPassword || 'TrueLight2026!';
    const role = targetRole || 'super_admin';
    const hash = await bcrypt.default.hash(password, 12);

    const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM public.users WHERE email = $1`, email,
    );
    if (existing.length > 0) {
      await prisma.$queryRawUnsafe(
        `UPDATE public.users SET password_hash = $1 WHERE email = $2`,
        hash, email,
      );
    } else {
      await prisma.$queryRawUnsafe(
        `INSERT INTO public.users (email, password_hash, name, role) VALUES ($1, $2, 'Admin', $3)`,
        email, hash, role,
      );
    }
    return reply.send({ success: true, email, password });
  });

  // Auth hook — skip for health and bootstrap
  app.addHook('preHandler', async (request, reply) => {
    const url = request.url;
    if (url.endsWith('/health') || url.endsWith('/bootstrap')) return;
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

      if (useLlm) {
        const agentStart = Date.now();
        // Static-only import → focus the agent on page layouts (more reliable);
        // it won't waste turns chasing individual posts (those migrate per-module).
        const staticOnly = includeList.every((k) => STATIC_INCLUDE.includes(k));
        const agentResult = await runMigrationAgent(
          sourceUrl,
          body.youtubeChannelUrl ?? null,
          (msg) => request.log.info({ migrationStep: 'agent' }, msg),
          staticOnly ? 'static' : 'all',
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

      await updateJobClassifiedData(job.id, classified);

      // 3. Apply — selective per `include`.
      await updateJobStatus(job.id, 'applying');
      const result = await applyAll(tenantSlug, classified, { include: includeList });
      await updateJobApplyResult(job.id, result);

      return reply.send({
        data: {
          jobId: job.id,
          applyResult: result,
          classifiedCounts: {
            sermons: classified.sermons.length,
            bulletins: classified.bulletins.length,
            columns: classified.columns.length,
            events: classified.events.length,
            albums: classified.albums.length,
            staff: classified.staff.length,
            history: classified.history.length,
            boards: classified.boards.length,
            menus: classified.menus.length,
            pages: classified.pageContents.length,
            images: classified.images.length,
            youtubeVideos: body.youtubeChannelUrl ? classified.sermons.filter((s) => s.youtubeUrl).length : 0,
            // Phase 12-γ.2: count of SEO fields populated (out of 7).
            // Operator can see at-a-glance whether source site had usable
            // meta. See project_migration_seo_extraction.
            seoFieldsFilled: countSeoFields(classified.churchInfo),
            // Phase 12-γ.4: AI analysis stats. pagesAnalyzed = total
            // pages LLM examined; llmAdded = items LLM contributed
            // beyond rule-based output.
            llmPagesAnalyzed: llmStats.pagesProcessed,
            llmItemsAdded: llmStats.llmAdded,
            llmBreakdown: llmStats.breakdown ?? {},
            llmWarnings: (llmStats.warnings ?? []).slice(0, 10),
          },
          // Phase 12-γ.5 — echo back what was actually applied vs skipped.
          appliedTypes: includeList,
          usedLlm: useLlm,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Migration failed';
      await updateJobStatus(job.id, 'failed', msg);
      throw new AppError('INTERNAL_ERROR', 500, msg);
    }
  });

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

    await updateJobStatus(job.id, 'applying');

    try {
      const result = await applyAll(job.tenantSlug, data);
      await updateJobApplyResult(job.id, result);
      const updated = await getJob(job.id);
      return reply.send({ data: updated });
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
