import { z } from 'zod';

// Sermon categories
export const createSermonCategorySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  sort_order: z.number().int().default(0),
});

export const updateSermonCategorySchema = createSermonCategorySchema.partial();

// Preachers
export const createPreacherSchema = z.object({
  name: z.string().min(1).max(200),
  title: z.string().max(200).optional().nullable(),
  is_default: z.boolean().default(false),
});

export const updatePreacherSchema = createPreacherSchema.partial();

// Album categories
export const createAlbumCategorySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
});

export const updateAlbumCategorySchema = createAlbumCategorySchema.partial();

export type CreateSermonCategoryInput = z.infer<typeof createSermonCategorySchema>;
export type UpdateSermonCategoryInput = z.infer<typeof updateSermonCategorySchema>;
export type CreatePreacherInput = z.infer<typeof createPreacherSchema>;
export type UpdatePreacherInput = z.infer<typeof updatePreacherSchema>;
export type CreateAlbumCategoryInput = z.infer<typeof createAlbumCategorySchema>;
export type UpdateAlbumCategoryInput = z.infer<typeof updateAlbumCategorySchema>;
