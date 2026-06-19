import { z } from 'zod';

export const blockTypes = [
  // Hero (static)
  'hero_banner',
  'hero_full_width',
  // Banner slider (dynamic — linked to admin 배너 관리)
  'banner_slider',
  'hero_image_slider',
  'hero_split',
  // About
  'pastor_message',
  'church_intro',
  'mission_vision',
  // Content (dynamic widgets)
  'recent_sermons',
  'recent_bulletins',
  'recent_columns',
  'album_gallery',
  'video_board',
  'staff_grid',
  'history_timeline',
  'event_grid',
  'schedule_board',
  'schedule_split',
  // Text
  'text_image',
  'text_only',
  'quote_block',
  // Church Info
  'worship_schedule',
  'worship_times',
  'location_map',
  'map_embed',
  'contact_info',
  'address_info',
  'newcomer_info',
  'visitor_welcome',
  'first_time_guide',
  'giving_info',
  // Media
  'image_gallery',
  'video',
  // CTA
  'call_to_action',
  'newsletter_signup',
  // Layout Block — container with children blocks
  'layout_row',
  'layout_columns',
  'layout_section',
  'divider',
  'section_header',
  'two_columns',
  'three_columns',
  'tabs',
  'accordion',
  // Board
  'board',
  // Contact form (새가족 등록 등)
  'contact_form',
  // 목장(셀) Data Block + 새가족 등록 폼 Static Block
  'cell_grid',
  'newcomer_form',
  // 목장사역보고서 폼 Data Block (form_type=cell_report)
  'cell_report',
] as const;

export type BlockType = (typeof blockTypes)[number];

// Page kind — 'static' is a normal page; the *_detail kinds mark a page as
// the builder-designed template for a content type's detail view (blocks
// bind to the current item via DynamicSource).
export const pageKindSchema = z.enum(['static', 'sermon_detail', 'column_detail', 'bulletin_detail']);

export const createPageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  isHome: z.boolean().default(false),
  status: z.enum(['draft', 'published']).default('draft'),
  kind: pageKindSchema.optional(),  // createPage defaults to 'static'
  sortOrder: z.number().int().default(0),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  isHome: z.boolean().optional(),
  status: z.enum(['draft', 'published']).optional(),
  kind: pageKindSchema.optional(),
  sortOrder: z.number().int().optional(),
});

export const createSectionSchema = z.object({
  blockType: z.enum(blockTypes),
  props: z.record(z.unknown()).default({}),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
});

export const updateSectionSchema = z.object({
  blockType: z.enum(blockTypes).optional(),
  props: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
});

export const reorderSectionsSchema = z.object({
  ids: z.array(z.string().uuid()),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;
