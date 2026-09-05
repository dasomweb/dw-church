import type { FastifyInstance } from 'fastify';
import { requireAuth, requireFeature } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import {
  updatePresetSchema, applyPresetSchema,
  createGroupSchema, updateGroupSchema, listGroupsQuerySchema,
  addGroupMemberSchema, assignMembersSchema, updateGroupMemberSchema,
  createQueueSchema, placeFromQueueSchema,
} from './schema.js';
import * as svc from './service.js';

/**
 * 스몰그룹 (smallgroup) — 교회 행정 애드온. 전부 관리자 전용:
 * requireAuth + requireFeature('smallgroup').
 * STEP 1 (골격): 운영모델 프리셋(group-preset) · 조직(groups, 트리) ·
 * 명단 배정(group-members) · 배치 대기 큐(group-queue).
 */
export async function smallgroupRoutes(app: FastifyInstance) {
  const gate = { preHandler: [requireAuth, requireFeature('smallgroup')] };
  const NOT_FOUND = (what: string) => ({ error: { code: 'NOT_FOUND', message: `${what}을(를) 찾을 수 없습니다` } });

  // ── 프리셋 / 운영 모델 설정 (SG-01) ──────────────────────
  app.get('/group-preset', gate, async (request, reply) =>
    reply.send({ data: await svc.getPreset(getSchema(request)) }));

  app.put('/group-preset', gate, async (request, reply) => {
    const input = updatePresetSchema.parse(request.body);
    return reply.send({ data: await svc.updatePreset(getSchema(request), input) });
  });

  // 특정 모델 기본값으로 초기화 (용어·계층·리포트·과정 리셋).
  app.post('/group-preset/apply', gate, async (request, reply) => {
    const { model } = applyPresetSchema.parse(request.body);
    return reply.send({ data: await svc.applyPreset(getSchema(request), model) });
  });

  // ── 조직 (groups) ────────────────────────────────────────
  app.get('/groups', gate, async (request, reply) => {
    const q = listGroupsQuerySchema.parse(request.query ?? {});
    return reply.send({ data: await svc.listGroups(getSchema(request), q) });
  });

  app.get('/groups/tree', gate, async (request, reply) => {
    const status = (request.query as { status?: string }).status ?? 'active';
    return reply.send({ data: await svc.getGroupTree(getSchema(request), status) });
  });

  // 미배정/소속 현황용 member→group 맵 (GR-02 명단 배정 화면).
  app.get('/groups/member-map', gate, async (request, reply) =>
    reply.send({ data: await svc.memberGroupMap(getSchema(request)) }));

  app.get('/groups/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const g = await svc.getGroup(getSchema(request), id);
    if (!g) return reply.status(404).send(NOT_FOUND('조직'));
    return reply.send({ data: g });
  });

  app.post('/groups', gate, async (request, reply) => {
    const input = createGroupSchema.parse(request.body);
    return reply.status(201).send({ data: await svc.createGroup(getSchema(request), input) });
  });

  app.put('/groups/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const g = await svc.updateGroup(getSchema(request), id, updateGroupSchema.parse(request.body));
    if (!g) return reply.status(404).send(NOT_FOUND('조직'));
    return reply.send({ data: g });
  });

  app.delete('/groups/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await svc.deleteGroup(getSchema(request), id);
    if (!ok) return reply.status(404).send(NOT_FOUND('조직'));
    return reply.send({ data: { deleted: true } });
  });

  // ── 명단 배정 (group-members) ────────────────────────────
  app.get('/groups/:id/members', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send({ data: await svc.listGroupMembers(getSchema(request), id) });
  });

  app.post('/groups/:id/members', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = addGroupMemberSchema.parse(request.body);
    return reply.status(201).send({ data: await svc.addGroupMember(getSchema(request), id, input) });
  });

  // 일괄 배정 (GR-02) — 여러 교인을 한 조직으로.
  app.post('/group-members/assign', gate, async (request, reply) => {
    const input = assignMembersSchema.parse(request.body);
    return reply.send({ data: await svc.assignMembers(getSchema(request), input) });
  });

  app.put('/group-members/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await svc.updateGroupMember(getSchema(request), id, updateGroupMemberSchema.parse(request.body));
    if (!row) return reply.status(404).send(NOT_FOUND('소속'));
    return reply.send({ data: row });
  });

  app.delete('/group-members/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await svc.removeGroupMember(getSchema(request), id);
    if (!ok) return reply.status(404).send(NOT_FOUND('소속'));
    return reply.send({ data: { removed: true } });
  });

  // ── 배치 대기 큐 (group-queue) — GR-09 ───────────────────
  app.get('/group-queue', gate, async (request, reply) => {
    const status = (request.query as { status?: string }).status ?? 'waiting';
    return reply.send({ data: await svc.listQueue(getSchema(request), status) });
  });

  app.post('/group-queue', gate, async (request, reply) => {
    const input = createQueueSchema.parse(request.body);
    return reply.status(201).send({ data: await svc.createQueueItem(getSchema(request), input) });
  });

  app.post('/group-queue/:id/place', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await svc.placeFromQueue(getSchema(request), id, placeFromQueueSchema.parse(request.body));
    if (!row) return reply.status(404).send(NOT_FOUND('대기 항목'));
    return reply.send({ data: row });
  });

  app.delete('/group-queue/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await svc.deleteQueueItem(getSchema(request), id);
    if (!ok) return reply.status(404).send(NOT_FOUND('대기 항목'));
    return reply.send({ data: { deleted: true } });
  });
}
