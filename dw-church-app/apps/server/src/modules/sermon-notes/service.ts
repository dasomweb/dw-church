import { prisma } from '../../config/database.js';
import { deleteUrlsFromR2, urlsFromValue } from '../../config/r2.js';
import type { CreateSermonNoteInput, UpdateSermonNoteInput } from './schema.js';

interface ListParams { page: number; perPage: number; search?: string; status?: string; }

export async function listSermonNotes(schema: string, params: ListParams) {
  const { page, perPage, search, status } = params;
  const offset = (page - 1) * perPage;
  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;
  if (status) { whereClause += ` AND status = $${paramIndex++}`; values.push(status); }
  if (search) { whereClause += ` AND title ILIKE $${paramIndex++}`; values.push(`%${search}%`); }
  const [rows, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${schema}".sermon_notes ${whereClause} ORDER BY note_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      ...values, perPage, offset,
    ),
    prisma.$queryRawUnsafe<[{ total: number }]>(
      `SELECT COUNT(*)::int AS total FROM "${schema}".sermon_notes ${whereClause}`,
      ...values,
    ),
  ]);
  return { data: rows, total: countResult[0].total };
}

export async function getSermonNote(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".sermon_notes WHERE id = $1::uuid`, id,
  );
  return rows[0] ?? null;
}

/** 특정 주일 날짜의 설교노트 — 온라인 주보/온라인 주보 편집기가 날짜로 끌어옴.
 *  publishedOnly: 익명 스토어프론트 읽기는 게시본만. 여러 개면 최신 갱신본. */
export async function getSermonNoteByDate(schema: string, date: string, publishedOnly = true) {
  const where = publishedOnly ? `AND status = 'published'` : '';
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".sermon_notes WHERE note_date = $1::date ${where} ORDER BY updated_at DESC LIMIT 1`,
    date,
  );
  return rows[0] ?? null;
}

export async function createSermonNote(schema: string, input: CreateSermonNoteInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".sermon_notes (title, note_date, content, status)
     VALUES ($1, $2::date, $3::jsonb, $4)
     RETURNING *`,
    input.title ?? '', input.noteDate, JSON.stringify(input.content ?? {}), input.status ?? 'published',
  );
  return rows[0];
}

export async function updateSermonNote(schema: string, id: string, input: UpdateSermonNoteInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.noteDate !== undefined) { setClauses.push(`note_date = $${paramIndex++}::date`); values.push(input.noteDate); }
  if (input.content !== undefined) { setClauses.push(`content = $${paramIndex++}::jsonb`); values.push(JSON.stringify(input.content)); }
  if (input.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(input.status); }
  if (setClauses.length === 0) return getSermonNote(schema, id);
  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".sermon_notes SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

/** 날짜 기준 업서트 — 온라인 주보 편집기에서 해당 주일 설교노트를 저장할 때 사용.
 *  같은 날짜 행이 있으면 갱신, 없으면 생성(설교노트 = 주일당 1개). */
export async function upsertSermonNoteByDate(schema: string, date: string, input: UpdateSermonNoteInput) {
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "${schema}".sermon_notes WHERE note_date = $1::date ORDER BY updated_at DESC LIMIT 1`,
    date,
  );
  if (existing[0]) return updateSermonNote(schema, existing[0].id, { ...input, noteDate: date });
  return createSermonNote(schema, {
    title: input.title ?? '',
    noteDate: date,
    content: (input.content ?? {}) as Record<string, unknown>,
    status: input.status ?? 'published',
  });
}

export async function deleteSermonNote(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<{ content: unknown }[]>(
    `SELECT content FROM "${schema}".sermon_notes WHERE id = $1::uuid`, id,
  );
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".sermon_notes WHERE id = $1::uuid`, id);
  if (rows[0]) await deleteUrlsFromR2(urlsFromValue(rows[0].content));
}
