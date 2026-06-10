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
      backgroundImageUrl: 'https://example.com/img.jpg',
      imageOnly: false,
      department: '예배부',
      eventDate: '2026-04-20',
      location: '본당',
      linkUrl: 'https://example.com',
      description: '부활의 기쁨을 함께 나누는 특별예배입니다.',
      youtubeUrl: 'https://www.youtube.com/watch?v=abc',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      status: 'draft',
    }).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createEventSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('accepts free-form eventDate string', () => {
    // eventDate is free-form (max 100), e.g. "2026-03-22 10:00" — no strict regex
    expect(createEventSchema.safeParse({ ...valid, eventDate: '2026-03-22 10:00' }).success).toBe(true);
    expect(createEventSchema.safeParse({ ...valid, eventDate: 'April 20' }).success).toBe(true);
  });

  it('defaults imageOnly to false', () => {
    const r = createEventSchema.safeParse(valid);
    if (r.success) expect(r.data.imageOnly).toBe(false);
  });

  it('defaults status to published', () => {
    const r = createEventSchema.safeParse(valid);
    if (r.success) expect(r.data.status).toBe('published');
  });

  it('allows null optional fields', () => {
    expect(createEventSchema.safeParse({
      ...valid, backgroundImageUrl: null, department: null, eventDate: null, location: null,
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
