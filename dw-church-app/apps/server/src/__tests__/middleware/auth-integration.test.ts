/**
 * Auth middleware integration test — imports actual middleware,
 * mocks jwt and prisma dependencies.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Mock prisma before importing middleware
vi.mock('../../config/database.js', () => ({
  prisma: {
    tenant: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

// Mock env
vi.mock('../../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-at-least-32-characters-long',
    SUPER_ADMIN_EMAILS: ['admin@test.com'],
  },
}));

import { requireAuth, requireAdmin, requireOwner, optionalAuth } from '../../middleware/auth.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

const JWT_SECRET = 'test-secret-at-least-32-characters-long';

function makeRequest(token?: string): FastifyRequest {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    user: undefined,
    tenant: undefined,
    tenantSchema: undefined,
  } as unknown as FastifyRequest;
}

const mockReply = {} as FastifyReply;

function signToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws UNAUTHORIZED when no token', async () => {
    const req = makeRequest();
    await expect(requireAuth(req, mockReply)).rejects.toThrow('Missing authorization token');
  });

  it('throws UNAUTHORIZED for invalid token', async () => {
    const req = makeRequest('invalid.jwt.token');
    await expect(requireAuth(req, mockReply)).rejects.toThrow('Invalid or expired token');
  });

  it('sets request.user for valid token', async () => {
    const token = signToken({
      userId: 'user-123',
      email: 'test@test.com',
      tenantId: 'tenant-1',
      tenantSlug: 'grace',
      role: 'admin',
    });
    const req = makeRequest(token);
    await requireAuth(req, mockReply);

    expect(req.user).toBeDefined();
    expect(req.user!.id).toBe('user-123');
    expect(req.user!.email).toBe('test@test.com');
    expect(req.user!.role).toBe('admin');
  });

  it('throws for expired token', async () => {
    const token = jwt.sign(
      { userId: 'user-123', email: 'test@test.com', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '-1s' },
    );
    const req = makeRequest(token);
    await expect(requireAuth(req, mockReply)).rejects.toThrow('Invalid or expired token');
  });

  it('throws for wrong secret', async () => {
    const token = jwt.sign({ userId: 'user-123' }, 'wrong-secret-wrong-secret-wrong-secret');
    const req = makeRequest(token);
    await expect(requireAuth(req, mockReply)).rejects.toThrow('Invalid or expired token');
  });
});

describe('requireAdmin', () => {
  it('passes for admin role', async () => {
    const token = signToken({ userId: 'u1', email: 'a@b.com', tenantId: 't1', tenantSlug: 's', role: 'admin' });
    const req = makeRequest(token);
    await expect(requireAdmin(req, mockReply)).resolves.toBeUndefined();
  });

  it('passes for owner role', async () => {
    const token = signToken({ userId: 'u1', email: 'a@b.com', tenantId: 't1', tenantSlug: 's', role: 'owner' });
    const req = makeRequest(token);
    await expect(requireAdmin(req, mockReply)).resolves.toBeUndefined();
  });

  it('passes for super_admin role', async () => {
    const token = signToken({ userId: 'u1', email: 'a@b.com', tenantId: 't1', tenantSlug: 's', role: 'super_admin' });
    const req = makeRequest(token);
    await expect(requireAdmin(req, mockReply)).resolves.toBeUndefined();
  });

  it('throws FORBIDDEN for member role', async () => {
    const token = signToken({ userId: 'u1', email: 'a@b.com', tenantId: 't1', tenantSlug: 's', role: 'member' });
    const req = makeRequest(token);
    await expect(requireAdmin(req, mockReply)).rejects.toThrow('Admin access required');
  });

  it('throws FORBIDDEN for editor role', async () => {
    const token = signToken({ userId: 'u1', email: 'a@b.com', tenantId: 't1', tenantSlug: 's', role: 'editor' });
    const req = makeRequest(token);
    await expect(requireAdmin(req, mockReply)).rejects.toThrow('Admin access required');
  });
});

describe('requireOwner', () => {
  it('passes for owner role', async () => {
    const token = signToken({ userId: 'u1', email: 'a@b.com', tenantId: 't1', tenantSlug: 's', role: 'owner' });
    const req = makeRequest(token);
    await expect(requireOwner(req, mockReply)).resolves.toBeUndefined();
  });

  it('passes for super_admin', async () => {
    const token = signToken({ userId: 'u1', email: 'a@b.com', tenantId: 't1', tenantSlug: 's', role: 'super_admin' });
    const req = makeRequest(token);
    await expect(requireOwner(req, mockReply)).resolves.toBeUndefined();
  });

  it('throws FORBIDDEN for admin role', async () => {
    const token = signToken({ userId: 'u1', email: 'a@b.com', tenantId: 't1', tenantSlug: 's', role: 'admin' });
    const req = makeRequest(token);
    await expect(requireOwner(req, mockReply)).rejects.toThrow('Owner access required');
  });
});

describe('optionalAuth', () => {
  it('sets user for valid token', async () => {
    const token = signToken({ userId: 'u1', email: 'a@b.com', tenantId: 't1', tenantSlug: 's', role: 'member' });
    const req = makeRequest(token);
    await optionalAuth(req, mockReply);
    expect(req.user).toBeDefined();
    expect(req.user!.id).toBe('u1');
  });

  it('does not throw for missing token', async () => {
    const req = makeRequest();
    await optionalAuth(req, mockReply);
    expect(req.user).toBeUndefined();
  });

  it('does not throw for invalid token', async () => {
    const req = makeRequest('bad.token.here');
    await optionalAuth(req, mockReply);
    expect(req.user).toBeUndefined();
  });
});
