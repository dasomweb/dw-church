/**
 * BrandTokensStyle — server component that emits per-tenant CSS
 * variables from the DesignTokens snapshot.
 *
 * Why this exists
 *   The single source of truth for color/typography/spacing/radius is
 *   `@dw-church/design-tokens`. Storefront, admin live preview, and the
 *   AI Designer all share that schema. This component is the storefront
 *   side: it scopes the emitted `--brand-*` vars to `[data-tenant="X"]`
 *   so two tenants rendered in the same SSR request can't bleed into
 *   each other.
 *
 * Why not at globals.css
 *   globals.css is bundled at build time and identical for every
 *   tenant. Theme tokens are per-tenant runtime values from the DB —
 *   they have to be inlined in the rendered HTML.
 *
 * The legacy `--dw-*` variables stay in globals.css as a hard fallback
 * for storefront chunks that haven't been migrated yet. Migrate them
 * incrementally to `--brand-*` and the `--dw-*` fallback simply stops
 * being consulted.
 */
import { tokensToCssText, type DesignTokens } from '@dw-church/design-tokens';

interface BrandTokensStyleProps {
  tenantSlug: string;
  tokens: DesignTokens;
}

export function BrandTokensStyle({ tenantSlug, tokens }: BrandTokensStyleProps) {
  // Scope so multiple tenants can SSR in the same request without
  // their `--brand-*` declarations clobbering each other.
  const scope = `[data-tenant="${tenantSlug.replace(/[^a-zA-Z0-9_-]/g, '')}"]`;
  const css = tokensToCssText(tokens, scope);
  return <style data-brand-tokens={tenantSlug} dangerouslySetInnerHTML={{ __html: css }} />;
}
