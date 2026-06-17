import { prisma } from '../../config/database.js';
import type { UpdatePricingInput } from './schema.js';

const TABLE = 'public.plan_pricing';

export async function listPricing() {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} ORDER BY sort_order ASC`,
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
