import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { getSchema } from '../../utils/get-schema.js';
import { createBoardSchema, updateBoardSchema, createBoardPostSchema, updateBoardPostSchema } from './schema.js';
import * as boardService from './service.js';

export async function boardRoutes(app: FastifyInstance) {
  // ─── Boards ──────────────────────────────────────────

  // List boards (public)
  app.get('/boards', { preHandler: [optionalAuth] }, async (request, reply) => {
    const schema = getSchema(request);
    const boards = await boardService.listBoards(schema);
    return reply.send({ data: boards });
  });

  // Create board (auth required)
  app.post('/boards', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createBoardSchema.parse(request.body);
    const board = await boardService.createBoard(getSchema(request), input);
    return reply.status(201).send({ data: board });
  });

  // Get single board by id (public)
  app.get('/boards/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = getSchema(request);

    // Try by UUID first, then by slug
    let board;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      board = await boardService.getBoard(schema, id);
    } else {
      board = await boardService.getBoardBySlug(schema, id);
    }

    if (!board) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Board not found' } });
    return reply.send({ data: board });
  });

  // Update board (auth required)
  app.put('/boards/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateBoardSchema.parse(request.body);
    const board = await boardService.updateBoard(getSchema(request), id, input);
    if (!board) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Board not found' } });
    return reply.send({ data: board });
  });

  // Delete board (auth required)
  app.delete('/boards/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await boardService.deleteBoard(getSchema(request), id);
    return reply.status(204).send();
  });

  // ─── Board Posts ─────────────────────────────────────

  // List posts (public with optional auth)
  app.get('/boards/:boardId/posts', { preHandler: [optionalAuth] }, async (request, reply) => {
    const schema = getSchema(request);
    const { boardId } = request.params as { boardId: string };
    const query = request.query as Record<string, unknown>;
    const { page, perPage } = parsePagination(query);
    const status = (query.status as string) || (request.user ? undefined : 'published');
    const search = query.search as string | undefined;

    const { data, total } = await boardService.listPosts(schema, boardId, {
      page, perPage, search, status,
    });

    return reply.send(paginatedResponse(data, total, page, perPage));
  });

  // Create post (auth required)
  app.post('/boards/:boardId/posts', { preHandler: [requireAuth] }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };
    const input = createBoardPostSchema.parse(request.body);
    const post = await boardService.createPost(getSchema(request), boardId, input);
    return reply.status(201).send({ data: post });
  });

  // Get single post (public — increments view count)
  app.get('/boards/:boardId/posts/:postId', async (request, reply) => {
    const { postId } = request.params as { boardId: string; postId: string };
    const schema = getSchema(request);
    const post = await boardService.getPost(schema, postId);
    if (!post) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    // Increment view count in background
    await boardService.incrementViewCount(schema, postId);
    return reply.send({ data: { ...post, view_count: ((post.view_count as number) || 0) + 1 } });
  });

  // Update post (auth required)
  app.put('/boards/:boardId/posts/:postId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { postId } = request.params as { boardId: string; postId: string };
    const input = updateBoardPostSchema.parse(request.body);
    const post = await boardService.updatePost(getSchema(request), postId, input);
    if (!post) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    return reply.send({ data: post });
  });

  // Delete post (auth required)
  app.delete('/boards/:boardId/posts/:postId', { preHandler: [requireAuth] }, async (request, reply) => {
    const { postId } = request.params as { boardId: string; postId: string };
    await boardService.deletePost(getSchema(request), postId);
    return reply.status(204).send();
  });
}
