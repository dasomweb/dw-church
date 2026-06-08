/**
 * Content-entries schema tests — pins the CONTENT-layer contract used to
 * separate reusable content from page-section DESIGN.
 */
import { describe, it, expect } from 'vitest';
import { createContentEntrySchema, updateContentEntrySchema } from '../../modules/content-entries/schema.js';

describe('createContentEntrySchema', () => {
  it('accepts a typed, named entry with arbitrary content data', () => {
    const r = createContentEntrySchema.parse({
      type: 'text_image',
      name: '담임목사 인사말',
      data: { title: '환영합니다', content: '<p>...</p>', imageUrl: 'https://cdn/x.webp' },
    });
    expect(r.type).toBe('text_image');
    expect(r.name).toBe('담임목사 인사말');
    expect((r.data as Record<string, unknown>).title).toBe('환영합니다');
  });

  it('defaults data to {} when omitted', () => {
    const r = createContentEntrySchema.parse({ type: 'hero_banner', name: 'A' });
    expect(r.data).toEqual({});
  });

  it('rejects empty type or name', () => {
    expect(() => createContentEntrySchema.parse({ type: '', name: 'A' })).toThrow();
    expect(() => createContentEntrySchema.parse({ type: 'text_image', name: '' })).toThrow();
  });
});

describe('updateContentEntrySchema', () => {
  it('allows partial updates (name only / data only)', () => {
    expect(updateContentEntrySchema.parse({ name: '새 이름' }).name).toBe('새 이름');
    expect(updateContentEntrySchema.parse({ data: { title: 'x' } }).data).toEqual({ title: 'x' });
    expect(updateContentEntrySchema.parse({})).toEqual({});
  });
});
