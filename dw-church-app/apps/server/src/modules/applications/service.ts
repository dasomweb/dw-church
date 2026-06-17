import { prisma } from '../../config/database.js';
import type { CreateApplicationInput, UpdateApplicationInput } from './schema.js';

// Platform table lives in the public schema (prospects, not tenants).
const TABLE = 'public.service_applications';

const COLUMN_MAP: Record<string, string> = {
  churchName: 'church_name',
  contactName: 'contact_name',
  email: 'email',
  phone: 'phone',
  churchAddress: 'church_address',
  denomination: 'denomination',
  plan: 'plan',
  billingPeriod: 'billing_period',
  existingUrl: 'existing_url',
  desiredDomain: 'desired_domain',
  message: 'message',
  status: 'status',
  adminNote: 'admin_note',
  paymentLink: 'payment_link',
  denominationVerified: 'denomination_verified',
};

export async function listApplications(status?: string) {
  const params: unknown[] = [];
  let where = '';
  if (status) {
    where = 'WHERE status = $1';
    params.push(status);
  }
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} ${where} ORDER BY created_at DESC`,
    ...params,
  );
}

export async function getApplication(id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} WHERE id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function createApplication(input: CreateApplicationInput) {
  const cols: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined && v !== null && v !== '') {
      cols.push(`"${col}"`);
      placeholders.push(`$${i++}`);
      values.push(v);
    }
  }
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO ${TABLE} (${cols.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING *`,
    ...values,
  );
  return rows[0];
}

export async function updateApplication(id: string, input: UpdateApplicationInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  // sendPaymentLink is a control flag, not a column — skip it here.
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined) {
      setClauses.push(`"${col}" = $${i++}`);
      values.push(v);
    }
  }
  if (setClauses.length === 0) return getApplication(id);
  setClauses.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE ${TABLE} SET ${setClauses.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...values,
    id,
  );
  return rows[0] ?? null;
}

export async function deleteApplication(id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM ${TABLE} WHERE id = $1::uuid`, id);
}
