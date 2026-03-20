import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, 'Invalid slug format'),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(1).max(100),
  plan: z.enum(['free', 'basic', 'pro']).default('free'),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  plan: z.enum(['free', 'basic', 'pro']).optional(),
  isActive: z.boolean().optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
