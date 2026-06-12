import { z } from 'zod';

// camelCase to match the api-client payload. A schedule row is one titled
// GROUP — { title, columns, rows } — identical to the ScheduleGroup shape the
// storefront ScheduleSplitBlock / admin ScheduleGroupsField already use.
export const createScheduleSchema = z.object({
  title: z.string().min(1).max(255),
  columns: z.array(z.string()).optional().default(['예배', '시간', '장소']),
  rows: z.array(z.array(z.string())).optional().default([]),
  sortOrder: z.coerce.number().int().optional().default(0),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
}).passthrough();

export const updateScheduleSchema = createScheduleSchema.partial();

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
