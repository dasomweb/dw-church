/**
 * Claude Design import routes (super-admin) — zip-upload model.
 *
 * The console unzips the Claude Design Project archive in the browser and sends
 * the `.dc.html` canvas (+ `_ds/_tokens.css`) here. Long steps (LLM mapping,
 * image R2 upload) run as background jobs the dialog polls — same pattern as
 * migration, so Cloudflare's ~100s edge timeout never bites.
 *
 *   POST /design/import/analyze  → { jobId }   map canvas → ImportSpec (no writes)
 *   POST /design/import/apply    → { jobId }   map (if needed) + apply to tenant
 *   GET  /design/import/jobs/:id → { status, step, result }
 */
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { parseCanvas } from './canvas-parse.js';
import { mapCanvas, type ImportSpec } from './map.js';
import { applyImportSpec, ALLOWED_TENANTS, type ApplyMode, type ApplyResult } from './apply.js';

async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  const isSuperByRole = request.user?.role === 'super_admin';
  const isSuperByEnv = !!request.user?.email && env.SUPER_ADMIN_EMAILS.includes(request.user.email);
  if (!isSuperByRole && !isSuperByEnv) throw new AppError('FORBIDDEN', 403, 'Super admin access required');
}

interface Job {
  id: string;
  kind: 'analyze' | 'apply';
  status: 'running' | 'done' | 'error';
  step: string;
  spec?: ImportSpec;
  result?: ApplyResult;
  error?: string;
  updatedAt: number;
}
const JOBS = new Map<string, Job>();
// GC jobs older than 30 min.
function gcJobs(): void {
  const cutoff = Date.now() - 30 * 60_000;
  for (const [id, j] of JOBS) if (j.updatedAt < cutoff) JOBS.delete(id);
}
function newJob(kind: Job['kind']): Job {
  gcJobs();
  const job: Job = { id: randomUUID(), kind, status: 'running', step: '시작', updatedAt: Date.now() };
  JOBS.set(job.id, job);
  return job;
}
function fail(job: Job, e: unknown): void {
  job.status = 'error';
  job.error = e instanceof Error ? e.message : String(e);
  job.updatedAt = Date.now();
}

export async function designImportRoutes(app: FastifyInstance): Promise<void> {
  // Map canvas → ImportSpec (LLM). No writes — this is the review step.
  app.post('/design/import/analyze', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const body = (request.body ?? {}) as { canvasHtml?: string; tokensCss?: string; churchName?: string };
    if (!body.canvasHtml || body.canvasHtml.length < 40) throw new AppError('BAD_REQUEST', 400, 'canvasHtml 필수');
    const job = newJob('analyze');
    const { canvasHtml, tokensCss, churchName } = body;
    void (async () => {
      try {
        const spec = await mapCanvas(canvasHtml, tokensCss, churchName ?? 'Claude Design', (msg, done, total) => {
          job.step = `${msg} (${done}/${total})`; job.updatedAt = Date.now();
        });
        job.spec = spec; job.status = 'done'; job.step = '완료'; job.updatedAt = Date.now();
      } catch (e) { fail(job, e); }
    })();
    return reply.send({ data: { jobId: job.id } });
  });

  // Map (if no spec passed) + apply theme/pages/images to the tenant.
  app.post('/design/import/apply', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const body = (request.body ?? {}) as {
      tenantSlug?: string; canvasHtml?: string; tokensCss?: string; churchName?: string;
      mode?: ApplyMode; spec?: ImportSpec;
    };
    if (!body.tenantSlug) throw new AppError('BAD_REQUEST', 400, 'tenantSlug 필수');
    if (!ALLOWED_TENANTS.has(body.tenantSlug)) {
      throw new AppError('FORBIDDEN', 403, `현재 [${[...ALLOWED_TENANTS].join(', ')}] 에만 반영 가능합니다.`);
    }
    if (!body.canvasHtml && !body.spec) throw new AppError('BAD_REQUEST', 400, 'canvasHtml 또는 spec 필수');
    const job = newJob('apply');
    const { tenantSlug, canvasHtml = '', tokensCss, churchName, mode = '전면개편' } = body;
    let spec = body.spec;
    void (async () => {
      try {
        if (!spec) {
          spec = await mapCanvas(canvasHtml, tokensCss, churchName ?? 'Claude Design', (msg, done, total) => {
            job.step = `매핑 ${msg} (${done}/${total})`; job.updatedAt = Date.now();
          });
        }
        const result = await applyImportSpec(tenantSlug, spec, canvasHtml, mode, (step, done) => {
          job.step = `${done ? '✓ ' : ''}${step}`; job.updatedAt = Date.now();
        });
        job.result = result; job.status = 'done'; job.step = '완료'; job.updatedAt = Date.now();
      } catch (e) { fail(job, e); }
    })();
    return reply.send({ data: { jobId: job.id } });
  });

  app.get('/design/import/jobs/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = JOBS.get(id);
    if (!job) throw new AppError('NOT_FOUND', 404, 'job 없음(만료되었을 수 있음)');
    return reply.send({
      data: {
        status: job.status, step: job.step, error: job.error,
        spec: job.spec, result: job.result,
      },
    });
  });

  // Quick client-side sanity: parse structure without the LLM (optional preview).
  app.post('/design/import/structure', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const body = (request.body ?? {}) as { canvasHtml?: string };
    if (!body.canvasHtml) throw new AppError('BAD_REQUEST', 400, 'canvasHtml 필수');
    const parsed = parseCanvas(body.canvasHtml);
    return reply.send({
      data: {
        screens: parsed.screens.map((s) => ({ label: s.label, slug: s.slug, kind: s.kind, dynamicLists: s.dynamicLists, images: s.imageUrls.length })),
        imageCount: parsed.imageUrls.length,
        warnings: parsed.warnings,
      },
    });
  });
}
