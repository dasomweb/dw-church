import { z } from 'zod';

// camelCase to match the api-client payload (it no longer snakeizes); URLs are
// plain strings so empties don't 400; thumbnail raised to 2000 for R2 URLs.
export const createBulletinSchema = z.object({
  title: z.string().min(1).max(300),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  pdfUrl: z.string().max(1000).optional().nullable(),
  images: z.array(z.string()).optional().default([]),
  thumbnailUrl: z.string().max(2000).optional().nullable(),
  status: z.enum(['draft', 'published']).default('published'),
}).passthrough();

export const updateBulletinSchema = createBulletinSchema.partial();

export type CreateBulletinInput = z.infer<typeof createBulletinSchema>;
export type UpdateBulletinInput = z.infer<typeof updateBulletinSchema>;
