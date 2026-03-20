import { z } from 'zod';

export const createBulletinSchema = z.object({
  title: z.string().min(1).max(300),
  bulletin_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  pdf_url: z.string().url().max(1000).optional().nullable(),
  images: z.array(z.string().url()).optional().default([]),
  thumbnail_url: z.string().url().max(1000).optional().nullable(),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updateBulletinSchema = createBulletinSchema.partial();

export type CreateBulletinInput = z.infer<typeof createBulletinSchema>;
export type UpdateBulletinInput = z.infer<typeof updateBulletinSchema>;
