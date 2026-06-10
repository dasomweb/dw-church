import { describe, it, expect } from 'vitest';
import { createBulletinSchema, updateBulletinSchema } from '../../modules/bulletins/schema.js';

describe('createBulletinSchema', () => {
  const valid = { title: '2024년 1월 주보', date: '2024-01-07' };

  it('accepts valid input', () => {
    expect(createBulletinSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full input with images', () => {
    const result = createBulletinSchema.safeParse({
      ...valid,
      pdfUrl: 'https://example.com/bulletin.pdf',
      images: ['https://example.com/img1.jpg'],
      thumbnailUrl: 'https://example.com/thumb.jpg',
      status: 'draft',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createBulletinSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
  });

  it('rejects invalid date', () => {
    expect(createBulletinSchema.safeParse({ ...valid, date: 'Jan 7' }).success).toBe(false);
  });

  it('accepts lenient (non-.url) string URL fields', () => {
    // pdfUrl/thumbnailUrl are plain max-length strings, not .url() validated
    expect(createBulletinSchema.safeParse({ ...valid, pdfUrl: 'not-a-url', thumbnailUrl: '' }).success).toBe(true);
  });

  it('defaults status to published', () => {
    const result = createBulletinSchema.safeParse(valid);
    if (result.success) expect(result.data.status).toBe('published');
  });

  it('defaults images to empty array', () => {
    const result = createBulletinSchema.safeParse(valid);
    if (result.success) expect(result.data.images).toEqual([]);
  });
});

describe('updateBulletinSchema', () => {
  it('accepts partial', () => {
    expect(updateBulletinSchema.safeParse({ title: 'Updated' }).success).toBe(true);
  });

  it('accepts empty', () => {
    expect(updateBulletinSchema.safeParse({}).success).toBe(true);
  });
});
