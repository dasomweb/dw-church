/**
 * Theme tokens route integration tests.
 *
 * Exercises GET/PUT /theme/tokens — the new endpoints that sit alongside
 * the existing colors/fonts editor. GET must return a valid DesignTokens
 * snapshot even for tenants whose `settings` JSONB is still the legacy
 * shape (the legacyThemeToTokens projection fills the gap). PUT must
 * round-trip through the Zod schema and be readable back.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
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

// In-memory tenant table — `themes.settings` JSONB lives here. Each test
// resets this so reads/writes are isolated.
const fakeStore: { settings: Record<string, unknown> | null; rowId: string } = {
  settings: null,
  rowId: 'theme-row-1',
};

vi.mock('../../modules/themes/service.js', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    // Intercept the service helpers so the routes hit our in-memory store
    // instead of Prisma. The real helpers still get tested through their
    // own unit tests in modules/themes-tokens-service.test.ts.
    getThemeTokens: vi.fn(async () => {
      const { legacyThemeToTokens } = await import('@dw-church/design-tokens');
      return legacyThemeToTokens(
        (fakeStore.settings ?? {}) as Parameters<typeof legacyThemeToTokens>[0],
      );
    }),
    updateThemeTokens: vi.fn(async (_schema: string, tokens: unknown) => {
      fakeStore.settings = { ...(fakeStore.settings ?? {}), tokensV2: tokens };
      return tokens;
    }),
  };
});

let app: FastifyInstance;
let validToken: string;

beforeAll(async () => {
  app = Fastify();
  const { errorHandler } = await import('../../middleware/error-handler.js');
  app.setErrorHandler(errorHandler);
  const { tenantMiddleware } = await import('../../middleware/tenant.js');
  app.addHook('preHandler', tenantMiddleware);
  const themeRoutes = (await import('../../modules/themes/routes.js')).default;
  await app.register(themeRoutes, { prefix: '/api/v1/theme' });

  const { prisma } = await import('../../config/database.js');
  vi.mocked(prisma.tenant.findFirst).mockResolvedValue({
    id: 'tenant-1',
    slug: 'gracechurch',
    name: 'Grace Church',
    plan: 'pro',
    isActive: true,
  } as Awaited<ReturnType<typeof prisma.tenant.findFirst>>);

  validToken = jwt.sign(
    { userId: 'u1', email: 'admin@gracechurch.com', tenantId: 'tenant-1', tenantSlug: 'gracechurch', role: 'admin' },
    'test-secret-at-least-32-characters-long',
  );
});

afterAll(async () => { await app.close(); });
beforeEach(() => { fakeStore.settings = null; });

describe('GET /theme/tokens', () => {
  it('returns DesignTokens projected from an empty settings (defaults)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/theme/tokens', headers: { 'x-tenant-slug': 'gracechurch' } });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: typeof DEFAULT_DESIGN_TOKENS };
    expect(body.data.colors.system.primary).toBe(DEFAULT_DESIGN_TOKENS.colors.system.primary);
    expect(body.data.typography.scales.h1?.size.desktop).toBe(72);
  });

  it('projects legacy colors/fonts into the tokens shape', async () => {
    fakeStore.settings = {
      colors: { primary: '#ff0000', text: '#101010' },
      fonts: { heading: 'Georgia, serif' },
    };
    const res = await app.inject({ method: 'GET', url: '/api/v1/theme/tokens', headers: { 'x-tenant-slug': 'gracechurch' } });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: typeof DEFAULT_DESIGN_TOKENS };
    expect(body.data.colors.system.primary).toBe('#ff0000');
    expect(body.data.colors.system.text).toBe('#101010');
    expect(body.data.typography.families.heading).toBe('Georgia, serif');
  });
});

describe('PUT /theme/tokens', () => {
  it('validates the body against the DesignTokens schema and persists', async () => {
    const tokens = { ...DEFAULT_DESIGN_TOKENS };
    tokens.colors = { ...tokens.colors, system: { ...tokens.colors.system, primary: '#0033cc' } };

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/theme/tokens',
      headers: { 'x-tenant-slug': 'gracechurch', authorization: `Bearer ${validToken}` },
      payload: tokens,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { data: typeof DEFAULT_DESIGN_TOKENS };
    expect(body.data.colors.system.primary).toBe('#0033cc');

    // Read back — store should reflect the write.
    const readBack = await app.inject({ method: 'GET', url: '/api/v1/theme/tokens', headers: { 'x-tenant-slug': 'gracechurch' } });
    const readBody = readBack.json() as { data: typeof DEFAULT_DESIGN_TOKENS };
    expect(readBody.data.colors.system.primary).toBe('#0033cc');
  });

  it('rejects malformed bodies with 400', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/theme/tokens',
      headers: { 'x-tenant-slug': 'gracechurch', authorization: `Bearer ${validToken}` },
      payload: { colors: 'not an object' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/theme/tokens',
      headers: { 'x-tenant-slug': 'gracechurch' },
      payload: DEFAULT_DESIGN_TOKENS,
    });
    expect(res.statusCode).toBe(401);
  });
});
