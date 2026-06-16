/**
 * Plan gate middleware tests.
 *
 * Verifies the pricing-model boundary (Basic = content editing only,
 * Pro = + page addition):
 *   - Basic plan + POST /pages       → 403 PLAN_UPGRADE_REQUIRED
 *   - Pro plan + POST /pages         → 200/201 (proceeds)
 *   - Enterprise + POST /pages       → 200/201 (proceeds)
 *   - super_admin role + Basic plan  → bypasses, succeeds
 *   - PUT /pages/:id/sections/:sid (content edit) stays open to Basic
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

vi.mock('../../config/database.js', () => ({
  prisma: { tenant: { findFirst: vi.fn() }, $queryRawUnsafe: vi.fn(), $executeRawUnsafe: vi.fn() },
}));
vi.mock('../../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-characters-long', SUPER_ADMIN_EMAILS: [] },
}));
vi.mock('../../modules/pages/service.js', () => ({
  listPages: vi.fn().mockResolvedValue([]),
  countPages: vi.fn().mockResolvedValue(0),
  createPage: vi.fn().mockResolvedValue({ id: 'p1', title: 'new' }),
  updatePage: vi.fn(),
  deletePage: vi.fn(),
  getPageBySlug: vi.fn(),
  listSections: vi.fn().mockResolvedValue([]),
  createSection: vi.fn().mockResolvedValue({ id: 's1', blockType: 'hero_banner', props: {} }),
  updateSection: vi.fn().mockResolvedValue({ id: 's1', blockType: 'hero_banner', props: { title: 'edited' } }),
  deleteSection: vi.fn(),
  reorderSections: vi.fn().mockResolvedValue([]),
  createPageFromTemplate: vi.fn(),
}));

let app: FastifyInstance;

function tokenFor(plan: string, role: string = 'owner') {
  return jwt.sign(
    { userId: 'u1', email: `owner@${plan}.com`, tenantId: 't1', tenantSlug: plan, role },
    'test-secret-at-least-32-characters-long',
  );
}

beforeAll(async () => {
  app = Fastify();
  const { errorHandler } = await import('../../middleware/error-handler.js');
  app.setErrorHandler(errorHandler);
  const { tenantMiddleware } = await import('../../middleware/tenant.js');
  app.addHook('preHandler', tenantMiddleware);
  const pageRoutes = (await import('../../modules/pages/routes.js')).default;
  await app.register(pageRoutes, { prefix: '/api/v1/pages' });

  const { prisma } = await import('../../config/database.js');
  // tenant.findFirst returns the plan based on the slug used in the
  // X-Tenant-Slug header — lets each test pick which tier to simulate.
  vi.mocked(prisma.tenant.findFirst).mockImplementation((args: { where?: { slug?: string } } = {}) => {
    const slug = args.where?.slug ?? 'basic';
    return Promise.resolve({
      id: 't1', slug, name: `${slug} Church`, plan: slug, isActive: true,
    } as Awaited<ReturnType<typeof prisma.tenant.findFirst>>);
  });
});

afterAll(async () => { await app.close(); });
beforeEach(() => {});

describe('Plan gate — POST /pages', () => {
  it('Basic plan + owner → 403 PLAN_UPGRADE_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pages',
      headers: { 'x-tenant-slug': 'basic', authorization: `Bearer ${tokenFor('basic')}` },
      payload: { title: 'New', slug: 'new' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error?.code).toBe('PLAN_UPGRADE_REQUIRED');
  });

  it('Pro plan + owner → proceeds (no 403)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pages',
      headers: { 'x-tenant-slug': 'pro', authorization: `Bearer ${tokenFor('pro')}` },
      payload: { title: 'New', slug: 'new' },
    });
    expect(res.statusCode).not.toBe(403);
  });

  it('Enterprise plan → proceeds', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pages',
      headers: { 'x-tenant-slug': 'enterprise', authorization: `Bearer ${tokenFor('enterprise')}` },
      payload: { title: 'New', slug: 'new' },
    });
    expect(res.statusCode).not.toBe(403);
  });

  it('super_admin role bypasses Basic gate', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pages',
      headers: { 'x-tenant-slug': 'basic', authorization: `Bearer ${tokenFor('basic', 'super_admin')}` },
      payload: { title: 'New', slug: 'new' },
    });
    // super_admin's JWT has tenantSlug='basic' so the cross-tenant rebinder
    // doesn't kick in; the plan gate sees role=super_admin and bypasses.
    expect(res.statusCode).not.toBe(403);
  });
});

describe('Plan gate — POST /pages/:id/sections', () => {
  it('Basic plan → 403 (Pro feature: adding sections)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pages/p1/sections',
      headers: { 'x-tenant-slug': 'basic', authorization: `Bearer ${tokenFor('basic')}` },
      payload: { blockType: 'hero_banner', props: {}, sortOrder: 0 },
    });
    expect(res.statusCode).toBe(403);
  });

  it('Pro plan → proceeds', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/pages/p1/sections',
      headers: { 'x-tenant-slug': 'pro', authorization: `Bearer ${tokenFor('pro')}` },
      payload: { blockType: 'hero_banner', props: {}, sortOrder: 0 },
    });
    expect(res.statusCode).not.toBe(403);
  });
});

describe('Plan gate — PUT /pages/:id/sections/:sid (content edit)', () => {
  it('Basic plan → proceeds (content editing IS the Basic value prop)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/pages/p1/sections/s1',
      headers: { 'x-tenant-slug': 'basic', authorization: `Bearer ${tokenFor('basic')}` },
      payload: { props: { title: 'edited' } },
    });
    expect(res.statusCode).not.toBe(403);
  });
});
