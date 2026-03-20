import { z } from 'zod';

export const blockTypes = [
  'hero_banner',
  'text_image',
  'text_only',
  'image_gallery',
  'video',
  'divider',
  'recent_sermons',
  'recent_bulletins',
  'album_gallery',
  'staff_grid',
  'history_timeline',
  'event_grid',
  'worship_schedule',
  'location_map',
  'contact_info',
  'newcomer_info',
  'two_columns',
  'three_columns',
  'tabs',
  'accordion',
] as const;

export type BlockType = (typeof blockTypes)[number];

export const createPageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  isHome: z.boolean().default(false),
  status: z.enum(['draft', 'published']).default('draft'),
  sortOrder: z.number().int().default(0),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  isHome: z.boolean().optional(),
  status: z.enum(['draft', 'published']).optional(),
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
