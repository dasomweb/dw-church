import { z } from 'zod';

/**
 * Promotion settings (single global row). Time-limited, super-admin managed.
 * Discounts the one-time setup fee for the targeted plans during [startsAt, endsAt].
 */
export const updatePromoSchema = z.object({
  active: z.boolean().optional(),
  code: z.string().max(40).optional().nullable(), // 쿠폰 코드 (대소문자 무시 매칭)
  label: z.string().max(200).optional().nullable(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  targetPlans: z.array(z.string()).optional(),
  startsAt: z.string().optional().nullable(), // ISO date/datetime or null
  endsAt: z.string().optional().nullable(),
});

// Public coupon validation — applicant types a code at /apply.
export const validatePromoSchema = z.object({ code: z.string().min(1).max(40) });

export type UpdatePromoInput = z.infer<typeof updatePromoSchema>;
