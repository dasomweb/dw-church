import { describe, it, expect } from 'vitest';
import { createSermonSchema, updateSermonSchema } from '../../modules/sermons/schema.js';

describe('createSermonSchema', () => {
  const valid = {
    title: '믿음의 사람들',
    sermon_date: '2024-01-07',
    status: 'published' as const,
  };

  it('accepts valid minimal input', () => {
    const result = createSermonSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts valid full input', () => {
    const result = createSermonSchema.safeParse({
      ...valid,
      scripture: '히브리서 11:1-6',
      youtube_url: 'https://www.youtube.com/watch?v=abc123',
      thumbnail_url: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
      preacher_id: '550e8400-e29b-41d4-a716-446655440000',
      category_ids: ['550e8400-e29b-41d4-a716-446655440001'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createSermonSchema.safeParse({ ...valid, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = createSermonSchema.safeParse({ ...valid, sermon_date: '01-07-2024' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format (no dashes)', () => {
    const result = createSermonSchema.safeParse({ ...valid, sermon_date: '20240107' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid youtube URL', () => {
    const result = createSermonSchema.safeParse({ ...valid, youtube_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('allows null optional fields', () => {
    const result = createSermonSchema.safeParse({
      ...valid,
      scripture: null,
      youtube_url: null,
      thumbnail_url: null,
      preacher_id: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = createSermonSchema.safeParse({ ...valid, status: 'archived' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid preacher_id (not UUID)', () => {
    const result = createSermonSchema.safeParse({ ...valid, preacher_id: 'not-uuid' });
    expect(result.success).toBe(false);
  });

  it('defaults status to published', () => {
    const result = createSermonSchema.safeParse({ title: 'Test', sermon_date: '2024-01-01' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('published');
    }
  });

  it('defaults category_ids to empty array', () => {
    const result = createSermonSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category_ids).toEqual([]);
    }
  });
});

describe('updateSermonSchema', () => {
  it('accepts partial update (title only)', () => {
    const result = updateSermonSchema.safeParse({ title: 'Updated' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updateSermonSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid field in partial', () => {
    const result = updateSermonSchema.safeParse({ youtube_url: 'bad' });
    expect(result.success).toBe(false);
  });
});
