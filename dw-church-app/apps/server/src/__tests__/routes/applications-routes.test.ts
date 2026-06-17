/**
 * 신청서(applications) route tests — public submit + super-admin gate + payment-link send.
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
const svc = {
  listApplications: vi.fn(), getApplication: vi.fn(), createApplication: vi.fn(),
  updateApplication: vi.fn(), deleteApplication: vi.fn(),
};
vi.mock('../../modules/applications/service.js', () => svc);
const sendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock('../../config/email.js', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
function token(role: string) {
  return jwt.sign({ userId: 'u1', email: 'a@a.com', role }, JWT_SECRET, { expiresIn: '1h' });
}

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  const { errorHandler } = await import('../../middleware/error-handler.js');
  app.setErrorHandler(errorHandler);
  const { applicationRoutes } = await import('../../modules/applications/routes.js');
  await app.register(applicationRoutes, { prefix: '/api/v1' });

  svc.createApplication.mockResolvedValue({ id: 'a1', church_name: '은혜교회', email: 'p@p.com', status: 'new' });
  svc.listApplications.mockResolvedValue([]);
  svc.getApplication.mockResolvedValue({ id: 'a1', church_name: '은혜교회', email: 'p@p.com', payment_link: null });
  svc.updateApplication.mockImplementation((_id: string, input: Record<string, unknown>) =>
    Promise.resolve({ id: 'a1', church_name: '은혜교회', email: 'p@p.com', status: input.status ?? 'new', payment_link: input.paymentLink ?? null }),
  );
});
afterAll(async () => { await app.close(); });

describe('public POST /applications', () => {
  it('accepts a submission with no auth → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/applications',
      payload: { churchName: '은혜교회', email: 'p@p.com', plan: 'basic' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe('a1');
  });

  it('rejects an invalid email → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/applications',
      payload: { churchName: '은혜교회', email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('admin /admin/applications gate', () => {
  it('list without token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/applications' });
    expect(res.statusCode).toBe(401);
  });

  it('list as non-super admin → 403', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/admin/applications',
      headers: { authorization: `Bearer ${token('admin')}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('list as super_admin → 200', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/admin/applications',
      headers: { authorization: `Bearer ${token('super_admin')}` },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('payment-link send', () => {
  it('sendPaymentLink with a link → emails applicant + status approved', async () => {
    sendEmail.mockClear();
    const res = await app.inject({
      method: 'PATCH', url: '/api/v1/admin/applications/a1',
      headers: { authorization: `Bearer ${token('super_admin')}` },
      payload: { paymentLink: 'https://buy.stripe.com/test', sendPaymentLink: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('approved');
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail.mock.calls[0][0].to).toBe('p@p.com');
  });

  it('sendPaymentLink with no link anywhere → 400', async () => {
    svc.getApplication.mockResolvedValueOnce({ id: 'a1', church_name: '은혜교회', email: 'p@p.com', payment_link: null });
    const res = await app.inject({
      method: 'PATCH', url: '/api/v1/admin/applications/a1',
      headers: { authorization: `Bearer ${token('super_admin')}` },
      payload: { sendPaymentLink: true },
    });
    expect(res.statusCode).toBe(400);
  });
});
