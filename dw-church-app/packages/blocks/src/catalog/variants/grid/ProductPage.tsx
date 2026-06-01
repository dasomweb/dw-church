/**
 * Grid product page — image at 95%+ of the spread, metadata reduced to a
 * single corner tile (number + title + 1-line caption). The product
 * carries the page; type is documentary, not decorative.
 */

import {
  CATALOG_SPREAD_ASPECT,
  CATALOG_SPREAD_CLASS,
} from '../../../utilities/catalog-page';
import { getStarterVisuals } from '../../../utilities/catalog-starter-visuals';
import { mergeElementStyle } from '../../../utilities/element-styles';
import { ProductImageGallery } from '../ProductImageGallery';

interface ResolvedProduct {
  title?: string;
  sku?: string | null;
  description?: string | null;
  images?: Array<{ url: string }>;
  customFields?: Record<string, unknown>;
}

interface Props {
  props: Record<string, unknown>;
}

export function GridProductPage({ props }: Props) {
  const productId = (props.productId as string) || '';
  const product = (props.product as ResolvedProduct | undefined) ?? null;
  const v = getStarterVisuals('grid');

  const images = product?.images ?? [];
  const hero = images[0]?.url ?? '';
  const title = product?.title ?? '';
  const sku = product?.sku ?? '';
  const description = product?.description ?? '';
  // Single-line caption: prefer first sentence of description, fall back
  // to title alone — keeps the corner tile compact.
  const firstSentence = description
    ? description.split(/[.。!?]/)[0]?.trim() || ''
    : '';

  return (
    <div
      className={CATALOG_SPREAD_CLASS}
      style={{
        aspectRatio: CATALOG_SPREAD_ASPECT,
        background: (props.pageBackgroundColor as string) || v.paper,
        borderColor: v.rule,
        color: v.ink,
        fontFamily: v.bodyFamily,
      }}
    >
      <div className="absolute inset-0" style={{ background: v.imagePlaceholderBg }}>
        {hero ? (
          <img
            src={hero}
            alt={title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center text-xs"
            style={{ color: v.inkMuted }}
          >
            {productId
              ? 'No product image'
              : 'Select a product in the inspector'}
          </div>
        )}
      </div>

      {/* Bottom-right caption tile */}
      <div
        className="absolute bottom-4 right-4 p-3 max-w-[60%]"
        style={{ background: v.paper, color: v.ink }}
      >
        <div
          className="text-[9px] font-mono uppercase mb-1"
          style={{ letterSpacing: v.eyebrowTracking, color: v.inkMuted }}
        >
          {v.productEyebrow}
          {sku ? ` · ${sku}` : ''}
        </div>
        {title && (
          <div
            data-element="title"
            style={mergeElementStyle(
              {
                fontFamily: v.headingFamily,
                fontWeight: v.headingWeight,
                letterSpacing: v.headingTracking,
                fontSize: 'var(--fs-lg)',
                lineHeight: 1.2,
              },
              props,
              'title',
            )}
          >
            {title}
          </div>
        )}
        {firstSentence && (
          <div
            data-element="description"
            className="mt-1 text-[11px] truncate"
            style={mergeElementStyle(
              { color: v.inkMuted },
              props,
              'description',
            )}
          >
            {firstSentence}
          </div>
        )}
        {/* Album portfolio — 2x2 thumbnail grid below the caption tile.
            Operator-requested: catalog page reads as a product portfolio,
            not a single shot. Hidden when product has 0-1 images. */}
        {images.length > 1 && (
          <div className="mt-3">
            <ProductImageGallery
              images={images}
              placeholderBg={v.imagePlaceholderBg}
              borderColor={v.rule}
              layout="grid"
              max={4}
            />
          </div>
        )}
      </div>
    </div>
  );
}
