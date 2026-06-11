import { z } from 'zod';

// camelCase to match the api-client payload (it no longer snake-cases on send).
// coerce handles the number input + the isActive <select> ("true"/"" → boolean).
// .passthrough() so stray keys don't 400.
export const createBoardSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().max(1000).optional().default(''),
  sortOrder: z.coerce.number().int().optional().default(0),
  isActive: z.coerce.boolean().optional().default(true),
}).passthrough();

export const updateBoardSchema = createBoardSchema.partial();

export const createBoardPostSchema = z.object({
  title: z.string().min(1).max(500),
  author_name: z.string().max(100).optional().default(''),
  content: z.string().optional().default(''),
  attachments: z.array(z.object({
    url: z.string().url(),
    filename: z.string(),
    size: z.number().optional(),
    type: z.string().optional(),
  })).optional().default([]),
  is_pinned: z.boolean().optional().default(false),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updateBoardPostSchema = createBoardPostSchema.partial();

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type CreateBoardPostInput = z.infer<typeof createBoardPostSchema>;
export type UpdateBoardPostInput = z.infer<typeof updateBoardPostSchema>;
