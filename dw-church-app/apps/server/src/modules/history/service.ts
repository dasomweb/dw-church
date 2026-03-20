import { prisma } from '../../config/database.js';
import type { CreateHistoryInput, UpdateHistoryInput } from './schema.js';

export async function listHistory(schema: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".history ORDER BY year DESC`,
  );
  return { data: rows };
}

export async function getDistinctYears(schema: string) {
  const rows = await prisma.$queryRawUnsafe<{ year: number }[]>(
    `SELECT DISTINCT year FROM "${schema}".history ORDER BY year DESC`,
  );
  return rows.map((r) => r.year);
}

export async function getHistory(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".history WHERE id = $1`, id,
  );
  return rows[0] ?? null;
}

export async function getHistoryByYear(schema: string, year: number) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".history WHERE year = $1`, year,
  );
  return rows[0] ?? null;
}

export async function createHistory(schema: string, input: CreateHistoryInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".history (year, items)
     VALUES ($1, $2::jsonb)
     RETURNING *`,
    input.year,
    JSON.stringify(input.items),
  );
  return rows[0];
}

export async function updateHistory(schema: string, id: string, input: UpdateHistoryInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.year !== undefined) { setClauses.push(`year = $${paramIndex++}`); values.push(input.year); }
  if (input.items !== undefined) { setClauses.push(`items = $${paramIndex++}::jsonb`); values.push(JSON.stringify(input.items)); }

  if (setClauses.length === 0) return getHistory(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".history SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteHistory(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".history WHERE id = $1`, id);
}
