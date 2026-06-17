/**
 * 고객지원 티켓 route tests — auth on create, super-admin gate, reply email.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

vi.mock('../../config/database.js', () => ({
  prisma: { tenant: { findFirst: vi.fn() }, $queryRawUnsafe: vi.fn(), $executeRawUnsafe: vi.fn() },
}));
vi.mock('../../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-characters-long', SUPER_ADMIN_EMAILS: [] },
}));
const svc = { listTickets: vi.fn(), getTicket: vi.fn(), createTicket: vi.fn(), updateTicket: vi.fn(), deleteTicket: vi.fn() };
vi.mock('../../modules/support/service.js', () => svc);
const sendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock('../../config/email.js', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
const tok = (role: string) => jwt.sign({ userId: 'u1', email: 'a@a.com', tenantSlug: 'grace', role }, JWT_SECRET, { expiresIn: '1h' });

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  const { errorHandler } = await import('../../middleware/error-handler.js');
  app.setErrorHandler(errorHandler);
  const { supportRoutes } = await import('../../modules/support/routes.js');
  await app.register(supportRoutes, { prefix: '/api/v1' });
  svc.createTicket.mockResolvedValue({ id: 't1', subject: 'help', status: 'open' });
  svc.listTickets.mockResolvedValue([]);
  svc.updateTicket.mockImplementation((_id: string, i: Record<string, unknown>) =>
    Promise.resolve({ id: 't1', subject: 'help', email: 'p@p.com', status: i.status ?? 'open', admin_reply: i.adminReply ?? '' }));
});
afterAll(async () => { await app.close(); });

describe('support tickets', () => {
  it('create without auth → 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/support-tickets', payload: { subject: 'help', message: 'x' } });
    expect(res.statusCode).toBe(401);
  });

  it('create as authed tenant admin → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/support-tickets',
      headers: { authorization: `Bearer ${tok('admin')}` }, payload: { subject: 'help', message: 'please' },
    });
    expect(res.statusCode).toBe(201);
  });

  it('admin list as non-super → 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/support-tickets', headers: { authorization: `Bearer ${tok('admin')}` } });
    expect(res.statusCode).toBe(403);
  });

  it('admin list as super_admin → 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/support-tickets', headers: { authorization: `Bearer ${tok('super_admin')}` } });
    expect(res.statusCode).toBe(200);
  });

  it('PATCH with sendReply emails the contact', async () => {
    sendEmail.mockClear();
    const res = await app.inject({
      method: 'PATCH', url: '/api/v1/admin/support-tickets/t1',
      headers: { authorization: `Bearer ${tok('super_admin')}` },
      payload: { adminReply: '도와드리겠습니다', sendReply: true, status: 'resolved' },
    });
    expect(res.statusCode).toBe(200);
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail.mock.calls[0][0].to).toBe('p@p.com');
  });
});
