/**
 * Catalog back cover dispatcher — picks one of three distinct sub-
 * components (full-bleed vignette / image-100% + center tile / 3-band
 * structural with contact box) based on `props.style`. See variants/
 * {editorial,grid,corporate}/BackCover.tsx for layouts.
 */

import { EditorialBackCover } from './variants/editorial/BackCover';
import { GridBackCover } from './variants/grid/BackCover';
import { CorporateBackCover } from './variants/corporate/BackCover';
import { normalizeStarterStyle } from '../utilities/catalog-starter-visuals';

interface CatalogBackCoverBlockProps {
  props: Record<string, unknown>;
}

export function CatalogBackCoverBlock({ props }: CatalogBackCoverBlockProps) {
  const style = normalizeStarterStyle(props.style as string | undefined);
  switch (style) {
    case 'grid':
      return <GridBackCover props={props} />;
    case 'corporate':
      return <CorporateBackCover props={props} />;
    case 'editorial':
    default:
      return <EditorialBackCover props={props} />;
  }
}
