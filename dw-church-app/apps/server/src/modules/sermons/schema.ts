import { z } from 'zod';

export const createSermonSchema = z.object({
  title: z.string().min(1).max(300),
  scripture: z.string().max(500).optional().nullable(),
  youtube_url: z.string().url().max(500).optional().nullable(),
  sermon_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  thumbnail_url: z.string().url().max(1000).optional().nullable(),
  preacher_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'published']).default('published'),
  category_ids: z.array(z.string().uuid()).optional().default([]),
});

export const updateSermonSchema = createSermonSchema.partial();

export type CreateSermonInput = z.infer<typeof createSermonSchema>;
export type UpdateSermonInput = z.infer<typeof updateSermonSchema>;
