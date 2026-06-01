/**
 * Catalog cover dispatcher — picks one of three fully distinct sub-
 * components based on the operator-picked starter (`props.style`).
 * Each variant has its own layout structure (full-bleed overlay /
 * corner caption / 3-band structural), not just typography/color
 * swaps. See variants/{editorial,grid,corporate}/Cover.tsx for the
 * actual JSX trees.
 */

import { EditorialCover } from './variants/editorial/Cover';
import { GridCover } from './variants/grid/Cover';
import { CorporateCover } from './variants/corporate/Cover';
import { normalizeStarterStyle } from '../utilities/catalog-starter-visuals';

interface CatalogCoverBlockProps {
  props: Record<string, unknown>;
}

export function CatalogCoverBlock({ props }: CatalogCoverBlockProps) {
  const style = normalizeStarterStyle(props.style as string | undefined);
  switch (style) {
    case 'grid':
      return <GridCover props={props} />;
    case 'corporate':
      return <CorporateCover props={props} />;
    case 'editorial':
    default:
      return <EditorialCover props={props} />;
  }
}
