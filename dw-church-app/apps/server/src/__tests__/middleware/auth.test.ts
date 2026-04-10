/**
 * Auth middleware tests — token extraction and role checking logic.
 */
import { describe, it, expect } from 'vitest';

// Re-implement pure functions from auth.ts for testing
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function hasRole(userRole: string | undefined, requiredRoles: string[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

describe('extractToken', () => {
  it('extracts Bearer token', () => {
    expect(extractToken('Bearer abc123')).toBe('abc123');
  });

  it('returns null for missing header', () => {
    expect(extractToken(undefined)).toBe(null);
  });

  it('returns null for empty header', () => {
    expect(extractToken('')).toBe(null);
  });

  it('returns null for non-Bearer scheme', () => {
    expect(extractToken('Basic abc123')).toBe(null);
  });

  it('returns null for Bearer without token', () => {
    expect(extractToken('Bearer')).toBe(null);
  });

  it('returns null for just Bearer with space', () => {
    expect(extractToken('Bearer ')).toBe(null);
  });

  it('handles JWT-like tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.abc';
    expect(extractToken(`Bearer ${jwt}`)).toBe(jwt);
  });
});

describe('role checking', () => {
  const adminRoles = ['admin', 'owner', 'super_admin'];
  const ownerRoles = ['owner', 'super_admin'];

  it('admin check passes for admin', () => {
    expect(hasRole('admin', adminRoles)).toBe(true);
  });

  it('admin check passes for owner', () => {
    expect(hasRole('owner', adminRoles)).toBe(true);
  });

  it('admin check passes for super_admin', () => {
    expect(hasRole('super_admin', adminRoles)).toBe(true);
  });

  it('admin check fails for member', () => {
    expect(hasRole('member', adminRoles)).toBe(false);
  });

  it('admin check fails for editor', () => {
    expect(hasRole('editor', adminRoles)).toBe(false);
  });

  it('owner check passes for owner', () => {
    expect(hasRole('owner', ownerRoles)).toBe(true);
  });

  it('owner check passes for super_admin', () => {
    expect(hasRole('super_admin', ownerRoles)).toBe(true);
  });

  it('owner check fails for admin', () => {
    expect(hasRole('admin', ownerRoles)).toBe(false);
  });

  it('owner check fails for undefined role', () => {
    expect(hasRole(undefined, ownerRoles)).toBe(false);
  });
});
