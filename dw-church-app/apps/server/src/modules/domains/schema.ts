import { z } from 'zod';

export const addDomainSchema = z.object({
  domain: z
    .string()
    .min(3)
    .max(255)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i,
      'Invalid domain format',
    ),
});

export type AddDomainInput = z.infer<typeof addDomainSchema>;
