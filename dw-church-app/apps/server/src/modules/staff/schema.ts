import { z } from 'zod';

export const snsLinksSchema = z.object({
  youtube: z.string().url().optional(),
  instagram: z.string().url().optional(),
  facebook: z.string().url().optional(),
  twitter: z.string().url().optional(),
  linkedin: z.string().url().optional(),
}).optional().nullable();

export const createStaffSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(200).optional().nullable(),
  department: z.string().max(200).optional().nullable(),
  email: z.string().email().max(300).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  bio: z.string().optional().nullable(),
  photo_url: z.string().url().max(1000).optional().nullable(),
  sns_links: snsLinksSchema,
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const updateStaffSchema = createStaffSchema.partial();

export const reorderStaffSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type ReorderStaffInput = z.infer<typeof reorderStaffSchema>;
