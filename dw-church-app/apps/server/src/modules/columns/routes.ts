import type { FastifyInstance } from 'fastify';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../../utils/pagination.js';
import { getSchema } from '../../utils/get-schema.js';
import { createColumnSchema, updateColumnSchema } from './schema.js';
import * as columnService from './service.js';

export async function columnRoutes(app: FastifyInstance) {
  app.get('/columns', { preHandler: [optionalAuth] }, async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const { page, perPage } = parsePagination(query);
    const status = (query.status as string) || (request.user ? undefined : 'published');
    const search = query.search as string | undefined;

    // 비인증(스토어프론트)이면 예약 공개 기간 밖의 칼럼은 숨긴다.
    // 관리자(인증)는 예약·종료된 것까지 다 보여야 관리가 된다.
    const { data, total } = await columnService.listColumns(getSchema(request), {
      page, perPage, search, status, activeOnly: !request.user,
    });
    return reply.send(paginatedResponse(data, total, page, perPage));
  });

  app.get('/columns/:id', { preHandler: [optionalAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    // 예약 공개 전/종료 후인 칼럼은 주소를 알아도 비인증에게는 404.
    const column = await columnService.getColumn(getSchema(request), id, { activeOnly: !request.user });
    if (!column) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Column not found' } });
    return reply.send({ data: column });
  });

  app.post('/columns', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createColumnSchema.parse(request.body);
    const column = await columnService.createColumn(getSchema(request), input);
    return reply.status(201).send({ data: column });
  });

  app.put('/columns/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateColumnSchema.parse(request.body);
    const column = await columnService.updateColumn(getSchema(request), id, input);
    if (!column) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Column not found' } });
    return reply.send({ data: column });
  });

  app.delete('/columns/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await columnService.deleteColumn(getSchema(request), id);
    return reply.status(204).send();
  });
}
