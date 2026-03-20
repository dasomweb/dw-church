import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { getSchema } from '../../utils/get-schema.js';
import { createBulletinSchema, updateBulletinSchema } from './schema.js';
import * as bulletinService from './service.js';

export async function bulletinRoutes(app: FastifyInstance) {
  app.get('/bulletins', { preHandler: [optionalAuth] }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const { page, perPage } = parsePagination(query);
    const status = (query.status as string) || (request.user ? undefined : 'published');
    const search = query.search as string | undefined;

    const { data, total } = await bulletinService.listBulletins(getSchema(request), {
      page, perPage, search, status,
    });
    return reply.send(paginatedResponse(data, total, page, perPage));
  });

  app.get('/bulletins/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const bulletin = await bulletinService.getBulletin(getSchema(request), id);
    if (!bulletin) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Bulletin not found' } });
    return reply.send({ data: bulletin });
  });

  app.post('/bulletins', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createBulletinSchema.parse(request.body);
    const bulletin = await bulletinService.createBulletin(getSchema(request), input);
    return reply.status(201).send({ data: bulletin });
  });

  app.put('/bulletins/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateBulletinSchema.parse(request.body);
    const bulletin = await bulletinService.updateBulletin(getSchema(request), id, input);
    if (!bulletin) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Bulletin not found' } });
    return reply.send({ data: bulletin });
  });

  app.delete('/bulletins/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await bulletinService.deleteBulletin(getSchema(request), id);
    return reply.status(204).send();
  });
}
