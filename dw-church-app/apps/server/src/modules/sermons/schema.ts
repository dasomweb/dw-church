import { z } from 'zod';

// camelCase to match the api-client payload: the form sends `date` (not
// sermon_date) and `preacher` as a NAME (the service resolves it to an id).
// URLs are plain strings so empties don't 400.
export const createSermonSchema = z.object({
  title: z.string().min(1).max(300),
  scripture: z.string().max(500).optional().nullable(),
  youtubeUrl: z.string().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  thumbnailUrl: z.string().max(2000).optional().nullable(),
  preacher: z.string().max(200).optional().nullable(),
  category: z.string().optional().nullable(),
  status: z.enum(['draft', 'published']).default('published'),
  categoryIds: z.array(z.string()).optional().default([]),
  // 설교 스터디 (13a 설교 매거진). 한줄요약·써머리(요약 본문) + 질문 3종(문자열 배열).
  oneLineSummary: z.string().max(400).optional().nullable(),
  summary: z.string().max(8000).optional().nullable(),
  observationQuestions: z.array(z.string().max(1000)).optional(),
  deepQuestions: z.array(z.string().max(1000)).optional(),
  applicationQuestions: z.array(z.string().max(1000)).optional(),
}).passthrough();

export const updateSermonSchema = createSermonSchema.partial();

export type CreateSermonInput = z.infer<typeof createSermonSchema>;
export type UpdateSermonInput = z.infer<typeof updateSermonSchema>;
