import { prisma } from '../../config/database.js';
import type { CreateNewcomerInput, UpdateNewcomerInput } from './schema.js';

const COLUMN_MAP: Record<string, string> = {
  name: 'name',
  phone: 'phone',
  email: 'email',
  address: 'address',
  birthDate: 'birth_date',
  gender: 'gender',
  prevChurch: 'prev_church',
  visitPath: 'visit_path',
  faithStatus: 'faith_status',
  familyInfo: 'family_info',
  prayerRequest: 'prayer_request',
  status: 'status',
  memo: 'memo',
};

export async function listNewcomers(schema: string, status?: string) {
  const params: unknown[] = [];
  let where = '';
  if (status) {
    where = 'WHERE status = $1';
    params.push(status);
  }
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".newcomer_registrations ${where} ORDER BY created_at DESC`,
    ...params,
  );
  return rows;
}

export async function getNewcomer(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".newcomer_registrations WHERE id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function createNewcomer(schema: string, input: CreateNewcomerInput) {
  const cols: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined && v !== '') {
      cols.push(`"${col}"`);
      placeholders.push(`$${i++}`);
      values.push(v);
    }
  }
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".newcomer_registrations (${cols.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING *`,
    ...values,
  );
  return rows[0];
}

export async function updateNewcomer(schema: string, id: string, input: UpdateNewcomerInput) {
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
  if (setClauses.length === 0) return getNewcomer(schema, id);
  setClauses.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".newcomer_registrations SET ${setClauses.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...values,
    id,
  );
  return rows[0] ?? null;
}

export async function deleteNewcomer(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".newcomer_registrations WHERE id = $1::uuid`, id);
}
