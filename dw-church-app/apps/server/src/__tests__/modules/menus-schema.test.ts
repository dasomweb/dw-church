import { describe, it, expect } from 'vitest';
import { createMenuSchema, updateMenuSchema, reorderMenuSchema } from '../../modules/menus/schema.js';

describe('createMenuSchema', () => {
  const valid = { label: '교회안내' };

  it('accepts valid minimal input', () => {
    expect(createMenuSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full input', () => {
    expect(createMenuSchema.safeParse({
      ...valid,
      pageId: '550e8400-e29b-41d4-a716-446655440000',
      externalUrl: 'https://example.com',
      parentId: '550e8400-e29b-41d4-a716-446655440001',
      sortOrder: 1,
      isVisible: true,
    }).success).toBe(true);
  });

  it('rejects empty label', () => {
    expect(createMenuSchema.safeParse({ label: '' }).success).toBe(false);
  });

  it('rejects label over 100 chars', () => {
    expect(createMenuSchema.safeParse({ label: 'a'.repeat(101) }).success).toBe(false);
  });

  it('rejects invalid pageId', () => {
    expect(createMenuSchema.safeParse({ ...valid, pageId: 'not-uuid' }).success).toBe(false);
  });

  it('rejects invalid externalUrl', () => {
    expect(createMenuSchema.safeParse({ ...valid, externalUrl: 'not-url' }).success).toBe(false);
  });

  it('defaults sortOrder to 0', () => {
    const r = createMenuSchema.safeParse(valid);
    if (r.success) expect(r.data.sortOrder).toBe(0);
  });

  it('defaults isVisible to true', () => {
    const r = createMenuSchema.safeParse(valid);
    if (r.success) expect(r.data.isVisible).toBe(true);
  });

  it('allows null pageId and parentId', () => {
    expect(createMenuSchema.safeParse({ ...valid, pageId: null, parentId: null }).success).toBe(true);
  });
});

describe('updateMenuSchema', () => {
  it('accepts partial', () => {
    expect(updateMenuSchema.safeParse({ label: 'Updated' }).success).toBe(true);
  });
  it('accepts isVisible change', () => {
    expect(updateMenuSchema.safeParse({ isVisible: false }).success).toBe(true);
  });
  it('accepts empty', () => {
    expect(updateMenuSchema.safeParse({}).success).toBe(true);
  });
});

describe('reorderMenuSchema', () => {
  it('accepts valid items', () => {
    expect(reorderMenuSchema.safeParse({
      items: [
        { id: '550e8400-e29b-41d4-a716-446655440000', parentId: null, sortOrder: 0 },
        { id: '550e8400-e29b-41d4-a716-446655440001', parentId: '550e8400-e29b-41d4-a716-446655440000', sortOrder: 0 },
      ],
    }).success).toBe(true);
  });

  it('rejects invalid UUID in items', () => {
    expect(reorderMenuSchema.safeParse({
      items: [{ id: 'bad', parentId: null, sortOrder: 0 }],
    }).success).toBe(false);
  });

  it('rejects missing sortOrder', () => {
    expect(reorderMenuSchema.safeParse({
      items: [{ id: '550e8400-e29b-41d4-a716-446655440000', parentId: null }],
    }).success).toBe(false);
  });
});
