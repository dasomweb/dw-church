import { prisma } from '../../config/database.js';
import type { CreateSermonInput, UpdateSermonInput } from './schema.js';

interface ListParams {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
  categoryId?: string;
  orderBy?: string;
  order?: string;
}

export async function listSermons(schema: string, params: ListParams) {
  const { page, perPage, search, status, categoryId, orderBy, order } = params;
  const offset = (page - 1) * perPage;

  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (status) {
    whereClause += ` AND s.status = $${paramIndex++}`;
    values.push(status);
  }
  if (search) {
    whereClause += ` AND s.title ILIKE $${paramIndex++}`;
    values.push(`%${search}%`);
  }
  if (categoryId) {
    whereClause += ` AND EXISTS (SELECT 1 FROM "${schema}".sermon_category_map scm WHERE scm.sermon_id = s.id AND scm.category_id = $${paramIndex++})`;
    values.push(categoryId);
  }

  const sortColumn = orderBy === 'title' ? 's.title' : 's.sermon_date';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';

  const [rows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT s.*,
              p.name AS preacher_name,
              COALESCE(
                (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
                 FROM "${schema}".sermon_category_map scm
                 JOIN "${schema}".categories c ON c.id = scm.category_id
                 WHERE scm.sermon_id = s.id), '[]'
              ) AS categories
       FROM "${schema}".sermons s
       LEFT JOIN "${schema}".preachers p ON p.id = s.preacher_id
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDir}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      ...values,
      perPage,
      offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total
       FROM "${schema}".sermons s
       ${whereClause}`,
      ...values,
    ),
  ]);

  return { data: rows, total: countResult[0].total };
}

export async function getSermon(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT s.*,
            p.name AS preacher_name,
            COALESCE(
              (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
               FROM "${schema}".sermon_category_map scm
               JOIN "${schema}".categories c ON c.id = scm.category_id
               WHERE scm.sermon_id = s.id), '[]'
            ) AS categories
     FROM "${schema}".sermons s
     LEFT JOIN "${schema}".preachers p ON p.id = s.preacher_id
     WHERE s.id = $1`,
    id,
  );
  return rows[0] ?? null;
}

export async function getRelatedSermons(schema: string, id: string, limit = 6) {
  // Get current sermon's categories
  const cats = await prisma.$queryRawUnsafe<{ category_id: string }[]>(
    `SELECT category_id FROM "${schema}".sermon_category_map WHERE sermon_id = $1`,
    id,
  );

  const categoryIds = cats.map((c) => c.category_id);

  if (categoryIds.length > 0) {
    // Same category sermons first, then fill with latest
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `(SELECT s.*, p.name AS preacher_name, 1 AS relevance
        FROM "${schema}".sermons s
        LEFT JOIN "${schema}".preachers p ON p.id = s.preacher_id
        WHERE s.id != $1
          AND s.status = 'published'
          AND EXISTS (
            SELECT 1 FROM "${schema}".sermon_category_map scm
            WHERE scm.sermon_id = s.id AND scm.category_id = ANY($2::uuid[])
          )
        ORDER BY s.sermon_date DESC
        LIMIT $3)
       UNION ALL
       (SELECT s.*, p.name AS preacher_name, 2 AS relevance
        FROM "${schema}".sermons s
        LEFT JOIN "${schema}".preachers p ON p.id = s.preacher_id
        WHERE s.id != $1
          AND s.status = 'published'
          AND NOT EXISTS (
            SELECT 1 FROM "${schema}".sermon_category_map scm
            WHERE scm.sermon_id = s.id AND scm.category_id = ANY($2::uuid[])
          )
        ORDER BY s.sermon_date DESC
        LIMIT $3)
       ORDER BY relevance, sermon_date DESC
       LIMIT $3`,
      id,
      categoryIds,
      limit,
    );
    return rows;
  }

  // No categories — just return latest
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT s.*, p.name AS preacher_name
     FROM "${schema}".sermons s
     LEFT JOIN "${schema}".preachers p ON p.id = s.preacher_id
     WHERE s.id != $1 AND s.status = 'published'
     ORDER BY s.sermon_date DESC
     LIMIT $2`,
    id,
    limit,
  );
  return rows;
}

export async function createSermon(schema: string, input: CreateSermonInput) {
  const { category_ids = [], ...data } = input;

  const rows = await prisma.$queryRawUnsafe<[{ id: string }]>(
    `INSERT INTO "${schema}".sermons (title, scripture, youtube_url, sermon_date, thumbnail_url, preacher_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    data.title,
    data.scripture ?? null,
    data.youtube_url ?? null,
    data.sermon_date,
    data.thumbnail_url ?? null,
    data.preacher_id ?? null,
    data.status ?? 'published',
  );

  const sermonId = rows[0].id;

  if (category_ids && category_ids.length > 0) {
    const placeholders = category_ids
      .map((_, i) => `($1, $${i + 2})`)
      .join(', ');
    await prisma.$queryRawUnsafe(
      `INSERT INTO "${schema}".sermon_category_map (sermon_id, category_id) VALUES ${placeholders}`,
      sermonId,
      ...category_ids,
    );
  }

  return getSermon(schema, sermonId);
}

export async function updateSermon(schema: string, id: string, input: UpdateSermonInput) {
  const { category_ids, ...data } = input;

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(data.title); }
  if (data.scripture !== undefined) { setClauses.push(`scripture = $${paramIndex++}`); values.push(data.scripture); }
  if (data.youtube_url !== undefined) { setClauses.push(`youtube_url = $${paramIndex++}`); values.push(data.youtube_url); }
  if (data.sermon_date !== undefined) { setClauses.push(`sermon_date = $${paramIndex++}::date`); values.push(data.sermon_date); }
  if (data.thumbnail_url !== undefined) { setClauses.push(`thumbnail_url = $${paramIndex++}`); values.push(data.thumbnail_url); }
  if (data.preacher_id !== undefined) { setClauses.push(`preacher_id = $${paramIndex++}`); values.push(data.preacher_id); }
  if (data.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(data.status); }

  if (setClauses.length > 0) {
    setClauses.push(`updated_at = NOW()`);
    await prisma.$queryRawUnsafe(
      `UPDATE "${schema}".sermons SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
      ...values,
      id,
    );
  }

  if (category_ids !== undefined) {
    await prisma.$queryRawUnsafe(
      `DELETE FROM "${schema}".sermon_category_map WHERE sermon_id = $1`,
      id,
    );
    if (category_ids.length > 0) {
      const placeholders = category_ids
        .map((_, i) => `($1, $${i + 2})`)
        .join(', ');
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".sermon_category_map (sermon_id, category_id) VALUES ${placeholders}`,
        id,
        ...category_ids,
      );
    }
  }

  return getSermon(schema, id);
}

export async function deleteSermon(schema: string, id: string) {
  await prisma.$queryRawUnsafe(
    `DELETE FROM "${schema}".sermon_category_map WHERE sermon_id = $1`,
    id,
  );
  await prisma.$queryRawUnsafe(
    `DELETE FROM "${schema}".sermons WHERE id = $1`,
    id,
  );
}
