import { prisma } from '../../config/database.js';
import type { CreateBannerInput, UpdateBannerInput } from './schema.js';

interface ListParams {
  category?: string;
  activeOnly?: boolean;
  status?: string;
}

export async function listBanners(schema: string, params: ListParams) {
  let whereClause = 'WHERE 1=1';
  const values: unknown[] = [];
  let paramIndex = 1;

  if (params.status) { whereClause += ` AND status = $${paramIndex++}`; values.push(params.status); }
  if (params.category) { whereClause += ` AND category = $${paramIndex++}`; values.push(params.category); }
  if (params.activeOnly) {
    whereClause += ` AND (end_date IS NULL OR end_date >= CURRENT_DATE)`;
    whereClause += ` AND (start_date IS NULL OR start_date <= CURRENT_DATE)`;
  }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".banners ${whereClause} ORDER BY sort_order ASC, created_at DESC`,
    ...values,
  );

  return { data: rows };
}

export async function getBanner(schema: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM "${schema}".banners WHERE id = $1::uuid`, id,
  );
  return rows[0] ?? null;
}

export async function createBanner(schema: string, input: CreateBannerInput) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO "${schema}".banners
     (title, pc_image_url, mobile_image_url, sub_image_url, link_url, link_target,
      start_date, end_date, text_overlay, category, sort_order, status)
     VALUES ($1, $2, $3, $4, $5, $6,
             $7::date, $8::date, $9::jsonb, $10, $11, $12)
     RETURNING *`,
    input.title,
    input.pc_image_url ?? null,
    input.mobile_image_url ?? null,
    input.sub_image_url ?? null,
    input.link_url ?? null,
    input.link_target,
    input.start_date ?? null,
    input.end_date ?? null,
    input.text_overlay ? JSON.stringify(input.text_overlay) : null,
    input.category,
    input.sort_order,
    input.status,
  );
  return rows[0];
}

export async function updateBanner(schema: string, id: string, input: UpdateBannerInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.pc_image_url !== undefined) { setClauses.push(`pc_image_url = $${paramIndex++}`); values.push(input.pc_image_url); }
  if (input.mobile_image_url !== undefined) { setClauses.push(`mobile_image_url = $${paramIndex++}`); values.push(input.mobile_image_url); }
  if (input.sub_image_url !== undefined) { setClauses.push(`sub_image_url = $${paramIndex++}`); values.push(input.sub_image_url); }
  if (input.link_url !== undefined) { setClauses.push(`link_url = $${paramIndex++}`); values.push(input.link_url); }
  if (input.link_target !== undefined) { setClauses.push(`link_target = $${paramIndex++}`); values.push(input.link_target); }
  if (input.start_date !== undefined) { setClauses.push(`start_date = $${paramIndex++}::date`); values.push(input.start_date); }
  if (input.end_date !== undefined) { setClauses.push(`end_date = $${paramIndex++}::date`); values.push(input.end_date); }
  if (input.text_overlay !== undefined) { setClauses.push(`text_overlay = $${paramIndex++}::jsonb`); values.push(input.text_overlay ? JSON.stringify(input.text_overlay) : null); }
  if (input.category !== undefined) { setClauses.push(`category = $${paramIndex++}`); values.push(input.category); }
  if (input.sort_order !== undefined) { setClauses.push(`sort_order = $${paramIndex++}`); values.push(input.sort_order); }
  if (input.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(input.status); }

  if (setClauses.length === 0) return getBanner(schema, id);

  setClauses.push(`updated_at = NOW()`);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE "${schema}".banners SET ${setClauses.join(', ')} WHERE id = $${paramIndex}::uuid RETURNING *`,
    ...values, id,
  );
  return rows[0] ?? null;
}

export async function deleteBanner(schema: string, id: string) {
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".banners WHERE id = $1::uuid`, id);
}
