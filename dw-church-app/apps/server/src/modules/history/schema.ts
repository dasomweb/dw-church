import { z } from 'zod';

export const historyItemSchema = z.object({
  id: z.string().uuid().optional(),
  month: z.number().int().min(1).max(12).optional().nullable(),
  day: z.number().int().min(1).max(31).optional().nullable(),
  content: z.string().min(1),
  photo_url: z.string().url().max(1000).optional().nullable(),
});

export const createHistorySchema = z.object({
  year: z.number().int().min(1900).max(2100),
  items: z.array(historyItemSchema).default([]),
});

export const updateHistorySchema = z.object({
  year: z.number().int().min(1900).max(2100).optional(),
  items: z.array(historyItemSchema).optional(),
});

export type HistoryItem = z.infer<typeof historyItemSchema>;
export type CreateHistoryInput = z.infer<typeof createHistorySchema>;
export type UpdateHistoryInput = z.infer<typeof updateHistorySchema>;
