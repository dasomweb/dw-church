import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { exportTenant } from './service.js';

/**
 * Content export — available on every tier (the SaaS exit guarantee).
 * GET /api/v1/export → a downloadable JSON archive of the tenant's full schema.
 */
export async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.get('/export', { preHandler: [requireAdmin] }, async (request, reply) => {
    const tenant = request.tenant;
    if (!tenant) {
      throw new AppError('TENANT_NOT_FOUND', 404, 'Tenant not resolved');
    }

    const exportedAt = new Date().toISOString();
    const archive = await exportTenant(tenant.slug, tenant.name, tenant.plan ?? '', exportedAt);

    // Stamp the filename with the date so repeated exports don't collide.
    const datePart = exportedAt.slice(0, 10);
    const filename = `${tenant.slug}-export-${datePart}.json`;

    reply.header('Content-Type', 'application/json; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    // Pretty-print — the archive is meant to be human-inspectable.
    return reply.send(JSON.stringify(archive, null, 2));
  });
}
