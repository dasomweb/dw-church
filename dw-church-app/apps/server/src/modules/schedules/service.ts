import { prisma } from '../../config/database.js';
import type { CreateScheduleInput, UpdateScheduleInput } from './schema.js';

interface ListParams {
  status?: string;
}

export async function listSchedules(schema: string, params: ListParams) {
  const { status } = params;

  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (status) { whereClause += ` AND status = $${paramIndex++}`; values.push(status); }

  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".schedules ${whereClause}
     ORDER BY sort_order ASC, created_at ASC`,
    ...values,
  );
}

export async function getSchedule(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".schedules WHERE id = $1::uuid`, id,
  );
  return rows[0] ?? null;
}

export async function createSchedule(schema: string, input: CreateScheduleInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".schedules (title, columns, rows, sort_order, status)
     VALUES ($1, $2::jsonb, $3::jsonb, $4, $5)
     RETURNING *`,
    input.title,
    JSON.stringify(input.columns ?? ['예배', '시간', '장소']),
    JSON.stringify(input.rows ?? []),
    input.sortOrder ?? 0,
    input.status,
  );
  return rows[0];
}

export async function updateSchedule(schema: string, id: string, input: UpdateScheduleInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.columns !== undefined) { setClauses.push(`columns = $${paramIndex++}::jsonb`); values.push(JSON.stringify(input.columns)); }
  if (input.rows !== undefined) { setClauses.push(`rows = $${paramIndex++}::jsonb`); values.push(JSON.stringify(input.rows)); }
  if (input.sortOrder !== undefined) { setClauses.push(`sort_order = $${paramIndex++}`); values.push(input.sortOrder); }
  if (input.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(input.status); }

  if (setClauses.length === 0) return getSchedule(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".schedules SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteSchedule(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".schedules WHERE id = $1::uuid`, id);
}
