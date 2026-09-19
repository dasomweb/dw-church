import { prisma } from '../../config/database.js';
import { deleteUrlsFromR2, urlsFromValue } from '../../config/r2.js';
import type { CreateOnlineBulletinInput, UpdateOnlineBulletinInput } from './schema.js';

interface ListParams { page: number; perPage: number; search?: string; status?: string; }

export async function listOnlineBulletins(schema: string, params: ListParams) {
  const { page, perPage, search, status } = params;
  const offset = (page - 1) * perPage;
  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;
  if (status) { whereClause += ` AND status = $${paramIndex++}`; values.push(status); }
  if (search) { whereClause += ` AND title ILIKE $${paramIndex++}`; values.push(`%${search}%`); }
  const [rows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${schema}".online_bulletins ${whereClause} ORDER BY service_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      ...values, perPage, offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total FROM "${schema}".online_bulletins ${whereClause}`,
      ...values,
    ),
  ]);
  return { data: rows, total: countResult[0].total };
}

export async function getOnlineBulletin(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".online_bulletins WHERE id = $1::uuid`, id,
  );
  return rows[0] ?? null;
}

/** Latest bulletin — used by the storefront data block. publishedOnly for
 *  anonymous storefront reads; admins may preview drafts via getOnlineBulletin. */
export async function getLatestOnlineBulletin(schema: string, publishedOnly = true) {
  const where = publishedOnly ? `WHERE status = 'published'` : '';
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".online_bulletins ${where} ORDER BY service_date DESC LIMIT 1`,
  );
  return rows[0] ?? null;
}

export async function createOnlineBulletin(schema: string, input: CreateOnlineBulletinInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".online_bulletins (title, service_date, content, status)
     VALUES ($1, $2::date, $3::jsonb, $4)
     RETURNING *`,
    input.title, input.serviceDate, JSON.stringify(input.content ?? {}), input.status,
  );
  return rows[0];
}

export async function updateOnlineBulletin(schema: string, id: string, input: UpdateOnlineBulletinInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.serviceDate !== undefined) { setClauses.push(`service_date = $${paramIndex++}::date`); values.push(input.serviceDate); }
  if (input.content !== undefined) { setClauses.push(`content = $${paramIndex++}::jsonb`); values.push(JSON.stringify(input.content)); }
  if (input.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(input.status); }
  if (setClauses.length === 0) return getOnlineBulletin(schema, id);
  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".online_bulletins SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteOnlineBulletin(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<{ content: unknown }[]>(
    `SELECT content FROM "${schema}".online_bulletins WHERE id = $1::uuid`, id,
  );
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".online_bulletins WHERE id = $1::uuid`, id);
  // Clean up any uploaded sheet-music / images referenced anywhere in content.
  if (rows[0]) await deleteUrlsFromR2(urlsFromValue(rows[0].content));
}
