import { describe, it, expect } from 'vitest';
import { createEventSchema, updateEventSchema } from '../../modules/events/schema.js';

describe('createEventSchema', () => {
  const valid = { title: '부활절 특별예배' };

  it('accepts valid minimal input', () => {
    expect(createEventSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full input', () => {
    expect(createEventSchema.safeParse({
      ...valid,
      background_image_url: 'https://example.com/img.jpg',
      image_only: false,
      department: '예배부',
      event_date: '2026-04-20',
      location: '본당',
      link_url: 'https://example.com',
      description: '부활의 기쁨을 함께 나누는 특별예배입니다.',
      youtube_url: 'https://www.youtube.com/watch?v=abc',
      thumbnail_url: 'https://example.com/thumb.jpg',
      status: 'draft',
    }).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createEventSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('rejects invalid date format', () => {
    expect(createEventSchema.safeParse({ ...valid, event_date: 'April 20' }).success).toBe(false);
  });

  it('defaults image_only to false', () => {
    const r = createEventSchema.safeParse(valid);
    if (r.success) expect(r.data.image_only).toBe(false);
  });

  it('defaults status to published', () => {
    const r = createEventSchema.safeParse(valid);
    if (r.success) expect(r.data.status).toBe('published');
  });

  it('allows null optional fields', () => {
    expect(createEventSchema.safeParse({
      ...valid, background_image_url: null, department: null, event_date: null, location: null,
    }).success).toBe(true);
  });
});

describe('updateEventSchema', () => {
  it('accepts partial', () => {
    expect(updateEventSchema.safeParse({ location: '교육관' }).success).toBe(true);
  });
  it('accepts empty', () => {
    expect(updateEventSchema.safeParse({}).success).toBe(true);
  });
});
