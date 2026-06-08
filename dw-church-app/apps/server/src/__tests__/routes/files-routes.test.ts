/**
 * Files API integration test — focuses on the reference-photo additions:
 * GET /files?kind=reference must flow the kind filter to the service, and
 * reads require auth.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

vi.mock('../../config/database.js', () => ({
  prisma: { tenant: { findFirst: vi.fn() }, $queryRawUnsafe: vi.fn() },
}));
vi.mock('../../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-characters-long', SUPER_ADMIN_EMAILS: [] },
}));

const JWT_SECRET = 'test-secret-at-least-32-characters-long';

const mockList = vi.fn();
const mockRemove = vi.fn();
vi.mock('../../modules/files/service.js', () => ({
  listFiles: (...a: unknown[]) => mockList(...a),
  remove: (...a: unknown[]) => mockRemove(...a),
  upload: vi.fn(),
}));

const { fileRoutes } = await import('../../modules/files/routes.js');
const { errorHandler } = await import('../../middleware/error-handler.js');

function token(): string {
  return jwt.sign({ userId: 'u1', email: 't@t.com', tenantId: 't1', tenantSlug: 'grace', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
}

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  app.setErrorHandler(errorHandler);
  app.addHook('preHandler', async (request) => {
    request.tenant = { id: 't1', slug: 'grace', name: 'Grace', plan: 'free' } as never;
    request.tenantSchema = 'tenant_grace';
  });
  await app.register(fileRoutes, { prefix: '/api/v1' });
  await app.ready();
});
afterAll(async () => { await app.close(); });

describe('GET /api/v1/files', () => {
  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/files' });
    expect(res.statusCode).toBe(401);
  });

  it('passes kind=reference through to the service', async () => {
    mockList.mockResolvedValue({ data: [{ id: 'f1', kind: 'reference' }], total: 1 });
    const res = await app.inject({
      method: 'GET', url: '/api/v1/files?kind=reference&perPage=50',
      headers: { authorization: `Bearer ${token()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(mockList).toHaveBeenCalledWith('tenant_grace', expect.objectContaining({ kind: 'reference' }));
    expect(res.json().data).toHaveLength(1);
  });

  it('omits kind when not provided', async () => {
    mockList.mockResolvedValue({ data: [], total: 0 });
    await app.inject({ method: 'GET', url: '/api/v1/files', headers: { authorization: `Bearer ${token()}` } });
    expect(mockList).toHaveBeenCalledWith('tenant_grace', expect.objectContaining({ kind: undefined }));
  });
});

describe('DELETE /api/v1/files/:id', () => {
  it('deletes (204) when found', async () => {
    mockRemove.mockResolvedValue(true);
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/files/f1', headers: { authorization: `Bearer ${token()}` } });
    expect(res.statusCode).toBe(204);
  });

  it('404s when missing', async () => {
    mockRemove.mockResolvedValue(false);
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/files/x', headers: { authorization: `Bearer ${token()}` } });
    expect(res.statusCode).toBe(404);
  });
});
