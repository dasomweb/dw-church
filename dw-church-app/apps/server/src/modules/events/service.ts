import { prisma } from '../../config/database.js';
import type { CreateEventInput, UpdateEventInput } from './schema.js';

interface ListParams {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
}

export async function listEvents(schema: string, params: ListParams) {
  const { page, perPage, search, status } = params;
  const offset = (page - 1) * perPage;

  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (status) { whereClause += ` AND status = $${paramIndex++}`; values.push(status); }
  if (search) { whereClause += ` AND title ILIKE $${paramIndex++}`; values.push(`%${search}%`); }

  const [rows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${schema}".events ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      ...values, perPage, offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total FROM "${schema}".events ${whereClause}`,
      ...values,
    ),
  ]);

  return { data: rows, total: countResult[0].total };
}

export async function getEvent(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".events WHERE id = $1::uuid`, id,
  );
  return rows[0] ?? null;
}

export async function createEvent(schema: string, input: CreateEventInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".events
     (title, background_image_url, image_only, department, event_date, location, link_url, description, youtube_url, thumbnail_url, status)
     VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    input.title,
    input.background_image_url ?? null,
    input.image_only,
    input.department ?? null,
    input.event_date ?? null,
    input.location ?? null,
    input.link_url ?? null,
    input.description ?? null,
    input.youtube_url ?? null,
    input.thumbnail_url ?? null,
    input.status,
  );
  return rows[0];
}

export async function updateEvent(schema: string, id: string, input: UpdateEventInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.background_image_url !== undefined) { setClauses.push(`background_image_url = $${paramIndex++}`); values.push(input.background_image_url); }
  if (input.image_only !== undefined) { setClauses.push(`image_only = $${paramIndex++}`); values.push(input.image_only); }
  if (input.department !== undefined) { setClauses.push(`department = $${paramIndex++}`); values.push(input.department); }
  if (input.event_date !== undefined) { setClauses.push(`event_date = $${paramIndex++}::date`); values.push(input.event_date); }
  if (input.location !== undefined) { setClauses.push(`location = $${paramIndex++}`); values.push(input.location); }
  if (input.link_url !== undefined) { setClauses.push(`link_url = $${paramIndex++}`); values.push(input.link_url); }
  if (input.description !== undefined) { setClauses.push(`description = $${paramIndex++}`); values.push(input.description); }
  if (input.youtube_url !== undefined) { setClauses.push(`youtube_url = $${paramIndex++}`); values.push(input.youtube_url); }
  if (input.thumbnail_url !== undefined) { setClauses.push(`thumbnail_url = $${paramIndex++}`); values.push(input.thumbnail_url); }
  if (input.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(input.status); }

  if (setClauses.length === 0) return getEvent(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".events SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteEvent(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".events WHERE id = $1::uuid`, id);
}
