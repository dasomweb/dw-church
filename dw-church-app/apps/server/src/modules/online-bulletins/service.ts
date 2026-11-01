import { prisma } from '../../config/database.js';
import { deleteUrlsFromR2, urlsFromValue } from '../../config/r2.js';
import type { CreateOnlineBulletinInput, UpdateOnlineBulletinInput } from './schema.js';

interface ListParams { page: number; perPage: number; search?: string; status?: string; activeOnly?: boolean; }

/** 교회 기준 시간대 — 목회컬럼·책 추천의 예약 공개와 같은 기준일. */
const CHURCH_TZ = 'America/New_York';
const TODAY = `(NOW() AT TIME ZONE '${CHURCH_TZ}')::date`;

/**
 * 스토어프론트에 보이는 주보 조건.
 *
 * `service_date <= TODAY` 가 **보장 조항**이다 — 예약일을 비워 두든, 예배일보다
 * 뒤로 잘못 적어 두든, **예배일이 되면 무조건 공개**된다(대표님 지시).
 * 예약일은 "그 전까지만 가려 두는" 장치일 뿐 공개를 막는 장치가 아니다.
 */
const VISIBLE = `status = 'published' AND (publish_at IS NULL OR publish_at <= ${TODAY} OR service_date <= ${TODAY})`;

export async function listOnlineBulletins(schema: string, params: ListParams) {
  const { page, perPage, search, status, activeOnly } = params;
  const offset = (page - 1) * perPage;
  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;
  // 비인증(스토어프론트)은 공개 조건으로 한 번에 거른다. 관리자는 예약분까지 다 본다.
  if (activeOnly) whereClause += ` AND ${VISIBLE}`;
  else if (status) { whereClause += ` AND status = $${paramIndex++}`; values.push(status); }
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

export async function getOnlineBulletin(schema: string, id: string, opts: { activeOnly?: boolean } = {}) {
  // 예약 공개 전 주보는 주소를 알아도 비인증에게는 안 준다(목록에서만 숨기면 의미 없음).
  const guard = opts.activeOnly ? `AND ${VISIBLE}` : '';
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".online_bulletins WHERE id = $1::uuid ${guard}`, id,
  );
  return rows[0] ?? null;
}

/** Latest bulletin — used by the storefront data block. publishedOnly for
 *  anonymous storefront reads; admins may preview drafts via getOnlineBulletin. */
export async function getLatestOnlineBulletin(schema: string, publishedOnly = true) {
  // '최신'도 공개 조건을 통과한 것 중 최신 — 예약 중인 다음 주 주보가 먼저 뜨면 안 된다.
  const where = publishedOnly ? `WHERE ${VISIBLE}` : '';
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".online_bulletins ${where} ORDER BY service_date DESC LIMIT 1`,
  );
  return rows[0] ?? null;
}

export async function createOnlineBulletin(schema: string, input: CreateOnlineBulletinInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".online_bulletins (title, service_date, content, publish_at, status)
     VALUES ($1, $2::date, $3::jsonb, $4::date, $5)
     RETURNING *`,
    // 빈 문자열은 NULL 로 — ''::date 는 Postgres 22007 로 죽는다(?? 가 아니라 ||).
    input.title, input.serviceDate, JSON.stringify(input.content ?? {}), input.publishAt || null, input.status,
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
  if (input.publishAt !== undefined) { setClauses.push(`publish_at = $${paramIndex++}::date`); values.push(input.publishAt || null); }
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
