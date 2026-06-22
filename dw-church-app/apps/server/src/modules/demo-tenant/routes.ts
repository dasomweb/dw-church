import type { FastifyInstance } from 'fastify';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { DEMO_SLUG, captureSnapshot, restoreSnapshot, snapshotStatus } from './service.js';

/**
 * Demo-tenant lifecycle (super-admin only).
 *   GET  /admin/demo-tenant/status   — snapshot metadata (taken_at, table count)
 *   POST /admin/demo-tenant/snapshot — capture the current state as the golden baseline
 *   POST /admin/demo-tenant/reset    — restore from the snapshot (wipe tester garbage)
 *
 * The target slug is forced to the configured demo tenant — a real tenant can
 * NEVER be wiped through this route.
 */
function assertDemo(slug?: string): string {
  const s = (slug || DEMO_SLUG).toLowerCase();
  if (s !== DEMO_SLUG) {
    throw new AppError('FORBIDDEN_TENANT', 403, `스냅샷/초기화는 데모 테넌트(${DEMO_SLUG})에만 허용됩니다.`);
  }
  return s;
}

export async function demoTenantRoutes(app: FastifyInstance) {
  app.get('/admin/demo-tenant/status', { preHandler: [requireSuperAdmin] }, async (_req, reply) => {
    return reply.send({ data: { slug: DEMO_SLUG, ...(await snapshotStatus(DEMO_SLUG)) } });
  });

  app.post('/admin/demo-tenant/snapshot', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const slug = assertDemo((req.body as { slug?: string } | undefined)?.slug);
    return reply.send({ data: { slug, ...(await captureSnapshot(slug)) } });
  });

  app.post('/admin/demo-tenant/reset', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const slug = assertDemo((req.body as { slug?: string } | undefined)?.slug);
    return reply.send({ data: { slug, ...(await restoreSnapshot(slug)) } });
  });
}
