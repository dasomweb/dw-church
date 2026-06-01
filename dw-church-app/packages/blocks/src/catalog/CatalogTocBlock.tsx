/**
 * Catalog TOC dispatcher — picks one of three fully distinct sub-
 * components (stacked oversized numbers / contact-sheet thumbnails /
 * tabular two-column) based on `props.style`. See variants/{editorial,
 * grid,corporate}/Toc.tsx for the layouts.
 */

import { EditorialToc } from './variants/editorial/Toc';
import { GridToc } from './variants/grid/Toc';
import { CorporateToc } from './variants/corporate/Toc';
import { normalizeStarterStyle } from '../utilities/catalog-starter-visuals';

interface CatalogTocBlockProps {
  props: Record<string, unknown>;
}

export function CatalogTocBlock({ props }: CatalogTocBlockProps) {
  const style = normalizeStarterStyle(props.style as string | undefined);
  switch (style) {
    case 'grid':
      return <GridToc props={props} />;
    case 'corporate':
      return <CorporateToc props={props} />;
    case 'editorial':
    default:
      return <EditorialToc props={props} />;
  }
}
