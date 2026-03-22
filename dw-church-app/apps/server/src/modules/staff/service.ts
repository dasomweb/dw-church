import { prisma } from '../../config/database.js';
import type { CreateStaffInput, UpdateStaffInput } from './schema.js';

interface ListParams {
  department?: string;
  activeOnly?: boolean;
}

export async function listStaff(schema: string, params: ListParams) {
  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (params.department) { whereClause += ` AND department = $${paramIndex++}`; values.push(params.department); }
  if (params.activeOnly) { whereClause += ` AND is_active = true`; }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".staff ${whereClause} ORDER BY sort_order ASC, created_at ASC`,
    ...values,
  );

  return { data: rows };
}

export async function getStaffMember(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".staff WHERE id = $1::uuid`, id,
  );
  return rows[0] ?? null;
}

export async function createStaffMember(schema: string, input: CreateStaffInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".staff
     (name, role, department, email, phone, bio, photo_url, sns_links, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
     RETURNING *`,
    input.name,
    input.role ?? null,
    input.department ?? null,
    input.email ?? null,
    input.phone ?? null,
    input.bio ?? null,
    input.photo_url ?? null,
    input.sns_links ? JSON.stringify(input.sns_links) : null,
    input.sort_order,
    input.is_active,
  );
  return rows[0];
}

export async function updateStaffMember(schema: string, id: string, input: UpdateStaffInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(input.name); }
  if (input.role !== undefined) { setClauses.push(`role = $${paramIndex++}`); values.push(input.role); }
  if (input.department !== undefined) { setClauses.push(`department = $${paramIndex++}`); values.push(input.department); }
  if (input.email !== undefined) { setClauses.push(`email = $${paramIndex++}`); values.push(input.email); }
  if (input.phone !== undefined) { setClauses.push(`phone = $${paramIndex++}`); values.push(input.phone); }
  if (input.bio !== undefined) { setClauses.push(`bio = $${paramIndex++}`); values.push(input.bio); }
  if (input.photo_url !== undefined) { setClauses.push(`photo_url = $${paramIndex++}`); values.push(input.photo_url); }
  if (input.sns_links !== undefined) { setClauses.push(`sns_links = $${paramIndex++}::jsonb`); values.push(input.sns_links ? JSON.stringify(input.sns_links) : null); }
  if (input.sort_order !== undefined) { setClauses.push(`sort_order = $${paramIndex++}`); values.push(input.sort_order); }
  if (input.is_active !== undefined) { setClauses.push(`is_active = $${paramIndex++}`); values.push(input.is_active); }

  if (setClauses.length === 0) return getStaffMember(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".staff SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function reorderStaff(schema: string, ids: string[]) {
  for (let i = 0; i < ids.length; i++) {
    await prisma.$queryRawUnsafe(
      `UPDATE "${schema}".staff SET sort_order = $1, updated_at = NOW() WHERE id = $2::uuid`,
      i + 1,
      ids[i],
    );
  }
}

export async function deleteStaffMember(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".staff WHERE id = $1::uuid`, id);
}
