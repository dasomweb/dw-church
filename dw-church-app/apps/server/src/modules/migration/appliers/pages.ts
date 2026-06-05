/**
 * Pages Applier — updates page_sections.props with classified content.
 * Does NOT create new pages or change block structure.
 * Only updates props of existing blocks that match the classified content.
 * hero_banner is excluded (admin sets it manually).
 */

import { prisma } from '../../../config/database.js';
import { validateSchemaName } from '../../../utils/validate-schema.js';
import type { ClassifiedPageContent } from '../types.js';
import type { ImageUrlMap } from './images.js';
import { replaceImageUrls } from './images.js';

export async function applyPageContents(
  tenantSlug: string,
  pageContents: ClassifiedPageContent[],
  urlMap: ImageUrlMap,
): Promise<number> {
  if (pageContents.length === 0) return 0;
  const schema = validateSchemaName(`tenant_${tenantSlug}`);
  let count = 0;

  for (const page of pageContents) {
    if (page.blocks.length === 0) continue;

    // Find existing page by slug. If the tenant doesn't have it yet
    // (new tenants from URL-only migration don't have pages pre-created),
    // create one so the imported static content actually lands. Was
    // silently skipping pre-2026-06-04, which made migration appear to
    // succeed but no static content visible.
    let pages = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${schema}".pages WHERE slug = $1 LIMIT 1`,
      page.pageSlug,
    );
    if (pages.length === 0) {
      const title = inferPageTitle(page.pageSlug);
      // pages has no is_visible column — visibility is controlled by status
      // ('published'). is_visible belongs to page_sections (see below).
      pages = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `INSERT INTO "${schema}".pages (slug, title, sort_order, status)
         VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) + 1 FROM "${schema}".pages), 0), 'published')
         RETURNING id`,
        page.pageSlug,
        title,
      );
    }

    const pageId = pages[0]!.id;

    // Get existing sections for this page
    const sections = await prisma.$queryRawUnsafe<{ id: string; block_type: string; sort_order: number }[]>(
      `SELECT id, block_type, sort_order FROM "${schema}".page_sections
       WHERE page_id = $1::uuid ORDER BY sort_order`,
      pageId,
    );

    for (const block of page.blocks) {
      // Skip hero_banner — admin sets it manually
      if (block.blockType === 'hero_banner') continue;

      // Replace image URLs with R2 URLs
      const props = replaceImageUrls(block.props, urlMap);

      // Find matching existing section by block_type
      const existing = sections.find((s) => s.block_type === block.blockType);

      if (existing) {
        // Merge props into existing section (new props override)
        await prisma.$queryRawUnsafe(
          `UPDATE "${schema}".page_sections
           SET props = props || $1::jsonb, updated_at = NOW()
           WHERE id = $2::uuid`,
          JSON.stringify(props),
          existing.id,
        );
        count++;
      } else {
        // Insert new section at the end (after existing blocks)
        const maxOrder = sections.length > 0
          ? Math.max(...sections.map((s) => s.sort_order)) + 1
          : 0;

        await prisma.$queryRawUnsafe(
          `INSERT INTO "${schema}".page_sections (page_id, block_type, props, sort_order, is_visible)
           VALUES ($1::uuid, $2, $3::jsonb, $4, true)`,
          pageId,
          block.blockType,
          JSON.stringify(props),
          maxOrder,
        );
        count++;
      }
    }
  }

  return count;
}

/** Friendly Korean page title for an auto-created page slug. Used only
 *  when migration creates a page that wasn't seeded by the tenant
 *  template. The operator can rename later in the admin UI. */
function inferPageTitle(slug: string): string {
  const map: Record<string, string> = {
    'home': '홈',
    'about': '교회 소개',
    'pastor-greeting': '담임목사 인사말',
    'vision': '비전',
    'directions': '오시는 길',
    'newcomer': '새가족 안내',
    'mission': '선교',
    'worship': '예배 안내',
    'history': '교회 연혁',
    'sermons': '설교',
    'columns': '목회칼럼',
    'bulletins': '주보',
    'albums': '갤러리',
    'events': '행사',
    'staff': '교역자',
  };
  return map[slug] ?? slug;
}
