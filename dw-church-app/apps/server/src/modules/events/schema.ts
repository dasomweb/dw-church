import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1).max(300),
  background_image_url: z.string().url().max(1000).optional().nullable(),
  image_only: z.boolean().default(false),
  department: z.string().max(200).optional().nullable(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  link_url: z.string().max(1000).optional().nullable(),
  description: z.string().optional().nullable(),
  youtube_url: z.string().url().max(500).optional().nullable(),
  thumbnail_url: z.string().url().max(1000).optional().nullable(),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updateEventSchema = createEventSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
