/**
 * Routes for the super_admin background-job queue.
 *
 *   POST   /api/v1/ai/jobs           — create a job, returns row (status='queued')
 *   GET    /api/v1/ai/jobs/:id       — fetch one (poll target)
 *   GET    /api/v1/ai/jobs           — list mine, ?status=queued,running for resume
 *   DELETE /api/v1/ai/jobs/:id       — best-effort cancel
 *
 * All routes require super_admin (createJob enforces this through the
 * agents proxy gate too; the gate at the route level catches misuse
 * earlier with a clean 403 instead of letting non-admins bounce off
 * the agents call).
 */
import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../../middleware/auth.js';
import { AppError } from '../../../middleware/error-handler.js';
import {
  cancelJob,
  createJob,
  getJob,
  listJobs,
  type JobRow,
  type JobStatus,
} from './service.js';

function shapeJob(row: JobRow) {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    input: row.input,
    output: row.output,
    error: row.error,
    progress: row.progress,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export async function aiJobsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/ai/jobs', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const body = (request.body ?? {}) as { kind?: string; input?: Record<string, unknown> };
    if (!body.kind || typeof body.kind !== 'string') {
      throw new AppError('BAD_REQUEST', 400, 'kind (string) required');
    }
    if (!body.input || typeof body.input !== 'object') {
      throw new AppError('BAD_REQUEST', 400, 'input (object) required');
    }
    const userId = request.user?.id;
    if (!userId) throw new AppError('UNAUTHORIZED', 401, 'No user on request');

    const row = await createJob({ userId, kind: body.kind, input: body.input });
    return reply.code(202).send(shapeJob(row));
  });

  app.get<{ Params: { id: string } }>(
    '/ai/jobs/:id',
    { preHandler: [requireSuperAdmin] },
    async (request) => {
      const userId = request.user?.id;
      if (!userId) throw new AppError('UNAUTHORIZED', 401, 'No user on request');
      const row = await getJob(request.params.id, userId);
      return shapeJob(row);
    },
  );

  app.get('/ai/jobs', { preHandler: [requireSuperAdmin] }, async (request) => {
    const userId = request.user?.id;
    if (!userId) throw new AppError('UNAUTHORIZED', 401, 'No user on request');
    const q = (request.query ?? {}) as { status?: string; limit?: string };
    let statusFilter: JobStatus[] | undefined;
    if (q.status) {
      const valid: JobStatus[] = ['queued', 'running', 'completed', 'failed', 'cancelled'];
      statusFilter = q.status
        .split(',')
        .map((s) => s.trim() as JobStatus)
        .filter((s) => valid.includes(s));
    }
    const limit = q.limit ? Number(q.limit) : 20;
    const rows = await listJobs(userId, { status: statusFilter, limit });
    return rows.map(shapeJob);
  });

  app.delete<{ Params: { id: string } }>(
    '/ai/jobs/:id',
    { preHandler: [requireSuperAdmin] },
    async (request) => {
      const userId = request.user?.id;
      if (!userId) throw new AppError('UNAUTHORIZED', 401, 'No user on request');
      const row = await cancelJob(request.params.id, userId);
      return shapeJob(row);
    },
  );
}
