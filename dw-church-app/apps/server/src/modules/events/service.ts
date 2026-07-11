import { prisma } from '../../config/database.js';
import { deleteUrlsFromR2 } from '../../config/r2.js';
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
    input.backgroundImageUrl ?? null,
    input.imageOnly,
    input.department ?? null,
    input.eventDate || null,
    input.location ?? null,
    input.linkUrl ?? null,
    input.description ?? null,
    input.youtubeUrl ?? null,
    input.thumbnailUrl ?? null,
    input.status,
  );
  return rows[0];
}

export async function updateEvent(schema: string, id: string, input: UpdateEventInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.backgroundImageUrl !== undefined) { setClauses.push(`background_image_url = $${paramIndex++}`); values.push(input.backgroundImageUrl); }
  if (input.imageOnly !== undefined) { setClauses.push(`image_only = $${paramIndex++}`); values.push(input.imageOnly); }
  if (input.department !== undefined) { setClauses.push(`department = $${paramIndex++}`); values.push(input.department); }
  if (input.eventDate !== undefined) { setClauses.push(`event_date = $${paramIndex++}::date`); values.push(input.eventDate || null); }
  if (input.location !== undefined) { setClauses.push(`location = $${paramIndex++}`); values.push(input.location); }
  if (input.linkUrl !== undefined) { setClauses.push(`link_url = $${paramIndex++}`); values.push(input.linkUrl); }
  if (input.description !== undefined) { setClauses.push(`description = $${paramIndex++}`); values.push(input.description); }
  if (input.youtubeUrl !== undefined) { setClauses.push(`youtube_url = $${paramIndex++}`); values.push(input.youtubeUrl); }
  if (input.thumbnailUrl !== undefined) { setClauses.push(`thumbnail_url = $${paramIndex++}`); values.push(input.thumbnailUrl); }
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
  const rows = await prisma.$queryRawUnsafe<{ background_image_url: string | null; thumbnail_url: string | null }[]>(
    `SELECT background_image_url, thumbnail_url FROM "${schema}".events WHERE id = $1::uuid`, id,
  );
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".events WHERE id = $1::uuid`, id);
  if (rows[0]) await deleteUrlsFromR2([rows[0].background_image_url, rows[0].thumbnail_url]);
}
