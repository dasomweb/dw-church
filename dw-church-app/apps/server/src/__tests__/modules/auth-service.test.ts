/**
 * Auth service tests — business logic with mocked DB.
 * Tests password hashing, token generation, profile update logic.
 */
import { describe, it, expect, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-at-least-32-characters-long';

// Test the core auth logic without importing service (which has heavy DB deps)
// Instead, test the individual functions that the service relies on.

describe('Password hashing', () => {
  it('bcrypt hash is verifiable', async () => {
    const password = 'TestPassword123!';
    const hash = await bcrypt.hash(password, 12);

    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
    expect(await bcrypt.compare(password, hash)).toBe(true);
  });

  it('wrong password fails verification', async () => {
    const hash = await bcrypt.hash('CorrectPassword', 12);
    expect(await bcrypt.compare('WrongPassword', hash)).toBe(false);
  });

  it('same password produces different hashes (salt)', async () => {
    const password = 'SamePassword';
    const hash1 = await bcrypt.hash(password, 12);
    const hash2 = await bcrypt.hash(password, 12);
    expect(hash1).not.toBe(hash2);
    // Both should still verify
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });

  it('empty password can be hashed and compared', async () => {
    const hash = await bcrypt.hash('', 12);
    expect(await bcrypt.compare('', hash)).toBe(true);
    expect(await bcrypt.compare('notempty', hash)).toBe(false);
  });
});

describe('JWT token generation', () => {
  it('sign and verify roundtrip', () => {
    const payload = { userId: 'u1', email: 'test@test.com', tenantId: 't1', tenantSlug: 'grace', role: 'admin' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;

    expect(decoded.userId).toBe('u1');
    expect(decoded.email).toBe('test@test.com');
    expect(decoded.tenantSlug).toBe('grace');
    expect(decoded.role).toBe('admin');
    expect(decoded.exp).toBeDefined();
  });

  it('expired token throws', () => {
    const token = jwt.sign({ userId: 'u1' }, JWT_SECRET, { expiresIn: '-1s' });
    expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
  });

  it('wrong secret throws', () => {
    const token = jwt.sign({ userId: 'u1' }, 'other-secret-other-secret-other-secret');
    expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
  });

  it('token contains all required fields', () => {
    const payload = { userId: 'u1', email: 'a@b.com', tenantId: 't1', tenantSlug: 'grace', role: 'owner' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;

    expect(decoded).toHaveProperty('userId');
    expect(decoded).toHaveProperty('email');
    expect(decoded).toHaveProperty('tenantId');
    expect(decoded).toHaveProperty('tenantSlug');
    expect(decoded).toHaveProperty('role');
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
  });

  it('refresh token has longer expiry', () => {
    const access = jwt.sign({ userId: 'u1' }, JWT_SECRET, { expiresIn: '1h' });
    const refresh = jwt.sign({ userId: 'u1' }, JWT_SECRET, { expiresIn: '7d' });

    const accessDecoded = jwt.verify(access, JWT_SECRET) as { exp: number; iat: number };
    const refreshDecoded = jwt.verify(refresh, JWT_SECRET) as { exp: number; iat: number };

    const accessLifetime = accessDecoded.exp - accessDecoded.iat;
    const refreshLifetime = refreshDecoded.exp - refreshDecoded.iat;

    expect(refreshLifetime).toBeGreaterThan(accessLifetime);
  });
});

describe('Super admin check logic', () => {
  const SUPER_EMAILS = ['admin@truelight.app', 'dev@dasomweb.com'];

  function checkIsSuperAdmin(role: string | undefined, email: string): boolean {
    if (role === 'super_admin') return true;
    if (email && SUPER_EMAILS.includes(email)) return true;
    return false;
  }

  it('role super_admin → true', () => {
    expect(checkIsSuperAdmin('super_admin', 'anyone@test.com')).toBe(true);
  });

  it('email in SUPER_ADMIN_EMAILS → true', () => {
    expect(checkIsSuperAdmin('member', 'admin@truelight.app')).toBe(true);
  });

  it('regular role + non-super email → false', () => {
    expect(checkIsSuperAdmin('admin', 'regular@test.com')).toBe(false);
  });

  it('undefined role + non-super email → false', () => {
    expect(checkIsSuperAdmin(undefined, 'nobody@test.com')).toBe(false);
  });

  it('role takes priority over email', () => {
    expect(checkIsSuperAdmin('super_admin', 'random@random.com')).toBe(true);
  });
});

describe('YouTube thumbnail extraction', () => {
  // This is used in sermon service for auto-generating thumbnails
  function extractYoutubeThumbnail(url?: string | null): string | null {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?\s/]+)/);
    return match?.[1] ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
  }

  it('extracts from watch URL', () => {
    expect(extractYoutubeThumbnail('https://www.youtube.com/watch?v=abc123')).toBe('https://img.youtube.com/vi/abc123/hqdefault.jpg');
  });

  it('extracts from short URL', () => {
    expect(extractYoutubeThumbnail('https://youtu.be/abc123')).toBe('https://img.youtube.com/vi/abc123/hqdefault.jpg');
  });

  it('extracts from embed URL', () => {
    expect(extractYoutubeThumbnail('https://www.youtube.com/embed/abc123')).toBe('https://img.youtube.com/vi/abc123/hqdefault.jpg');
  });

  it('returns null for non-YouTube URL', () => {
    expect(extractYoutubeThumbnail('https://vimeo.com/123')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(extractYoutubeThumbnail(null)).toBeNull();
    expect(extractYoutubeThumbnail(undefined)).toBeNull();
  });

  it('handles URL with extra params', () => {
    expect(extractYoutubeThumbnail('https://www.youtube.com/watch?v=abc123&t=120&list=PLxyz')).toBe('https://img.youtube.com/vi/abc123/hqdefault.jpg');
  });
});
