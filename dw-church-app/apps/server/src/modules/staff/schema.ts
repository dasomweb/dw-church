import { z } from 'zod';

// Plain strings (not .url()) so empty fields don't 400. SNS links optional.
export const snsLinksSchema = z.object({
  youtube: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
}).optional().nullable();

// camelCase to match the api-client (it no longer snakeizes). The old
// snake_case fields silently dropped photo_url / sns_links / sort_order /
// is_active on save. email is a plain string (not .email()) so a staff member
// with no email doesn't 400; photoUrl is an R2 URL (raised to 2000 chars).
export const createStaffSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(200).optional().nullable(),
  department: z.string().max(200).optional().nullable(),
  email: z.string().max(300).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  bio: z.string().optional().nullable(),
  photoUrl: z.string().max(2000).optional().nullable(),
  snsLinks: snsLinksSchema,
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
}).passthrough();

export const updateStaffSchema = createStaffSchema.partial();

export const reorderStaffSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type ReorderStaffInput = z.infer<typeof reorderStaffSchema>;
