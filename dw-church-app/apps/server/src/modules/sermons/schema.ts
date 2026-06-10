import { z } from 'zod';

// camelCase to match the api-client payload: the form sends `date` (not
// sermon_date) and `preacher` as a NAME (the service resolves it to an id).
// URLs are plain strings so empties don't 400.
export const createSermonSchema = z.object({
  title: z.string().min(1).max(300),
  scripture: z.string().max(500).optional().nullable(),
  youtubeUrl: z.string().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  thumbnailUrl: z.string().max(2000).optional().nullable(),
  preacher: z.string().max(200).optional().nullable(),
  category: z.string().optional().nullable(),
  status: z.enum(['draft', 'published']).default('published'),
  categoryIds: z.array(z.string()).optional().default([]),
}).passthrough();

export const updateSermonSchema = createSermonSchema.partial();

export type CreateSermonInput = z.infer<typeof createSermonSchema>;
export type UpdateSermonInput = z.infer<typeof updateSermonSchema>;
