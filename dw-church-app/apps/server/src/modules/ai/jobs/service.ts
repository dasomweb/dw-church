/**
 * Background-job service for super_admin LLM/build operations.
 *
 * Storage: public.ai_jobs (created in apps/server/src/index.ts boot
 * migrations). The fastify process itself is the worker — POST /ai/jobs
 * inserts the row + fire-and-forget runs the kind's runner. State is
 * polled via GET /ai/jobs/:id.
 *
 * Why not Redis/BullMQ: at our scale (a single super_admin running a
 * wizard occasionally) the cost of standing up a queue infrastructure
 * outweighs the benefit. Postgres + a fire-and-forget Promise is enough
 * — the only real failure mode (process restart mid-job) is handled by
 * a boot-time stuck-job sweep.
 */
import { prisma } from '../../../config/database.js';
import { AppError } from '../../../middleware/error-handler.js';
import { callAgents } from '../planner-proxy/agents-client.js';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Job kinds. Format: `<service>:<sub-path>`.
 *
 * "planner:*" wraps the agents /api/planner/<sub-path> endpoint —
 * this is the bulk of slow operations (content-map, design-system,
 * sitemap, etc.). The runner just forwards input to agents and stores
 * the response as output.
 */
const KNOWN_KINDS = new Set<string>([
  'planner:content-map',
  'planner:design-system',
  'planner:sitemap',
  'planner:auto-strategy',
  'planner:marketing-insight',
  'planner:crawl-sites',
]);

export interface JobRow {
  id: string;
  user_id: string;
  kind: string;
  status: JobStatus;
  input: Record<string, unknown>;
  output: unknown;
  error: string | null;
  progress: Record<string, unknown>;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
}

interface CreateJobArgs {
  userId: string;
  kind: string;
  input: Record<string, unknown>;
}

export async function createJob(args: CreateJobArgs): Promise<JobRow> {
  if (!KNOWN_KINDS.has(args.kind)) {
    throw new AppError('BAD_REQUEST', 400, `Unknown job kind: ${args.kind}`);
  }
  const rows = await prisma.$queryRawUnsafe<JobRow[]>(
    `INSERT INTO "ai_jobs" (user_id, kind, status, input)
     VALUES ($1::uuid, $2, 'queued', $3::jsonb)
     RETURNING id, user_id, kind, status, input, output, error, progress, created_at, started_at, finished_at`,
    args.userId,
    args.kind,
    JSON.stringify(args.input),
  );
  const row = rows[0];
  if (!row) throw new AppError('INTERNAL_ERROR', 500, 'Failed to insert job');

  // Fire-and-forget — the row is now durable, the response can return,
  // and the runner writes status+output back when it finishes. Catch
  // is required: an unhandled rejection here would crash the process.
  void runJob(row.id).catch((err) => {
    console.error(`[ai_jobs] runner crashed for ${row.id}:`, err);
  });

  return row;
}

export async function getJob(id: string, userId: string): Promise<JobRow> {
  const rows = await prisma.$queryRawUnsafe<JobRow[]>(
    `SELECT id, user_id, kind, status, input, output, error, progress, created_at, started_at, finished_at
       FROM "ai_jobs"
      WHERE id = $1::uuid AND user_id = $2::uuid
      LIMIT 1`,
    id,
    userId,
  );
  const row = rows[0];
  if (!row) throw new AppError('NOT_FOUND', 404, `Job ${id} not found`);
  return row;
}

/**
 * List jobs for a user, optionally filtered to active states. Used by
 * the wizard's resume-on-mount check — we surface any 'queued' or
 * 'running' job so the operator can rejoin instead of starting over.
 */
export async function listJobs(
  userId: string,
  opts: { status?: JobStatus[]; limit?: number } = {},
): Promise<JobRow[]> {
  const limit = Math.min(opts.limit ?? 20, 100);
  if (opts.status && opts.status.length > 0) {
    return prisma.$queryRawUnsafe<JobRow[]>(
      `SELECT id, user_id, kind, status, input, output, error, progress, created_at, started_at, finished_at
         FROM "ai_jobs"
        WHERE user_id = $1::uuid AND status = ANY($2::text[])
        ORDER BY created_at DESC
        LIMIT $3`,
      userId,
      opts.status,
      limit,
    );
  }
  return prisma.$queryRawUnsafe<JobRow[]>(
    `SELECT id, user_id, kind, status, input, output, error, progress, created_at, started_at, finished_at
       FROM "ai_jobs"
      WHERE user_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2`,
    userId,
    limit,
  );
}

export async function cancelJob(id: string, userId: string): Promise<JobRow> {
  // Best-effort cancel — only marks the row. The in-flight fetch keeps
  // running (we don't have an AbortController handle stored across the
  // fire-and-forget boundary). The runner checks the status on completion
  // and skips writing output if already 'cancelled'.
  const rows = await prisma.$queryRawUnsafe<JobRow[]>(
    `UPDATE "ai_jobs"
        SET status = 'cancelled', finished_at = NOW()
      WHERE id = $1::uuid AND user_id = $2::uuid AND status IN ('queued', 'running')
      RETURNING id, user_id, kind, status, input, output, error, progress, created_at, started_at, finished_at`,
    id,
    userId,
  );
  const row = rows[0];
  if (!row) {
    // Either doesn't exist, isn't ours, or already terminal — return
    // current state for context rather than 404 (idempotent cancel).
    return getJob(id, userId);
  }
  return row;
}

async function runJob(id: string): Promise<void> {
  // Mark running. If another runner already grabbed it (shouldn't happen
  // in single-process mode but defensive) UPDATE returns 0 and we bail.
  const claimed = await prisma.$queryRawUnsafe<JobRow[]>(
    `UPDATE "ai_jobs"
        SET status = 'running', started_at = NOW()
      WHERE id = $1::uuid AND status = 'queued'
      RETURNING id, user_id, kind, status, input, output, error, progress, created_at, started_at, finished_at`,
    id,
  );
  const job = claimed[0];
  if (!job) return;

  try {
    let output: unknown;
    if (job.kind.startsWith('planner:')) {
      const subPath = job.kind.slice('planner:'.length);
      const { status, body } = await callAgents(subPath, job.input);
      if (status < 200 || status >= 300) {
        let detail = `agents responded ${status}`;
        try {
          const j = JSON.parse(body) as { detail?: unknown };
          if (j.detail) detail = String(j.detail);
        } catch { /* not JSON */ }
        throw new Error(detail);
      }
      try {
        output = JSON.parse(body);
      } catch {
        output = { raw: body };
      }
    } else {
      throw new Error(`Unhandled job kind in runner: ${job.kind}`);
    }

    // Skip writing output if the operator cancelled mid-flight.
    await prisma.$executeRawUnsafe(
      `UPDATE "ai_jobs"
          SET status = 'completed', output = $2::jsonb, finished_at = NOW()
        WHERE id = $1::uuid AND status = 'running'`,
      id,
      JSON.stringify(output ?? null),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.$executeRawUnsafe(
      `UPDATE "ai_jobs"
          SET status = 'failed', error = $2, finished_at = NOW()
        WHERE id = $1::uuid AND status = 'running'`,
      id,
      msg.slice(0, 2000),
    );
  }
}

/**
 * Boot-time sweep: any 'running' job whose started_at is older than
 * STUCK_THRESHOLD must have been killed by a process restart, since
 * even content-map (the longest) finishes well within 3 minutes after
 * the parallelization work. Mark them failed so the wizard's resume
 * check doesn't keep showing them as in-progress forever.
 */
export async function recoverStuckJobs(): Promise<number> {
  const STUCK_THRESHOLD_SECONDS = 5 * 60; // 5 min — well past any real job
  const rows = await prisma.$executeRawUnsafe(
    `UPDATE "ai_jobs"
        SET status = 'failed',
            error = COALESCE(error, '') ||
                    CASE WHEN error IS NULL OR error = '' THEN '' ELSE E'\\n' END ||
                    'recovered: server restarted while job was running',
            finished_at = NOW()
      WHERE status = 'running'
        AND started_at IS NOT NULL
        AND started_at < NOW() - INTERVAL '${STUCK_THRESHOLD_SECONDS} seconds'`,
  );
  return Number(rows ?? 0);
}
