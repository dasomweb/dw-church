import { z } from 'zod';

// camelCase to match the api-client payload; URLs plain strings (no .url()) so
// empties don't 400; image fields raised to 2000 for R2 URLs.
export const createColumnSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().optional().nullable(),
  topImageUrl: z.string().max(2000).optional().nullable(),
  bottomImageUrl: z.string().max(2000).optional().nullable(),
  youtubeUrl: z.string().max(500).optional().nullable(),
  thumbnailUrl: z.string().max(2000).optional().nullable(),
  status: z.enum(['draft', 'published']).default('published'),
}).passthrough();

export const updateColumnSchema = createColumnSchema.partial();

export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
