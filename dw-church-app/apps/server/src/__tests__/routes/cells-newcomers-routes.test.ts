/**
 * 목장(cells) + 새가족(newcomers) route tests — feature-gate boundary + CRUD.
 *
 *   cells:    write requires Plus/Pro; light/basic → 403. reads open.
 *   newcomers: public POST gated by Pro; admin list/update require auth + Pro.
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

const cellSvc = { listCells: vi.fn(), getCell: vi.fn(), createCell: vi.fn(), updateCell: vi.fn(), deleteCell: vi.fn() };
vi.mock('../../modules/cells/service.js', () => cellSvc);
const ncSvc = { listNewcomers: vi.fn(), getNewcomer: vi.fn(), createNewcomer: vi.fn(), updateNewcomer: vi.fn(), deleteNewcomer: vi.fn() };
vi.mock('../../modules/newcomers/service.js', () => ncSvc);

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
function token(plan: string, role = 'admin') {
  return jwt.sign({ userId: 'u1', email: 't@t.com', tenantId: 't1', tenantSlug: plan, role }, JWT_SECRET, { expiresIn: '1h' });
}

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  const { errorHandler } = await import('../../middleware/error-handler.js');
  app.setErrorHandler(errorHandler);
  const { tenantMiddleware } = await import('../../middleware/tenant.js');
  app.addHook('preHandler', tenantMiddleware);
  const { cellRoutes } = await import('../../modules/cells/routes.js');
  const { newcomerRoutes } = await import('../../modules/newcomers/routes.js');
  await app.register(cellRoutes, { prefix: '/api/v1' });
  await app.register(newcomerRoutes, { prefix: '/api/v1' });

  const { prisma } = await import('../../config/database.js');
  // slug == plan tier so each test picks the tier via X-Tenant-Slug.
  vi.mocked(prisma.tenant.findFirst).mockImplementation((args: { where?: { slug?: string } } = {}) => {
    const slug = args.where?.slug ?? 'light';
    return Promise.resolve({ id: 't1', slug, name: `${slug} Church`, plan: slug, isActive: true } as Awaited<ReturnType<typeof prisma.tenant.findFirst>>);
  });
  cellSvc.listCells.mockResolvedValue([]);
  cellSvc.createCell.mockResolvedValue({ id: 'c1', name: '사랑목장' });
  ncSvc.listNewcomers.mockResolvedValue([]);
  ncSvc.createNewcomer.mockResolvedValue({ id: 'n1', name: '김방문' });
});
afterAll(async () => { await app.close(); });

describe('cells — feature gate (Plus/Pro)', () => {
  it('GET /cells is public (no auth) → 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/cells', headers: { 'x-tenant-slug': 'light' } });
    expect(res.statusCode).toBe(200);
  });

  it('POST /cells on basic → 403 PLAN_UPGRADE_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/cells',
      headers: { 'x-tenant-slug': 'basic', authorization: `Bearer ${token('basic')}` },
      payload: { name: '사랑목장' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error?.code).toBe('PLAN_UPGRADE_REQUIRED');
  });

  it('POST /cells on plus → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/cells',
      headers: { 'x-tenant-slug': 'plus', authorization: `Bearer ${token('plus')}` },
      payload: { name: '사랑목장', leaderName: '김목자' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe('c1');
  });

  it('POST /cells on pro → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/cells',
      headers: { 'x-tenant-slug': 'pro', authorization: `Bearer ${token('pro')}` },
      payload: { name: '믿음목장' },
    });
    expect(res.statusCode).toBe(201);
  });
});

describe('newcomers — public intake + admin gate (Pro)', () => {
  it('public POST /newcomers on pro → 201 (no auth)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/newcomers',
      headers: { 'x-tenant-slug': 'pro' },
      payload: { name: '김방문', phone: '010-1234-5678' },
    });
    expect(res.statusCode).toBe(201);
  });

  it('public POST /newcomers on plus → 403 (Pro-only feature)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/newcomers',
      headers: { 'x-tenant-slug': 'plus' },
      payload: { name: '김방문' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET /newcomers requires auth → 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/newcomers', headers: { 'x-tenant-slug': 'pro' } });
    expect(res.statusCode).toBe(401);
  });

  it('GET /newcomers on pro admin → 200', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/newcomers',
      headers: { 'x-tenant-slug': 'pro', authorization: `Bearer ${token('pro')}` },
    });
    expect(res.statusCode).toBe(200);
  });
});
