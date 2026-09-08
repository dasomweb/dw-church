import { describe, it, expect } from 'vitest';
import { sanitizePermissions, staffMayAccess } from '../../modules/auth/capabilities.js';

describe('sanitizePermissions', () => {
  it('keeps only valid capability keys, de-duplicated', () => {
    expect(sanitizePermissions(['newcomer', 'bogus', 'newcomer', 'content'])).toEqual(['newcomer', 'content']);
  });
  it('returns [] for non-arrays', () => {
    expect(sanitizePermissions(null)).toEqual([]);
    expect(sanitizePermissions('newcomer')).toEqual([]);
  });
});

describe('staffMayAccess', () => {
  it('allows a guarded path only with the matching capability', () => {
    expect(staffMayAccess(['newcomer'], '/api/v1/newcomers')).toBe(true);
    expect(staffMayAccess(['newcomer'], '/api/v1/newcomers/123/history')).toBe(true);
    expect(staffMayAccess(['newcomer'], '/api/v1/members')).toBe(false);
    expect(staffMayAccess(['membership'], '/api/v1/members/abc')).toBe(true);
    expect(staffMayAccess(['content'], '/api/v1/sermons?page=1')).toBe(true);
    expect(staffMayAccess(['content'], '/api/v1/newcomers')).toBe(false);
  });

  it('allows the shared 목장 report endpoint for smallgroup OR group_report', () => {
    expect(staffMayAccess(['group_report'], '/api/v1/meeting-reports')).toBe(true);
    expect(staffMayAccess(['smallgroup'], '/api/v1/meeting-reports/draft')).toBe(true);
    expect(staffMayAccess(['newcomer'], '/api/v1/meeting-reports')).toBe(false);
  });

  it('a 목자 (group_report only) cannot reach full smallgroup admin', () => {
    expect(staffMayAccess(['group_report'], '/api/v1/groups')).toBe(false);
    expect(staffMayAccess(['group_report'], '/api/v1/meeting-reports')).toBe(true);
  });

  it('leaves ungated paths (auth, entitlements, uploads) open', () => {
    expect(staffMayAccess([], '/api/v1/auth/me')).toBe(true);
    expect(staffMayAccess([], '/api/v1/admin/entitlements')).toBe(true);
  });
});
