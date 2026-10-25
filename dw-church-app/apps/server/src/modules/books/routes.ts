import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { getSchema } from '../../utils/get-schema.js';
import { createBookSchema, updateBookSchema } from './schema.js';
import * as bookService from './service.js';

/** 책 추천 — 목록/상세는 공개(스토어프론트 블록), 쓰기는 관리자. */
export async function bookRoutes(app: FastifyInstance) {
  app.get('/books', { preHandler: [optionalAuth] }, async (request, reply) => {
    const q = request.query as Record<string, unknown>;
    const { page, perPage } = parsePagination(q);
    // 비로그인(스토어프론트)은 공개된 것만, 관리자는 전부.
    const status = (q.status as string) || (request.user ? undefined : 'published');
    const { data, total } = await bookService.listBooks(getSchema(request), {
      page, perPage,
      search: q.search as string | undefined,
      category: (q.category as string) || undefined,
      status,
    });
    return reply.send(paginatedResponse(data, total, page, perPage));
  });

  app.get('/books/categories', async (request, reply) => {
    const data = await bookService.listBookCategories(getSchema(request));
    return reply.send({ data });
  });

  app.get('/books/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const book = await bookService.getBook(getSchema(request), id);
    if (!book) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '책을 찾을 수 없습니다' } });
    return reply.send({ data: book });
  });

  app.post('/books', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createBookSchema.parse(request.body);
    const book = await bookService.createBook(getSchema(request), input);
    return reply.status(201).send({ data: book });
  });

  app.put('/books/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateBookSchema.parse(request.body);
    const book = await bookService.updateBook(getSchema(request), id, input);
    if (!book) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '책을 찾을 수 없습니다' } });
    return reply.send({ data: book });
  });

  app.delete('/books/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await bookService.deleteBook(getSchema(request), id);
    return reply.status(204).send();
  });
}
