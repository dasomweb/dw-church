import { z } from 'zod';

/**
 * Plan pricing — the SINGLE SOURCE OF TRUTH for plan prices, managed by the
 * super admin. Stripe checkout, the /apply form, and (later) the landing all
 * read from here, so prices are never duplicated into the Stripe dashboard.
 *
 * Amounts are whole US dollars (our prices are whole-dollar). Convert ×100 to
 * cents when handing to Stripe.
 *   monthly = $/month on the monthly plan
 *   yearly  = $/month-equivalent on the annual plan (Stripe charges ×12/year)
 *   setupFee = one-time setup charge
 */
export const PLAN_KEYS = ['light', 'basic', 'plus', 'pro'] as const;

export const updatePricingSchema = z.object({
  label: z.string().max(50).optional(),
  monthly: z.number().int().min(0).max(100000).optional(),
  yearly: z.number().int().min(0).max(100000).optional(),
  setupFee: z.number().int().min(0).max(1000000).optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePricingInput = z.infer<typeof updatePricingSchema>;
