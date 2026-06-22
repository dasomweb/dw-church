import { prisma } from '../../config/database.js';
import type { CreateDemoRequestInput, UpdateDemoRequestInput, DemoConfigInput } from './schema.js';

const TABLE = 'public.demo_requests';

const COLUMN_MAP: Record<string, string> = {
  name: 'name',
  churchName: 'church_name',
  email: 'email',
  phone: 'phone',
  message: 'message',
  status: 'status',
  memo: 'memo',
};

export async function listDemoRequests(status?: string) {
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

export async function getDemoRequest(id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${TABLE} WHERE id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function createDemoRequest(input: CreateDemoRequestInput) {
  const cols: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    if (col === 'status' || col === 'memo') continue; // defaults
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined && v !== null && v !== '') {
      cols.push(`"${col}"`);
      placeholders.push(`$${i++}`);
      values.push(v);
    }
  }
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    ...values,
  );
  return rows[0];
}

export async function updateDemoRequest(id: string, input: UpdateDemoRequestInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined) {
      setClauses.push(`"${col}" = $${i++}`);
      values.push(v);
    }
  }
  if (setClauses.length === 0) return getDemoRequest(id);
  setClauses.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE ${TABLE} SET ${setClauses.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...values,
    id,
  );
  return rows[0] ?? null;
}

export async function deleteDemoRequest(id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM ${TABLE} WHERE id = $1::uuid`, id);
}

export async function countNewDemoRequests(): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ c: number }[]>(
    `SELECT count(*)::int c FROM ${TABLE} WHERE status = 'new'`,
  );
  return rows[0]?.c ?? 0;
}

// ── Shared demo-account access config (singleton row id = 1) ──
export async function getDemoConfig() {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT login_url, login_email, login_password, message_body FROM public.demo_config WHERE id = 1`,
  );
  return rows[0] ?? null;
}

export async function setDemoConfig(input: DemoConfigInput) {
  const map: Record<string, string> = {
    loginUrl: 'login_url',
    loginEmail: 'login_email',
    loginPassword: 'login_password',
    messageBody: 'message_body',
  };
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(map)) {
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined) {
      setClauses.push(`"${col}" = $${i++}`);
      values.push(v);
    }
  }
  if (setClauses.length === 0) return getDemoConfig();
  setClauses.push('updated_at = NOW()');
  await prisma.$queryRawUnsafe(
    `UPDATE public.demo_config SET ${setClauses.join(', ')} WHERE id = 1`,
    ...values,
  );
  return getDemoConfig();
}
