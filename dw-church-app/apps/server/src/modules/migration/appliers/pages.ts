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

    // Find existing page by slug
    const pages = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "${schema}".pages WHERE slug = $1 LIMIT 1`,
      page.pageSlug,
    );
    if (pages.length === 0) continue; // Page doesn't exist — skip, don't create

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
