import { z } from 'zod';

export const createColumnSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().optional().nullable(),
  top_image_url: z.string().url().max(1000).optional().nullable(),
  bottom_image_url: z.string().url().max(1000).optional().nullable(),
  youtube_url: z.string().url().max(500).optional().nullable(),
  thumbnail_url: z.string().url().max(1000).optional().nullable(),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updateColumnSchema = createColumnSchema.partial();

export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
