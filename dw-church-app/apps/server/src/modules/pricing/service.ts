import { prisma } from '../../config/database.js';
import type { UpdatePricingInput } from './schema.js';

const TABLE = 'public.plan_pricing';

/**
 * List plan pricing. `activeOnly` (public /pricing) hides deactivated rows —
 * e.g. the retired plus/pro tiers after the move to the single $99 plan; the
 * admin 요금 관리 view passes false to still see/manage them.
 */
export async function listPricing(activeOnly = false) {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} ${activeOnly ? 'WHERE is_active = true' : ''} ORDER BY sort_order ASC`,
  );
}

export async function getPricing(planKey: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} WHERE plan_key = $1`,
    planKey,
  );
  return rows[0] ?? null;
}

export async function updatePricing(planKey: string, input: UpdatePricingInput) {
  const map: Record<string, string> = {
    label: 'label', monthly: 'monthly', yearly: 'yearly', setupFee: 'setup_fee', isActive: 'is_active',
  };
  const set: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined) { set.push(`"${col}" = $${i++}`); values.push(v); }
  }
  if (set.length === 0) return getPricing(planKey);
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE ${TABLE} SET ${set.join(', ')} WHERE plan_key = $${i} RETURNING *`,
    ...values, planKey,
  );
  return rows[0] ?? null;
}
