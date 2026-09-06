import { z } from 'zod';

// 오늘의 말씀 (Verse of the Day) — camelCase to match the api-client payload.
// verseDate is free-form date string ("2026-09-06"); empty allowed.
export const createVerseSchema = z.object({
  text: z.string().min(1).max(2000),
  reference: z.string().max(300).optional().nullable(),
  verseDate: z.string().max(40).optional().nullable(),
  sortOrder: z.number().int().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
}).passthrough();

export const updateVerseSchema = createVerseSchema.partial();

export type CreateVerseInput = z.infer<typeof createVerseSchema>;
export type UpdateVerseInput = z.infer<typeof updateVerseSchema>;
