import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { getSchema } from '../../utils/get-schema.js';
import { createSermonSchema, updateSermonSchema } from './schema.js';
import * as sermonService from './service.js';

export async function sermonRoutes(app: FastifyInstance) {
  // List sermons (public with optional auth)
  app.get('/sermons', { preHandler: [optionalAuth] }, async (request, reply) => {
    const schema = getSchema(request);
    const query = request.query as Record<string, unknown>;
    const { page, perPage } = parsePagination(query);
    const status = (query.status as string) || (request.user ? undefined : 'published');
    const search = query.search as string | undefined;
    const categoryId = query.categoryId as string | undefined;
    const orderBy = query.orderBy as string | undefined;
    const order = query.order as string | undefined;

    const { data, total } = await sermonService.listSermons(schema, {
      page, perPage, search, status, categoryId, orderBy, order,
    });

    return reply.send(paginatedResponse(data, total, page, perPage));
  });

  // Get single sermon (public)
  app.get('/sermons/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const sermon = await sermonService.getSermon(getSchema(request), id);
    if (!sermon) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Sermon not found' } });
    return reply.send({ data: sermon });
  });

  // Related sermons (public)
  app.get('/sermons/:id/related', async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as Record<string, unknown>;
    const limit = Math.min(Number(query.limit) || 6, 20);
    const related = await sermonService.getRelatedSermons(getSchema(request), id, limit);
    return reply.send({ data: related });
  });

  // Create sermon (authenticated)
  app.post('/sermons', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createSermonSchema.parse(request.body);
    const sermon = await sermonService.createSermon(getSchema(request), input);
    return reply.status(201).send({ data: sermon });
  });

  // Update sermon (authenticated)
  app.put('/sermons/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateSermonSchema.parse(request.body);
    const sermon = await sermonService.updateSermon(getSchema(request), id, input);
    if (!sermon) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Sermon not found' } });
    return reply.send({ data: sermon });
  });

  // Delete sermon (authenticated)
  app.delete('/sermons/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await sermonService.deleteSermon(getSchema(request), id);
    return reply.status(204).send();
  });
}
