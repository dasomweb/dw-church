import { prisma } from '../../config/database.js';
import type { UpdatePromoInput } from './schema.js';

const TABLE = 'public.promo_settings';

export async function getPromo() {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM ${TABLE} WHERE id = 1`);
  return rows[0] ?? null;
}

/** True if the promo is active and within its [startsAt, endsAt] window. */
function isLive(promo: Record<string, unknown>): boolean {
  if (!promo.active) return false;
  const now = Date.now();
  const starts = promo.starts_at ? new Date(promo.starts_at as string).getTime() : null;
  const ends = promo.ends_at ? new Date(promo.ends_at as string).getTime() : null;
  if (starts && now < starts) return false;
  if (ends && now > ends) return false;
  return true;
}

/** Validate a coupon code typed by an applicant. Returns the live promo or null. */
export async function validateCode(code: string) {
  const promo = await getPromo();
  if (!promo || !isLive(promo)) return null;
  const want = String(promo.code ?? '').trim().toLowerCase();
  if (!want || want !== code.trim().toLowerCase()) return null;
  return promo;
}

export async function updatePromo(input: UpdatePromoInput) {
  const map: Record<string, string> = {
    active: 'active', code: 'code', label: 'label', discountPercent: 'discount_percent',
    targetPlans: 'target_plans', startsAt: 'starts_at', endsAt: 'ends_at',
  };
  // Ensure the singleton row exists, then update only the provided fields.
  await prisma.$executeRawUnsafe(`INSERT INTO ${TABLE} (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
  const set: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    const v = (input as Record<string, unknown>)[key];
    if (v === undefined) continue;
    if (col === 'target_plans') { set.push(`"${col}" = $${i++}::jsonb`); values.push(JSON.stringify(v)); }
    else if ((col === 'starts_at' || col === 'ends_at') && v) { set.push(`"${col}" = $${i++}::timestamptz`); values.push(v); }
    else { set.push(`"${col}" = $${i++}`); values.push(v); }
  }
  if (set.length === 0) return getPromo();
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE ${TABLE} SET ${set.join(', ')} WHERE id = 1 RETURNING *`,
    ...values,
  );
  return rows[0] ?? null;
}

/** Discounted setup fee if the (already-validated) promo targets this plan. */
export function applyPromoToSetupFee(setupFee: number, planKey: string, promo: Record<string, unknown> | null): number {
  if (!promo) return setupFee;
  const targets = (promo.target_plans as string[]) || [];
  if (!targets.includes(planKey)) return setupFee;
  const pct = Number(promo.discount_percent) || 0;
  return Math.max(0, Math.round(setupFee * (1 - pct / 100)));
}
