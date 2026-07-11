import { prisma } from '../../config/database.js';
import { deleteUrlsFromR2 } from '../../config/r2.js';
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
    input.pcImageUrl ?? null,
    input.mobileImageUrl ?? null,
    input.subImageUrl ?? null,
    input.linkUrl ?? null,
    input.linkTarget,
    input.startDate ?? null,
    input.endDate ?? null,
    input.textOverlay ? JSON.stringify(input.textOverlay) : null,
    input.category,
    input.sortOrder,
    input.status,
  );
  return rows[0];
}

export async function updateBanner(schema: string, id: string, input: UpdateBannerInput) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) { setClauses.push(`title = $${paramIndex++}`); values.push(input.title); }
  if (input.pcImageUrl !== undefined) { setClauses.push(`pc_image_url = $${paramIndex++}`); values.push(input.pcImageUrl); }
  if (input.mobileImageUrl !== undefined) { setClauses.push(`mobile_image_url = $${paramIndex++}`); values.push(input.mobileImageUrl); }
  if (input.subImageUrl !== undefined) { setClauses.push(`sub_image_url = $${paramIndex++}`); values.push(input.subImageUrl); }
  if (input.linkUrl !== undefined) { setClauses.push(`link_url = $${paramIndex++}`); values.push(input.linkUrl); }
  if (input.linkTarget !== undefined) { setClauses.push(`link_target = $${paramIndex++}`); values.push(input.linkTarget); }
  if (input.startDate !== undefined) { setClauses.push(`start_date = $${paramIndex++}::date`); values.push(input.startDate); }
  if (input.endDate !== undefined) { setClauses.push(`end_date = $${paramIndex++}::date`); values.push(input.endDate); }
  if (input.textOverlay !== undefined) { setClauses.push(`text_overlay = $${paramIndex++}::jsonb`); values.push(input.textOverlay ? JSON.stringify(input.textOverlay) : null); }
  if (input.category !== undefined) { setClauses.push(`category = $${paramIndex++}`); values.push(input.category); }
  if (input.sortOrder !== undefined) { setClauses.push(`sort_order = $${paramIndex++}`); values.push(input.sortOrder); }
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
  const rows = await prisma.$queryRawUnsafe<{ pc_image_url: string | null; mobile_image_url: string | null; sub_image_url: string | null }[]>(
    `SELECT pc_image_url, mobile_image_url, sub_image_url FROM "${schema}".banners WHERE id = $1::uuid`, id,
  );
  await prisma.$queryRawUnsafe(`DELETE FROM "${schema}".banners WHERE id = $1::uuid`, id);
  if (rows[0]) await deleteUrlsFromR2([rows[0].pc_image_url, rows[0].mobile_image_url, rows[0].sub_image_url]);
}
