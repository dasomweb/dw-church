/**
 * Generic form-submission route tests.
 *
 *   POST /forms/:formType is PUBLIC (storefront form blocks) → 201, validates
 *     the formType pattern. Admin inbox (list/get/update/delete) requires auth.
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

const formSvc = {
  listFormSubmissions: vi.fn(),
  getFormSubmission: vi.fn(),
  createFormSubmission: vi.fn(),
  updateFormSubmission: vi.fn(),
  deleteFormSubmission: vi.fn(),
  countNewFormSubmissions: vi.fn(),
};
vi.mock('../../modules/forms/service.js', () => formSvc);

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
function token(slug: string, role = 'admin') {
  return jwt.sign({ userId: 'u1', email: 't@t.com', tenantId: 't1', tenantSlug: slug, role }, JWT_SECRET, { expiresIn: '1h' });
}

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  const { errorHandler } = await import('../../middleware/error-handler.js');
  app.setErrorHandler(errorHandler);
  const { tenantMiddleware } = await import('../../middleware/tenant.js');
  app.addHook('preHandler', tenantMiddleware);
  const { formRoutes } = await import('../../modules/forms/routes.js');
  await app.register(formRoutes, { prefix: '/api/v1' });

  const { prisma } = await import('../../config/database.js');
  vi.mocked(prisma.tenant.findFirst).mockImplementation((args: { where?: { slug?: string } } = {}) => {
    const slug = args.where?.slug ?? 'demo';
    return Promise.resolve({ id: 't1', slug, name: `${slug} Church`, plan: 'basic', isActive: true } as Awaited<ReturnType<typeof prisma.tenant.findFirst>>);
  });
  formSvc.createFormSubmission.mockResolvedValue({ id: 'f1', form_type: 'contact', status: 'new' });
  formSvc.listFormSubmissions.mockResolvedValue([]);
  formSvc.updateFormSubmission.mockResolvedValue({ id: 'f1', status: 'done' });
});
afterAll(async () => { await app.close(); });

describe('forms — public submission', () => {
  it('POST /forms/contact (no auth) → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/forms/contact',
      headers: { 'x-tenant-slug': 'demo' },
      payload: { name: '홍길동', email: 'a@b.com', message: '문의드립니다' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.id).toBe('f1');
    expect(formSvc.createFormSubmission).toHaveBeenCalledWith('tenant_demo', 'contact', expect.objectContaining({ name: '홍길동' }));
  });

  it('POST /forms/cell_report (no auth) → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/forms/cell_report',
      headers: { 'x-tenant-slug': 'demo' },
      payload: { cellName: '사랑목장', leaderName: '김목자', report: '이번 주 모임 보고' },
    });
    expect(res.statusCode).toBe(201);
  });

  it('POST /forms/INVALID-TYPE → 400 (formType pattern)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/forms/Bad-Type',
      headers: { 'x-tenant-slug': 'demo' },
      payload: { name: 'x' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('forms — admin inbox (auth gate)', () => {
  it('GET /form-submissions without token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/form-submissions', headers: { 'x-tenant-slug': 'demo' } });
    expect(res.statusCode).toBe(401);
  });

  it('GET /form-submissions with token → 200', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/form-submissions?formType=contact',
      headers: { 'x-tenant-slug': 'demo', authorization: `Bearer ${token('demo')}` },
    });
    expect(res.statusCode).toBe(200);
    expect(formSvc.listFormSubmissions).toHaveBeenCalledWith('tenant_demo', { formType: 'contact', status: undefined });
  });

  it('PUT /form-submissions/:id updates status → 200', async () => {
    const res = await app.inject({
      method: 'PUT', url: '/api/v1/form-submissions/f1',
      headers: { 'x-tenant-slug': 'demo', authorization: `Bearer ${token('demo')}` },
      payload: { status: 'done', memo: '연락 완료' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('done');
  });

  it('DELETE /form-submissions/:id → 204', async () => {
    const res = await app.inject({
      method: 'DELETE', url: '/api/v1/form-submissions/f1',
      headers: { 'x-tenant-slug': 'demo', authorization: `Bearer ${token('demo')}` },
    });
    expect(res.statusCode).toBe(204);
  });
});
