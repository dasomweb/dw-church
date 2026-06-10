import { describe, it, expect } from 'vitest';
import { createSermonSchema, updateSermonSchema } from '../../modules/sermons/schema.js';

describe('createSermonSchema', () => {
  const valid = {
    title: '믿음의 사람들',
    date: '2024-03-15',
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
      youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
      thumbnailUrl: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
      preacher: '김목사',
      category: '주일예배',
      categoryIds: ['550e8400-e29b-41d4-a716-446655440001'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createSermonSchema.safeParse({ ...valid, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const result = createSermonSchema.safeParse({ date: '2024-03-15' });
    expect(result.success).toBe(false);
  });

  it('rejects missing date', () => {
    const result = createSermonSchema.safeParse({ title: 'Test' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = createSermonSchema.safeParse({ ...valid, date: '2024/03/15' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format (no dashes)', () => {
    const result = createSermonSchema.safeParse({ ...valid, date: '20240315' });
    expect(result.success).toBe(false);
  });

  it('rejects non-date string', () => {
    const result = createSermonSchema.safeParse({ ...valid, date: 'notadate' });
    expect(result.success).toBe(false);
  });

  it('accepts a plain-string youtube URL (not .url() validated)', () => {
    // URL fields are plain strings now — empties / non-URLs no longer 400.
    const result = createSermonSchema.safeParse({ ...valid, youtubeUrl: 'not-a-url' });
    expect(result.success).toBe(true);
  });

  it('allows null optional fields', () => {
    const result = createSermonSchema.safeParse({
      ...valid,
      scripture: null,
      youtubeUrl: null,
      thumbnailUrl: null,
      preacher: null,
      category: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = createSermonSchema.safeParse({ ...valid, status: 'archived' });
    expect(result.success).toBe(false);
  });

  it('defaults status to published', () => {
    const result = createSermonSchema.safeParse({ title: 'Test', date: '2024-01-01' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('published');
    }
  });

  it('defaults categoryIds to empty array', () => {
    const result = createSermonSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoryIds).toEqual([]);
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

  it('parses known camelCase fields on partial update', () => {
    // Schema uses .passthrough(), so unknown keys are allowed — assert the
    // known fields still parse with the correct shape instead of expecting
    // rejection.
    const result = updateSermonSchema.safeParse({
      youtubeUrl: 'https://youtu.be/abc',
      preacher: '이목사',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.youtubeUrl).toBe('https://youtu.be/abc');
      expect(result.data.preacher).toBe('이목사');
    }
  });

  it('still enforces date format on partial update', () => {
    const result = updateSermonSchema.safeParse({ date: 'bad-date' });
    expect(result.success).toBe(false);
  });
});
