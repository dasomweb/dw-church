import { z } from 'zod';

export const textOverlaySchema = z.object({
  heading: z.string().optional(),
  subheading: z.string().optional(),
  description: z.string().optional(),
  buttonText: z.string().optional(),
  buttonUrl: z.string().optional(),
  position: z.string().optional(),
  align: z.string().optional(),
  // Tenant toggle for the dark overlay (scrim) on this banner. Default on.
  overlayEnabled: z.boolean().optional(),
  widths: z.record(z.string()).optional(),
}).optional().nullable();

// camelCase to match what the api-client sends (it no longer snakeizes
// payloads). The old snake_case fields here silently dropped pc_image_url etc.
// on save — banner images/links/dates never persisted.
export const createBannerSchema = z.object({
  title: z.string().min(1).max(300),
  pcImageUrl: z.string().max(2000).optional().nullable(),
  mobileImageUrl: z.string().max(2000).optional().nullable(),
  subImageUrl: z.string().max(2000).optional().nullable(),
  linkUrl: z.string().max(1000).optional().nullable(),
  linkTarget: z.enum(['_self', '_blank']).default('_self'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  textOverlay: textOverlaySchema,
  category: z.enum(['main', 'sub']).default('main'),
  sortOrder: z.number().int().default(0),
  // 'archived' matches the banners table CHECK + the admin status dropdown
  // (보관). The schema omitted it, so picking 보관 would 400.
  status: z.enum(['draft', 'published', 'archived']).default('published'),
}).passthrough();

export const updateBannerSchema = createBannerSchema.partial();

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
