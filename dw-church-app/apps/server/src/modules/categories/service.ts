import { prisma } from '../../config/database.js';
import type {
  CreateSermonCategoryInput, UpdateSermonCategoryInput,
  CreatePreacherInput, UpdatePreacherInput,
  CreateAlbumCategoryInput, UpdateAlbumCategoryInput,
} from './schema.js';

// ─── Generic ─────────────────────────────────────────────────────────

export async function listByType(schema: string, type: string) {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".categories WHERE type = $1 ORDER BY sort_order ASC, name ASC`,
    type,
  );
}

// ─── Sermon Categories ───────────────────────────────────────────────

export async function listSermonCategories(schema: string) {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".categories WHERE type = 'sermon' ORDER BY sort_order ASC, name ASC`,
  );
}

export async function getSermonCategory(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".categories WHERE id = $1 AND type = 'sermon'`, id,
  );
  return rows[0] ?? null;
}

export async function createSermonCategory(schema: string, input: CreateSermonCategoryInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".categories (name, slug, type, sort_order)
     VALUES ($1, $2, 'sermon', $3)
     RETURNING *`,
    input.name, input.slug, input.sort_order,
  );
  return rows[0];
}

export async function updateSermonCategory(schema: string, id: string, input: UpdateSermonCategoryInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(input.name); }
  if (input.slug !== undefined) { setClauses.push(`slug = $${paramIndex++}`); values.push(input.slug); }
  if (input.sort_order !== undefined) { setClauses.push(`sort_order = $${paramIndex++}`); values.push(input.sort_order); }

  if (setClauses.length === 0) return getSermonCategory(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".categories SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND type = 'sermon' RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteSermonCategory(schema: string, id: string) {
  await prisma.$queryRawUnsafe(
    `DELETE FROM "${schema}".categories WHERE id = $1 AND type = 'sermon'`, id,
  );
}

// ─── Preachers ───────────────────────────────────────────────────────

export async function listPreachers(schema: string) {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".preachers ORDER BY is_default DESC, name ASC`,
  );
}

export async function getPreacher(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".preachers WHERE id = $1`, id,
  );
  return rows[0] ?? null;
}

export async function createPreacher(schema: string, input: CreatePreacherInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".preachers (name, title, is_default)
     VALUES ($1, $2, $3)
     RETURNING *`,
    input.name, input.title ?? null, input.is_default,
  );
  return rows[0];
}

export async function updatePreacher(schema: string, id: string, input: UpdatePreacherInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(input.name); }
  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.is_default !== undefined) { setClauses.push(`is_default = $${paramIndex++}`); values.push(input.is_default); }

  if (setClauses.length === 0) return getPreacher(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".preachers SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deletePreacher(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".preachers WHERE id = $1`, id);
}

// ─── Album Categories ────────────────────────────────────────────────

export async function listAlbumCategories(schema: string) {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".categories WHERE type = 'album' ORDER BY name ASC`,
  );
}

export async function getAlbumCategory(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".categories WHERE id = $1 AND type = 'album'`, id,
  );
  return rows[0] ?? null;
}

export async function createAlbumCategory(schema: string, input: CreateAlbumCategoryInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".categories (name, slug, type)
     VALUES ($1, $2, 'album')
     RETURNING *`,
    input.name, input.slug,
  );
  return rows[0];
}

export async function updateAlbumCategory(schema: string, id: string, input: UpdateAlbumCategoryInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(input.name); }
  if (input.slug !== undefined) { setClauses.push(`slug = $${paramIndex++}`); values.push(input.slug); }

  if (setClauses.length === 0) return getAlbumCategory(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".categories SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND type = 'album' RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteAlbumCategory(schema: string, id: string) {
  await prisma.$queryRawUnsafe(
    `DELETE FROM "${schema}".categories WHERE id = $1 AND type = 'album'`, id,
  );
}
