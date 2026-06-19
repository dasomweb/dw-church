/**
 * Saved design-sets route tests — auth gate + CRUD + apply.
 * apply() delegates to the themes service (mocked) to copy tokens into the
 * live theme.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { DEFAULT_DESIGN_TOKENS } from '@dw-church/design-tokens';

vi.mock('../../config/database.js', () => ({
  prisma: { tenant: { findFirst: vi.fn() }, $queryRawUnsafe: vi.fn(), $executeRawUnsafe: vi.fn() },
}));
vi.mock('../../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-characters-long', SUPER_ADMIN_EMAILS: [] },
}));

const svc = {
  listDesignSets: vi.fn(),
  getDesignSet: vi.fn(),
  createDesignSet: vi.fn(),
  updateDesignSet: vi.fn(),
  deleteDesignSet: vi.fn(),
  applyDesignSet: vi.fn(),
  saveAiDesignSet: vi.fn(),
};
vi.mock('../../modules/design-sets/service.js', () => svc);

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
function token(slug: string, role = 'admin') {
  return jwt.sign({ userId: 'u1', email: 't@t.com', tenantId: 't1', tenantSlug: slug, role }, JWT_SECRET, { expiresIn: '1h' });
}

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  const { errorHandler } = await import('../../middleware/error-handler.js');
  app.setErrorHandler(errorHandler);
  const { tenantMiddleware } = await import('../../middleware/tenant.js');
  app.addHook('preHandler', tenantMiddleware);
  const { designSetRoutes } = await import('../../modules/design-sets/routes.js');
  await app.register(designSetRoutes, { prefix: '/api/v1' });

  const { prisma } = await import('../../config/database.js');
  vi.mocked(prisma.tenant.findFirst).mockImplementation((args: { where?: { slug?: string } } = {}) => {
    const slug = args.where?.slug ?? 'demo';
    return Promise.resolve({ id: 't1', slug, name: `${slug} Church`, plan: 'pro', isActive: true } as Awaited<ReturnType<typeof prisma.tenant.findFirst>>);
  });
  svc.listDesignSets.mockResolvedValue([]);
  svc.createDesignSet.mockResolvedValue({ id: 'd1', name: '내 디자인', source: 'manual' });
  svc.applyDesignSet.mockResolvedValue(DEFAULT_DESIGN_TOKENS);
});
afterAll(async () => { await app.close(); });

describe('design-sets — auth gate', () => {
  it('GET /design-sets without token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/design-sets', headers: { 'x-tenant-slug': 'demo' } });
    expect(res.statusCode).toBe(401);
  });

  it('GET /design-sets with token → 200', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/design-sets',
      headers: { 'x-tenant-slug': 'demo', authorization: `Bearer ${token('demo')}` },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('design-sets — create + apply', () => {
  it('POST /design-sets saves a set → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/design-sets',
      headers: { 'x-tenant-slug': 'demo', authorization: `Bearer ${token('demo')}` },
      payload: { name: '내 디자인', tokens: DEFAULT_DESIGN_TOKENS },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe('d1');
  });

  it('POST /design-sets with invalid tokens → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/design-sets',
      headers: { 'x-tenant-slug': 'demo', authorization: `Bearer ${token('demo')}` },
      payload: { name: 'bad', tokens: { colors: 'nope' } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /design-sets/:id/apply copies tokens to live theme → 200', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/design-sets/d1/apply',
      headers: { 'x-tenant-slug': 'demo', authorization: `Bearer ${token('demo')}` },
    });
    expect(res.statusCode).toBe(200);
    expect(svc.applyDesignSet).toHaveBeenCalledWith('tenant_demo', 'd1');
  });
});
