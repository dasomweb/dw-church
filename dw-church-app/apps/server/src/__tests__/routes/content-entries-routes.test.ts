/**
 * Content-entries API integration test — Fastify inject() against the real
 * routes. Verifies the CONTENT-layer CRUD + that writes require auth while
 * reads are public (the storefront resolves referenced entries when
 * rendering).
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
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();

vi.mock('../../modules/content-entries/service.js', () => ({
  listContentEntries: (...a: unknown[]) => mockList(...a),
  getContentEntry: (...a: unknown[]) => mockGet(...a),
  createContentEntry: (...a: unknown[]) => mockCreate(...a),
  updateContentEntry: (...a: unknown[]) => mockUpdate(...a),
  removeContentEntry: (...a: unknown[]) => mockRemove(...a),
}));

const { contentEntryRoutes } = await import('../../modules/content-entries/routes.js');
const { errorHandler } = await import('../../middleware/error-handler.js');

function token(role = 'admin'): string {
  return jwt.sign({ userId: 'u1', email: 't@t.com', tenantId: 't1', tenantSlug: 'grace', role }, JWT_SECRET, { expiresIn: '1h' });
}

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  app.setErrorHandler(errorHandler);
  app.addHook('preHandler', async (request) => {
    request.tenant = { id: 't1', slug: 'grace', name: 'Grace', plan: 'free' } as never;
    request.tenantSchema = 'tenant_grace';
  });
  await app.register(contentEntryRoutes, { prefix: '/api/v1' });
  await app.ready();
});
afterAll(async () => { await app.close(); });

describe('GET /api/v1/content-entries (public read)', () => {
  it('lists entries, passing the type filter to the service', async () => {
    mockList.mockResolvedValue([{ id: 'e1', type: 'text_image', name: 'A', data: {} }]);
    const res = await app.inject({ method: 'GET', url: '/api/v1/content-entries?type=text_image' });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
    expect(mockList).toHaveBeenCalledWith('tenant_grace', 'text_image');
  });

  it('does not require auth for read', async () => {
    mockList.mockResolvedValue([]);
    const res = await app.inject({ method: 'GET', url: '/api/v1/content-entries' });
    expect(res.statusCode).toBe(200);
  });
});

describe('POST /api/v1/content-entries (auth required)', () => {
  it('rejects unauthenticated writes', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/content-entries',
      payload: { type: 'text_image', name: 'A', data: {} },
    });
    expect(res.statusCode).toBe(401);
  });

  it('creates an entry when authenticated', async () => {
    mockCreate.mockResolvedValue({ id: 'e9', type: 'text_image', name: '인사말', data: { title: '환영' } });
    const res = await app.inject({
      method: 'POST', url: '/api/v1/content-entries',
      headers: { authorization: `Bearer ${token()}` },
      payload: { type: 'text_image', name: '인사말', data: { title: '환영' } },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe('e9');
    expect(mockCreate).toHaveBeenCalledWith('tenant_grace', expect.objectContaining({ type: 'text_image', name: '인사말' }));
  });

  it('validates the body (empty name rejected)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/content-entries',
      headers: { authorization: `Bearer ${token()}` },
      payload: { type: 'text_image', name: '' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('PUT / DELETE /api/v1/content-entries/:id', () => {
  it('updates an entry', async () => {
    mockUpdate.mockResolvedValue({ id: 'e1', type: 'text_image', name: '새 이름', data: {} });
    const res = await app.inject({
      method: 'PUT', url: '/api/v1/content-entries/e1',
      headers: { authorization: `Bearer ${token()}` },
      payload: { name: '새 이름' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.name).toBe('새 이름');
  });

  it('deletes an entry (204)', async () => {
    mockRemove.mockResolvedValue(true);
    const res = await app.inject({
      method: 'DELETE', url: '/api/v1/content-entries/e1',
      headers: { authorization: `Bearer ${token()}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it('404s when deleting a missing entry', async () => {
    mockRemove.mockResolvedValue(false);
    const res = await app.inject({
      method: 'DELETE', url: '/api/v1/content-entries/missing',
      headers: { authorization: `Bearer ${token()}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
