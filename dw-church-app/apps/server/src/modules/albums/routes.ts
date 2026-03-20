import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { getSchema } from '../../utils/get-schema.js';
import { createAlbumSchema, updateAlbumSchema } from './schema.js';
import * as albumService from './service.js';

export async function albumRoutes(app: FastifyInstance) {
  app.get('/albums', { preHandler: [optionalAuth] }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const { page, perPage } = parsePagination(query);
    const status = (query.status as string) || (request.user ? undefined : 'published');
    const search = query.search as string | undefined;
    const categoryId = query.categoryId as string | undefined;

    const { data, total } = await albumService.listAlbums(getSchema(request), {
      page, perPage, search, status, categoryId,
    });
    return reply.send(paginatedResponse(data, total, page, perPage));
  });

  app.get('/albums/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const album = await albumService.getAlbum(getSchema(request), id);
    if (!album) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Album not found' } });
    return reply.send({ data: album });
  });

  app.post('/albums', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createAlbumSchema.parse(request.body);
    const album = await albumService.createAlbum(getSchema(request), input);
    return reply.status(201).send({ data: album });
  });

  app.put('/albums/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateAlbumSchema.parse(request.body);
    const album = await albumService.updateAlbum(getSchema(request), id, input);
    if (!album) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Album not found' } });
    return reply.send({ data: album });
  });

  app.delete('/albums/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await albumService.deleteAlbum(getSchema(request), id);
    return reply.status(204).send();
  });
}
