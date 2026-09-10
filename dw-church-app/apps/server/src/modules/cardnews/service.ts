import { prisma } from '../../config/database.js';
import type { CreateCardnewsInput, UpdateCardnewsInput } from './schema.js';

// camelCase(입력) → snake_case(컬럼). api-client 는 camelCase 로 보내고 반환 row 는
// snake_case → FetchAdapter 가 다시 camelize.
const COLUMN_MAP: Record<string, string> = {
  title: 'title',
  category: 'category',
  description: 'description',
  imageUrl: 'image_url',
  linkUrl: 'link_url',
  cards: 'cards',
  sortOrder: 'sort_order',
  status: 'status',
};
// jsonb 컬럼은 문자열화 + ::jsonb 캐스트가 필요.
const JSONB_COLS = new Set(['cards']);

// 표지 자동 동기화: cards 가 오면 표지(image_url)를 첫 카드로 맞춘다(레퍼런스 규칙:
// 표지=첫 카드). 운영자가 명시적으로 imageUrl 을 준 경우엔 존중.
function withCoverSync<T extends Record<string, unknown>>(input: T): T {
  const cards = input.cards as { imageUrl?: string }[] | undefined;
  if (Array.isArray(cards) && cards.length && !input.imageUrl) {
    return { ...input, imageUrl: cards[0]?.imageUrl ?? null };
  }
  return input;
}

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

export async function createCardnews(schema: string, rawInput: CreateCardnewsInput) {
  const input = withCoverSync(rawInput as Record<string, unknown>);
  const cols: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const v = input[key];
    if (v !== undefined) {
      cols.push(`"${col}"`);
      if (JSONB_COLS.has(col)) { placeholders.push(`$${i++}::jsonb`); values.push(JSON.stringify(v)); }
      else { placeholders.push(`$${i++}`); values.push(v); }
    }
  }
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".cardnews (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    ...values,
  );
  return rows[0];
}

export async function updateCardnews(schema: string, id: string, rawInput: UpdateCardnewsInput) {
  const input = withCoverSync(rawInput as Record<string, unknown>);
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const v = input[key];
    if (v !== undefined) {
      if (JSONB_COLS.has(col)) { setClauses.push(`"${col}" = $${i++}::jsonb`); values.push(JSON.stringify(v)); }
      else { setClauses.push(`"${col}" = $${i++}`); values.push(v); }
    }
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
