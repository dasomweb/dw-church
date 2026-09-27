import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { getSchema } from '../../utils/get-schema.js';
import { createSermonNoteSchema, updateSermonNoteSchema } from './schema.js';
import * as service from './service.js';

export async function sermonNoteRoutes(app: FastifyInstance) {
  app.get('/sermon-notes', { preHandler: [optionalAuth] }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const { page, perPage } = parsePagination(query);
    const status = (query.status as string) || (request.user ? undefined : 'published');
    const search = query.search as string | undefined;
    const { data, total } = await service.listSermonNotes(getSchema(request), { page, perPage, search, status });
    return reply.send(paginatedResponse(data, total, page, perPage));
  });

  // 최신 설교노트 — 홈 '최근 설교노트' 블록. '/:id' 보다 먼저. 익명 → 게시본만.
  app.get('/sermon-notes/latest', { preHandler: [optionalAuth] }, async (request, reply) => {
    const note = await service.getLatestSermonNote(getSchema(request), !request.user);
    if (!note) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No sermon note' } });
    return reply.send({ data: note });
  });

  // 특정 주일 날짜의 설교노트 — 온라인 주보(스토어프론트) + 온라인 주보 편집기가 사용.
  // '/:id' 보다 먼저 등록해 'by-date' 가 id 로 잡히지 않게. 익명 → 게시본만.
  app.get('/sermon-notes/by-date/:date', { preHandler: [optionalAuth] }, async (request, reply) => {
    const { date } = request.params as { date: string };
    const note = await service.getSermonNoteByDate(getSchema(request), date, !request.user);
    if (!note) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No sermon note for date' } });
    return reply.send({ data: note });
  });

  // 날짜 기준 업서트(온라인 주보 편집기에서 해당 주일 설교노트 저장).
  app.put('/sermon-notes/by-date/:date', { preHandler: [requireAuth] }, async (request, reply) => {
    const { date } = request.params as { date: string };
    const input = updateSermonNoteSchema.parse(request.body);
    const note = await service.upsertSermonNoteByDate(getSchema(request), date, input);
    return reply.send({ data: note });
  });

  app.get('/sermon-notes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const note = await service.getSermonNote(getSchema(request), id);
    if (!note) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Sermon note not found' } });
    return reply.send({ data: note });
  });

  app.post('/sermon-notes', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createSermonNoteSchema.parse(request.body);
    const note = await service.createSermonNote(getSchema(request), input);
    return reply.status(201).send({ data: note });
  });

  app.put('/sermon-notes/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateSermonNoteSchema.parse(request.body);
    const note = await service.updateSermonNote(getSchema(request), id, input);
    if (!note) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Sermon note not found' } });
    return reply.send({ data: note });
  });

  app.delete('/sermon-notes/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteSermonNote(getSchema(request), id);
    return reply.status(204).send();
  });
}
