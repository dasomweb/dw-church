import { prisma } from '../../config/database.js';
import type { CreateAlbumInput, UpdateAlbumInput } from './schema.js';

interface ListParams {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
  categoryId?: string;
}

export async function listAlbums(schema: string, params: ListParams) {
  const { page, perPage, search, status, categoryId } = params;
  const offset = (page - 1) * perPage;

  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (status) { whereClause += ` AND a.status = $${paramIndex++}`; values.push(status); }
  if (search) { whereClause += ` AND a.title ILIKE $${paramIndex++}`; values.push(`%${search}%`); }
  if (categoryId) { whereClause += ` AND a.category_id = $${paramIndex++}`; values.push(categoryId); }

  const [rows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT a.*, c.name AS category_name
       FROM "${schema}".albums a
       LEFT JOIN "${schema}".categories c ON c.id = a.category_id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      ...values, perPage, offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total FROM "${schema}".albums a ${whereClause}`,
      ...values,
    ),
  ]);

  return { data: rows, total: countResult[0].total };
}

export async function getAlbum(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT a.*, c.name AS category_name
     FROM "${schema}".albums a
     LEFT JOIN "${schema}".categories c ON c.id = a.category_id
     WHERE a.id = $1`,
    id,
  );
  return rows[0] ?? null;
}

export async function createAlbum(schema: string, input: CreateAlbumInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".albums (title, images, youtube_url, thumbnail_url, category_id, status)
     VALUES ($1, $2::jsonb, $3, $4, $5, $6)
     RETURNING *`,
    input.title,
    JSON.stringify(input.images),
    input.youtube_url ?? null,
    input.thumbnail_url ?? null,
    input.category_id ?? null,
    input.status,
  );
  return rows[0];
}

export async function updateAlbum(schema: string, id: string, input: UpdateAlbumInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.images !== undefined) { setClauses.push(`images = $${paramIndex++}::jsonb`); values.push(JSON.stringify(input.images)); }
  if (input.youtube_url !== undefined) { setClauses.push(`youtube_url = $${paramIndex++}`); values.push(input.youtube_url); }
  if (input.thumbnail_url !== undefined) { setClauses.push(`thumbnail_url = $${paramIndex++}`); values.push(input.thumbnail_url); }
  if (input.category_id !== undefined) { setClauses.push(`category_id = $${paramIndex++}`); values.push(input.category_id); }
  if (input.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(input.status); }

  if (setClauses.length === 0) return getAlbum(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".albums SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteAlbum(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".albums WHERE id = $1`, id);
}
