/**
 * Catalog product page dispatcher — picks one of three distinct sub-
 * components (full-bleed overlay / image-95%-corner-caption / 2×2 spec
 * grid) based on `props.style`. Each variant has its own JSX tree,
 * not just typography/color swaps. See variants/{editorial,grid,
 * corporate}/ProductPage.tsx.
 *
 * Sync component, used in two contexts:
 *  - Storefront (apps/web) wraps it: server component fetches the
 *    product by `props.productId` and injects the resolved data as
 *    `props.product` before rendering.
 *  - Admin canvas: LivePreviewPane pre-fetches the tenant product
 *    list and injects the matching product as `props.product`.
 */

import { EditorialProductPage } from './variants/editorial/ProductPage';
import { GridProductPage } from './variants/grid/ProductPage';
import { CorporateProductPage } from './variants/corporate/ProductPage';
import { normalizeStarterStyle } from '../utilities/catalog-starter-visuals';

interface CatalogProductPageBlockProps {
  props: Record<string, unknown>;
}

export function CatalogProductPageBlock({ props }: CatalogProductPageBlockProps) {
  const style = normalizeStarterStyle(props.style as string | undefined);
  switch (style) {
    case 'grid':
      return <GridProductPage props={props} />;
    case 'corporate':
      return <CorporateProductPage props={props} />;
    case 'editorial':
    default:
      return <EditorialProductPage props={props} />;
  }
}
