import { prisma } from '../../config/database.js';
import type { CreateCardnewsInput, UpdateCardnewsInput } from './schema.js';

// camelCase(입력) → snake_case(컬럼). api-client 는 camelCase 로 보내고 반환 row 는
// snake_case → FetchAdapter 가 다시 camelize.
const COLUMN_MAP: Record<string, string> = {
  title: 'title',
  description: 'description',
  imageUrl: 'image_url',
  linkUrl: 'link_url',
  sortOrder: 'sort_order',
  status: 'status',
};

export async function listCardnews(schema: string, opts: { status?: string } = {}) {
  const params: unknown[] = [];
  let where = '';
  if (opts.status) { where = 'WHERE status = $1'; params.push(opts.status); }
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".cardnews ${where}
     ORDER BY sort_order ASC, created_at DESC`,
    ...params,
  );
}

export async function getCardnews(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".cardnews WHERE id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function createCardnews(schema: string, input: CreateCardnewsInput) {
  const cols: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined) {
      cols.push(`"${col}"`);
      placeholders.push(`$${i++}`);
      values.push(v);
    }
  }
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".cardnews (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    ...values,
  );
  return rows[0];
}

export async function updateCardnews(schema: string, id: string, input: UpdateCardnewsInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined) { setClauses.push(`"${col}" = $${i++}`); values.push(v); }
  }
  if (setClauses.length === 0) return getCardnews(schema, id);
  setClauses.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".cardnews SET ${setClauses.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteCardnews(schema: string, id: string) {
  await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".cardnews WHERE id = $1::uuid`, id);
}
