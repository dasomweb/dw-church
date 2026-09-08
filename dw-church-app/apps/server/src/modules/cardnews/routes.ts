import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { createCardnewsSchema, updateCardnewsSchema } from './schema.js';
import * as svc from './service.js';

/**
 * 카드뉴스 (cardnews) — 기본 콘텐츠 모듈(게이팅 없음). GET 은 공개(스토어프론트
 * cardnews 데이터 블록이 게시된 카드 fetch), 생성/수정/삭제는 관리자 인증 필요.
 */
export async function cardnewsRoutes(app: FastifyInstance) {
  const NOT_FOUND = { error: { code: 'NOT_FOUND', message: '카드뉴스를 찾을 수 없습니다' } };

  app.get('/cardnews', async (request, reply) => {
    const status = request.headers.authorization ? undefined : 'published';
    return reply.send({ data: await svc.listCardnews(getSchema(request), { status }) });
  });

  app.get('/cardnews/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await svc.getCardnews(getSchema(request), id);
    if (!row) return reply.status(404).send(NOT_FOUND);
    return reply.send({ data: row });
  });

  app.post('/cardnews', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createCardnewsSchema.parse(request.body);
    return reply.status(201).send({ data: await svc.createCardnews(getSchema(request), input) });
  });

  app.put('/cardnews/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateCardnewsSchema.parse(request.body);
    const row = await svc.updateCardnews(getSchema(request), id, input);
    if (!row) return reply.status(404).send(NOT_FOUND);
    return reply.send({ data: row });
  });

  app.delete('/cardnews/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await svc.deleteCardnews(getSchema(request), id);
    return reply.status(204).send();
  });
}
