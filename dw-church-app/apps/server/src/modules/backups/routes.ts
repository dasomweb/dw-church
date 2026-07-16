import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { createBackup, listBackups, restoreBackup, deleteBackup } from './service.js';

/**
 * Tenant backup / restore (super-admin only).
 *   GET    /admin/tenants/:slug/backups              — list versions (newest first)
 *   POST   /admin/tenants/:slug/backups              — capture a new backup { note? }
 *   POST   /admin/tenants/:slug/backups/:id/restore  — restore (auto-safety-backup first)
 *   DELETE /admin/tenants/:slug/backups/:id          — delete a backup version
 *
 * The slug comes from the URL and every op is validated against the live schema,
 * so a backup can only ever touch the addressed tenant.
 */
export const createBackupBody = z.object({
  note: z.string().max(200).optional(),
});

export async function backupRoutes(app: FastifyInstance) {
  app.get('/admin/tenants/:slug/backups', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    return reply.send({ data: await listBackups(slug) });
  });

  app.post('/admin/tenants/:slug/backups', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const body = createBackupBody.parse(req.body ?? {});
    const backup = await createBackup(slug, {
      note: body.note ?? null,
      createdBy: req.user?.email ?? null,
      kind: 'manual',
    });
    return reply.send({ data: backup });
  });

  app.post('/admin/tenants/:slug/backups/:id/restore', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { slug, id } = req.params as { slug: string; id: string };
    const result = await restoreBackup(slug, id, { createdBy: req.user?.email ?? null });
    return reply.send({ data: result });
  });

  app.delete('/admin/tenants/:slug/backups/:id', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { slug, id } = req.params as { slug: string; id: string };
    await deleteBackup(slug, id);
    return reply.send({ data: { deleted: true } });
  });
}
