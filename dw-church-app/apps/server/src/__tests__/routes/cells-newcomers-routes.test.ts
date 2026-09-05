/**
 * 목장(cells) + 새가족(newcomers) route tests — ADD-ON gate boundary + CRUD.
 *
 * 2026-09 model: no tier ladder. 목장·새가족 are paid ADD-ONS granted per-tenant
 * via feature_overrides (requireFeature honors overrides now). So:
 *   cells:     write requires the 'cells' add-on (override) → off by default 403.
 *              reads open. super_admin bypasses.
 *   newcomers: public POST + admin require the 'newcomer_registration' add-on.
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
  // Default: no add-on overrides. requireFeature loads feature_overrides via
  // $queryRawUnsafe — return an empty row so add-ons are OFF unless a test
  // opts in with mockResolvedValueOnce below.
  vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([{ feature_overrides: null }] as never);
});
afterAll(async () => { await app.close(); });

// Enable a paid add-on for the NEXT requireFeature check (one gated request).
async function withAddon(keys: Record<string, boolean>): Promise<void> {
  const { prisma } = await import('../../config/database.js');
  vi.mocked(prisma.$queryRawUnsafe).mockResolvedValueOnce([{ feature_overrides: keys }] as never);
}

describe('cells — add-on gate (목장)', () => {
  it('GET /cells is public (no auth) → 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/cells', headers: { 'x-tenant-slug': 'light' } });
    expect(res.statusCode).toBe(200);
  });

  it('POST /cells WITHOUT the 목장 add-on → 403 PLAN_UPGRADE_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/cells',
      headers: { 'x-tenant-slug': 'base', authorization: `Bearer ${token('base')}` },
      payload: { name: '사랑목장' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error?.code).toBe('PLAN_UPGRADE_REQUIRED');
  });

  it('POST /cells WITH the 목장 add-on (override) → 201', async () => {
    await withAddon({ cells: true });
    const res = await app.inject({
      method: 'POST', url: '/api/v1/cells',
      headers: { 'x-tenant-slug': 'base', authorization: `Bearer ${token('base')}` },
      payload: { name: '사랑목장', leaderName: '김목자' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe('c1');
  });

  it('POST /cells as super_admin → 201 (bypass)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/cells',
      headers: { 'x-tenant-slug': 'base', authorization: `Bearer ${token('base', 'super_admin')}` },
      payload: { name: '믿음목장' },
    });
    expect(res.statusCode).toBe(201);
  });
});

describe('newcomers — add-on gate (새가족)', () => {
  it('public POST /newcomers WITHOUT the add-on → 403', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/newcomers',
      headers: { 'x-tenant-slug': 'base' },
      payload: { name: '김방문' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('public POST /newcomers WITH the add-on (override) → 201', async () => {
    await withAddon({ newcomer_registration: true });
    const res = await app.inject({
      method: 'POST', url: '/api/v1/newcomers',
      headers: { 'x-tenant-slug': 'base' },
      payload: { name: '김방문', phone: '(201) 555-1234' },
    });
    expect(res.statusCode).toBe(201);
  });

  it('GET /newcomers requires auth → 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/newcomers', headers: { 'x-tenant-slug': 'base' } });
    expect(res.statusCode).toBe(401);
  });

  it('GET /newcomers admin WITH the add-on → 200', async () => {
    await withAddon({ newcomer_registration: true });
    const res = await app.inject({
      method: 'GET', url: '/api/v1/newcomers',
      headers: { 'x-tenant-slug': 'base', authorization: `Bearer ${token('base')}` },
    });
    expect(res.statusCode).toBe(200);
  });
});
