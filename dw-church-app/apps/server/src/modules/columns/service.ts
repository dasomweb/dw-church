import { prisma } from '../../config/database.js';
import { deleteUrlsFromR2 } from '../../config/r2.js';
import type { CreateColumnInput, UpdateColumnInput } from './schema.js';

interface ListParams {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
  /** true 면 예약 공개 기간 밖의 칼럼을 걸러낸다(스토어프론트). */
  activeOnly?: boolean;
}

/**
 * 교회 기준 시간대. CURRENT_DATE(=UTC) 로 비교하면 미 동부에서는 전날 저녁
 * 8시에 날짜가 바뀌어, 주일자 칼럼이 토요일 밤에 떠 버린다.
 * 관리자 뱃지(packages/admin-app/src/lib/publish-window.ts)와 같은 시간대.
 */
const CHURCH_TZ = 'America/New_York';
const TODAY = `(NOW() AT TIME ZONE '${CHURCH_TZ}')::date`;

/**
 * 예약 공개 필터 — 빈 날짜는 "제한 없음"으로 본다.
 * 스케줄러가 없다. 날짜가 되면 이 조건이 통과되면서 저절로 공개된다.
 */
const IN_WINDOW = `(publish_at IS NULL OR publish_at <= ${TODAY}) AND (unpublish_at IS NULL OR unpublish_at >= ${TODAY})`;

/** 정렬: 공개일(없으면 등록일) 최신순. 같은 날 여러 건이면 등록 역순. */
const ORDER = `ORDER BY COALESCE(publish_at, created_at::date) DESC, created_at DESC`;

export async function listColumns(schema: string, params: ListParams) {
  const { page, perPage, search, status, activeOnly } = params;
  const offset = (page - 1) * perPage;

  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (status) { whereClause += ` AND status = $${paramIndex++}`; values.push(status); }
  if (activeOnly) { whereClause += ` AND ${IN_WINDOW}`; }
  if (search) { whereClause += ` AND title ILIKE $${paramIndex++}`; values.push(`%${search}%`); }

  const [rows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${schema}".columns_pastoral ${whereClause} ${ORDER} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      ...values, perPage, offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total FROM "${schema}".columns_pastoral ${whereClause}`,
      ...values,
    ),
  ]);

  return { data: rows, total: countResult[0].total };
}

/**
 * 한 건 조회. activeOnly(비인증 요청)면 공개 상태 + 예약 공개 기간 안인 것만 준다 —
 * 예약 공개가 주소를 아는 사람에게는 무용지물이 되면 안 되므로, 목록뿐 아니라
 * 상세에서도 같은 조건으로 막는다.
 */
export async function getColumn(schema: string, id: string, opts: { activeOnly?: boolean } = {}) {
  const guard = opts.activeOnly ? `AND status = 'published' AND ${IN_WINDOW}` : '';
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".columns_pastoral WHERE id = $1::uuid ${guard}`, id,
  );
  return rows[0] ?? null;
}

export async function createColumn(schema: string, input: CreateColumnInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".columns_pastoral
       (title, content, top_image_url, bottom_image_url, youtube_url, thumbnail_url,
        publish_at, unpublish_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9)
     RETURNING *`,
    input.title,
    input.content ?? null,
    input.topImageUrl ?? null,
    input.bottomImageUrl ?? null,
    input.youtubeUrl ?? null,
    input.thumbnailUrl ?? null,
    // 빈 문자열은 NULL 로 — ''::date 는 Postgres 22007 로 죽는다(?? 가 아니라 ||).
    input.publishAt || null,
    input.unpublishAt || null,
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
  if (input.topImageUrl !== undefined) { setClauses.push(`top_image_url = $${paramIndex++}`); values.push(input.topImageUrl); }
  if (input.bottomImageUrl !== undefined) { setClauses.push(`bottom_image_url = $${paramIndex++}`); values.push(input.bottomImageUrl); }
  if (input.youtubeUrl !== undefined) { setClauses.push(`youtube_url = $${paramIndex++}`); values.push(input.youtubeUrl); }
  if (input.thumbnailUrl !== undefined) { setClauses.push(`thumbnail_url = $${paramIndex++}`); values.push(input.thumbnailUrl); }
  if (input.publishAt !== undefined) { setClauses.push(`publish_at = $${paramIndex++}::date`); values.push(input.publishAt || null); }
  if (input.unpublishAt !== undefined) { setClauses.push(`unpublish_at = $${paramIndex++}::date`); values.push(input.unpublishAt || null); }
  if (input.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(input.status); }

  if (setClauses.length === 0) return getColumn(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".columns_pastoral SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteColumn(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<{ top_image_url: string | null; bottom_image_url: string | null; thumbnail_url: string | null }[]>(
    `SELECT top_image_url, bottom_image_url, thumbnail_url FROM "${schema}".columns_pastoral WHERE id = $1::uuid`, id,
  );
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".columns_pastoral WHERE id = $1::uuid`, id);
  if (rows[0]) await deleteUrlsFromR2([rows[0].top_image_url, rows[0].bottom_image_url, rows[0].thumbnail_url]);
}
