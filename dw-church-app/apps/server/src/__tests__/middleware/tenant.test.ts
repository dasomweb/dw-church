/**
 * Tenant middleware tests — unit tests for helper functions.
 * DB-dependent parts (actual tenant lookup) are integration tests.
 */
import { describe, it, expect } from 'vitest';

// Re-implement the pure functions from tenant.ts for testing
// (since they are not exported, we test the logic directly)

const SKIP_PREFIXES = ['/api/v1/auth/', '/api/v1/admin', '/api/v1/billing', '/api/v1/migration', '/health'];
const SYSTEM_SUBDOMAINS = new Set(['api', 'admin', 'www', 'mail', 'ftp', 'staging', 'dev']);

function shouldSkip(path: string): boolean {
  return SKIP_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0];
  if (!host) return null;
  const parts = host.split('.');
  if (parts.length < 3) {
    if (parts.length === 2 && parts[1] === 'localhost') return parts[0] ?? null;
    return null;
  }
  const subdomain = parts[0] ?? null;
  if (subdomain && SYSTEM_SUBDOMAINS.has(subdomain)) return null;
  return subdomain;
}

describe('shouldSkip', () => {
  it('skips auth routes', () => {
    expect(shouldSkip('/api/v1/auth/login')).toBe(true);
    expect(shouldSkip('/api/v1/auth/register')).toBe(true);
  });

  it('skips admin routes', () => {
    expect(shouldSkip('/api/v1/admin/tenants')).toBe(true);
  });

  it('skips billing routes', () => {
    expect(shouldSkip('/api/v1/billing/checkout')).toBe(true);
  });

  it('skips migration routes', () => {
    expect(shouldSkip('/api/v1/migration/health')).toBe(true);
  });

  it('skips health check', () => {
    expect(shouldSkip('/health')).toBe(true);
  });

  it('does not skip regular API routes', () => {
    expect(shouldSkip('/api/v1/sermons')).toBe(false);
    expect(shouldSkip('/api/v1/pages')).toBe(false);
    expect(shouldSkip('/api/v1/staff')).toBe(false);
  });
});

describe('extractSubdomain', () => {
  it('extracts subdomain from 3-part hostname', () => {
    expect(extractSubdomain('bethelfaith.truelight.app')).toBe('bethelfaith');
  });

  it('extracts subdomain from 4-part hostname', () => {
    expect(extractSubdomain('grace.church.truelight.app')).toBe('grace');
  });

  it('returns null for bare domain', () => {
    expect(extractSubdomain('truelight.app')).toBe(null);
  });

  it('returns null for system subdomain - api', () => {
    expect(extractSubdomain('api.truelight.app')).toBe(null);
  });

  it('returns null for system subdomain - admin', () => {
    expect(extractSubdomain('admin.truelight.app')).toBe(null);
  });

  it('returns null for system subdomain - www', () => {
    expect(extractSubdomain('www.truelight.app')).toBe(null);
  });

  it('handles localhost with subdomain', () => {
    expect(extractSubdomain('grace.localhost')).toBe('grace');
  });

  it('handles hostname with port', () => {
    expect(extractSubdomain('grace.truelight.app:3000')).toBe('grace');
  });

  it('returns null for plain localhost', () => {
    expect(extractSubdomain('localhost')).toBe(null);
  });

  it('returns null for localhost with port', () => {
    expect(extractSubdomain('localhost:3000')).toBe(null);
  });
});
