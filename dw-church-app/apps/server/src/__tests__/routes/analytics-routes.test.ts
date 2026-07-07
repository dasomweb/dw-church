/**
 * Analytics route tests.
 *
 *   POST /analytics/hit  — public beacon; no tenant (no X-Tenant-Slug in this
 *                          isolated harness) → 204, silently ignored.
 *   GET  /analytics/summary — requireAuth; tenant comes from the JWT's
 *                          tenantSlug (resolveUser fills request.tenant), so a
 *                          missing token → 401 and a valid token → 200.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

vi.mock('../../config/database.js', () => ({
  prisma: { tenant: { findFirst: vi.fn() }, $queryRawUnsafe: vi.fn(), $executeRawUnsafe: vi.fn() },
}));
vi.mock('../../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-characters-long', SUPER_ADMIN_EMAILS: ['boss@truelight.app'] },
}));

const analyticsSvc = {
  recordHit: vi.fn(),
  getSummary: vi.fn(),
};
vi.mock('../../modules/analytics/service.js', () => analyticsSvc);

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
function adminToken() {
  return jwt.sign(
    { userId: 'u1', email: 'admin@wakechurch.org', role: 'admin', tenantId: 't1', tenantSlug: 'wakechurch' },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  const { errorHandler } = await import('../../middleware/error-handler.js');
  app.setErrorHandler(errorHandler);
  const { prisma } = await import('../../config/database.js');
  // resolveUser fills request.tenant from the JWT's tenantSlug via this lookup.
  (prisma.tenant.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: 't1', slug: 'wakechurch', name: 'Wake Church', plan: 'pro',
  });
  const { analyticsRoutes } = await import('../../modules/analytics/routes.js');
  await app.register(analyticsRoutes, { prefix: '/api/v1' });

  analyticsSvc.getSummary.mockResolvedValue({
    range: '30d', days: 30,
    totals: { pageviews: 10, visitors: 4, sessions: 5, activeNow: 1 },
    deltas: { pageviews: 20, visitors: null, sessions: 0 },
    daily: [], topPages: [], referrers: [], devices: [],
  });
});
afterAll(async () => { await app.close(); });

describe('analytics — public beacon', () => {
  it('POST /analytics/hit with no tenant → 204 (ignored)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/analytics/hit',
      payload: { path: '/sermons', vid: 'v1', sid: 's1' },
    });
    expect(res.statusCode).toBe(204);
    // No tenant resolved in this harness → recordHit must not run.
    expect(analyticsSvc.recordHit).not.toHaveBeenCalled();
  });
});

describe('analytics — summary (auth-gated)', () => {
  it('GET /analytics/summary without token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/analytics/summary' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /analytics/summary with token → 200, scoped to JWT tenant', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/analytics/summary?range=7d',
      headers: { authorization: `Bearer ${adminToken()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.totals.pageviews).toBe(10);
    expect(analyticsSvc.getSummary).toHaveBeenCalledWith('wakechurch', '7d');
  });

  it('GET /analytics/summary with bad range → 400', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/analytics/summary?range=nonsense',
      headers: { authorization: `Bearer ${adminToken()}` },
    });
    expect(res.statusCode).toBe(400);
  });
});
