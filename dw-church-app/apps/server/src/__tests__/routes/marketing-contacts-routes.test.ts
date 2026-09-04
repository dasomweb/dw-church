/**
 * 주소록(marketing_contacts) route tests — super-admin gate + validation + CRUD/import wiring.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';

vi.mock('../../config/database.js', () => ({
  prisma: { $queryRawUnsafe: vi.fn(), $executeRawUnsafe: vi.fn() },
}));
vi.mock('../../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-characters-long', SUPER_ADMIN_EMAILS: [] },
}));
const svc = {
  listContacts: vi.fn(), getStats: vi.fn(), listTags: vi.fn(),
  createContact: vi.fn(), updateContact: vi.fn(), deleteContact: vi.fn(),
  importContacts: vi.fn(), subscribedEmails: vi.fn(),
};
vi.mock('../../modules/marketing-contacts/service.js', () => svc);

const JWT_SECRET = 'test-secret-at-least-32-characters-long';
function token(role: string) {
  return jwt.sign({ userId: 'u1', email: 'a@a.com', role }, JWT_SECRET, { expiresIn: '1h' });
}
const sa = () => ({ authorization: `Bearer ${token('super_admin')}` });

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify();
  const { errorHandler } = await import('../../middleware/error-handler.js');
  app.setErrorHandler(errorHandler);
  const { marketingContactsRoutes } = await import('../../modules/marketing-contacts/routes.js');
  await app.register(marketingContactsRoutes, { prefix: '/api/v1' });

  svc.listContacts.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 50 });
  svc.getStats.mockResolvedValue({ total: 0, subscribed: 0, unsubscribed: 0 });
  svc.listTags.mockResolvedValue([]);
  svc.createContact.mockResolvedValue({ id: 'c1', email: 'p@p.com', name: '', tags: [], status: 'subscribed' });
  svc.updateContact.mockResolvedValue({ id: 'c1', email: 'p@p.com', status: 'unsubscribed' });
  svc.deleteContact.mockResolvedValue(true);
  svc.importContacts.mockResolvedValue({ received: 2, imported: 2, invalid: 0, invalidSamples: [] });
});
afterAll(async () => { await app.close(); });

describe('auth gate', () => {
  it('GET without token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/marketing-contacts' });
    expect(res.statusCode).toBe(401);
  });
  it('GET as non-super-admin → 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/marketing-contacts', headers: { authorization: `Bearer ${token('admin')}` } });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /admin/marketing-contacts', () => {
  it('super-admin → 200 with items/stats/tags', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/marketing-contacts', headers: sa() });
    expect(res.statusCode).toBe(200);
    const d = res.json().data;
    expect(d).toHaveProperty('items');
    expect(d).toHaveProperty('stats');
    expect(d).toHaveProperty('tags');
  });
});

describe('POST /admin/marketing-contacts', () => {
  it('invalid email → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/admin/marketing-contacts', headers: sa(), payload: { email: 'not-an-email' } });
    expect(res.statusCode).toBe(400);
  });
  it('valid → 201 and lowercases/trims email', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/admin/marketing-contacts', headers: sa(), payload: { email: '  P@P.com ', name: '홍길동', tags: ['nj'] } });
    expect(res.statusCode).toBe(201);
    expect(svc.createContact).toHaveBeenCalledWith(expect.objectContaining({ email: 'p@p.com' }));
  });
});

describe('POST /admin/marketing-contacts/import', () => {
  it('no data → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/admin/marketing-contacts/import', headers: sa(), payload: {} });
    expect(res.statusCode).toBe(400);
  });
  it('rows → 200 with counts', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/admin/marketing-contacts/import', headers: sa(),
      payload: { rows: [{ email: 'a@a.com' }, { email: 'b@b.com' }], tags: ['import-2026'] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.imported).toBe(2);
  });
});
