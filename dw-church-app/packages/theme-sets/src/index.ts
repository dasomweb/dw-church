/**
 * @dw-church/theme-sets — curated design + structure bundles for church
 * sites. A tenant picks ONE theme set; the site auto-builds with that
 * set's tokens + layout + pageTemplates.
 *
 * v1 (Phase 10-α): 1 set hardcoded in TS (Modern Light). Used to verify
 * the data flow end-to-end (DB column → API → super-admin picker →
 * storefront rendering).
 *
 * v2 (Phase 10-β): 10 sets — see modern-light.ts header for the list.
 *
 * v3 (future, Enterprise tier): persist theme sets in `public.theme_sets`
 * so super-admin can author new sets through the theme-set developer
 * mode without code deploy.
 */
export {
  // Schema (Zod)
  themeSetSchema,
  themeSetMetaSchema,
  themeSetLayoutSchema,
  pageTemplateSchema,
  pageTemplateBlockSchema,
  headerVariantSchema,
  footerVariantSchema,
  contentWidthSchema,
  cardStyleSchema,
} from './schema.js';

export type {
  ThemeSet,
  ThemeSetMeta,
  ThemeSetLayout,
  PageTemplate,
  PageTemplateBlock,
  HeaderVariant,
  FooterVariant,
  ContentWidth,
  CardStyle,
} from './schema.js';

import type { ThemeSet } from './schema.js';
import { modernLight } from './sets/modern-light.js';

/**
 * The curated registry — array order is the picker display order. Add
 * new sets here as files under `./sets/` and they appear in the UI.
 */
export const ALL_THEME_SETS: ThemeSet[] = [
  modernLight,
];

/** Lookup helper — returns null if no match. */
export function findThemeSet(id: string): ThemeSet | null {
  return ALL_THEME_SETS.find((s) => s.meta.id === id) ?? null;
}

/** Default — what new tenants are assigned before they pick one. */
export const DEFAULT_THEME_SET_ID = 'modern-light';

export { modernLight };
