/**
 * Editorial product page — full-bleed product photograph with a bottom
 * overlay band carrying title + SKU + description. Image takes the
 * whole spread; type sits on a dark gradient so it stays legible
 * regardless of product photo. One product, one stage.
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

export function EditorialProductPage({ props }: Props) {
  const productId = (props.productId as string) || '';
  const product = (props.product as ResolvedProduct | undefined) ?? null;
  const show = (props.show as ShowFlags | undefined) ?? {};
  const showSku = show.sku !== false;
  const showDescription = show.description !== false;
  const v = getStarterVisuals('editorial');

  const images = product?.images ?? [];
  const hero = images[0]?.url ?? '';
  const title = product?.title ?? '';
  const sku = product?.sku ?? '';
  const description = product?.description ?? '';

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
      {/* Full-bleed product image */}
      <div
        className="absolute inset-0"
        style={{ background: v.imagePlaceholderBg }}
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
            {productId
              ? 'No product image'
              : 'Select a product in the inspector'}
          </div>
        )}
      </div>

      {/* Top-right eyebrow with mix-blend so it survives any photo tone */}
      <div
        className="absolute top-10 right-10 sm:top-14 sm:right-14 z-10"
        style={{ color: '#fff', mixBlendMode: 'difference' }}
      >
        <div
          className="text-[10px] uppercase"
          style={{ letterSpacing: v.eyebrowTracking }}
        >
          {v.productEyebrow}
        </div>
      </div>

      {/* Bottom overlay band */}
      <div
        className="absolute inset-x-0 bottom-0 pt-32 pb-12 px-12 sm:px-16"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0) 100%)',
        }}
      >
        {title && (
          <h2
            data-element="title"
            className="leading-[1.05]"
            style={mergeElementStyle(
              {
                color: '#fff',
                fontFamily: v.headingFamily,
                fontWeight: v.headingWeight,
                letterSpacing: v.headingTracking,
                fontSize: 'var(--fs-h1)',
                maxWidth: '24ch',
              },
              props,
              'title',
            )}
          >
            {title}
          </h2>
        )}
        <div className="flex items-end justify-between gap-8 mt-4">
          {showDescription && description && (
            <p
              data-element="description"
              className="overflow-hidden"
              style={mergeElementStyle(
                {
                  color: 'rgba(255,255,255,0.88)',
                  fontSize: 'var(--fs-base)',
                  lineHeight: 1.6,
                  fontStyle: 'italic',
                  maxWidth: '52ch',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                },
                props,
                'description',
              )}
            >
              {description}
            </p>
          )}
          {showSku && sku && (
            <span
              className="font-mono text-xs shrink-0"
              style={{
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: v.eyebrowTracking,
              }}
            >
              SKU · {sku}
            </span>
          )}
        </div>
        {/* Album portfolio thumbnail strip — CEO directive 2026-05-25:
            hero spread 의 thumbnail 은 사진이 아무리 많아도 디자인
            일관성을 위해 항상 max 3장. 나머지 사진들은 자동 inject 되는
            CatalogProductGallery spread(s) 에서 화보 mosaic 으로 펼침. */}
        {images.length > 1 && (
          <div className="mt-6">
            <ProductImageGallery
              images={images}
              placeholderBg="rgba(255,255,255,0.1)"
              borderColor="rgba(255,255,255,0.25)"
              layout="row"
              max={3}
            />
          </div>
        )}
      </div>
    </div>
  );
}
