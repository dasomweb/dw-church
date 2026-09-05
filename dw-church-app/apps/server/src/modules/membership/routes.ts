import type { FastifyInstance } from 'fastify';
import { requireAuth, requireFeature } from '../../middleware/auth.js';
import { getSchema } from '../../utils/get-schema.js';
import {
  createMemberSchema, updateMemberSchema, listMembersQuerySchema,
  createHouseholdSchema, updateHouseholdSchema, listHouseholdsQuerySchema,
  createRelationSchema, createCodeSchema, updateCodeSchema, updateMemberSettingsSchema,
  importMembersSchema, createServiceSchema, updateServiceSchema, recordAttendanceSchema,
  createVisitSchema, updateVisitSchema, createSacramentSchema, createTransferSchema, appointMembersSchema,
} from './schema.js';
import * as svc from './service.js';
import { importMembers } from './import-service.js';
import * as rec from './records-service.js';

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

  // ── 교적 설정(member_settings) ───────────────────────────
  app.get('/member-settings', gate, async (request, reply) => reply.send({ data: await svc.getMemberSettings(getSchema(request)) }));
  app.put('/member-settings', gate, async (request, reply) => {
    const input = updateMemberSettingsSchema.parse(request.body);
    return reply.send({ data: await svc.updateMemberSettings(getSchema(request), input) });
  });

  // ── 엑셀(CSV) 가져오기 (MB-05) ────────────────────────────
  app.post('/members/import', gate, async (request, reply) => {
    const input = importMembersSchema.parse(request.body);
    if (!input.csv && !(input.rows && input.rows.length)) {
      return reply.status(400).send({ error: { code: 'NO_DATA', message: 'CSV 내용 또는 rows 가 필요합니다.' } });
    }
    return reply.send({ data: await importMembers(getSchema(request), input as any) });
  });

  // ── 예배 정의(services) ──────────────────────────────────
  app.get('/member-services', gate, async (request, reply) => reply.send({ data: await rec.listServices(getSchema(request)) }));
  app.post('/member-services', gate, async (request, reply) => {
    const input = createServiceSchema.parse(request.body);
    return reply.status(201).send({ data: await rec.createService(getSchema(request), input) });
  });
  app.put('/member-services/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await rec.updateService(getSchema(request), id, updateServiceSchema.parse(request.body));
    if (!row) return reply.status(404).send(NOT_FOUND('예배'));
    return reply.send({ data: row });
  });
  app.delete('/member-services/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await rec.deleteService(getSchema(request), id);
    if (!ok) return reply.status(404).send(NOT_FOUND('예배'));
    return reply.send({ data: { deleted: true } });
  });

  // ── 출석(attendance) ─────────────────────────────────────
  app.get('/attendance/sheet', gate, async (request, reply) => {
    const { serviceId, date } = request.query as { serviceId?: string; date?: string };
    if (!serviceId || !date) return reply.status(400).send({ error: { code: 'BAD_QUERY', message: 'serviceId 와 date 가 필요합니다.' } });
    return reply.send({ data: await rec.attendanceSheet(getSchema(request), serviceId, date) });
  });
  app.post('/attendance', gate, async (request, reply) => {
    const input = recordAttendanceSchema.parse(request.body);
    return reply.send({ data: await rec.recordAttendance(getSchema(request), input) });
  });
  app.get('/attendance/long-absent', gate, async (request, reply) => {
    const weeks = Math.max(1, Math.min(52, Number((request.query as any).weeks) || 4));
    return reply.send({ data: await rec.longAbsentees(getSchema(request), weeks) });
  });

  // ── 심방(visits) ─────────────────────────────────────────
  app.get('/member-visits', gate, async (request, reply) => {
    const q = request.query as any;
    return reply.send({ data: await rec.listVisits(getSchema(request), { memberId: q.memberId, status: q.status, from: q.from, to: q.to }) });
  });
  app.post('/member-visits', gate, async (request, reply) => {
    const input = createVisitSchema.parse(request.body);
    return reply.status(201).send({ data: await rec.createVisit(getSchema(request), input) });
  });
  app.put('/member-visits/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await rec.updateVisit(getSchema(request), id, updateVisitSchema.parse(request.body));
    if (!row) return reply.status(404).send(NOT_FOUND('심방 기록'));
    return reply.send({ data: row });
  });
  app.delete('/member-visits/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await rec.deleteVisit(getSchema(request), id);
    if (!ok) return reply.status(404).send(NOT_FOUND('심방 기록'));
    return reply.send({ data: { deleted: true } });
  });

  // ── 성례(sacraments) ─────────────────────────────────────
  app.get('/member-sacraments', gate, async (request, reply) => {
    const q = request.query as any;
    return reply.send({ data: await rec.listSacraments(getSchema(request), { memberId: q.memberId, type: q.type }) });
  });
  app.post('/member-sacraments', gate, async (request, reply) => {
    const input = createSacramentSchema.parse(request.body);
    return reply.status(201).send({ data: await rec.createSacrament(getSchema(request), input) });
  });
  app.delete('/member-sacraments/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await rec.deleteSacrament(getSchema(request), id);
    if (!ok) return reply.status(404).send(NOT_FOUND('성례 기록'));
    return reply.send({ data: { deleted: true } });
  });

  // ── 이동(transfers) ──────────────────────────────────────
  app.get('/member-transfers', gate, async (request, reply) => {
    const q = request.query as any;
    return reply.send({ data: await rec.listTransfers(getSchema(request), { type: q.type }) });
  });
  app.post('/member-transfers', gate, async (request, reply) => {
    const input = createTransferSchema.parse(request.body);
    return reply.status(201).send({ data: await rec.createTransfer(getSchema(request), input) });
  });
  app.delete('/member-transfers/:id', gate, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await rec.deleteTransfer(getSchema(request), id);
    if (!ok) return reply.status(404).send(NOT_FOUND('이동 기록'));
    return reply.send({ data: { deleted: true } });
  });

  // ── 직분 임명(appointments) ──────────────────────────────
  app.post('/members/appoint', gate, async (request, reply) => {
    const input = appointMembersSchema.parse(request.body);
    return reply.send({ data: await rec.appointMembers(getSchema(request), input) });
  });
  app.get('/member-appointments', gate, async (request, reply) => {
    const q = request.query as { memberId?: string };
    return reply.send({ data: await rec.listAppointments(getSchema(request), { memberId: q.memberId }) });
  });

  // ── 통계(Phase 4) ────────────────────────────────────────
  app.get('/member-stats/report', gate, async (request, reply) => reply.send({ data: await rec.statsReport(getSchema(request)) }));
}
