import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSuperAdmin } from '../../middleware/auth.js';
import * as svc from './service.js';

const caseStudySchema = z.object({
  churchName: z.string().min(1).max(200),
  tagline: z.string().max(300).optional().nullable(),
  screenshotUrl: z.string().max(2000).optional().nullable(),
  liveUrl: z.string().max(500).optional().nullable(),
  tags: z.array(z.string().max(40)).max(12).optional().nullable(),
  sortOrder: z.number().int().optional().nullable(),
  isPublished: z.boolean().optional(),
});
const updateSchema = caseStudySchema.partial();

/**
 * 포트폴리오 / 케이스 스터디 — showcase of churches we've built.
 *   GET    /case-studies            — PUBLIC (marketing /portfolio page)
 *   GET    /admin/case-studies      — super-admin: list all (incl. drafts)
 *   POST   /admin/case-studies      — super-admin: create
 *   PATCH  /admin/case-studies/:id  — super-admin: update
 *   DELETE /admin/case-studies/:id  — super-admin: delete
 */
export async function caseStudyRoutes(app: FastifyInstance) {
  app.get('/case-studies', async (_request, reply) => {
    return reply.send({ data: await svc.listPublished() });
  });

  app.get('/admin/case-studies', { preHandler: [requireSuperAdmin] }, async (_request, reply) => {
    return reply.send({ data: await svc.listAll() });
  });

  app.post('/admin/case-studies', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const input = caseStudySchema.parse(request.body);
    return reply.code(201).send({ data: await svc.create(input) });
  });

  app.patch('/admin/case-studies/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateSchema.parse(request.body);
    const row = await svc.update(id, input);
    if (!row) return reply.code(404).send({ error: { message: 'Case study not found' } });
    return reply.send({ data: row });
  });

  app.delete('/admin/case-studies/:id', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await svc.remove(id);
    return reply.code(204).send();
  });
}
