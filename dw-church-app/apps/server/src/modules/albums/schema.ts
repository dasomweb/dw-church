import { z } from 'zod';

export const createAlbumSchema = z.object({
  title: z.string().min(1).max(300),
  images: z.array(z.string().url()).optional().default([]),
  youtube_url: z.string().url().max(500).optional().nullable(),
  thumbnail_url: z.string().url().max(1000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updateAlbumSchema = createAlbumSchema.partial();

export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;
export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>;
