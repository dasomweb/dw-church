import { describe, it, expect } from 'vitest';
import { createStaffSchema, updateStaffSchema, reorderStaffSchema } from '../../modules/staff/schema.js';

describe('createStaffSchema', () => {
  const valid = { name: '박성호' };

  it('accepts valid minimal input', () => {
    expect(createStaffSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full input', () => {
    expect(createStaffSchema.safeParse({
      ...valid,
      role: '담임목사',
      department: '목회실',
      email: 'pastor@grace.church',
      phone: '770-555-1234',
      bio: '총신대학교 신학대학원 졸업.',
      photoUrl: 'https://example.com/photo.jpg',
      snsLinks: { youtube: 'https://youtube.com/@test', instagram: 'https://instagram.com/test' },
      order: 0,
      isActive: true,
    }).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(createStaffSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('rejects missing name', () => {
    expect(createStaffSchema.safeParse({ role: '부목사' }).success).toBe(false);
  });

  it('rejects name over 200 chars', () => {
    expect(createStaffSchema.safeParse({ name: 'a'.repeat(201) }).success).toBe(false);
  });

  it('accepts lenient (non-.email) email string', () => {
    // email is a plain string (not .email()) so a staff member with no real
    // email or an unusual value doesn't 400.
    expect(createStaffSchema.safeParse({ ...valid, email: 'not-email' }).success).toBe(true);
  });

  it('accepts lenient (non-URL) snsLinks strings', () => {
    // snsLinks values are plain optional strings, not .url() validated.
    expect(createStaffSchema.safeParse({ ...valid, snsLinks: { youtube: 'not-url' } }).success).toBe(true);
  });

  it('defaults order to 0', () => {
    const r = createStaffSchema.safeParse(valid);
    if (r.success) expect(r.data.order).toBe(0);
  });

  it('defaults isActive to true', () => {
    const r = createStaffSchema.safeParse(valid);
    if (r.success) expect(r.data.isActive).toBe(true);
  });

  it('allows null optional fields', () => {
    expect(createStaffSchema.safeParse({ ...valid, role: null, department: null, bio: null }).success).toBe(true);
  });
});

describe('updateStaffSchema', () => {
  it('accepts partial', () => {
    expect(updateStaffSchema.safeParse({ role: '부목사' }).success).toBe(true);
  });
  it('accepts empty', () => {
    expect(updateStaffSchema.safeParse({}).success).toBe(true);
  });
});

describe('reorderStaffSchema', () => {
  it('accepts valid UUID array', () => {
    expect(reorderStaffSchema.safeParse({
      ids: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
    }).success).toBe(true);
  });

  it('rejects empty array', () => {
    expect(reorderStaffSchema.safeParse({ ids: [] }).success).toBe(false);
  });

  it('rejects non-UUID', () => {
    expect(reorderStaffSchema.safeParse({ ids: ['not-uuid'] }).success).toBe(false);
  });
});
