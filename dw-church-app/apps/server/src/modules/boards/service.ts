import { prisma } from '../../config/database.js';
import type { CreateBoardInput, UpdateBoardInput, CreateBoardPostInput, UpdateBoardPostInput } from './schema.js';

// ─── Boards ──────────────────────────────────────────────────

export async function listBoards(schema: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT b.*,
            (SELECT COUNT(*)::int FROM "${schema}".board_posts bp WHERE bp.board_id = b.id) AS post_count
     FROM "${schema}".boards b
     ORDER BY b.sort_order ASC, b.created_at DESC`,
  );
  return rows;
}

export async function getBoard(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT b.*,
            (SELECT COUNT(*)::int FROM "${schema}".board_posts bp WHERE bp.board_id = b.id) AS post_count
     FROM "${schema}".boards b
     WHERE b.id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function getBoardBySlug(schema: string, slug: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT b.*,
            (SELECT COUNT(*)::int FROM "${schema}".board_posts bp WHERE bp.board_id = b.id) AS post_count
     FROM "${schema}".boards b
     WHERE b.slug = $1 AND b.is_active = true`,
    slug,
  );
  return rows[0] ?? null;
}

export async function createBoard(schema: string, input: CreateBoardInput) {
  const rows = await prisma.$queryRawUnsafe<[{ id: string }]>(
    `INSERT INTO "${schema}".boards (title, slug, description, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    input.title,
    input.slug,
    input.description ?? '',
    input.sort_order ?? 0,
    input.is_active ?? true,
  );
  return getBoard(schema, rows[0].id);
}

export async function updateBoard(schema: string, id: string, input: UpdateBoardInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.slug !== undefined) { setClauses.push(`slug = $${paramIndex++}`); values.push(input.slug); }
  if (input.description !== undefined) { setClauses.push(`description = $${paramIndex++}`); values.push(input.description); }
  if (input.sort_order !== undefined) { setClauses.push(`sort_order = $${paramIndex++}`); values.push(input.sort_order); }
  if (input.is_active !== undefined) { setClauses.push(`is_active = $${paramIndex++}`); values.push(input.is_active); }

  if (setClauses.length > 0) {
    setClauses.push(`updated_at = NOW()`);
    await prisma.$queryRawUnsafe(
      `UPDATE "${schema}".boards SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid`,
      ...values,
      id,
    );
  }

  return getBoard(schema, id);
}

export async function deleteBoard(schema: string, id: string) {
  await prisma.$queryRawUnsafe(
    `DELETE FROM "${schema}".boards WHERE id = $1::uuid`,
    id,
  );
}

// ─── Board Posts ─────────────────────────────────────────────

interface ListPostsParams {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
}

export async function listPosts(schema: string, boardId: string, params: ListPostsParams) {
  const { page, perPage, search, status } = params;
  const offset = (page - 1) * perPage;

  let whereClause = 'WHERE bp.board_id = $1::uuid';
  const values: unknown[] = [boardId];
  let paramIndex = 2;

  if (status) {
    whereClause += ` AND bp.status = $${paramIndex++}`;
    values.push(status);
  }
  if (search) {
    whereClause += ` AND (bp.title ILIKE $${paramIndex} OR bp.author_name ILIKE $${paramIndex})`;
    paramIndex++;
    values.push(`%${search}%`);
  }

  const [rows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT bp.*
       FROM "${schema}".board_posts bp
       ${whereClause}
       ORDER BY bp.is_pinned DESC, bp.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      ...values,
      perPage,
      offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total
       FROM "${schema}".board_posts bp
       ${whereClause}`,
      ...values,
    ),
  ]);

  return { data: rows, total: countResult[0].total };
}

export async function getPost(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT bp.* FROM "${schema}".board_posts bp WHERE bp.id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function createPost(schema: string, boardId: string, input: CreateBoardPostInput) {
  const rows = await prisma.$queryRawUnsafe<[{ id: string }]>(
    `INSERT INTO "${schema}".board_posts (board_id, title, author_name, content, attachments, is_pinned, status)
     VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6, $7)
     RETURNING id`,
    boardId,
    input.title,
    input.author_name ?? '',
    input.content ?? '',
    JSON.stringify(input.attachments ?? []),
    input.is_pinned ?? false,
    input.status ?? 'published',
  );
  return getPost(schema, rows[0].id);
}

export async function updatePost(schema: string, id: string, input: UpdateBoardPostInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.author_name !== undefined) { setClauses.push(`author_name = $${paramIndex++}`); values.push(input.author_name); }
  if (input.content !== undefined) { setClauses.push(`content = $${paramIndex++}`); values.push(input.content); }
  if (input.attachments !== undefined) { setClauses.push(`attachments = $${paramIndex++}::jsonb`); values.push(JSON.stringify(input.attachments)); }
  if (input.is_pinned !== undefined) { setClauses.push(`is_pinned = $${paramIndex++}`); values.push(input.is_pinned); }
  if (input.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(input.status); }

  if (setClauses.length > 0) {
    setClauses.push(`updated_at = NOW()`);
    await prisma.$queryRawUnsafe(
      `UPDATE "${schema}".board_posts SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid`,
      ...values,
      id,
    );
  }

  return getPost(schema, id);
}

export async function deletePost(schema: string, id: string) {
  await prisma.$queryRawUnsafe(
    `DELETE FROM "${schema}".board_posts WHERE id = $1::uuid`,
    id,
  );
}

export async function incrementViewCount(schema: string, id: string) {
  await prisma.$queryRawUnsafe(
    `UPDATE "${schema}".board_posts SET view_count = view_count + 1 WHERE id = $1::uuid`,
    id,
  );
}
