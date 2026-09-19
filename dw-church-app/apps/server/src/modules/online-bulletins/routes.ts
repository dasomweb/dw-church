import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { getSchema } from '../../utils/get-schema.js';
import { createOnlineBulletinSchema, updateOnlineBulletinSchema } from './schema.js';
import * as service from './service.js';

export async function onlineBulletinRoutes(app: FastifyInstance) {
  app.get('/online-bulletins', { preHandler: [optionalAuth] }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const { page, perPage } = parsePagination(query);
    const status = (query.status as string) || (request.user ? undefined : 'published');
    const search = query.search as string | undefined;
    const { data, total } = await service.listOnlineBulletins(getSchema(request), { page, perPage, search, status });
    return reply.send(paginatedResponse(data, total, page, perPage));
  });

  // Latest bulletin — the storefront data block hits this. Registered before
  // '/:id' so 'latest' isn't captured as an id. Anonymous → published only;
  // a logged-in admin may preview the latest draft.
  app.get('/online-bulletins/latest', { preHandler: [optionalAuth] }, async (request, reply) => {
    const bulletin = await service.getLatestOnlineBulletin(getSchema(request), !request.user);
    if (!bulletin) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No online bulletin' } });
    return reply.send({ data: bulletin });
  });

  app.get('/online-bulletins/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const bulletin = await service.getOnlineBulletin(getSchema(request), id);
    if (!bulletin) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Online bulletin not found' } });
    return reply.send({ data: bulletin });
  });

  app.post('/online-bulletins', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createOnlineBulletinSchema.parse(request.body);
    const bulletin = await service.createOnlineBulletin(getSchema(request), input);
    return reply.status(201).send({ data: bulletin });
  });

  app.put('/online-bulletins/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateOnlineBulletinSchema.parse(request.body);
    const bulletin = await service.updateOnlineBulletin(getSchema(request), id, input);
    if (!bulletin) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Online bulletin not found' } });
    return reply.send({ data: bulletin });
  });

  app.delete('/online-bulletins/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteOnlineBulletin(getSchema(request), id);
    return reply.status(204).send();
  });
}
