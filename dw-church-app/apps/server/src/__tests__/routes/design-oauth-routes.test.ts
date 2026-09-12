/**
 * Claude Design OAuth routes — local-connector model.
 * Auth gate (super-admin only) + connect lifecycle (init → complete → status),
 * with prisma mocked at the raw-query level (the service IS the logic under test).
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
// Avoid real network in the MCP probe test.
vi.mock('../../modules/design-oauth/mcp-client.js', () => ({
  probeTools: vi.fn().mockResolvedValue([{ name: 'list_files' }, { name: 'get_file' }]),
}));

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
const superToken = () => jwt.sign({ userId: 'super1', email: 's@t.com', role: 'super_admin' }, JWT_SECRET, { expiresIn: '1h' });
const adminToken = () => jwt.sign({ userId: 'u2', email: 'a@t.com', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

// Controllable canned rows the mocked SELECTs return.
let connectRow: { user_id: string }[] = [];
let oauthRow: { access_token: string; refresh_token: string | null; expires_at: Date | null; client_id: string | null; scope?: string | null; updated_at?: Date }[] = [];

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  const { errorHandler } = await import('../../middleware/error-handler.js');
  app.setErrorHandler(errorHandler);
  const { designOauthRoutes } = await import('../../modules/design-oauth/routes.js');
  await app.register(designOauthRoutes, { prefix: '/api/v1' });

  const { prisma } = await import('../../config/database.js');
  vi.mocked(prisma.$queryRawUnsafe).mockImplementation((sql: unknown) => {
    const s = String(sql);
    if (s.includes('design_oauth_connect')) return Promise.resolve(connectRow as never);
    if (s.includes('FROM public.design_oauth')) return Promise.resolve(oauthRow as never);
    return Promise.resolve([] as never);
  });
  vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(0 as never);
});
afterAll(async () => { await app.close(); });
beforeEach(() => { connectRow = []; oauthRow = []; vi.clearAllMocks(); });

describe('design-oauth — auth gate', () => {
  it('GET /design/oauth/status without token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/design/oauth/status' });
    expect(res.statusCode).toBe(401);
  });
  it('POST /design/oauth/local/init as non-super-admin → 403', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/design/oauth/local/init', headers: { authorization: `Bearer ${adminToken()}` }, payload: {} });
    expect(res.statusCode).toBe(403);
  });
});

describe('design-oauth — status', () => {
  it('returns connected:false when no row', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/design/oauth/status', headers: { authorization: `Bearer ${superToken()}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual({ connected: false });
  });
});

describe('design-oauth — local connect lifecycle', () => {
  it('init mints a connect_token + the exact local command', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/design/oauth/local/init', headers: { authorization: `Bearer ${superToken()}` }, payload: {} });
    expect(res.statusCode).toBe(200);
    const { connectToken, command } = res.json().data;
    expect(connectToken).toBeTruthy();
    expect(command).toContain('node scripts/design-connect.mjs');
    expect(command).toContain(connectToken);
  });

  it('complete rejects missing fields → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/design/oauth/local/complete', payload: { connectToken: 'x' } });
    expect(res.statusCode).toBe(400);
  });

  it('complete rejects an unknown/expired connect_token → 400', async () => {
    connectRow = []; // no matching pending row
    const res = await app.inject({
      method: 'POST', url: '/api/v1/design/oauth/local/complete',
      payload: { connectToken: 'bogus', clientId: 'c1', accessToken: 'a1' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('complete stores tokens for the bound user when the connect_token is valid', async () => {
    connectRow = [{ user_id: 'super1' }];
    const { prisma } = await import('../../config/database.js');
    const res = await app.inject({
      method: 'POST', url: '/api/v1/design/oauth/local/complete',
      payload: { connectToken: 'good', clientId: 'client-xyz', accessToken: 'access-xyz', refreshToken: 'refresh-xyz', expiresIn: 3600, scope: 'user:design:read user:design:write' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.ok).toBe(true);
    // The upsert into design_oauth must have run with the client_id + tokens.
    const calls = vi.mocked(prisma.$executeRawUnsafe).mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => s.includes('INSERT INTO public.design_oauth') && s.includes('ON CONFLICT'))).toBe(true);
    const upsert = vi.mocked(prisma.$executeRawUnsafe).mock.calls.find((c) => String(c[0]).includes('INSERT INTO public.design_oauth'))!;
    expect(upsert).toContain('client-xyz');
    expect(upsert).toContain('access-xyz');
  });
});

describe('design-oauth — MCP probe', () => {
  it('probes tools/list with a stored token', async () => {
    oauthRow = [{ access_token: 'a1', refresh_token: null, expires_at: null, client_id: 'c1' }];
    const res = await app.inject({ method: 'POST', url: '/api/v1/design/oauth/mcp/probe', headers: { authorization: `Bearer ${superToken()}` }, payload: {} });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.tools.map((t: { name: string }) => t.name)).toContain('list_files');
  });
});
