import { prisma } from '../../config/database.js';
import type { CreateBulletinInput, UpdateBulletinInput } from './schema.js';

interface ListParams {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
}

export async function listBulletins(schema: string, params: ListParams) {
  const { page, perPage, search, status } = params;
  const offset = (page - 1) * perPage;

  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (status) { whereClause += ` AND status = $${paramIndex++}`; values.push(status); }
  if (search) { whereClause += ` AND title ILIKE $${paramIndex++}`; values.push(`%${search}%`); }

  const [rows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${schema}".bulletins ${whereClause} ORDER BY bulletin_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      ...values, perPage, offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total FROM "${schema}".bulletins ${whereClause}`,
      ...values,
    ),
  ]);

  return { data: rows, total: countResult[0].total };
}

export async function getBulletin(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".bulletins WHERE id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function createBulletin(schema: string, input: CreateBulletinInput) {
  const rows = await prisma.$queryRawUnsafe<[{ id: string }]>(
    `INSERT INTO "${schema}".bulletins (title, bulletin_date, pdf_url, images, thumbnail_url, status)
     VALUES ($1, $2::date, $3, $4::jsonb, $5, $6)
     RETURNING *`,
    input.title,
    input.bulletin_date,
    input.pdf_url ?? null,
    JSON.stringify(input.images),
    input.thumbnail_url ?? null,
    input.status,
  );
  return rows[0];
}

export async function updateBulletin(schema: string, id: string, input: UpdateBulletinInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.bulletin_date !== undefined) { setClauses.push(`bulletin_date = $${paramIndex++}::date`); values.push(input.bulletin_date); }
  if (input.pdf_url !== undefined) { setClauses.push(`pdf_url = $${paramIndex++}`); values.push(input.pdf_url); }
  if (input.images !== undefined) { setClauses.push(`images = $${paramIndex++}::jsonb`); values.push(JSON.stringify(input.images)); }
  if (input.thumbnail_url !== undefined) { setClauses.push(`thumbnail_url = $${paramIndex++}`); values.push(input.thumbnail_url); }
  if (input.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(input.status); }

  if (setClauses.length === 0) return getBulletin(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".bulletins SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteBulletin(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".bulletins WHERE id = $1::uuid`, id);
}
