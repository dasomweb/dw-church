import { z } from 'zod';

// camelCase to match the api-client payload. eventDate is free-form (the form
// allows "2026-03-22 10:00"), URLs are plain strings so empties don't 400.
export const createEventSchema = z.object({
  title: z.string().min(1).max(300),
  backgroundImageUrl: z.string().max(2000).optional().nullable(),
  imageOnly: z.boolean().default(false),
  department: z.string().max(200).optional().nullable(),
  eventDate: z.string().max(100).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  linkUrl: z.string().max(1000).optional().nullable(),
  description: z.string().optional().nullable(),
  youtubeUrl: z.string().max(500).optional().nullable(),
  thumbnailUrl: z.string().max(2000).optional().nullable(),
  status: z.enum(['draft', 'published']).default('published'),
}).passthrough();

export const updateEventSchema = createEventSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
