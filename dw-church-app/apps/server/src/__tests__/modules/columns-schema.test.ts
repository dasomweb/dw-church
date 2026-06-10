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
      topImageUrl: 'https://example.com/img.jpg',
      bottomImageUrl: 'https://example.com/img2.jpg',
      youtubeUrl: 'https://www.youtube.com/watch?v=abc',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      status: 'draft',
    }).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createColumnSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('rejects missing title', () => {
    expect(createColumnSchema.safeParse({ content: 'no title here' }).success).toBe(false);
  });

  it('accepts lenient (non-.url) youtubeUrl string', () => {
    // youtubeUrl is a plain max-length string, not .url() validated
    expect(createColumnSchema.safeParse({ ...valid, youtubeUrl: 'not-url' }).success).toBe(true);
  });

  it('defaults status to published', () => {
    const r = createColumnSchema.safeParse(valid);
    if (r.success) expect(r.data.status).toBe('published');
  });

  it('allows null optional fields', () => {
    expect(createColumnSchema.safeParse({ ...valid, content: null, topImageUrl: null }).success).toBe(true);
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
