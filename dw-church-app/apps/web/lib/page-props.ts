import { getPageBySlug } from './api';

/**
 * Get block props from a page's section by block type.
 * Used by dedicated route pages to read PageEditor settings (variant, title, etc.)
 */
export async function getBlockProps(
  tenantSlug: string,
  pageSlug: string,
  blockType: string,
): Promise<Record<string, unknown>> {
  try {
    const page = await getPageBySlug(tenantSlug, pageSlug);
    const section = page.sections?.find(
      (s: { blockType: string; isVisible: boolean }) =>
        s.blockType === blockType && s.isVisible
    );
    return section?.props ?? {};
  } catch {
    return {};
  }
}

/**
 * Extract grid columns from variant string.
 * e.g. 'grid-4' → 4, 'grid-2' → 2, 'list' → 1, 'cards-3' → 3
 */
export function variantToColumns(variant: string, defaultCols = 3): number {
  if (variant === 'list') return 1;
  const match = variant.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : defaultCols;
}
