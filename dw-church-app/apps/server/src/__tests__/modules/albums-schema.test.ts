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
      youtube_url: 'https://www.youtube.com/watch?v=abc',
      thumbnail_url: 'https://example.com/thumb.jpg',
      category_id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'draft',
    }).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createAlbumSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('rejects invalid image URL in array', () => {
    expect(createAlbumSchema.safeParse({ ...valid, images: ['not-url'] }).success).toBe(false);
  });

  it('rejects invalid category_id', () => {
    expect(createAlbumSchema.safeParse({ ...valid, category_id: 'not-uuid' }).success).toBe(false);
  });

  it('defaults images to empty array', () => {
    const r = createAlbumSchema.safeParse(valid);
    if (r.success) expect(r.data.images).toEqual([]);
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
