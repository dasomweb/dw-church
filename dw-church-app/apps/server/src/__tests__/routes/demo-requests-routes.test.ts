/**
 * 데모 체험 신청 route tests.
 *
 *   POST /demo-requests is PUBLIC (marketing site) → 201.
 *   /admin/demo-requests/* + /admin/demo-config require super-admin.
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

const demoSvc = {
  listDemoRequests: vi.fn(),
  getDemoRequest: vi.fn(),
  createDemoRequest: vi.fn(),
  updateDemoRequest: vi.fn(),
  deleteDemoRequest: vi.fn(),
  countNewDemoRequests: vi.fn(),
  getDemoConfig: vi.fn(),
  setDemoConfig: vi.fn(),
};
vi.mock('../../modules/demo-requests/service.js', () => demoSvc);

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
function superToken() {
  return jwt.sign({ userId: 'u1', email: 'boss@truelight.app', role: 'super_admin' }, JWT_SECRET, { expiresIn: '1h' });
}

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  const { errorHandler } = await import('../../middleware/error-handler.js');
  app.setErrorHandler(errorHandler);
  const { demoRequestRoutes } = await import('../../modules/demo-requests/routes.js');
  await app.register(demoRequestRoutes, { prefix: '/api/v1' });

  demoSvc.createDemoRequest.mockResolvedValue({ id: 'd1', name: '홍길동', status: 'new' });
  demoSvc.listDemoRequests.mockResolvedValue([]);
});
afterAll(async () => { await app.close(); });

describe('demo-requests — public submission', () => {
  it('POST /demo-requests (no auth) → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/demo-requests',
      payload: { name: '홍길동', churchName: '다솜교회', email: 'a@b.com' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe('d1');
  });

  it('POST /demo-requests with bad email → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/demo-requests',
      payload: { name: 'x', email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('demo-requests — admin (super-admin gate)', () => {
  it('GET /admin/demo-requests without token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/demo-requests' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /admin/demo-requests with super token → 200', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/admin/demo-requests',
      headers: { authorization: `Bearer ${superToken()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(demoSvc.listDemoRequests).toHaveBeenCalled();
  });
});
