import { z } from 'zod';

export const createMenuSchema = z.object({
  label: z.string().min(1).max(100),
  pageId: z.string().uuid().nullable().optional(),
  externalUrl: z.string().url().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
});

export const updateMenuSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  pageId: z.string().uuid().nullable().optional(),
  externalUrl: z.string().url().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
});

export const reorderMenuSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      parentId: z.string().uuid().nullable(),
      sortOrder: z.number().int(),
    }),
  ),
});

export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
export type ReorderMenuInput = z.infer<typeof reorderMenuSchema>;
