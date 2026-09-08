import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { createDevotionSchema, updateDevotionSchema } from './schema.js';
import * as svc from './service.js';

/**
 * 말씀 묵상 (devotions) — 기본 콘텐츠 모듈(게이팅 없음). GET 은 공개(스토어프론트),
 * 생성/수정/삭제는 관리자 인증 필요. ⚠️ 성경 본문 전문은 저장하지 않음(저작권) —
 * 참조 + 창작 묵상 콘텐츠만.
 */
export async function devotionRoutes(app: FastifyInstance) {
  const NOT_FOUND = { error: { code: 'NOT_FOUND', message: '말씀 묵상을 찾을 수 없습니다' } };

  app.get('/devotions', async (request, reply) => {
    // 공개(비인증)면 게시된 것만, 관리자면 전체.
    const status = request.headers.authorization ? undefined : 'published';
    return reply.send({ data: await svc.listDevotions(getSchema(request), { status }) });
  });

  app.get('/devotions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await svc.getDevotion(getSchema(request), id);
    if (!row) return reply.status(404).send(NOT_FOUND);
    return reply.send({ data: row });
  });

  app.post('/devotions', { preHandler: [requireAuth] }, async (request, reply) => {
    const input = createDevotionSchema.parse(request.body);
    return reply.status(201).send({ data: await svc.createDevotion(getSchema(request), input) });
  });

  app.put('/devotions/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateDevotionSchema.parse(request.body);
    const row = await svc.updateDevotion(getSchema(request), id, input);
    if (!row) return reply.status(404).send(NOT_FOUND);
    return reply.send({ data: row });
  });

  app.delete('/devotions/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await svc.deleteDevotion(getSchema(request), id);
    return reply.status(204).send();
  });
}
