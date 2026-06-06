/**
 * Pages Applier — reproduces each source page as ordered page_sections.
 * Creates the page if the tenant doesn't have it yet, inserts the classified
 * blocks in order (hero_banner first, then image+text / gallery sections),
 * and migrates every block image to R2. Page-level singleton blocks
 * (pastor_message / location_map / contact_info / newcomer_info) update a
 * matching pre-seeded section in place; hero_banner / text_image /
 * image_gallery always create their own section so the layout is preserved.
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

    // Idempotent re-import: replace the page's sections with the freshly
    // extracted blocks. Without this, every re-run appended duplicate
    // hero/text_image sections on top of the previous run. Migration is a
    // setup step — the operator customizes after — so a clean replace is the
    // right semantic and keeps repeated 가져오기 runs stable.
    await prisma.$executeRawUnsafe(
      `DELETE FROM "${schema}".page_sections WHERE page_id = $1::uuid`,
      pageId,
    );

    // Insert the page's blocks IN ORDER so the source layout is reproduced
    // (hero_banner first, then each image+text / gallery section).
    let nextOrder = 0;
    for (const block of page.blocks) {
      // Replace image URLs (imageUrl/photoUrl/backgroundImageUrl/images…) → R2.
      const props = replaceImageUrls(block.props, urlMap);
      {
        await prisma.$queryRawUnsafe(
          `INSERT INTO "${schema}".page_sections (page_id, block_type, props, sort_order, is_visible)
           VALUES ($1::uuid, $2, $3::jsonb, $4, true)`,
          pageId,
          block.blockType,
          JSON.stringify(props),
          nextOrder,
        );
        nextOrder++;
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
