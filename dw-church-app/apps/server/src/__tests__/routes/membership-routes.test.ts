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
});
