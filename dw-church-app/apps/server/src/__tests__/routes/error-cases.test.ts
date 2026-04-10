/**
 * Error case tests — auth errors, validation failures, not found, service errors.
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
vi.mock('../../modules/sermons/service.js', () => ({
  listSermons: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getSermon: vi.fn().mockResolvedValue(null),
  createSermon: vi.fn().mockRejectedValue(new Error('DB connection failed')),
  updateSermon: vi.fn().mockResolvedValue(null),
  deleteSermon: vi.fn().mockResolvedValue(undefined),
  getRelatedSermons: vi.fn().mockResolvedValue([]),
}));

import { errorHandler } from '../../middleware/error-handler.js';
import { sermonRoutes } from '../../modules/sermons/routes.js';
import * as sermonService from '../../modules/sermons/service.js';

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
let app: FastifyInstance;

function makeToken(overrides: Record<string, unknown> = {}): string {
  return jwt.sign({
    userId: 'u1', email: 'test@test.com', tenantId: 't1', tenantSlug: 'grace', role: 'admin',
    ...overrides,
  }, JWT_SECRET, { expiresIn: '1h' });
}

beforeAll(async () => {
  app = Fastify();
  app.setErrorHandler(errorHandler);
  app.addHook('preHandler', async (request) => {
    request.tenant = { id: 't1', slug: 'grace', name: 'Grace', plan: 'free' };
    request.tenantSchema = 'tenant_grace';
  });
  await app.register(sermonRoutes, { prefix: '/api/v1' });
  await app.ready();
});
afterAll(() => app.close());

describe('Authentication Errors', () => {
  it('missing token → 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/sermons', payload: { title: 'X', sermon_date: '2026-01-01' } });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error.code).toBe('UNAUTHORIZED');
  });

  it('malformed token → 401', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/sermons',
      headers: { authorization: 'Bearer totally.not.valid' },
      payload: { title: 'X', sermon_date: '2026-01-01' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('expired token → 401', async () => {
    const token = jwt.sign({ userId: 'u1', email: 'a@b.com', role: 'admin' }, JWT_SECRET, { expiresIn: '-1s' });
    const res = await app.inject({
      method: 'POST', url: '/api/v1/sermons',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'X', sermon_date: '2026-01-01' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('wrong secret → 401', async () => {
    const token = jwt.sign({ userId: 'u1' }, 'wrong-secret-wrong-secret-wrong-secret');
    const res = await app.inject({
      method: 'POST', url: '/api/v1/sermons',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'X', sermon_date: '2026-01-01' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('Basic auth scheme → 401', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/sermons',
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
      payload: { title: 'X', sermon_date: '2026-01-01' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('Validation Errors', () => {
  const AUTH = { authorization: `Bearer ${makeToken()}` };

  it('empty body → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/sermons', headers: AUTH, payload: {} });
    expect(res.statusCode).toBe(400);
  });

  it('title too long → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/sermons', headers: AUTH,
      payload: { title: 'a'.repeat(301), sermon_date: '2026-01-01' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('invalid date → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/sermons', headers: AUTH,
      payload: { title: 'Test', sermon_date: '2026/01/01' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('invalid youtube URL → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/sermons', headers: AUTH,
      payload: { title: 'Test', sermon_date: '2026-01-01', youtube_url: 'not-a-url' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('invalid UUID for preacher_id → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/sermons', headers: AUTH,
      payload: { title: 'Test', sermon_date: '2026-01-01', preacher_id: 'not-uuid' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('invalid status → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/sermons', headers: AUTH,
      payload: { title: 'Test', sermon_date: '2026-01-01', status: 'deleted' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('Not Found Errors', () => {
  it('GET nonexistent → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/sermons/550e8400-e29b-41d4-a716-446655440000' });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).error.code).toBe('NOT_FOUND');
  });

  it('PUT nonexistent → 404', async () => {
    const res = await app.inject({
      method: 'PUT', url: '/api/v1/sermons/550e8400-e29b-41d4-a716-446655440000',
      headers: { authorization: `Bearer ${makeToken()}` },
      payload: { title: 'Updated' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('nonexistent route → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nonexistent' });
    expect(res.statusCode).toBe(404);
  });
});

describe('Service Errors', () => {
  it('service throws → 500', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/sermons',
      headers: { authorization: `Bearer ${makeToken()}` },
      payload: { title: 'Test', sermon_date: '2026-01-01' },
    });
    expect(res.statusCode).toBe(500);
  });
});
