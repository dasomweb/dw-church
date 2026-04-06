import { z } from 'zod';

export const textOverlaySchema = z.object({
  heading: z.string().optional(),
  subheading: z.string().optional(),
  description: z.string().optional(),
  buttonText: z.string().optional(),
  buttonUrl: z.string().optional(),
  position: z.string().optional(),
  align: z.string().optional(),
  widths: z.record(z.string()).optional(),
}).optional().nullable();

export const createBannerSchema = z.object({
  title: z.string().min(1).max(300),
  pc_image_url: z.string().max(2000).optional().nullable(),
  mobile_image_url: z.string().max(2000).optional().nullable(),
  sub_image_url: z.string().max(2000).optional().nullable(),
  link_url: z.string().max(1000).optional().nullable(),
  link_target: z.enum(['_self', '_blank']).default('_self'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  text_overlay: textOverlaySchema,
  category: z.enum(['main', 'sub']).default('main'),
  sort_order: z.number().int().default(0),
  status: z.enum(['draft', 'published']).default('published'),
}).passthrough();

export const updateBannerSchema = createBannerSchema.partial();

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
