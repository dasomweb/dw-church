import type { FastifyInstance } from 'fastify';
import { requireAuth, requireFeature } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import { createNewcomerSchema, updateNewcomerSchema, createNewcomerHistorySchema } from './schema.js';
import * as newcomerService from './service.js';
import * as historyService from './history-service.js';

/**
 * 새가족 등록·관리 routes (Pro tier — feature 'newcomer_registration').
 *
 * POST /newcomers is PUBLIC (the storefront intake form) but still feature-
 * gated by plan, so a non-Pro tenant can't accumulate submissions. The list /
 * detail / update / delete management endpoints require an authenticated admin.
 */
export async function newcomerRoutes(app: FastifyInstance) {
  // Public intake form submission — no auth, gated by the tenant's plan.
  app.post('/newcomers', { preHandler: [requireFeature('newcomer_registration')] }, async (request, reply) => {
    const input = createNewcomerSchema.parse(request.body);
    const created = await newcomerService.createNewcomer(getSchema(request), input);
    return reply.status(201).send({ data: created });
  });

  app.get('/newcomers', { preHandler: [requireAuth, requireFeature('newcomer_registration')] }, async (request, reply) => {
    const { status } = request.query as { status?: string };
    const data = await newcomerService.listNewcomers(getSchema(request), status);
    return reply.send({ data });
  });

  app.get('/newcomers/:id', { preHandler: [requireAuth, requireFeature('newcomer_registration')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await newcomerService.getNewcomer(getSchema(request), id);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '새가족 등록을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  app.put('/newcomers/:id', { preHandler: [requireAuth, requireFeature('newcomer_registration')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateNewcomerSchema.parse(request.body);
    const row = await newcomerService.updateNewcomer(getSchema(request), id, input);
    if (!row) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: '새가족 등록을 찾을 수 없습니다' } });
    return reply.send({ data: row });
  });

  app.delete('/newcomers/:id', { preHandler: [requireAuth, requireFeature('newcomer_registration')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await newcomerService.deleteNewcomer(getSchema(request), id);
    return reply.status(204).send();
  });

  // ─── 정착 히스토리 (연락/심방/상담/모임/정착 등 날짜별 기록) — 관리자 전용 ───
  app.get('/newcomers/:id/history', { preHandler: [requireAuth, requireFeature('newcomer_registration')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await historyService.listNewcomerHistory(getSchema(request), id);
    return reply.send({ data });
  });

  app.post('/newcomers/:id/history', { preHandler: [requireAuth, requireFeature('newcomer_registration')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createNewcomerHistorySchema.parse(request.body);
    const created = await historyService.addNewcomerHistory(getSchema(request), id, input);
    return reply.status(201).send({ data: created });
  });

  app.delete('/newcomers/:id/history/:historyId', { preHandler: [requireAuth, requireFeature('newcomer_registration')] }, async (request, reply) => {
    const { historyId } = request.params as { historyId: string };
    await historyService.deleteNewcomerHistory(getSchema(request), historyId);
    return reply.status(204).send();
  });
}
