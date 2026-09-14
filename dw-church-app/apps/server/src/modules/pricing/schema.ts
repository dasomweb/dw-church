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
export const PLAN_KEYS = ['basic', 'plus', 'pro'] as const;

export const updatePricingSchema = z.object({
  label: z.string().max(50).optional(),
  monthly: z.number().int().min(0).max(100000).optional(),
  yearly: z.number().int().min(0).max(100000).optional(),
  setupFee: z.number().int().min(0).max(1000000).optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePricingInput = z.infer<typeof updatePricingSchema>;

/**
 * Setup pricing — 초기 구축비(1회) 범위별 SoT. 현행: new $600 / departments $900 /
 * migration $1,400부터 / subsidy_setup $200. from_price = "…부터"(변동가) 표기.
 */
export const updateSetupPricingSchema = z.object({
  label: z.string().max(60).optional(),
  price: z.number().int().min(0).max(1000000).optional(),
  fromPrice: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateSetupPricingInput = z.infer<typeof updateSetupPricingSchema>;
