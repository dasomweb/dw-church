import { prisma } from '../../config/database.js';
import type { CreateCellInput, UpdateCellInput } from './schema.js';

// snake_case column ↔ camelCase input field map. The route layer parses
// camelCase (Zod); we translate to columns here.
const COLUMN_MAP: Record<keyof CreateCellInput, string> = {
  name: 'name',
  leaderName: 'leader_name',
  leaderRole: 'leader_role',
  region: 'region',
  meetingDay: 'meeting_day',
  meetingTime: 'meeting_time',
  location: 'location',
  contact: 'contact',
  description: 'description',
  photoUrl: 'photo_url',
  sortOrder: 'sort_order',
  isVisible: 'is_visible',
};

export async function listCells(schema: string, opts: { visibleOnly?: boolean } = {}) {
  const where = opts.visibleOnly ? 'WHERE is_visible = true' : '';
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".cells ${where} ORDER BY sort_order ASC, created_at ASC`,
  );
  return rows;
}

export async function getCell(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".cells WHERE id = $1::uuid`,
    id,
  );
  return rows[0] ?? null;
}

export async function createCell(schema: string, input: CreateCellInput) {
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
    `INSERT INTO "${schema}".cells (${cols.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING *`,
    ...values,
  );
  return rows[0];
}

export async function updateCell(schema: string, id: string, input: UpdateCellInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMN_MAP)) {
    const v = (input as Record<string, unknown>)[key];
    if (v !== undefined) {
      setClauses.push(`"${col}" = $${i++}`);
      values.push(v);
    }
  }
  if (setClauses.length === 0) return getCell(schema, id);
  setClauses.push('updated_at = NOW()');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".cells SET ${setClauses.join(', ')} WHERE id = $${i}::uuid RETURNING *`,
    ...values,
    id,
  );
  return rows[0] ?? null;
}

export async function deleteCell(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".cells WHERE id = $1::uuid`, id);
}
