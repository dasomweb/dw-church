import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import type {
  CreateMenuInput,
  UpdateMenuInput,
  ReorderMenuInput,
} from './schema.js';

interface MenuRow {
  id: string;
  label: string;
  page_id: string | null;
  external_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function listMenus(schema: string): Promise<MenuRow[]> {
  return prisma.$queryRawUnsafe<MenuRow[]>(
    `SELECT id, label, page_id, external_url, parent_id, sort_order, is_visible, created_at, updated_at
     FROM "${schema}".menus
     ORDER BY sort_order ASC, created_at ASC`,
  );
}

export async function createMenu(
  schema: string,
  input: CreateMenuInput,
): Promise<MenuRow> {
  const rows = await prisma.$queryRawUnsafe<MenuRow[]>(
    `INSERT INTO "${schema}".menus (label, page_id, external_url, parent_id, sort_order, is_visible)
     VALUES ($1, $2::uuid, $3, $4::uuid, $5, $6)
     RETURNING id, label, page_id, external_url, parent_id, sort_order, is_visible, created_at, updated_at`,
    input.label,
    input.pageId ?? null,
    input.externalUrl ?? null,
    input.parentId ?? null,
    input.sortOrder,
    input.isVisible,
  );

  return rows[0]!;
}

export async function updateMenu(
  schema: string,
  id: string,
  input: UpdateMenuInput,
): Promise<MenuRow> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.label !== undefined) {
    setClauses.push(`label = $${paramIndex++}`);
    params.push(input.label);
  }
  if (input.pageId !== undefined) {
    setClauses.push(`page_id = $${paramIndex++}::uuid`);
    params.push(input.pageId);
  }
  if (input.externalUrl !== undefined) {
    setClauses.push(`external_url = $${paramIndex++}`);
    params.push(input.externalUrl);
  }
  if (input.parentId !== undefined) {
    setClauses.push(`parent_id = $${paramIndex++}::uuid`);
    params.push(input.parentId);
  }
  if (input.sortOrder !== undefined) {
    setClauses.push(`sort_order = $${paramIndex++}`);
    params.push(input.sortOrder);
  }
  if (input.isVisible !== undefined) {
    setClauses.push(`is_visible = $${paramIndex++}`);
    params.push(input.isVisible);
  }

  if (setClauses.length === 0) {
    throw new AppError('BAD_REQUEST', 400, 'No fields to update');
  }

  setClauses.push('updated_at = NOW()');
  params.push(id);

  const rows = await prisma.$queryRawUnsafe<MenuRow[]>(
    `UPDATE "${schema}".menus
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex}::uuid
     RETURNING id, label, page_id, external_url, parent_id, sort_order, is_visible, created_at, updated_at`,
    ...params,
  );

  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', 404, 'Menu item not found');
  }

  return rows[0]!;
}

export async function deleteMenu(
  schema: string,
  id: string,
): Promise<void> {
  // Cascade: delete children first
  await prisma.$executeRawUnsafe(
    `DELETE FROM "${schema}".menus WHERE parent_id = $1::uuid`,
    id,
  );

  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM "${schema}".menus WHERE id = $1::uuid`,
    id,
  );

  if (result === 0) {
    throw new AppError('NOT_FOUND', 404, 'Menu item not found');
  }
}

export async function reorderMenus(
  schema: string,
  input: ReorderMenuInput,
): Promise<MenuRow[]> {
  for (const item of input.items) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${schema}".menus
       SET parent_id = $1::uuid, sort_order = $2, updated_at = NOW()
       WHERE id = $3::uuid`,
      item.parentId,
      item.sortOrder,
      item.id,
    );
  }

  return prisma.$queryRawUnsafe<MenuRow[]>(
    `SELECT id, label, page_id, external_url, parent_id, sort_order, is_visible, created_at, updated_at
     FROM "${schema}".menus
     ORDER BY sort_order ASC, created_at ASC`,
  );
}
