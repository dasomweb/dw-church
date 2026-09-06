import { prisma } from '../../config/database.js';
import type { CreateVerseInput, UpdateVerseInput } from './schema.js';

interface ListParams {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
}

export async function listVerses(schema: string, params: ListParams) {
  const { page, perPage, search, status } = params;
  const offset = (page - 1) * perPage;

  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (status) { whereClause += ` AND status = $${paramIndex++}`; values.push(status); }
  if (search) { whereClause += ` AND text ILIKE $${paramIndex++}`; values.push(`%${search}%`); }

  const [rows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${schema}".verses ${whereClause}
       ORDER BY sort_order ASC, verse_date DESC NULLS LAST, created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      ...values, perPage, offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total FROM "${schema}".verses ${whereClause}`,
      ...values,
    ),
  ]);

  return { data: rows, total: countResult[0].total };
}

/**
 * 오늘의 말씀 — the single verse the storefront verse_of_day block shows.
 * Prefers the most recent published verse whose verse_date is today or past
 * (so admins can schedule ahead); falls back to the newest published verse.
 */
export async function getCurrentVerse(schema: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".verses
     WHERE status = 'published' AND (verse_date IS NULL OR verse_date <= CURRENT_DATE)
     ORDER BY verse_date DESC NULLS LAST, sort_order ASC, created_at DESC
     LIMIT 1`,
  );
  return rows[0] ?? null;
}

export async function getVerse(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".verses WHERE id = $1::uuid`, id,
  );
  return rows[0] ?? null;
}

export async function createVerse(schema: string, input: CreateVerseInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".verses (text, reference, verse_date, sort_order, status)
     VALUES ($1, $2, $3::date, $4, $5)
     RETURNING *`,
    input.text,
    input.reference ?? null,
    input.verseDate || null,
    input.sortOrder ?? 0,
    input.status,
  );
  return rows[0];
}

export async function updateVerse(schema: string, id: string, input: UpdateVerseInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.text !== undefined) { setClauses.push(`text = $${paramIndex++}`); values.push(input.text); }
  if (input.reference !== undefined) { setClauses.push(`reference = $${paramIndex++}`); values.push(input.reference ?? null); }
  if (input.verseDate !== undefined) { setClauses.push(`verse_date = $${paramIndex++}::date`); values.push(input.verseDate || null); }
  if (input.sortOrder !== undefined) { setClauses.push(`sort_order = $${paramIndex++}`); values.push(input.sortOrder); }
  if (input.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(input.status); }

  if (setClauses.length === 0) return getVerse(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".verses SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteVerse(schema: string, id: string) {
  await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".verses WHERE id = $1::uuid`, id);
}
