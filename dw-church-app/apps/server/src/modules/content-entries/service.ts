import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import type { CreateContentEntryInput, UpdateContentEntryInput } from './schema.js';

interface ContentEntryRow {
  id: string;
  type: string;
  name: string;
  data: unknown;
  created_at: Date;
  updated_at: Date;
}

export async function listContentEntries(schema: string, type?: string): Promise<ContentEntryRow[]> {
  if (type) {
    return prisma.$queryRawUnsafe<ContentEntryRow[]>(
      `SELECT id, type, name, data, created_at, updated_at
       FROM "${schema}".content_entries WHERE type = $1 ORDER BY updated_at DESC`,
      type,
    );
  }
  return prisma.$queryRawUnsafe<ContentEntryRow[]>(
    `SELECT id, type, name, data, created_at, updated_at
     FROM "${schema}".content_entries ORDER BY updated_at DESC`,
  );
}

export async function getContentEntry(schema: string, id: string): Promise<ContentEntryRow> {
  const rows = await prisma.$queryRawUnsafe<ContentEntryRow[]>(
    `SELECT id, type, name, data, created_at, updated_at
     FROM "${schema}".content_entries WHERE id = $1::uuid LIMIT 1`,
    id,
  );
  if (rows.length === 0) throw new AppError('NOT_FOUND', 404, 'Content entry not found');
  return rows[0]!;
}

export async function createContentEntry(schema: string, input: CreateContentEntryInput): Promise<ContentEntryRow> {
  const rows = await prisma.$queryRawUnsafe<ContentEntryRow[]>(
    `INSERT INTO "${schema}".content_entries (type, name, data)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id, type, name, data, created_at, updated_at`,
    input.type,
    input.name,
    JSON.stringify(input.data ?? {}),
  );
  return rows[0]!;
}

export async function updateContentEntry(schema: string, id: string, input: UpdateContentEntryInput): Promise<ContentEntryRow> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (input.name !== undefined) { setClauses.push(`name = $${i++}`); params.push(input.name); }
  if (input.data !== undefined) { setClauses.push(`data = $${i++}::jsonb`); params.push(JSON.stringify(input.data)); }
  if (setClauses.length === 0) throw new AppError('BAD_REQUEST', 400, 'No fields to update');
  setClauses.push('updated_at = NOW()');
  params.push(id);
  const rows = await prisma.$queryRawUnsafe<ContentEntryRow[]>(
    `UPDATE "${schema}".content_entries SET ${setClauses.join(', ')}
     WHERE id = $${i}::uuid
     RETURNING id, type, name, data, created_at, updated_at`,
    ...params,
  );
  if (rows.length === 0) throw new AppError('NOT_FOUND', 404, 'Content entry not found');
  return rows[0]!;
}

export async function removeContentEntry(schema: string, id: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `DELETE FROM "${schema}".content_entries WHERE id = $1::uuid RETURNING id`,
    id,
  );
  return rows.length > 0;
}
