import { describe, it, expect } from 'vitest';
import { createPageSchema, updatePageSchema, createSectionSchema, updateSectionSchema, reorderSectionsSchema } from '../../modules/pages/schema.js';

describe('createPageSchema', () => {
  const valid = { title: '교회 소개', slug: 'about' };

  it('accepts valid input', () => {
    expect(createPageSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(createPageSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
  });

  it('rejects empty slug', () => {
    expect(createPageSchema.safeParse({ ...valid, slug: '' }).success).toBe(false);
  });

  it('defaults isHome to false', () => {
    const result = createPageSchema.safeParse(valid);
    if (result.success) expect(result.data.isHome).toBe(false);
  });

  it('defaults status to draft', () => {
    const result = createPageSchema.safeParse(valid);
    if (result.success) expect(result.data.status).toBe('draft');
  });

  it('rejects invalid status', () => {
    expect(createPageSchema.safeParse({ ...valid, status: 'archived' }).success).toBe(false);
  });
});

describe('updatePageSchema', () => {
  it('accepts partial', () => {
    expect(updatePageSchema.safeParse({ title: 'New Title' }).success).toBe(true);
  });

  it('accepts empty', () => {
    expect(updatePageSchema.safeParse({}).success).toBe(true);
  });
});

describe('createSectionSchema', () => {
  it('accepts valid block type', () => {
    const result = createSectionSchema.safeParse({ blockType: 'hero_banner' });
    expect(result.success).toBe(true);
  });

  it('accepts text_image block', () => {
    const result = createSectionSchema.safeParse({
      blockType: 'text_image',
      props: { title: 'Test', content: 'Hello' },
      sortOrder: 1,
      isVisible: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown block type', () => {
    expect(createSectionSchema.safeParse({ blockType: 'unknown_block' }).success).toBe(false);
  });

  it('defaults props to empty object', () => {
    const result = createSectionSchema.safeParse({ blockType: 'divider' });
    if (result.success) expect(result.data.props).toEqual({});
  });

  it('defaults isVisible to true', () => {
    const result = createSectionSchema.safeParse({ blockType: 'divider' });
    if (result.success) expect(result.data.isVisible).toBe(true);
  });

  it('accepts all known block types', () => {
    const blockTypes = [
      'hero_banner', 'banner_slider', 'text_image', 'text_only', 'pastor_message',
      'church_intro', 'mission_vision', 'recent_sermons', 'recent_bulletins',
      'album_gallery', 'staff_grid', 'history_timeline', 'event_grid',
      'worship_schedule', 'worship_times', 'location_map', 'contact_info',
      'newcomer_info', 'image_gallery', 'video', 'divider', 'board',
    ];
    for (const bt of blockTypes) {
      expect(createSectionSchema.safeParse({ blockType: bt }).success).toBe(true);
    }
  });
});

describe('updateSectionSchema', () => {
  it('accepts partial', () => {
    expect(updateSectionSchema.safeParse({ isVisible: false }).success).toBe(true);
  });
});

describe('reorderSectionsSchema', () => {
  it('accepts valid UUID array', () => {
    const result = reorderSectionsSchema.safeParse({
      ids: ['550e8400-e29b-41d4-a716-446655440000'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID strings', () => {
    expect(reorderSectionsSchema.safeParse({ ids: ['not-uuid'] }).success).toBe(false);
  });
});
