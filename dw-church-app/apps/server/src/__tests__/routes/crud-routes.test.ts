/**
 * CRUD API route integration tests for ALL content modules.
 * Uses Fastify inject() with mocked services.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

vi.mock('../../config/database.js', () => ({
  prisma: { tenant: { findFirst: vi.fn() }, $queryRawUnsafe: vi.fn() },
}));
vi.mock('../../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-characters-long', SUPER_ADMIN_EMAILS: [] },
}));

// Mock services — use vi.fn() directly in factory (no outside variable references)
vi.mock('../../modules/bulletins/service.js', () => ({
  listBulletins: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getBulletin: vi.fn().mockResolvedValue(null),
  createBulletin: vi.fn().mockResolvedValue({ id: 'b1', title: 'test' }),
  updateBulletin: vi.fn().mockResolvedValue({ id: 'b1', title: 'updated' }),
  deleteBulletin: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../modules/staff/service.js', () => ({
  listStaff: vi.fn().mockResolvedValue([]),
  getStaffMember: vi.fn().mockResolvedValue(null),
  createStaffMember: vi.fn().mockResolvedValue({ id: 's1', name: 'test' }),
  updateStaffMember: vi.fn().mockResolvedValue({ id: 's1', name: 'updated' }),
  deleteStaffMember: vi.fn().mockResolvedValue(undefined),
  reorderStaff: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../modules/albums/service.js', () => ({
  listAlbums: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getAlbum: vi.fn().mockResolvedValue(null),
  createAlbum: vi.fn().mockResolvedValue({ id: 'a1', title: 'test' }),
  updateAlbum: vi.fn().mockResolvedValue({ id: 'a1', title: 'updated' }),
  deleteAlbum: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../modules/events/service.js', () => ({
  listEvents: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getEvent: vi.fn().mockResolvedValue(null),
  createEvent: vi.fn().mockResolvedValue({ id: 'e1', title: 'test' }),
  updateEvent: vi.fn().mockResolvedValue(null),
  deleteEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../modules/columns/service.js', () => ({
  listColumns: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getColumn: vi.fn().mockResolvedValue(null),
  createColumn: vi.fn().mockResolvedValue({ id: 'c1', title: 'test' }),
  updateColumn: vi.fn().mockResolvedValue({ id: 'c1', title: 'updated' }),
  deleteColumn: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../modules/history/service.js', () => ({
  listHistory: vi.fn().mockResolvedValue([]),
  getHistory: vi.fn().mockResolvedValue(null),
  createHistory: vi.fn().mockResolvedValue({ id: 'h1', year: 2020 }),
  updateHistory: vi.fn().mockResolvedValue({ id: 'h1', year: 2020 }),
  deleteHistory: vi.fn().mockResolvedValue(undefined),
  listYears: vi.fn().mockResolvedValue([]),
}));

import { errorHandler } from '../../middleware/error-handler.js';
import { bulletinRoutes } from '../../modules/bulletins/routes.js';
import { staffRoutes } from '../../modules/staff/routes.js';
import { albumRoutes } from '../../modules/albums/routes.js';
import { eventRoutes } from '../../modules/events/routes.js';
import { columnRoutes } from '../../modules/columns/routes.js';
import { historyRoutes } from '../../modules/history/routes.js';

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
let app: FastifyInstance;

function makeToken(role = 'admin'): string {
  return jwt.sign(
    { userId: 'u1', email: 'test@test.com', tenantId: 't1', tenantSlug: 'grace', role },
    JWT_SECRET, { expiresIn: '1h' },
  );
}
const AUTH = { authorization: `Bearer ${makeToken()}` };

beforeAll(async () => {
  app = Fastify();
  app.setErrorHandler(errorHandler);
  app.addHook('preHandler', async (request) => {
    request.tenant = { id: 't1', slug: 'grace', name: 'Grace', plan: 'free' };
    request.tenantSchema = 'tenant_grace';
  });
  await app.register(bulletinRoutes, { prefix: '/api/v1' });
  await app.register(staffRoutes, { prefix: '/api/v1' });
  await app.register(albumRoutes, { prefix: '/api/v1' });
  await app.register(eventRoutes, { prefix: '/api/v1' });
  await app.register(columnRoutes, { prefix: '/api/v1' });
  await app.register(historyRoutes, { prefix: '/api/v1' });
  await app.ready();
});
afterAll(() => app.close());

// ── Bulletins ──
describe('Bulletins', () => {
  it('GET → 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/bulletins' });
    expect(res.statusCode).toBe(200);
  });
  it('POST → 201', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/bulletins', headers: AUTH, payload: { title: '주보', bulletin_date: '2026-04-09' } });
    expect(res.statusCode).toBe(201);
  });
  it('POST no auth → 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/bulletins', payload: { title: 'X', bulletin_date: '2026-01-01' } });
    expect(res.statusCode).toBe(401);
  });
  it('POST invalid → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/bulletins', headers: AUTH, payload: { bulletin_date: '2026-01-01' } });
    expect(res.statusCode).toBe(400);
  });
  it('GET /:id missing → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/bulletins/missing' });
    expect(res.statusCode).toBe(404);
  });
});

// ── Staff ──
describe('Staff', () => {
  it('GET → 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/staff' });
    expect(res.statusCode).toBe(200);
  });
  it('POST → 201', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/staff', headers: AUTH, payload: { name: '김목사' } });
    expect(res.statusCode).toBe(201);
  });
  it('POST empty name → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/staff', headers: AUTH, payload: { name: '' } });
    expect(res.statusCode).toBe(400);
  });
  it('POST reorder → 200', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/staff/reorder', headers: AUTH, payload: { ids: ['550e8400-e29b-41d4-a716-446655440000'] } });
    expect(res.statusCode).toBe(200);
  });
  it('POST reorder invalid → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/staff/reorder', headers: AUTH, payload: { ids: ['bad'] } });
    expect(res.statusCode).toBe(400);
  });
});

// ── Albums ──
describe('Albums', () => {
  it('GET → 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/albums' });
    expect(res.statusCode).toBe(200);
  });
  it('POST → 201', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/albums', headers: AUTH, payload: { title: '앨범' } });
    expect(res.statusCode).toBe(201);
  });
  it('POST invalid image → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/albums', headers: AUTH, payload: { title: 'X', images: ['bad'] } });
    expect(res.statusCode).toBe(400);
  });
});

// ── Events ──
describe('Events', () => {
  it('GET → 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/events' });
    expect(res.statusCode).toBe(200);
  });
  it('POST → 201', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/events', headers: AUTH, payload: { title: '행사' } });
    expect(res.statusCode).toBe(201);
  });
  it('POST invalid date → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/events', headers: AUTH, payload: { title: 'X', event_date: 'bad' } });
    expect(res.statusCode).toBe(400);
  });
  it('PUT missing → 404', async () => {
    const res = await app.inject({ method: 'PUT', url: '/api/v1/events/x', headers: AUTH, payload: { title: 'X' } });
    expect(res.statusCode).toBe(404);
  });
});

// ── Columns ──
describe('Columns', () => {
  it('GET → 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/columns' });
    expect(res.statusCode).toBe(200);
  });
  it('POST → 201', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/columns', headers: AUTH, payload: { title: '칼럼' } });
    expect(res.statusCode).toBe(201);
  });
  it('POST empty title → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/columns', headers: AUTH, payload: { title: '' } });
    expect(res.statusCode).toBe(400);
  });
});

// ── History ──
describe('History', () => {
  it('GET → 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/history' });
    expect(res.statusCode).toBe(200);
  });
  it('POST → 201', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/history', headers: AUTH, payload: { year: 2025, items: [{ content: '설립' }] } });
    expect(res.statusCode).toBe(201);
  });
  it('POST year out of range → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/history', headers: AUTH, payload: { year: 1800 } });
    expect(res.statusCode).toBe(400);
  });
  it('POST item no content → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/history', headers: AUTH, payload: { year: 2020, items: [{ month: 3 }] } });
    expect(res.statusCode).toBe(400);
  });
});
