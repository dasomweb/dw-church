import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { getSchema } from '../../utils/get-schema.js';
import {
  createVideoSchema, updateVideoSchema,
  createVideoCategorySchema,
} from './schema.js';
import * as videoService from './service.js';

export async function videoRoutes(app: FastifyInstance) {
  // ─── Video Categories ───────────────────────────────────────────
  // Registered BEFORE /videos/:id so "categories" isn't captured as an :id.
  app.get('/videos/categories', async (request, reply) => {
    const data = await videoService.listVideoCategories(getSchema(request));
    return reply.send({ data });
  });

  app.post('/videos/categories', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createVideoCategorySchema.parse(request.body);
    const category = await videoService.createVideoCategory(getSchema(request), input);
    return reply.status(201).send({ data: category });
  });

  // ─── Videos ─────────────────────────────────────────────────────
  app.get('/videos', { preHandler: [optionalAuth] }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const { page, perPage } = parsePagination(query);
    const status = (query.status as string) || (request.user ? undefined : 'published');
    const search = query.search as string | undefined;
    const categoryId = query.categoryId as string | undefined;
    const category = query.category as string | undefined;

    const { data, total } = await videoService.listVideos(getSchema(request), {
      page, perPage, search, status, categoryId, category,
    });
    return reply.send(paginatedResponse(data, total, page, perPage));
  });

  app.get('/videos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const video = await videoService.getVideo(getSchema(request), id);
    if (!video) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Video not found' } });
    return reply.send({ data: video });
  });

  app.post('/videos', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createVideoSchema.parse(request.body);
    const video = await videoService.createVideo(getSchema(request), input);
    return reply.status(201).send({ data: video });
  });

  app.put('/videos/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateVideoSchema.parse(request.body);
    const video = await videoService.updateVideo(getSchema(request), id, input);
    if (!video) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Video not found' } });
    return reply.send({ data: video });
  });

  app.delete('/videos/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await videoService.deleteVideo(getSchema(request), id);
    return reply.status(204).send();
  });
}
