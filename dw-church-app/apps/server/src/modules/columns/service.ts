import { prisma } from '../../config/database.js';
import type { CreateColumnInput, UpdateColumnInput } from './schema.js';

interface ListParams {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
}

export async function listColumns(schema: string, params: ListParams) {
  const { page, perPage, search, status } = params;
  const offset = (page - 1) * perPage;

  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (status) { whereClause += ` AND status = $${paramIndex++}`; values.push(status); }
  if (search) { whereClause += ` AND title ILIKE $${paramIndex++}`; values.push(`%${search}%`); }

  const [rows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${schema}".columns_pastoral ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      ...values, perPage, offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total FROM "${schema}".columns_pastoral ${whereClause}`,
      ...values,
    ),
  ]);

  return { data: rows, total: countResult[0].total };
}

export async function getColumn(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".columns_pastoral WHERE id = $1`, id,
  );
  return rows[0] ?? null;
}

export async function createColumn(schema: string, input: CreateColumnInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".columns_pastoral (title, content, top_image_url, bottom_image_url, youtube_url, thumbnail_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    input.title,
    input.content ?? null,
    input.top_image_url ?? null,
    input.bottom_image_url ?? null,
    input.youtube_url ?? null,
    input.thumbnail_url ?? null,
    input.status,
  );
  return rows[0];
}

export async function updateColumn(schema: string, id: string, input: UpdateColumnInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.content !== undefined) { setClauses.push(`content = $${paramIndex++}`); values.push(input.content); }
  if (input.top_image_url !== undefined) { setClauses.push(`top_image_url = $${paramIndex++}`); values.push(input.top_image_url); }
  if (input.bottom_image_url !== undefined) { setClauses.push(`bottom_image_url = $${paramIndex++}`); values.push(input.bottom_image_url); }
  if (input.youtube_url !== undefined) { setClauses.push(`youtube_url = $${paramIndex++}`); values.push(input.youtube_url); }
  if (input.thumbnail_url !== undefined) { setClauses.push(`thumbnail_url = $${paramIndex++}`); values.push(input.thumbnail_url); }
  if (input.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(input.status); }

  if (setClauses.length === 0) return getColumn(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".columns_pastoral SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteColumn(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".columns_pastoral WHERE id = $1`, id);
}
