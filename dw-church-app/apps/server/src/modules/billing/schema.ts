import { z } from 'zod';

export const checkoutInputSchema = z.object({
  plan: z.enum(['basic', 'pro']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const portalInputSchema = z.object({
  returnUrl: z.string().url().optional(),
});

export type PortalInput = z.infer<typeof portalInputSchema>;
