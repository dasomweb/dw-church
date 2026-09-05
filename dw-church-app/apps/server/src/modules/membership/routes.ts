import type { FastifyInstance } from 'fastify';
import { requireAuth, requireFeature } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import {
  createMemberSchema, updateMemberSchema, listMembersQuerySchema,
  createHouseholdSchema, updateHouseholdSchema, listHouseholdsQuerySchema,
  createRelationSchema, createCodeSchema, updateCodeSchema,
} from './schema.js';
import * as svc from './service.js';

/**
 * 교적관리 (membership) — 교회 행정 애드온. 전부 내부(관리자) 전용:
 * requireAuth + requireFeature('membership'). 공개 스토어프론트에는 노출 안 함.
 * 교인 명부(members) · 세대(households) · 가족관계(member-relations) · 코드(member-codes).
 */
export async function membershipRoutes(app: FastifyInstance) {
  const gate = { preHandler: [requireAuth, requireFeature('membership')] };
  const NOT_FOUND = (what: string) => ({ error: { code: 'NOT_FOUND', message: `${what}을(를) 찾을 수 없습니다` } });

  // ── members ──────────────────────────────────────────────
  app.get('/members', gate, async (request, reply) => {
    const q = listMembersQuerySchema.parse(request.query ?? {});
    return reply.send({ data: await svc.listMembers(getSchema(request), q) });
  });

  app.get('/members/stats', gate, async (request, reply) => {
    return reply.send({ data: await svc.memberStats(getSchema(request)) });
  });

  app.get('/members/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const member = await svc.getMember(getSchema(request), id);
    if (!member) return reply.status(404).send(NOT_FOUND('교인'));
    return reply.send({ data: member });
  });

  app.post('/members', gate, async (request, reply) => {
    const input = createMemberSchema.parse(request.body);
    return reply.status(201).send({ data: await svc.createMember(getSchema(request), input) });
  });

  app.put('/members/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateMemberSchema.parse(request.body);
    const member = await svc.updateMember(getSchema(request), id, input);
    if (!member) return reply.status(404).send(NOT_FOUND('교인'));
    return reply.send({ data: member });
  });

  app.delete('/members/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await svc.deleteMember(getSchema(request), id);
    if (!ok) return reply.status(404).send(NOT_FOUND('교인'));
    return reply.send({ data: { deleted: true } });
  });

  // ── households ───────────────────────────────────────────
  app.get('/households', gate, async (request, reply) => {
    const q = listHouseholdsQuerySchema.parse(request.query ?? {});
    return reply.send({ data: await svc.listHouseholds(getSchema(request), q) });
  });

  app.get('/households/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const hh = await svc.getHousehold(getSchema(request), id);
    if (!hh) return reply.status(404).send(NOT_FOUND('세대'));
    return reply.send({ data: hh });
  });

  app.post('/households', gate, async (request, reply) => {
    const input = createHouseholdSchema.parse(request.body);
    return reply.status(201).send({ data: await svc.createHousehold(getSchema(request), input) });
  });

  app.put('/households/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateHouseholdSchema.parse(request.body);
    const hh = await svc.updateHousehold(getSchema(request), id, input);
    if (!hh) return reply.status(404).send(NOT_FOUND('세대'));
    return reply.send({ data: hh });
  });

  app.delete('/households/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await svc.deleteHousehold(getSchema(request), id);
    if (!ok) return reply.status(404).send(NOT_FOUND('세대'));
    return reply.send({ data: { deleted: true } });
  });

  // ── 가족관계 (member-relations) ──────────────────────────
  app.post('/member-relations', gate, async (request, reply) => {
    const input = createRelationSchema.parse(request.body);
    return reply.status(201).send({ data: await svc.createRelation(getSchema(request), input) });
  });

  app.delete('/member-relations/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await svc.deleteRelation(getSchema(request), id);
    if (!ok) return reply.status(404).send(NOT_FOUND('가족관계'));
    return reply.send({ data: { deleted: true } });
  });

  // ── 코드 (member-codes) — 직분/신급/등록상태/심방유형/조직유형 ──
  app.get('/member-codes', gate, async (request, reply) => {
    const schema = getSchema(request);
    await svc.seedCodesIfEmpty(schema); // 최초 진입 시 기본 코드 시드
    const { category } = request.query as { category?: string };
    return reply.send({ data: await svc.listCodes(schema, category) });
  });

  app.post('/member-codes', gate, async (request, reply) => {
    const input = createCodeSchema.parse(request.body);
    return reply.status(201).send({ data: await svc.createCode(getSchema(request), input) });
  });

  app.put('/member-codes/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateCodeSchema.parse(request.body);
    const code = await svc.updateCode(getSchema(request), id, input);
    if (!code) return reply.status(404).send(NOT_FOUND('코드'));
    return reply.send({ data: code });
  });

  app.delete('/member-codes/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await svc.deleteCode(getSchema(request), id);
    if (!ok) return reply.status(404).send(NOT_FOUND('코드'));
    return reply.send({ data: { deleted: true } });
  });
}
