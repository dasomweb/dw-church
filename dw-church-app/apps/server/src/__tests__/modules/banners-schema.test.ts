import { describe, it, expect } from 'vitest';
import { createBannerSchema, updateBannerSchema } from '../../modules/banners/schema.js';

describe('createBannerSchema', () => {
  const valid = { title: '부활절 특별예배' };

  it('accepts valid minimal input', () => {
    expect(createBannerSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts full input', () => {
    expect(createBannerSchema.safeParse({
      ...valid,
      pcImageUrl: 'https://example.com/pc.jpg',
      mobileImageUrl: 'https://example.com/mobile.jpg',
      subImageUrl: 'https://example.com/sub.jpg',
      linkUrl: 'https://example.com/event',
      linkTarget: '_blank',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      textOverlay: { heading: '부활절', subheading: '함께 기쁨을' },
      category: 'main',
      sortOrder: 1,
      status: 'published',
    }).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createBannerSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('rejects invalid linkTarget', () => {
    // linkTarget remains an enum (_self | _blank).
    expect(createBannerSchema.safeParse({ ...valid, linkTarget: '_parent' }).success).toBe(false);
  });

  it('rejects invalid category', () => {
    expect(createBannerSchema.safeParse({ ...valid, category: 'header' }).success).toBe(false);
  });

  it('rejects invalid date format', () => {
    // startDate is still a strict YYYY-MM-DD regex string.
    expect(createBannerSchema.safeParse({ ...valid, startDate: 'April 1' }).success).toBe(false);
  });

  it('defaults linkTarget to _self', () => {
    const r = createBannerSchema.safeParse(valid);
    if (r.success) expect(r.data.linkTarget).toBe('_self');
  });

  it('defaults category to main', () => {
    const r = createBannerSchema.safeParse(valid);
    if (r.success) expect(r.data.category).toBe('main');
  });

  it('defaults status to published', () => {
    const r = createBannerSchema.safeParse(valid);
    if (r.success) expect(r.data.status).toBe('published');
  });

  it('allows null optional fields', () => {
    expect(createBannerSchema.safeParse({
      ...valid, pcImageUrl: null, mobileImageUrl: null, linkUrl: null, startDate: null, endDate: null, textOverlay: null,
    }).success).toBe(true);
  });
});

describe('updateBannerSchema', () => {
  it('accepts partial', () => {
    expect(updateBannerSchema.safeParse({ sortOrder: 2 }).success).toBe(true);
  });
  it('accepts empty', () => {
    expect(updateBannerSchema.safeParse({}).success).toBe(true);
  });
});
