import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth, requireFeature } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { createCellSchema, updateCellSchema } from './schema.js';
import * as cellService from './service.js';

/**
 * 목장(셀) routes. Reads are public (storefront 목장 page). Writes require the
 * 'cells' feature (Plus/Pro) — super_admin bypasses via requireFeature.
 */
export async function cellRoutes(app: FastifyInstance) {
  app.get('/cells', { preHandler: [optionalAuth] }, async (request, reply) => {
    // Public callers see only visible 목장; authenticated admins see all.
    const visibleOnly = !request.user;
    const data = await cellService.listCells(getSchema(request), { visibleOnly });
    return reply.send({ data });
  });

  app.get('/cells/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const cell = await cellService.getCell(getSchema(request), id);
    if (!cell) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '목장을 찾을 수 없습니다' } });
    return reply.send({ data: cell });
  });

  app.post('/cells', { preHandler: [requireAuth, requireFeature('cells')] }, async (request, reply) => {
    const input = createCellSchema.parse(request.body);
    const cell = await cellService.createCell(getSchema(request), input);
    return reply.status(201).send({ data: cell });
  });

  app.put('/cells/:id', { preHandler: [requireAuth, requireFeature('cells')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateCellSchema.parse(request.body);
    const cell = await cellService.updateCell(getSchema(request), id, input);
    if (!cell) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '목장을 찾을 수 없습니다' } });
    return reply.send({ data: cell });
  });

  app.delete('/cells/:id', { preHandler: [requireAuth, requireFeature('cells')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await cellService.deleteCell(getSchema(request), id);
    return reply.status(204).send();
  });
}
