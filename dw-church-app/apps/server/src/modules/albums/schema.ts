import { z } from 'zod';

// camelCase to match the api-client payload. The client sends categoryIds[]
// (single-select today) → the service stores the first into category_id.
// URLs are plain strings so empties don't 400.
export const createAlbumSchema = z.object({
  title: z.string().min(1).max(300),
  images: z.array(z.string()).optional().default([]),
  youtubeUrl: z.string().max(500).optional().nullable(),
  thumbnailUrl: z.string().max(2000).optional().nullable(),
  categoryIds: z.array(z.string()).optional().default([]),
  status: z.enum(['draft', 'published']).default('published'),
}).passthrough();

export const updateAlbumSchema = createAlbumSchema.partial();

export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;
export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>;
