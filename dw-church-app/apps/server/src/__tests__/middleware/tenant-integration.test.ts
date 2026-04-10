/**
 * Tenant middleware integration test — imports actual middleware,
 * mocks prisma for tenant lookup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindFirst = vi.fn();
const mockQueryRawUnsafe = vi.fn();

vi.mock('../../config/database.js', () => ({
  prisma: {
    tenant: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
    $queryRawUnsafe: (...args: unknown[]) => mockQueryRawUnsafe(...args),
  },
}));

vi.mock('../../config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret-at-least-32-characters-long' },
}));

import { tenantMiddleware } from '../../middleware/tenant.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

function makeRequest(url: string, hostname: string, headers: Record<string, string> = {}): FastifyRequest {
  return {
    url,
    hostname,
    headers,
    tenant: undefined,
    tenantSchema: undefined,
  } as unknown as FastifyRequest;
}

const mockReply = {} as FastifyReply;

describe('tenantMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips auth routes', async () => {
    const req = makeRequest('/api/v1/auth/login', 'api.truelight.app');
    await tenantMiddleware(req, mockReply);
    expect(req.tenant).toBeUndefined();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it('skips admin routes', async () => {
    const req = makeRequest('/api/v1/admin/tenants', 'api.truelight.app');
    await tenantMiddleware(req, mockReply);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it('skips migration routes', async () => {
    const req = makeRequest('/api/v1/migration/health', 'api.truelight.app');
    await tenantMiddleware(req, mockReply);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it('skips health check', async () => {
    const req = makeRequest('/health', 'api.truelight.app');
    await tenantMiddleware(req, mockReply);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it('resolves tenant from X-Tenant-Slug header', async () => {
    mockFindFirst.mockResolvedValue({ id: 't1', slug: 'grace', name: 'Grace Church', plan: 'free' });

    const req = makeRequest('/api/v1/sermons', 'api.truelight.app', { 'x-tenant-slug': 'grace' });
    await tenantMiddleware(req, mockReply);

    expect(req.tenant).toBeDefined();
    expect(req.tenant!.slug).toBe('grace');
    expect(req.tenantSchema).toBe('tenant_grace');
  });

  it('resolves tenant from subdomain', async () => {
    mockFindFirst.mockResolvedValue({ id: 't2', slug: 'bethelfaith', name: 'Bethel', plan: 'free' });

    const req = makeRequest('/api/v1/sermons', 'bethelfaith.truelight.app');
    await tenantMiddleware(req, mockReply);

    expect(req.tenant).toBeDefined();
    expect(req.tenant!.slug).toBe('bethelfaith');
  });

  it('skips system subdomains (api, admin, www)', async () => {
    mockQueryRawUnsafe.mockResolvedValue([]); // custom domain lookup returns empty
    const req = makeRequest('/api/v1/sermons', 'api.truelight.app');
    await tenantMiddleware(req, mockReply);
    // System subdomain → no tenant resolved, falls through to custom domain check which returns empty
    expect(req.tenant).toBeUndefined();
  });

  it('throws TENANT_NOT_FOUND for unknown tenant subdomain', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockQueryRawUnsafe.mockResolvedValue([]);

    const req = makeRequest('/api/v1/sermons', 'nonexistent.truelight.app');
    await expect(tenantMiddleware(req, mockReply)).rejects.toThrow("Tenant 'nonexistent' not found");
  });

  it('resolves tenant from custom domain', async () => {
    mockFindFirst.mockResolvedValue(null); // subdomain lookup returns null
    mockQueryRawUnsafe.mockResolvedValue([{ id: 't3', slug: 'custom', name: 'Custom Church', plan: 'pro' }]);

    const req = makeRequest('/api/v1/pages', 'mychurch.org');
    await tenantMiddleware(req, mockReply);

    expect(req.tenant).toBeDefined();
    expect(req.tenant!.slug).toBe('custom');
  });

  it('header takes priority over subdomain', async () => {
    mockFindFirst
      .mockResolvedValueOnce({ id: 't1', slug: 'grace', name: 'Grace', plan: 'free' }); // header lookup

    const req = makeRequest('/api/v1/sermons', 'bethelfaith.truelight.app', { 'x-tenant-slug': 'grace' });
    await tenantMiddleware(req, mockReply);

    expect(req.tenant!.slug).toBe('grace'); // header wins
  });
});
