import { prisma } from '../../config/database.js';
import { deleteUrlsFromR2 } from '../../config/r2.js';
import type { CreateSermonInput, UpdateSermonInput } from './schema.js';

// Pull the 11-char video id out of any YouTube URL shape, incl. the share-menu
// `/live/<id>?si=…` and `/shorts/<id>` forms (previously unhandled → invalid
// URL / no thumbnail).
function extractYoutubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|\/live\/|\/embed\/|\/shorts\/|\/v\/|youtu\.be\/)([0-9A-Za-z_-]{11})/);
  return match?.[1] ?? null;
}

/** Canonicalize any recognizable YouTube URL to https://www.youtube.com/watch?v=ID.
 *  Non-YouTube / unrecognized input is returned unchanged. */
export function normalizeYoutubeUrl(url?: string | null): string | null | undefined {
  if (!url) return url;
  const id = extractYoutubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : url;
}

function extractYoutubeThumbnail(url?: string | null): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** The form's preacher dropdown sends the NAME; resolve it to a preacher id. */
async function resolvePreacherId(schema: string, name?: string | null): Promise<string | null> {
  if (!name || !name.trim()) return null;
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "${schema}".preachers WHERE name = $1 LIMIT 1`,
    name.trim(),
  );
  return rows[0]?.id ?? null;
}

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
    whereClause += ` AND (s.title ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex})`;
    paramIndex++;
    values.push(`%${search}%`);
  }
  if (categoryId) {
    whereClause += ` AND EXISTS (SELECT 1 FROM "${schema}".sermon_category_map scm WHERE scm.sermon_id = s.id AND scm.category_id = $${paramIndex++}::uuid)`;
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
       LEFT JOIN "${schema}".preachers p ON p.id = s.preacher_id
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
     WHERE s.id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function getRelatedSermons(schema: string, id: string, limit = 6) {
  // Get current sermon's categories
  const cats = await prisma.$queryRawUnsafe<{ category_id: string }[]>(
    `SELECT category_id FROM "${schema}".sermon_category_map WHERE sermon_id = $1::uuid`,
    id,
  );

  const categoryIds = cats.map((c) => c.category_id);

  if (categoryIds.length > 0) {
    // Same category sermons first, then fill with latest
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `(SELECT s.*, p.name AS preacher_name, 1 AS relevance
        FROM "${schema}".sermons s
        LEFT JOIN "${schema}".preachers p ON p.id = s.preacher_id
        WHERE s.id != $1::uuid
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
        WHERE s.id != $1::uuid
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
     WHERE s.id != $1::uuid AND s.status = 'published'
     ORDER BY s.sermon_date DESC
     LIMIT $2`,
    id,
    limit,
  );
  return rows;
}

export async function createSermon(schema: string, input: CreateSermonInput) {
  const { categoryIds = [] } = input;

  // Canonicalize the YouTube URL (share-menu /live/…?si= → watch?v=…) then
  // auto-generate thumbnail from it if none was provided.
  const youtubeUrl = normalizeYoutubeUrl(input.youtubeUrl);
  const thumbnailUrl = input.thumbnailUrl || extractYoutubeThumbnail(youtubeUrl) || null;
  const preacherId = await resolvePreacherId(schema, input.preacher);

  const rows = await prisma.$queryRawUnsafe<[{ id: string }]>(
    `INSERT INTO "${schema}".sermons (title, scripture, youtube_url, sermon_date, thumbnail_url, preacher_id, status)
     VALUES ($1, $2, $3, $4, $5, $6::uuid, $7)
     RETURNING id`,
    input.title,
    input.scripture ?? null,
    youtubeUrl ?? null,
    new Date(input.date),
    thumbnailUrl,
    preacherId,
    input.status ?? 'published',
  );

  const sermonId = rows[0].id;

  if (categoryIds && categoryIds.length > 0) {
    const placeholders = categoryIds
      .map((_, i) => `($1::uuid, $${i + 2}::uuid)`)
      .join(', ');
    await prisma.$queryRawUnsafe(
      `INSERT INTO "${schema}".sermon_category_map (sermon_id, category_id) VALUES ${placeholders}`,
      sermonId,
      ...categoryIds,
    );
  }

  return getSermon(schema, sermonId);
}

export async function updateSermon(schema: string, id: string, input: UpdateSermonInput) {
  const { categoryIds } = input;

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.scripture !== undefined) { setClauses.push(`scripture = $${paramIndex++}`); values.push(input.scripture); }
  if (input.youtubeUrl !== undefined) {
    const youtubeUrl = normalizeYoutubeUrl(input.youtubeUrl);
    setClauses.push(`youtube_url = $${paramIndex++}`); values.push(youtubeUrl);
    // Auto-update thumbnail when YouTube URL changes (unless thumbnail explicitly provided)
    if (input.thumbnailUrl === undefined) {
      const autoThumb = extractYoutubeThumbnail(youtubeUrl);
      if (autoThumb) { setClauses.push(`thumbnail_url = $${paramIndex++}`); values.push(autoThumb); }
    }
  }
  if (input.date !== undefined) { setClauses.push(`sermon_date = $${paramIndex++}::date`); values.push(input.date); }
  if (input.thumbnailUrl !== undefined) { setClauses.push(`thumbnail_url = $${paramIndex++}`); values.push(input.thumbnailUrl); }
  if (input.preacher !== undefined) {
    setClauses.push(`preacher_id = $${paramIndex++}::uuid`);
    values.push(await resolvePreacherId(schema, input.preacher));
  }
  if (input.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(input.status); }

  if (setClauses.length > 0) {
    setClauses.push(`updated_at = NOW()`);
    await prisma.$queryRawUnsafe(
      `UPDATE "${schema}".sermons SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid`,
      ...values,
      id,
    );
  }

  if (categoryIds !== undefined) {
    await prisma.$queryRawUnsafe(
      `DELETE FROM "${schema}".sermon_category_map WHERE sermon_id = $1::uuid`,
      id,
    );
    if (categoryIds.length > 0) {
      const placeholders = categoryIds
        .map((_, i) => `($1::uuid, $${i + 2}::uuid)`)
        .join(', ');
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${schema}".sermon_category_map (sermon_id, category_id) VALUES ${placeholders}`,
        id,
        ...categoryIds,
      );
    }
  }

  return getSermon(schema, id);
}

export async function deleteSermon(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<{ thumbnail_url: string | null }[]>(
    `SELECT thumbnail_url FROM "${schema}".sermons WHERE id = $1::uuid`, id,
  );
  await prisma.$queryRawUnsafe(
    `DELETE FROM "${schema}".sermon_category_map WHERE sermon_id = $1::uuid`,
    id,
  );
  await prisma.$queryRawUnsafe(
    `DELETE FROM "${schema}".sermons WHERE id = $1::uuid`,
    id,
  );
  // Only an uploaded thumbnail is removed; a YouTube hqdefault URL is skipped
  // (not in our bucket) by deleteUrlsFromR2.
  if (rows[0]) await deleteUrlsFromR2([rows[0].thumbnail_url]);
}
