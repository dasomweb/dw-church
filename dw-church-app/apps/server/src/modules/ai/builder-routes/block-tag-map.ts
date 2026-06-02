/**
 * block_type → reference tag preferences + image variant.
 *
 * Used by the section-image auto-generate endpoint to:
 *   1. pick which curated reference photos are relevant context for
 *      this section's image generation (`tags`).
 *   2. choose the aspect / size variant the image_service should
 *      target (`variant`).
 *
 * Tag vocabulary matches what apps/agents' /image/analyze classifier
 * emits — keeping the two sides synchronized means a reference photo
 * tagged "exterior" by the vision analyzer is automatically considered
 * relevant context for a `hero_banner` block here.
 *
 * If a block_type isn't listed, the auto-generate endpoint falls back
 * to `variant='section'` + no tag filter (all references considered).
 */
export interface BlockImageProfile {
  // ordered tag preferences — entries earlier in the array score
  // higher when matching reference photos. Mirrors PageBuilder's
  // TAGS_BY_SECTION_TYPE but keyed by persisted block_type (snake_case)
  // instead of the legacy sketch `SECTION_TYPE` enum (UPPER).
  tags: string[];
  // Image variant the agents image_service uses to pick aspect ratio
  // and model chain. `hero` → 16:9 wide, `section` → 4:3 / 8:5, `square`
  // → 1:1. Fallback `section` keeps the rendering sane for unknown blocks.
  variant: 'hero' | 'section' | 'square';
}

export const BLOCK_IMAGE_PROFILE: Record<string, BlockImageProfile> = {
  hero_banner:        { tags: ['exterior', 'interior'],          variant: 'hero' },
  page_hero:          { tags: ['exterior', 'interior'],          variant: 'hero' },
  banner_slider:      { tags: ['exterior', 'interior'],          variant: 'hero' },
  text_image:         { tags: ['interior', 'product', 'team'],   variant: 'section' },
  image_text:         { tags: ['interior', 'product', 'team'],   variant: 'section' },
  image_gallery:      { tags: ['interior', 'exterior', 'product'], variant: 'section' },
  features_grid:      { tags: ['product', 'process'],            variant: 'section' },
  category_tabs:      { tags: ['product', 'process'],            variant: 'section' },
  steps_list:         { tags: ['process'],                       variant: 'section' },
  team_members:       { tags: ['team'],                          variant: 'square' },
  testimonials:       { tags: ['team', 'interior'],              variant: 'square' },
  pricing_table:      { tags: ['product', 'interior'],           variant: 'section' },
  about_section:      { tags: ['team', 'interior', 'exterior'],  variant: 'section' },
  contact_info:       { tags: ['exterior', 'interior'],          variant: 'section' },
  location_map:       { tags: ['exterior'],                      variant: 'section' },
  logo_bar:           { tags: ['product'],                       variant: 'square' },
  products_showcase:  { tags: ['product'],                       variant: 'section' },
  stats_counter:      { tags: ['process'],                       variant: 'section' },
  cta_section:        { tags: ['exterior', 'interior', 'process'], variant: 'hero' },
};

export function profileFor(blockType: string | null | undefined): BlockImageProfile {
  const key = (blockType ?? '').trim();
  return BLOCK_IMAGE_PROFILE[key] ?? { tags: [], variant: 'section' };
}

/**
 * generation_mode picks the image_service policy prefix:
 *   - 'space' for venue / interior / exterior subjects (preserves real
 *     architecture when references are attached, image-to-image strict)
 *   - 'product' for product / commercial shots (preserves product
 *     identity when references are attached)
 * Defaults to undefined when the section doesn't map cleanly (the
 * image_service then runs without a policy prefix).
 */
export function modeFor(blockType: string | null | undefined): 'space' | 'product' | undefined {
  const tags = profileFor(blockType).tags;
  if (tags.includes('exterior') || tags.includes('interior')) return 'space';
  if (tags.includes('product')) return 'product';
  return undefined;
}
