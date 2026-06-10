import { describe, it, expect } from 'vitest';
import { createAlbumSchema, updateAlbumSchema } from '../../modules/albums/schema.js';

describe('createAlbumSchema', () => {
  const valid = { title: '2026 부활절 행사' };

  it('accepts valid input', () => {
    expect(createAlbumSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full input', () => {
    expect(createAlbumSchema.safeParse({
      ...valid,
      images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
      youtubeUrl: 'https://www.youtube.com/watch?v=abc',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      categoryIds: ['550e8400-e29b-41d4-a716-446655440000'],
      status: 'draft',
    }).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createAlbumSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('accepts lenient (non-URL) image strings', () => {
    // URLs are plain strings (not .url()) so empty/odd values don't 400.
    expect(createAlbumSchema.safeParse({ ...valid, images: ['not-url'] }).success).toBe(true);
  });

  it('accepts arbitrary categoryIds strings', () => {
    // categoryIds are plain strings (not .uuid()) — lenient by design.
    expect(createAlbumSchema.safeParse({ ...valid, categoryIds: ['not-uuid'] }).success).toBe(true);
  });

  it('defaults images to empty array', () => {
    const r = createAlbumSchema.safeParse(valid);
    if (r.success) expect(r.data.images).toEqual([]);
  });

  it('defaults categoryIds to empty array', () => {
    const r = createAlbumSchema.safeParse(valid);
    if (r.success) expect(r.data.categoryIds).toEqual([]);
  });

  it('defaults status to published', () => {
    const r = createAlbumSchema.safeParse(valid);
    if (r.success) expect(r.data.status).toBe('published');
  });
});

describe('updateAlbumSchema', () => {
  it('accepts partial', () => {
    expect(updateAlbumSchema.safeParse({ title: 'Updated' }).success).toBe(true);
  });
  it('accepts empty', () => {
    expect(updateAlbumSchema.safeParse({}).success).toBe(true);
  });
});
