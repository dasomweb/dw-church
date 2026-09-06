import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { getSchema } from '../../utils/get-schema.js';
import { createVerseSchema, updateVerseSchema } from './schema.js';
import * as verseService from './service.js';

export async function verseRoutes(app: FastifyInstance) {
  // Current verse for the storefront verse_of_day block (public).
  app.get('/verses/current', async (request, reply) => {
    const verse = await verseService.getCurrentVerse(getSchema(request));
    return reply.send({ data: verse });
  });

  app.get('/verses', { preHandler: [optionalAuth] }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const { page, perPage } = parsePagination(query);
    // Public callers only see published; authenticated admins see all.
    const status = (query.status as string) || (request.user ? undefined : 'published');
    const search = query.search as string | undefined;

    const { data, total } = await verseService.listVerses(getSchema(request), {
      page, perPage, search, status,
    });
    return reply.send(paginatedResponse(data, total, page, perPage));
  });

  app.get('/verses/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const verse = await verseService.getVerse(getSchema(request), id);
    if (!verse) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Verse not found' } });
    return reply.send({ data: verse });
  });

  app.post('/verses', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createVerseSchema.parse(request.body);
    const verse = await verseService.createVerse(getSchema(request), input);
    return reply.status(201).send({ data: verse });
  });

  app.put('/verses/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateVerseSchema.parse(request.body);
    const verse = await verseService.updateVerse(getSchema(request), id, input);
    if (!verse) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Verse not found' } });
    return reply.send({ data: verse });
  });

  app.delete('/verses/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await verseService.deleteVerse(getSchema(request), id);
    return reply.status(204).send();
  });
}
