import { prisma } from '../../config/database.js';
import type { CreateBookInput, UpdateBookInput } from './schema.js';

interface ListParams {
  page: number;
  perPage: number;
  search?: string;
  status?: string;
  category?: string;
  /** true 면 게시 기간이 지난/아직 안 된 항목을 걸러낸다(스토어프론트). */
  activeOnly?: boolean;
}

/** 정렬: 대표 추천 먼저 → 운영자 지정 순서 → 최근 추천일 → 등록 역순. */
const ORDER = `ORDER BY is_featured DESC, sort_order ASC, recommended_at DESC NULLS LAST, created_at DESC`;

/** 게시 기간 필터 — 비어 있는 날짜는 "제한 없음"으로 본다. */
const IN_WINDOW = `(start_date IS NULL OR start_date <= CURRENT_DATE) AND (end_date IS NULL OR end_date >= CURRENT_DATE)`;

export async function listBooks(schema: string, params: ListParams) {
  const { page, perPage, search, status, category, activeOnly } = params;
  const offset = (page - 1) * perPage;

  let where = 'WHERE 1=1';
  const values: unknown[] = [];
  let i = 1;
  if (status) { where += ` AND status = $${i++}`; values.push(status); }
  if (category) { where += ` AND category = $${i++}`; values.push(category); }
  if (activeOnly) { where += ` AND ${IN_WINDOW}`; }
  // 제목·저자·추천사 어디에 있든 찾히게 — 성도가 기억하는 단서가 제각각이다.
  if (search) {
    where += ` AND (title ILIKE $${i} OR author ILIKE $${i} OR recommendation ILIKE $${i})`;
    values.push(`%${search}%`);
    i++;
  }

  const [rows, count] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${schema}".books ${where} ${ORDER} LIMIT $${i++} OFFSET $${i++}`,
      ...values, perPage, offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total FROM "${schema}".books ${where}`, ...values,
    ),
  ]);
  return { data: rows, total: count[0].total };
}

/** 블록 필터용 분야 목록 — 지금 노출 중인 책 기준. */
export async function listBookCategories(schema: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ category: string }[]>(
    `SELECT DISTINCT category FROM "${schema}".books
     WHERE status = 'published' AND category IS NOT NULL AND category <> '' AND ${IN_WINDOW}
     ORDER BY category ASC`,
  );
  return rows.map((r) => r.category);
}

export async function getBook(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".books WHERE id = $1::uuid`, id,
  );
  return rows[0] ?? null;
}

export async function createBook(schema: string, input: CreateBookInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".books
       (title, author, publisher, cover_image_urls, category, recommendation,
        link_us, link_kr, recommended_at, start_date, end_date,
        sort_order, is_featured, featured_period, status)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9::date,$10::date,$11::date,$12,$13,$14,$15)
     RETURNING *`,
    input.title,
    input.author ?? null,
    input.publisher ?? null,
    JSON.stringify(input.coverImageUrls ?? []),
    input.category ?? null,
    input.recommendation ?? null,
    input.linkUs ?? null,
    input.linkKr ?? null,
    input.recommendedAt || null,
    input.startDate || null,
    input.endDate || null,
    input.sortOrder ?? 0,
    input.isFeatured ?? false,
    input.featuredPeriod ?? 'month',
    input.status,
  );
  return rows[0];
}

export async function updateBook(schema: string, id: string, input: UpdateBookInput) {
  const set: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const put = (col: string, v: unknown, cast = '') => { set.push(`${col} = $${i++}${cast}`); values.push(v); };

  if (input.title !== undefined) put('title', input.title);
  if (input.author !== undefined) put('author', input.author ?? null);
  if (input.publisher !== undefined) put('publisher', input.publisher ?? null);
  if (input.coverImageUrls !== undefined) put('cover_image_urls', JSON.stringify(input.coverImageUrls ?? []), '::jsonb');
  if (input.category !== undefined) put('category', input.category ?? null);
  if (input.recommendation !== undefined) put('recommendation', input.recommendation ?? null);
  if (input.linkUs !== undefined) put('link_us', input.linkUs ?? null);
  if (input.linkKr !== undefined) put('link_kr', input.linkKr ?? null);
  if (input.recommendedAt !== undefined) put('recommended_at', input.recommendedAt || null, '::date');
  if (input.startDate !== undefined) put('start_date', input.startDate || null, '::date');
  if (input.endDate !== undefined) put('end_date', input.endDate || null, '::date');
  if (input.sortOrder !== undefined) put('sort_order', input.sortOrder);
  if (input.isFeatured !== undefined) put('is_featured', input.isFeatured);
  if (input.featuredPeriod !== undefined) put('featured_period', input.featuredPeriod);
  if (input.status !== undefined) put('status', input.status);

  if (set.length === 0) return getBook(schema, id);
  set.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".books SET ${set.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteBook(schema: string, id: string) {
  await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".books WHERE id = $1::uuid`, id);
}
