import { describe, it, expect } from 'vitest';
import { createColumnSchema, updateColumnSchema } from '../../modules/columns/schema.js';

describe('createColumnSchema', () => {
  const valid = { title: '봄이 오는 길목에서' };

  it('accepts valid input', () => {
    expect(createColumnSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full input', () => {
    expect(createColumnSchema.safeParse({
      ...valid,
      content: '따스한 봄바람이 불어오는 계절입니다.',
      top_image_url: 'https://example.com/img.jpg',
      bottom_image_url: 'https://example.com/img2.jpg',
      youtube_url: 'https://www.youtube.com/watch?v=abc',
      thumbnail_url: 'https://example.com/thumb.jpg',
      status: 'draft',
    }).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createColumnSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('rejects invalid URL', () => {
    expect(createColumnSchema.safeParse({ ...valid, youtube_url: 'not-url' }).success).toBe(false);
  });

  it('defaults status to published', () => {
    const r = createColumnSchema.safeParse(valid);
    if (r.success) expect(r.data.status).toBe('published');
  });

  it('allows null optional fields', () => {
    expect(createColumnSchema.safeParse({ ...valid, content: null, top_image_url: null }).success).toBe(true);
  });
});

describe('updateColumnSchema', () => {
  it('accepts partial', () => {
    expect(updateColumnSchema.safeParse({ content: 'Updated' }).success).toBe(true);
  });
  it('accepts empty', () => {
    expect(updateColumnSchema.safeParse({}).success).toBe(true);
  });
});
