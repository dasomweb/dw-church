import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';
import type {
  CreatePageInput,
  UpdatePageInput,
  CreateSectionInput,
  UpdateSectionInput,
} from './schema.js';

// ──────────────────────────────────────────────────────────────
// Pages
// ──────────────────────────────────────────────────────────────

interface PageRow {
  id: string;
  title: string;
  slug: string;
  is_home: boolean;
  status: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

interface SectionRow {
  id: string;
  page_id: string;
  block_type: string;
  props: unknown;
  sort_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function listPages(schema: string): Promise<PageRow[]> {
  return prisma.$queryRawUnsafe<PageRow[]>(
    `SELECT id, title, slug, is_home, status, sort_order, created_at, updated_at
     FROM "${schema}".pages
     ORDER BY sort_order ASC, created_at ASC`,
  );
}

export async function getPageBySlug(
  schema: string,
  slug: string,
): Promise<{ page: PageRow; sections: SectionRow[] }> {
  const pages = await prisma.$queryRawUnsafe<PageRow[]>(
    `SELECT id, title, slug, is_home, status, sort_order, created_at, updated_at
     FROM "${schema}".pages
     WHERE slug = $1
     LIMIT 1`,
    slug,
  );

  if (pages.length === 0) {
    throw new AppError('NOT_FOUND', 404, `Page '${slug}' not found`);
  }

  const page = pages[0]!;

  const sections = await prisma.$queryRawUnsafe<SectionRow[]>(
    `SELECT id, page_id, block_type, props, sort_order, is_visible, created_at, updated_at
     FROM "${schema}".page_sections
     WHERE page_id = $1::uuid
     ORDER BY sort_order ASC`,
    page.id,
  );

  return { page, sections };
}

export async function createPage(
  schema: string,
  input: CreatePageInput,
): Promise<PageRow> {
  // If setting as home, unset any existing home page
  if (input.isHome) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${schema}".pages SET is_home = false WHERE is_home = true`,
    );
  }

  const rows = await prisma.$queryRawUnsafe<PageRow[]>(
    `INSERT INTO "${schema}".pages (title, slug, is_home, status, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, slug, is_home, status, sort_order, created_at, updated_at`,
    input.title,
    input.slug,
    input.isHome,
    input.status,
    input.sortOrder,
  );

  return rows[0]!;
}

export async function updatePage(
  schema: string,
  id: string,
  input: UpdatePageInput,
): Promise<PageRow> {
  // Verify page exists
  const existing = await prisma.$queryRawUnsafe<PageRow[]>(
    `SELECT id FROM "${schema}".pages WHERE id = $1::uuid`,
    id,
  );
  if (existing.length === 0) {
    throw new AppError('NOT_FOUND', 404, 'Page not found');
  }

  // If setting as home, unset others
  if (input.isHome === true) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${schema}".pages SET is_home = false WHERE is_home = true AND id != $1::uuid`,
      id,
    );
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    setClauses.push(`title = $${paramIndex++}`);
    params.push(input.title);
  }
  if (input.slug !== undefined) {
    setClauses.push(`slug = $${paramIndex++}`);
    params.push(input.slug);
  }
  if (input.isHome !== undefined) {
    setClauses.push(`is_home = $${paramIndex++}`);
    params.push(input.isHome);
  }
  if (input.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    params.push(input.status);
  }
  if (input.sortOrder !== undefined) {
    setClauses.push(`sort_order = $${paramIndex++}`);
    params.push(input.sortOrder);
  }

  if (setClauses.length === 0) {
    throw new AppError('BAD_REQUEST', 400, 'No fields to update');
  }

  setClauses.push('updated_at = NOW()');
  params.push(id);

  const rows = await prisma.$queryRawUnsafe<PageRow[]>(
    `UPDATE "${schema}".pages
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex}::uuid
     RETURNING id, title, slug, is_home, status, sort_order, created_at, updated_at`,
    ...params,
  );

  return rows[0]!;
}

export async function deletePage(schema: string, id: string): Promise<void> {
  // Cascade deletes sections
  await prisma.$executeRawUnsafe(
    `DELETE FROM "${schema}".page_sections WHERE page_id = $1::uuid`,
    id,
  );

  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM "${schema}".pages WHERE id = $1::uuid`,
    id,
  );

  if (result === 0) {
    throw new AppError('NOT_FOUND', 404, 'Page not found');
  }
}

// ──────────────────────────────────────────────────────────────
// Page Sections
// ──────────────────────────────────────────────────────────────

export async function listSections(
  schema: string,
  pageId: string,
): Promise<SectionRow[]> {
  return prisma.$queryRawUnsafe<SectionRow[]>(
    `SELECT id, page_id, block_type, props, sort_order, is_visible, created_at, updated_at
     FROM "${schema}".page_sections
     WHERE page_id = $1::uuid
     ORDER BY sort_order ASC`,
    pageId,
  );
}

export async function createSection(
  schema: string,
  pageId: string,
  input: CreateSectionInput,
): Promise<SectionRow> {
  // Verify page exists
  const existing = await prisma.$queryRawUnsafe<PageRow[]>(
    `SELECT id FROM "${schema}".pages WHERE id = $1::uuid`,
    pageId,
  );
  if (existing.length === 0) {
    throw new AppError('NOT_FOUND', 404, 'Page not found');
  }

  const rows = await prisma.$queryRawUnsafe<SectionRow[]>(
    `INSERT INTO "${schema}".page_sections (page_id, block_type, props, sort_order, is_visible)
     VALUES ($1::uuid, $2, $3::jsonb, $4, $5)
     RETURNING id, page_id, block_type, props, sort_order, is_visible, created_at, updated_at`,
    pageId,
    input.blockType,
    JSON.stringify(input.props),
    input.sortOrder,
    input.isVisible,
  );

  return rows[0]!;
}

export async function updateSection(
  schema: string,
  pageId: string,
  sectionId: string,
  input: UpdateSectionInput,
): Promise<SectionRow> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.blockType !== undefined) {
    setClauses.push(`block_type = $${paramIndex++}`);
    params.push(input.blockType);
  }
  if (input.props !== undefined) {
    setClauses.push(`props = $${paramIndex++}::jsonb`);
    params.push(JSON.stringify(input.props));
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
  params.push(pageId, sectionId);

  const rows = await prisma.$queryRawUnsafe<SectionRow[]>(
    `UPDATE "${schema}".page_sections
     SET ${setClauses.join(', ')}
     WHERE page_id = $${paramIndex}::uuid AND id = $${paramIndex + 1}::uuid
     RETURNING id, page_id, block_type, props, sort_order, is_visible, created_at, updated_at`,
    ...params,
  );

  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', 404, 'Section not found');
  }

  return rows[0]!;
}

export async function deleteSection(
  schema: string,
  pageId: string,
  sectionId: string,
): Promise<void> {
  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM "${schema}".page_sections WHERE page_id = $1::uuid AND id = $2::uuid`,
    pageId,
    sectionId,
  );

  if (result === 0) {
    throw new AppError('NOT_FOUND', 404, 'Section not found');
  }
}

export async function reorderSections(
  schema: string,
  pageId: string,
  ids: string[],
): Promise<SectionRow[]> {
  // Update sort_order for each section based on its position in the ids array
  for (let i = 0; i < ids.length; i++) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${schema}".page_sections
       SET sort_order = $1, updated_at = NOW()
       WHERE page_id = $2::uuid AND id = $3::uuid`,
      i,
      pageId,
      ids[i],
    );
  }

  return prisma.$queryRawUnsafe<SectionRow[]>(
    `SELECT id, page_id, block_type, props, sort_order, is_visible, created_at, updated_at
     FROM "${schema}".page_sections
     WHERE page_id = $1::uuid
     ORDER BY sort_order ASC`,
    pageId,
  );
}
