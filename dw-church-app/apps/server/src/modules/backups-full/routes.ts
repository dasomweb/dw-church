import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSuperAdmin } from '../../middleware/auth.js';
import {
  createFullBackup,
  listFullBackups,
  restoreFullBackup,
  deleteFullBackup,
  isBackupConfigured,
} from './service.js';

/**
 * Tenant FULL backup / restore (super-admin only). Durable DB+media snapshots in
 * the dedicated R2 backup bucket.
 *   GET    /admin/backups/status                        — { configured }
 *   GET    /admin/tenants/:slug/full-backups            — list (newest first)
 *   POST   /admin/tenants/:slug/full-backups            — create { includeFiles?, note? }
 *   POST   /admin/tenants/:slug/full-backups/:id/restore— restore { restoreFiles? }
 *   DELETE /admin/tenants/:slug/full-backups/:id        — delete a snapshot
 */
const createBody = z.object({
  includeFiles: z.boolean().optional(),
  note: z.string().max(200).optional(),
});
const restoreBody = z.object({
  restoreFiles: z.boolean().optional(),
});

export async function fullBackupRoutes(app: FastifyInstance) {
  app.get('/admin/backups/status', { preHandler: [requireSuperAdmin] }, async (_req, reply) => {
    return reply.send({ data: { configured: isBackupConfigured() } });
  });

  app.get('/admin/tenants/:slug/full-backups', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    return reply.send({ data: await listFullBackups(slug) });
  });

  app.post('/admin/tenants/:slug/full-backups', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const body = createBody.parse(req.body ?? {});
    const meta = await createFullBackup(slug, {
      kind: 'manual',
      includeFiles: body.includeFiles,
      note: body.note ?? null,
      createdBy: req.user?.email ?? null,
    });
    return reply.send({ data: meta });
  });

  app.post('/admin/tenants/:slug/full-backups/:id/restore', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { slug, id } = req.params as { slug: string; id: string };
    const body = restoreBody.parse(req.body ?? {});
    const result = await restoreFullBackup(slug, id, { restoreFiles: body.restoreFiles });
    return reply.send({ data: result });
  });

  app.delete('/admin/tenants/:slug/full-backups/:id', { preHandler: [requireSuperAdmin] }, async (req, reply) => {
    const { slug, id } = req.params as { slug: string; id: string };
    await deleteFullBackup(slug, id);
    return reply.send({ data: { deleted: true } });
  });
}
