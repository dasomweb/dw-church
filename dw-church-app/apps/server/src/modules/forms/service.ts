import { prisma } from '../../config/database.js';
import type { UpdateFormSubmissionInput } from './schema.js';

/**
 * Heuristic submitter extraction — the inbox list shows a name + contact
 * without forcing the operator to map fields. Covers common Korean + English
 * keys across contact / cell-report / newcomer / custom forms.
 */
const NAME_KEYS = ['name', '이름', 'fullName', '성명', 'cellName', '목장이름', '목장명', '목장', 'leaderName', '인도자', 'title'];
const CONTACT_KEYS = ['email', '이메일', 'phone', '연락처', '전화', '전화번호', 'tel', 'contact'];

function pick(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 290);
  }
  return null;
}

interface ListFilter {
  formType?: string;
  status?: string;
}

export async function listFormSubmissions(schema: string, filter: ListFilter = {}) {
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (filter.formType) {
    params.push(filter.formType);
    clauses.push(`form_type = $${params.length}`);
  }
  if (filter.status) {
    params.push(filter.status);
    clauses.push(`status = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".form_submissions ${where} ORDER BY created_at DESC`,
    ...params,
  );
}

export async function getFormSubmission(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".form_submissions WHERE id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function createFormSubmission(
  schema: string,
  formType: string,
  payload: Record<string, unknown>,
) {
  const name = pick(payload, NAME_KEYS);
  const contact = pick(payload, CONTACT_KEYS);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".form_submissions (form_type, submitter_name, submitter_contact, payload)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING *`,
    formType,
    name,
    contact,
    JSON.stringify(payload),
  );
  return rows[0];
}

export async function updateFormSubmission(schema: string, id: string, input: UpdateFormSubmissionInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (input.status !== undefined) {
    setClauses.push(`status = $${i++}`);
    values.push(input.status);
  }
  if (input.memo !== undefined) {
    setClauses.push(`memo = $${i++}`);
    values.push(input.memo);
  }
  if (setClauses.length === 0) return getFormSubmission(schema, id);
  setClauses.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".form_submissions SET ${setClauses.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...values,
    id,
  );
  return rows[0] ?? null;
}

export async function deleteFormSubmission(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".form_submissions WHERE id = $1::uuid`, id);
}

/** Dashboard badge — count of unread submissions across all form types. */
export async function countNewFormSubmissions(schema: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::int AS count FROM "${schema}".form_submissions WHERE status = 'new'`,
  );
  return Number(rows[0]?.count ?? 0);
}
