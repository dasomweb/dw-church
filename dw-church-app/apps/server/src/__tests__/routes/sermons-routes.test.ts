/**
 * Sermons API integration test — uses Fastify inject() to test actual routes.
 * Mocks service layer and auth middleware.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

// Mock dependencies — vi.mock is hoisted, so use literal strings
vi.mock('../../config/database.js', () => ({
  prisma: { tenant: { findFirst: vi.fn() }, $queryRawUnsafe: vi.fn() },
}));
vi.mock('../../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-characters-long', SUPER_ADMIN_EMAILS: [] },
}));

const JWT_SECRET = 'test-secret-at-least-32-characters-long';

// Mock sermon service
const mockListSermons = vi.fn();
const mockGetSermon = vi.fn();
const mockCreateSermon = vi.fn();
const mockUpdateSermon = vi.fn();
const mockDeleteSermon = vi.fn();
const mockGetRelatedSermons = vi.fn();

vi.mock('../../modules/sermons/service.js', () => ({
  listSermons: (...args: unknown[]) => mockListSermons(...args),
  getSermon: (...args: unknown[]) => mockGetSermon(...args),
  createSermon: (...args: unknown[]) => mockCreateSermon(...args),
  updateSermon: (...args: unknown[]) => mockUpdateSermon(...args),
  deleteSermon: (...args: unknown[]) => mockDeleteSermon(...args),
  getRelatedSermons: (...args: unknown[]) => mockGetRelatedSermons(...args),
}));

import { sermonRoutes } from '../../modules/sermons/routes.js';
import { errorHandler } from '../../middleware/error-handler.js';

let app: FastifyInstance;

function makeToken(role = 'admin'): string {
  return jwt.sign(
    { userId: 'u1', email: 'test@test.com', tenantId: 't1', tenantSlug: 'grace', role },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

beforeAll(async () => {
  app = Fastify();
  app.setErrorHandler(errorHandler);

  // Simulate tenant middleware
  app.addHook('preHandler', async (request) => {
    request.tenant = { id: 't1', slug: 'grace', name: 'Grace', plan: 'free' };
    request.tenantSchema = 'tenant_grace';
  });

  await app.register(sermonRoutes, { prefix: '/api/v1' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('GET /api/v1/sermons', () => {
  it('returns paginated sermon list', async () => {
    mockListSermons.mockResolvedValue({
      data: [{ id: 's1', title: '하나님의 은혜', sermon_date: '2026-04-06' }],
      total: 1,
    });

    const res = await app.inject({ method: 'GET', url: '/api/v1/sermons' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('하나님의 은혜');
    expect(body.meta.total).toBe(1);
  });

  it('passes search param to service', async () => {
    mockListSermons.mockResolvedValue({ data: [], total: 0 });
    await app.inject({ method: 'GET', url: '/api/v1/sermons?search=은혜&page=2&perPage=5' });

    expect(mockListSermons).toHaveBeenCalledWith('tenant_grace', expect.objectContaining({
      search: '은혜', page: 2, perPage: 5,
    }));
  });
});

describe('GET /api/v1/sermons/:id', () => {
  it('returns sermon by ID', async () => {
    mockGetSermon.mockResolvedValue({ id: 's1', title: '믿음의 사람들' });
    const res = await app.inject({ method: 'GET', url: '/api/v1/sermons/s1' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.title).toBe('믿음의 사람들');
  });

  it('returns 404 for missing sermon', async () => {
    mockGetSermon.mockResolvedValue(null);
    const res = await app.inject({ method: 'GET', url: '/api/v1/sermons/nonexistent' });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/v1/sermons', () => {
  it('creates sermon with valid data', async () => {
    mockCreateSermon.mockResolvedValue({ id: 's2', title: '새 설교' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sermons',
      headers: { authorization: `Bearer ${makeToken()}` },
      payload: { title: '새 설교', sermon_date: '2026-04-06', status: 'published' },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).data.title).toBe('새 설교');
  });

  it('returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sermons',
      payload: { title: 'Test', sermon_date: '2026-01-01' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for missing title', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sermons',
      headers: { authorization: `Bearer ${makeToken()}` },
      payload: { sermon_date: '2026-01-01' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid date format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sermons',
      headers: { authorization: `Bearer ${makeToken()}` },
      payload: { title: 'Test', sermon_date: 'Jan 1 2026' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('PUT /api/v1/sermons/:id', () => {
  it('updates sermon', async () => {
    mockUpdateSermon.mockResolvedValue({ id: 's1', title: '수정됨' });
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/sermons/s1',
      headers: { authorization: `Bearer ${makeToken()}` },
      payload: { title: '수정됨' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.title).toBe('수정됨');
  });

  it('returns 404 for missing sermon', async () => {
    mockUpdateSermon.mockResolvedValue(null);
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/sermons/missing',
      headers: { authorization: `Bearer ${makeToken()}` },
      payload: { title: 'Updated' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/v1/sermons/:id', () => {
  it('deletes sermon', async () => {
    mockDeleteSermon.mockResolvedValue(undefined);
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/sermons/s1',
      headers: { authorization: `Bearer ${makeToken()}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/sermons/s1' });
    expect(res.statusCode).toBe(401);
  });
});
