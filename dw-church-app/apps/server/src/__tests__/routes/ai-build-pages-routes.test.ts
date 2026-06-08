/**
 * AI builder (build-pages) integration test — the PlannerWizard hands a
 * PlannerResult here and it must materialize pages/sections/menus in the
 * target tenant. The LLM that PRODUCES the planner result lives in the
 * planner-proxy (separate route); this handler is the deterministic
 * "planner result → pages" persistence step, so we exercise it with a fixed
 * planner result and mocked DB / services / Unsplash.
 *
 * Verifies: super_admin gate, tenant/schema resolution, and that pages +
 * sections are created from the sitemap + pageContents.
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

const mockCreatePage = vi.fn();
const mockCreateSection = vi.fn();
vi.mock('../../modules/pages/service.js', () => ({
  createPage: (...a: unknown[]) => mockCreatePage(...a),
  createSection: (...a: unknown[]) => mockCreateSection(...a),
}));
const mockCreateMenu = vi.fn();
vi.mock('../../modules/menus/service.js', () => ({ createMenu: (...a: unknown[]) => mockCreateMenu(...a) }));
vi.mock('../../modules/themes/service.js', () => ({ updateTheme: vi.fn(async () => undefined) }));
vi.mock('../../modules/ai/build-pages/placeholder-images.js', () => ({
  prefetchUnsplash: vi.fn(async () => undefined),
  fillImage: vi.fn((section: unknown) => section),
  placeholderImage: vi.fn(() => 'https://cdn.example/ph.webp'),
  placeholdersAvailable: vi.fn(() => false),
}));

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
const { aiBuildPagesRoutes } = await import('../../modules/ai/build-pages/routes.js');
const { errorHandler } = await import('../../middleware/error-handler.js');
const { prisma } = await import('../../config/database.js');

function token(role = 'super_admin'): string {
  return jwt.sign({ userId: 'u1', email: 'sa@t.com', tenantId: null, tenantSlug: null, role }, JWT_SECRET, { expiresIn: '1h' });
}

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  app.setErrorHandler(errorHandler);
  await app.register(aiBuildPagesRoutes, { prefix: '/api/v1' });
  await app.ready();
});
afterAll(async () => { await app.close(); });

beforeEach(() => {
  vi.mocked(prisma.$queryRawUnsafe).mockReset();
  vi.mocked(prisma.$executeRawUnsafe).mockReset().mockResolvedValue(0 as never);
  mockCreatePage.mockReset().mockImplementation(async (_s: string, input: { slug: string }) => ({ id: `page-${input.slug}` }));
  mockCreateSection.mockReset().mockResolvedValue({ id: 'sec1' });
  mockCreateMenu.mockReset().mockResolvedValue({ id: 'menu1' });
  // tenant lookup + schema-exists check
  vi.mocked(prisma.$queryRawUnsafe).mockImplementation((sql: unknown) => {
    const s = String(sql);
    if (/FROM public\.tenants/.test(s)) return Promise.resolve([{ id: 't1', slug: 'grace' }] as never);
    if (/information_schema\.schemata/.test(s)) return Promise.resolve([{ exists: true }] as never);
    return Promise.resolve([] as never);
  });
});

const payload = {
  tenantSlug: 'grace',
  business: { name: '은혜교회' },
  designSystem: {},
  strategy: {},
  sitemap: [{ name: '홈', slug: 'home' }, { name: '소개', slug: 'about' }],
  pageContents: {
    home: [
      { sectionType: 'hero', title: '환영합니다', subtitle: '함께 예배해요' },
      { sectionType: 'text', title: '교회 소개', content: '<p>...</p>' },
    ],
    about: [{ sectionType: 'text', title: '우리 교회', content: '<p>...</p>' }],
  },
};

describe('POST /api/v1/ai/build-pages', () => {
  it('rejects unauthenticated requests (401)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/ai/build-pages', payload });
    expect(res.statusCode).toBe(401);
  });

  it('rejects non-super-admins (403)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/ai/build-pages',
      headers: { authorization: `Bearer ${token('admin')}` }, payload,
    });
    expect(res.statusCode).toBe(403);
  });

  it('404s when the tenant does not exist', async () => {
    vi.mocked(prisma.$queryRawUnsafe).mockImplementation(() => Promise.resolve([] as never));
    const res = await app.inject({
      method: 'POST', url: '/api/v1/ai/build-pages',
      headers: { authorization: `Bearer ${token()}` }, payload,
    });
    expect(res.statusCode).toBe(404);
  });

  it('builds pages + sections from the planner result', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/ai/build-pages',
      headers: { authorization: `Bearer ${token()}` }, payload,
    });
    expect(res.statusCode).toBe(200);
    const result = res.json().data;
    expect(result.pagesCreated).toBe(2);          // home + about
    expect(result.sectionsCreated).toBeGreaterThanOrEqual(3); // 2 + 1
    expect(mockCreatePage).toHaveBeenCalledTimes(2);
    expect(mockCreateSection.mock.calls.length).toBeGreaterThanOrEqual(3);
    // pages are created in the resolved tenant schema
    expect(mockCreatePage).toHaveBeenCalledWith('tenant_grace', expect.objectContaining({ slug: 'home' }));
  });
});
