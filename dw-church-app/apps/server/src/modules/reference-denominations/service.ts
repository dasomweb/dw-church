import { prisma } from '../../config/database.js';
import type { CreateRefDenomInput, UpdateRefDenomInput, DenomStatus } from './schema.js';

const TABLE = 'public.reference_denominations';

export async function listRefDenoms(opts: { status?: string; country?: string } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (opts.status) { where.push(`status = $${i++}`); params.push(opts.status); }
  if (opts.country) { where.push(`country = $${i++}`); params.push(opts.country); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} ${whereSql} ORDER BY status DESC, name ASC`,
    ...params,
  );
}

export async function createRefDenom(input: CreateRefDenomInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO ${TABLE} (name, country, status, note)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (lower(name)) DO UPDATE SET country = EXCLUDED.country, status = EXCLUDED.status, note = EXCLUDED.note, updated_at = NOW()
     RETURNING *`,
    input.name, input.country ?? '', input.status, input.note ?? '',
  );
  return rows[0];
}

export async function updateRefDenom(id: string, input: UpdateRefDenomInput) {
  const set: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.name !== undefined) { set.push(`name = $${i++}`); values.push(input.name); }
  if (input.country !== undefined) { set.push(`country = $${i++}`); values.push(input.country ?? ''); }
  if (input.status !== undefined) { set.push(`status = $${i++}`); values.push(input.status); }
  if (input.note !== undefined) { set.push(`note = $${i++}`); values.push(input.note ?? ''); }
  if (set.length === 0) return null;
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE ${TABLE} SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteRefDenom(id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM ${TABLE} WHERE id = $1::uuid`, id);
}

export interface DenomClassification {
  status: DenomStatus;
  matchedName: string;
}

/**
 * Classify a free-text denomination / church name against the reference list.
 * Substring match in either direction (case-insensitive). Severity wins:
 * cult > watch > recognized. Returns null if nothing matches (→ "미확인").
 * This is an ASSIST — the super admin always makes the final call.
 */
export async function classifyDenomination(text?: string | null): Promise<DenomClassification | null> {
  const q = (text ?? '').trim().toLowerCase();
  if (!q) return null;
  // Pull all rows (small reference table) and match in JS for flexible
  // bidirectional substring matching across KO/EN names.
  const rows = (await prisma.$queryRawUnsafe<{ name: string; status: DenomStatus }[]>(
    `SELECT name, status FROM ${TABLE}`,
  )) ?? [];
  const severity: Record<DenomStatus, number> = { cult: 3, watch: 2, recognized: 1 };
  let best: DenomClassification | null = null;
  for (const r of rows) {
    const n = r.name.trim().toLowerCase();
    if (!n) continue;
    if (q.includes(n) || n.includes(q)) {
      if (!best || severity[r.status] > severity[best.status]) {
        best = { status: r.status, matchedName: r.name };
      }
    }
  }
  return best;
}
