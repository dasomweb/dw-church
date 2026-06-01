/**
 * Corporate product page — 2×2 grid: image (top-left), SKU/spec table
 * (top-right), price block (bottom-left), full description (bottom-
 * right). Mimics an industrial / engineered-goods catalogue page where
 * the buyer needs every piece of data on one spread. No marketing copy
 * tricks — just structured information.
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

interface ShowFlags {
  sku?: boolean;
  description?: boolean;
  price?: boolean;
}

interface Props {
  props: Record<string, unknown>;
}

export function CorporateProductPage({ props }: Props) {
  const productId = (props.productId as string) || '';
  const product = (props.product as ResolvedProduct | undefined) ?? null;
  const show = (props.show as ShowFlags | undefined) ?? {};
  const showSku = show.sku !== false;
  const showDescription = show.description !== false;
  const showPrice = show.price === true;
  const v = getStarterVisuals('corporate');

  const images = product?.images ?? [];
  const hero = images[0]?.url ?? '';
  const title = product?.title ?? '';
  const sku = product?.sku ?? '';
  const description = product?.description ?? '';
  const cf = (product?.customFields ?? {}) as Record<string, unknown>;
  const variant = (cf.variant as string) || (cf.size as string) || '';
  const material = (cf.material as string) || '';
  const dimensions = (cf.dimensions as string) || '';
  const moq = (cf.moq as string) || (cf.minimumOrder as string) || '';
  const price = (cf.price as string | number) ?? '';

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
      <div className="absolute inset-0 flex flex-col">
        {/* Header strip with title + SKU */}
        <div
          className="flex items-baseline justify-between px-8 sm:px-10 py-4 border-b-2"
          style={{ borderColor: v.accent }}
        >
          <div className="flex items-baseline gap-4 min-w-0 flex-1">
            <span
              className="text-[10px] font-mono uppercase shrink-0"
              style={{ letterSpacing: v.eyebrowTracking, color: v.accent }}
            >
              {v.productEyebrow}
            </span>
            {title && (
              <h2
                data-element="title"
                className="truncate"
                style={mergeElementStyle(
                  {
                    fontFamily: v.headingFamily,
                    fontWeight: v.headingWeight,
                    letterSpacing: v.headingTracking,
                    fontSize: 'var(--fs-h3)',
                    color: v.ink,
                  },
                  props,
                  'title',
                )}
              >
                {title}
              </h2>
            )}
          </div>
          {showSku && sku && (
            <span
              className="font-mono text-xs shrink-0 ml-4"
              style={{ color: v.inkMuted, letterSpacing: v.eyebrowTracking }}
            >
              SKU · {sku}
            </span>
          )}
        </div>

        {/* 2×2 body grid */}
        <div className="flex-1 grid grid-cols-2 grid-rows-2 min-h-0">
          {/* TL — image */}
          <div
            className="relative border-r border-b"
            style={{ background: v.imagePlaceholderBg, borderColor: v.rule }}
          >
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
                {productId ? 'No product image' : 'Select a product in the inspector'}
              </div>
            )}
          </div>

          {/* TR — spec table */}
          <div
            className="p-6 border-b overflow-hidden"
            style={{ borderColor: v.rule }}
          >
            <div
              className="text-[9px] font-mono uppercase mb-3"
              style={{ letterSpacing: v.eyebrowTracking, color: v.inkMuted }}
            >
              SPECIFICATIONS
            </div>
            <dl className="space-y-2 text-xs">
              {variant && (
                <div className="grid grid-cols-[7rem_1fr] gap-2">
                  <dt style={{ color: v.inkMuted }}>VARIANT</dt>
                  <dd style={{ color: v.ink }}>{variant}</dd>
                </div>
              )}
              {material && (
                <div className="grid grid-cols-[7rem_1fr] gap-2">
                  <dt style={{ color: v.inkMuted }}>MATERIAL</dt>
                  <dd style={{ color: v.ink }}>{material}</dd>
                </div>
              )}
              {dimensions && (
                <div className="grid grid-cols-[7rem_1fr] gap-2">
                  <dt style={{ color: v.inkMuted }}>DIMENSIONS</dt>
                  <dd style={{ color: v.ink }}>{dimensions}</dd>
                </div>
              )}
              {moq && (
                <div className="grid grid-cols-[7rem_1fr] gap-2">
                  <dt style={{ color: v.inkMuted }}>MOQ</dt>
                  <dd style={{ color: v.ink }}>{moq}</dd>
                </div>
              )}
              {!variant && !material && !dimensions && !moq && (
                <div className="text-[11px] italic" style={{ color: v.inkMuted }}>
                  Additional specs (VARIANT / MATERIAL / DIMENSIONS / MOQ)
                  will appear here once entered in the product's custom fields.
                </div>
              )}
            </dl>
          </div>

          {/* BL — price block */}
          <div
            className="p-6 border-r flex flex-col"
            style={{ borderColor: v.rule }}
          >
            <div
              className="text-[9px] font-mono uppercase mb-3"
              style={{ letterSpacing: v.eyebrowTracking, color: v.inkMuted }}
            >
              PRICE
            </div>
            {showPrice && price !== '' ? (
              <div
                className="font-mono"
                style={{
                  color: v.accent,
                  fontSize: 'var(--fs-h2)',
                  letterSpacing: '-0.02em',
                }}
              >
                {String(price)}
              </div>
            ) : (
              <div className="text-[11px] italic" style={{ color: v.inkMuted }}>
                Contact for quote
              </div>
            )}
          </div>

          {/* BR — description */}
          <div className="p-6 overflow-hidden">
            <div
              className="text-[9px] font-mono uppercase mb-3"
              style={{ letterSpacing: v.eyebrowTracking, color: v.inkMuted }}
            >
              DESCRIPTION
            </div>
            {showDescription && description ? (
              <p
                data-element="description"
                className="text-xs overflow-hidden"
                style={mergeElementStyle(
                  {
                    color: v.ink,
                    lineHeight: 1.6,
                    display: '-webkit-box',
                    WebkitLineClamp: 6,
                    WebkitBoxOrient: 'vertical',
                  },
                  props,
                  'description',
                )}
              >
                {description}
              </p>
            ) : (
              <div className="text-[11px] italic" style={{ color: v.inkMuted }}>
                No product description yet.
              </div>
            )}
            {/* Album portfolio — additional product photos as 2x2
                thumbnail grid below the description. Operator-requested
                catalog reads as a multi-photo portfolio. Hidden when
                product has 0-1 images. */}
            {images.length > 1 && (
              <div className="mt-4">
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
      </div>
    </div>
  );
}
