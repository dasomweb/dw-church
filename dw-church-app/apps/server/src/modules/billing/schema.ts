import { z } from 'zod';

export const checkoutInputSchema = z.object({
  plan: z.enum(['basic', 'pro']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
