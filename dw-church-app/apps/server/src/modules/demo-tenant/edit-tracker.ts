import type { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';
import { DEMO_SLUG } from './service.js';

/**
 * Track SUPER-ADMIN edits to the demo tenant so the super-admin UI can warn when
 * the golden snapshot is stale — baseline edits made after the last snapshot are
 * silently wiped by the nightly restore (see scheduler.ts / service.ts).
 *
 * ONLY super_admin writes count. The demo tenant is a public test site: ordinary
 * demo testers (admin/owner temp accounts) churn content ON PURPOSE and their
 * edits are *meant* to be wiped — so they must NEVER trigger the "snapshot needed"
 * warning. The actor is read from request.user.role (auth.ts), the affected tenant
 * from request.tenant.slug (tenantMiddleware, set from the X-Tenant-Slug header).
 */
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Stamp demo_snapshots.last_admin_edit_at = NOW() for the demo tenant slug. */
async function markDemoAdminEdit(): Promise<void> {
  // The row may not exist yet (no snapshot captured) — upsert so the timestamp is
  // recorded regardless; snapshotStatus only treats it as "stale" once a snapshot exists.
  await prisma.$executeRawUnsafe(
    `INSERT INTO "demo_snapshots" ("slug", "last_admin_edit_at") VALUES ($1, NOW())
     ON CONFLICT ("slug") DO UPDATE SET "last_admin_edit_at" = NOW()`,
    DEMO_SLUG,
  );
}

export function registerDemoEditTracker(app: FastifyInstance): void {
  app.addHook('onResponse', async (request, reply) => {
    try {
      if (!MUTATING.has(request.method)) return;
      if (reply.statusCode >= 300) return; // only successful writes
      if (request.user?.role !== 'super_admin') return; // only super-admin baseline edits
      if (request.tenant?.slug !== DEMO_SLUG) return; // only the demo tenant
      await markDemoAdminEdit();
    } catch {
      // best-effort: edit-tracking must never break a request or surface an error
    }
  });
  console.log(`[demo-edit-tracker] armed — super-admin edits to ${DEMO_SLUG} mark the snapshot stale`);
}
