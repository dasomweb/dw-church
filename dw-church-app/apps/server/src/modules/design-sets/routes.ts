import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { createDesignSetSchema, updateDesignSetSchema } from './schema.js';
import * as designSetService from './service.js';

/**
 * Saved design sets — per-tenant named token snapshots. All routes require an
 * authenticated admin (design management surface, not public).
 *   GET    /design-sets            list
 *   POST   /design-sets            save current/provided tokens as a set
 *   PUT    /design-sets/:id        rename / replace tokens
 *   DELETE /design-sets/:id        delete
 *   POST   /design-sets/:id/apply  copy the set's tokens into the live theme
 */
export async function designSetRoutes(app: FastifyInstance) {
  app.get('/design-sets', { preHandler: [requireAuth] }, async (request, reply) => {
    const data = await designSetService.listDesignSets(getSchema(request));
    return reply.send({ data });
  });

  app.post('/design-sets', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createDesignSetSchema.parse(request.body);
    const created = await designSetService.createDesignSet(getSchema(request), input);
    return reply.status(201).send({ data: created });
  });

  app.get('/design-sets/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await designSetService.getDesignSet(getSchema(request), id);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '디자인셋을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  app.put('/design-sets/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateDesignSetSchema.parse(request.body);
    const row = await designSetService.updateDesignSet(getSchema(request), id, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '디자인셋을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  app.delete('/design-sets/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await designSetService.deleteDesignSet(getSchema(request), id);
    return reply.status(204).send();
  });

  app.post('/design-sets/:id/apply', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tokens = await designSetService.applyDesignSet(getSchema(request), id);
    if (!tokens) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '디자인셋을 찾을 수 없습니다' } });
    return reply.send({ data: tokens });
  });
}
