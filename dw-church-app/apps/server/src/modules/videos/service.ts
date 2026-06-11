import { prisma } from '../../config/database.js';
import type {
  CreateVideoInput, UpdateVideoInput,
  CreateVideoCategoryInput, UpdateVideoCategoryInput,
} from './schema.js';

function extractYoutubeThumbnail(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?\s/]+)/);
  return match?.[1] ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

interface ListParams {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
  categoryId?: string;
  category?: string; // category slug (used by the storefront video_board block)
}

export async function listVideos(schema: string, params: ListParams) {
  const { page, perPage, search, status, categoryId, category } = params;
  const offset = (page - 1) * perPage;

  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (status) { whereClause += ` AND v.status = $${paramIndex++}`; values.push(status); }
  if (search) { whereClause += ` AND v.title ILIKE $${paramIndex++}`; values.push(`%${search}%`); }
  if (categoryId) { whereClause += ` AND v.category_id = $${paramIndex++}::uuid`; values.push(categoryId); }
  // The block's "카테고리" field accepts either the slug (ascii) or the
  // human name — match both so operators don't have to remember the slug.
  if (category) { whereClause += ` AND (c.slug = $${paramIndex} OR c.name = $${paramIndex})`; paramIndex++; values.push(category); }

  const [rows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT v.*, c.name AS category_name
       FROM "${schema}".videos v
       LEFT JOIN "${schema}".video_categories c ON c.id = v.category_id
       ${whereClause}
       ORDER BY v.video_date DESC NULLS LAST, v.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      ...values, perPage, offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total
       FROM "${schema}".videos v
       LEFT JOIN "${schema}".video_categories c ON c.id = v.category_id
       ${whereClause}`,
      ...values,
    ),
  ]);

  return { data: rows, total: countResult[0].total };
}

export async function getVideo(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT v.*, c.name AS category_name
     FROM "${schema}".videos v
     LEFT JOIN "${schema}".video_categories c ON c.id = v.category_id
     WHERE v.id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function createVideo(schema: string, input: CreateVideoInput) {
  const thumbnailUrl = input.thumbnailUrl || extractYoutubeThumbnail(input.youtubeUrl) || null;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".videos (title, youtube_url, video_date, thumbnail_url, category_id, status)
     VALUES ($1, $2, $3::date, $4, $5::uuid, $6)
     RETURNING *`,
    input.title,
    input.youtubeUrl ?? null,
    input.videoDate || null,
    thumbnailUrl,
    input.categoryIds?.[0] ?? null,
    input.status,
  );
  return rows[0];
}

export async function updateVideo(schema: string, id: string, input: UpdateVideoInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.youtubeUrl !== undefined) {
    setClauses.push(`youtube_url = $${paramIndex++}`); values.push(input.youtubeUrl);
    // Re-derive the thumbnail unless the caller supplied one explicitly.
    if (input.thumbnailUrl === undefined) {
      const autoThumb = extractYoutubeThumbnail(input.youtubeUrl);
      setClauses.push(`thumbnail_url = $${paramIndex++}`); values.push(autoThumb);
    }
  }
  if (input.videoDate !== undefined) { setClauses.push(`video_date = $${paramIndex++}::date`); values.push(input.videoDate || null); }
  if (input.thumbnailUrl !== undefined) { setClauses.push(`thumbnail_url = $${paramIndex++}`); values.push(input.thumbnailUrl); }
  if (input.categoryIds !== undefined) { setClauses.push(`category_id = $${paramIndex++}::uuid`); values.push(input.categoryIds[0] ?? null); }
  if (input.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(input.status); }

  if (setClauses.length === 0) return getVideo(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".videos SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteVideo(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".videos WHERE id = $1::uuid`, id);
}

// ─── Video Categories ────────────────────────────────────────────────

export async function listVideoCategories(schema: string) {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".video_categories ORDER BY name ASC`,
  );
}

export async function getVideoCategory(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".video_categories WHERE id = $1::uuid`, id,
  );
  return rows[0] ?? null;
}

export async function createVideoCategory(schema: string, input: CreateVideoCategoryInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".video_categories (name, slug)
     VALUES ($1, $2)
     RETURNING *`,
    input.name, input.slug,
  );
  return rows[0];
}

export async function updateVideoCategory(schema: string, id: string, input: UpdateVideoCategoryInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(input.name); }
  if (input.slug !== undefined) { setClauses.push(`slug = $${paramIndex++}`); values.push(input.slug); }

  if (setClauses.length === 0) return getVideoCategory(schema, id);

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".video_categories SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteVideoCategory(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".video_categories WHERE id = $1::uuid`, id);
}
