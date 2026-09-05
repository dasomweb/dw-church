/**
 * 교적관리(membership) route tests — add-on gate + validation + CRUD wiring.
 * All routes require auth + the 'membership' add-on (feature_overrides); the
 * service is mocked so this exercises the gate + schema + routing only.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

vi.mock('../../config/database.js', () => ({
  prisma: { tenant: { findFirst: vi.fn() }, $queryRawUnsafe: vi.fn(), $executeRawUnsafe: vi.fn() },
}));
vi.mock('../../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-characters-long', SUPER_ADMIN_EMAILS: [] },
}));

const svc = {
  listMembers: vi.fn(), memberStats: vi.fn(), getMember: vi.fn(), createMember: vi.fn(),
  updateMember: vi.fn(), deleteMember: vi.fn(),
  listHouseholds: vi.fn(), getHousehold: vi.fn(), createHousehold: vi.fn(),
  updateHousehold: vi.fn(), deleteHousehold: vi.fn(),
  createRelation: vi.fn(), deleteRelation: vi.fn(),
  listCodes: vi.fn(), createCode: vi.fn(), updateCode: vi.fn(), deleteCode: vi.fn(), seedCodesIfEmpty: vi.fn(),
};
vi.mock('../../modules/membership/service.js', () => svc);

const imp = { importMembers: vi.fn() };
vi.mock('../../modules/membership/import-service.js', () => imp);
const rec = {
  listServices: vi.fn(), createService: vi.fn(), updateService: vi.fn(), deleteService: vi.fn(),
  attendanceSheet: vi.fn(), recordAttendance: vi.fn(), longAbsentees: vi.fn(),
  listVisits: vi.fn(), createVisit: vi.fn(), updateVisit: vi.fn(), deleteVisit: vi.fn(),
  listSacraments: vi.fn(), createSacrament: vi.fn(), deleteSacrament: vi.fn(),
  listTransfers: vi.fn(), createTransfer: vi.fn(), deleteTransfer: vi.fn(), statsReport: vi.fn(),
};
vi.mock('../../modules/membership/records-service.js', () => rec);

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
function token(role = 'admin') {
  return jwt.sign({ userId: 'u1', email: 't@t.com', tenantId: 't1', tenantSlug: 'base', role }, JWT_SECRET, { expiresIn: '1h' });
}

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  const { errorHandler } = await import('../../middleware/error-handler.js');
  app.setErrorHandler(errorHandler);
  const { tenantMiddleware } = await import('../../middleware/tenant.js');
  app.addHook('preHandler', tenantMiddleware);
  const { membershipRoutes } = await import('../../modules/membership/routes.js');
  await app.register(membershipRoutes, { prefix: '/api/v1' });

  const { prisma } = await import('../../config/database.js');
  vi.mocked(prisma.tenant.findFirst).mockResolvedValue(
    { id: 't1', slug: 'base', name: 'Base Church', plan: 'base', isActive: true } as Awaited<ReturnType<typeof prisma.tenant.findFirst>>,
  );
  // Default: no add-on → requireFeature reads empty overrides.
  vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([{ feature_overrides: null }] as never);

  svc.listMembers.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 50 });
  svc.memberStats.mockResolvedValue({ total: 0, active: 0, newcomer: 0, households: 0, birthdaysThisMonth: 0, byStatus: {} });
  svc.createMember.mockResolvedValue({ id: 'm1', name: '김성도' });
  svc.listHouseholds.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 50 });
  svc.createHousehold.mockResolvedValue({ id: 'h1', name: '김성도 세대' });
  svc.createRelation.mockResolvedValue({ id: 'r1' });
  svc.seedCodesIfEmpty.mockResolvedValue(0);
  svc.listCodes.mockResolvedValue([]);

  imp.importMembers.mockResolvedValue({ received: 2, imported: 2, invalid: 0, invalidSamples: [], householdsCreated: 1 });
  rec.listServices.mockResolvedValue([]);
  rec.createService.mockResolvedValue({ id: 'sv1', name: '주일 1부' });
  rec.recordAttendance.mockResolvedValue({ saved: 3 });
  rec.attendanceSheet.mockResolvedValue([]);
  rec.longAbsentees.mockResolvedValue([]);
  rec.listVisits.mockResolvedValue([]);
  rec.createVisit.mockResolvedValue({ id: 'v1' });
  rec.listSacraments.mockResolvedValue([]);
  rec.createSacrament.mockResolvedValue({ id: 'sac1' });
  rec.listTransfers.mockResolvedValue([]);
  rec.createTransfer.mockResolvedValue({ id: 'tr1' });
  rec.statsReport.mockResolvedValue({ gender: [], age: [], position: [], region: [], attendanceRecent: [] });
});
afterAll(async () => { await app.close(); });

async function withAddon(): Promise<void> {
  const { prisma } = await import('../../config/database.js');
  vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([{ feature_overrides: { membership: true } }] as never);
}
const auth = () => ({ authorization: `Bearer ${token()}` });

describe('membership — add-on gate', () => {
  it('GET /members without token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/members', headers: { 'x-tenant-slug': 'base' } });
    expect(res.statusCode).toBe(401);
  });

  it('GET /members WITHOUT the 교적 add-on → 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/members', headers: { 'x-tenant-slug': 'base', ...auth() } });
    expect(res.statusCode).toBe(403);
    expect(res.json().error?.code).toBe('PLAN_UPGRADE_REQUIRED');
  });

  it('GET /members WITH the add-on → 200', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: '/api/v1/members', headers: { 'x-tenant-slug': 'base', ...auth() } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveProperty('items');
  });
});

describe('members CRUD', () => {
  it('POST /members without name → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/members', headers: { 'x-tenant-slug': 'base', ...auth() }, payload: { phone: '(201) 555-0000' } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /members valid → 201', async () => {
    await withAddon();
    const res = await app.inject({
      method: 'POST', url: '/api/v1/members', headers: { 'x-tenant-slug': 'base', ...auth() },
      payload: { name: '김성도', gender: 'M', regStatus: 'newcomer', birthDate: '1980-03-02' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe('m1');
  });

  it('POST /members rejects a bad birthDate format → 400', async () => {
    await withAddon();
    const res = await app.inject({
      method: 'POST', url: '/api/v1/members', headers: { 'x-tenant-slug': 'base', ...auth() },
      payload: { name: '김성도', birthDate: '3/2/1980' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /members/stats → 200', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: '/api/v1/members/stats', headers: { 'x-tenant-slug': 'base', ...auth() } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveProperty('households');
  });
});

describe('households + relations + codes', () => {
  it('POST /households valid → 201', async () => {
    await withAddon();
    const res = await app.inject({
      method: 'POST', url: '/api/v1/households', headers: { 'x-tenant-slug': 'base', ...auth() },
      payload: { name: '김성도 세대', region: '1구역' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe('h1');
  });

  it('POST /member-relations with bad uuid → 400', async () => {
    await withAddon();
    const res = await app.inject({
      method: 'POST', url: '/api/v1/member-relations', headers: { 'x-tenant-slug': 'base', ...auth() },
      payload: { fromMemberId: 'not-a-uuid', toMemberId: 'x', relationType: 'spouse' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /member-codes → 200 (auto-seeds)', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: '/api/v1/member-codes', headers: { 'x-tenant-slug': 'base', ...auth() } });
    expect(res.statusCode).toBe(200);
    expect(svc.seedCodesIfEmpty).toHaveBeenCalled();
  });

  it('DELETE /member-codes/:id in use → 409 (protection propagates)', async () => {
    const { AppError } = await import('../../middleware/error-handler.js');
    svc.deleteCode.mockRejectedValueOnce(new AppError('CODE_IN_USE', 409, "'집사' 코드는 3명(건)이 사용 중이라 삭제할 수 없습니다."));
    await withAddon();
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/member-codes/22222222-2222-2222-2222-222222222222', headers: { 'x-tenant-slug': 'base', ...auth() } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error?.message).toContain('사용 중');
  });
});

describe('Phase 2-4 — import / attendance / visits / sacraments / transfers / stats', () => {
  it('POST /members/import no data → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/members/import', headers: { 'x-tenant-slug': 'base', ...auth() }, payload: {} });
    expect(res.statusCode).toBe(400);
  });
  it('POST /members/import with rows → 200 counts', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/members/import', headers: { 'x-tenant-slug': 'base', ...auth() }, payload: { rows: [{ name: '김철수' }, { name: '박영희' }], createHouseholds: true } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.imported).toBe(2);
  });
  it('gate: POST /members/import without add-on → 403', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/members/import', headers: { 'x-tenant-slug': 'base', ...auth() }, payload: { rows: [{ name: 'x' }] } });
    expect(res.statusCode).toBe(403);
  });

  it('POST /member-services valid → 201', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/member-services', headers: { 'x-tenant-slug': 'base', ...auth() }, payload: { name: '주일 1부', weekday: '주일', time: '09:00' } });
    expect(res.statusCode).toBe(201);
  });

  it('POST /attendance valid → 200 saved', async () => {
    await withAddon();
    const res = await app.inject({
      method: 'POST', url: '/api/v1/attendance', headers: { 'x-tenant-slug': 'base', ...auth() },
      payload: { serviceId: '11111111-1111-1111-1111-111111111111', date: '2026-09-06', entries: [{ memberId: '22222222-2222-2222-2222-222222222222', status: 'present' }] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.saved).toBe(3);
  });
  it('POST /attendance bad status → 400', async () => {
    await withAddon();
    const res = await app.inject({
      method: 'POST', url: '/api/v1/attendance', headers: { 'x-tenant-slug': 'base', ...auth() },
      payload: { serviceId: '11111111-1111-1111-1111-111111111111', date: '2026-09-06', entries: [{ memberId: '22222222-2222-2222-2222-222222222222', status: 'maybe' }] },
    });
    expect(res.statusCode).toBe(400);
  });
  it('GET /attendance/sheet without query → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: '/api/v1/attendance/sheet', headers: { 'x-tenant-slug': 'base', ...auth() } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /member-visits valid → 201', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/member-visits', headers: { 'x-tenant-slug': 'base', ...auth() }, payload: { memberId: '22222222-2222-2222-2222-222222222222', visitType: '심방', content: '가정 방문', visibility: 'pastors' } });
    expect(res.statusCode).toBe(201);
  });
  it('POST /member-visits bad memberId → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/member-visits', headers: { 'x-tenant-slug': 'base', ...auth() }, payload: { memberId: 'nope', content: 'x' } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /member-sacraments valid → 201', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/member-sacraments', headers: { 'x-tenant-slug': 'base', ...auth() }, payload: { memberId: '22222222-2222-2222-2222-222222222222', sacType: '세례', sacDate: '2026-04-05' } });
    expect(res.statusCode).toBe(201);
  });

  it('POST /member-transfers valid → 201', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/member-transfers', headers: { 'x-tenant-slug': 'base', ...auth() }, payload: { memberId: '22222222-2222-2222-2222-222222222222', trType: 'out', trDate: '2026-09-01', counterpart: '옆교회' } });
    expect(res.statusCode).toBe(201);
  });
  it('POST /member-transfers bad type → 400', async () => {
    await withAddon();
    const res = await app.inject({ method: 'POST', url: '/api/v1/member-transfers', headers: { 'x-tenant-slug': 'base', ...auth() }, payload: { memberId: '22222222-2222-2222-2222-222222222222', trType: 'teleport' } });
    expect(res.statusCode).toBe(400);
  });

  it('GET /member-stats/report → 200', async () => {
    await withAddon();
    const res = await app.inject({ method: 'GET', url: '/api/v1/member-stats/report', headers: { 'x-tenant-slug': 'base', ...auth() } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveProperty('gender');
  });
});
