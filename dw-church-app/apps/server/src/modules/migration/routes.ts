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
import { applyAll } from './appliers/index.js';
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
  // Ensure migration_jobs table exists on startup
  await ensureMigrationJobsTable();

  // Health check (no auth)
  app.get('/health', async () => ({ status: 'migration-ok' }));

  // All other routes require super admin
  app.addHook('preHandler', requireSuperAdmin);

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
