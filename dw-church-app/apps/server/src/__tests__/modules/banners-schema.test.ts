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
      pc_image_url: 'https://example.com/pc.jpg',
      mobile_image_url: 'https://example.com/mobile.jpg',
      sub_image_url: 'https://example.com/sub.jpg',
      link_url: 'https://example.com/event',
      link_target: '_blank',
      start_date: '2026-04-01',
      end_date: '2026-04-30',
      text_overlay: { heading: '부활절', subheading: '함께 기쁨을' },
      category: 'main',
      sort_order: 1,
      status: 'published',
    }).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createBannerSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('rejects invalid link_target', () => {
    expect(createBannerSchema.safeParse({ ...valid, link_target: '_parent' }).success).toBe(false);
  });

  it('rejects invalid category', () => {
    expect(createBannerSchema.safeParse({ ...valid, category: 'header' }).success).toBe(false);
  });

  it('rejects invalid date format', () => {
    expect(createBannerSchema.safeParse({ ...valid, start_date: 'April 1' }).success).toBe(false);
  });

  it('defaults link_target to _self', () => {
    const r = createBannerSchema.safeParse(valid);
    if (r.success) expect(r.data.link_target).toBe('_self');
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
      ...valid, pc_image_url: null, mobile_image_url: null, link_url: null, start_date: null, end_date: null, text_overlay: null,
    }).success).toBe(true);
  });
});

describe('updateBannerSchema', () => {
  it('accepts partial', () => {
    expect(updateBannerSchema.safeParse({ sort_order: 2 }).success).toBe(true);
  });
  it('accepts empty', () => {
    expect(updateBannerSchema.safeParse({}).success).toBe(true);
  });
});
