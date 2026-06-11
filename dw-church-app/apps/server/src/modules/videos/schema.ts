import { z } from 'zod';

// camelCase to match the api-client payload. The client sends categoryIds[]
// (single-select today) → the service stores the first into category_id.
// URLs/dates are plain strings so empties don't 400.
export const createVideoSchema = z.object({
  title: z.string().min(1).max(500),
  youtubeUrl: z.string().max(2000).optional().nullable(),
  videoDate: z.string().max(20).optional().nullable(), // YYYY-MM-DD
  thumbnailUrl: z.string().max(2000).optional().nullable(),
  categoryIds: z.array(z.string()).optional().default([]),
  status: z.enum(['draft', 'published']).default('published'),
}).passthrough();

export const updateVideoSchema = createVideoSchema.partial();

export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;

// Video categories (cloned from album_categories — separate per-module table).
export const createVideoCategorySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
});

export const updateVideoCategorySchema = createVideoCategorySchema.partial();

export type CreateVideoCategoryInput = z.infer<typeof createVideoCategorySchema>;
export type UpdateVideoCategoryInput = z.infer<typeof updateVideoCategorySchema>;
