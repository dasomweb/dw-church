/**
 * ProductImageGallery — thumbnail strip of additional product photos
 * shown inline on each catalog spread variant (editorial / grid /
 * corporate). Hero image (images[0]) is rendered as the main photo by
 * the parent variant; this component shows images[1..N] as a small
 * album-style row so the catalog spread reads like a product portfolio
 * page, not a single-photo product page.
 *
 * Hidden when there are 0 or 1 images (nothing extra to show).
 * Max 6 thumbnails rendered — beyond that, catalog pagination should
 * carry the rest to a follow-up spread (operator chooses).
 */

import type { CSSProperties } from 'react';

interface ProductImage {
  url: string;
  alt?: string;
}

export interface ProductImageGalleryProps {
  images: ProductImage[];
  /** Background of thumbnail tiles when image fails or is loading. */
  placeholderBg?: string;
  /** Border / divider color matching the variant palette. */
  borderColor?: string;
  /** Inline style override for the outer strip. */
  style?: CSSProperties;
  /** Tailwind className override for the outer strip. */
  className?: string;
  /** Layout — 'row' for horizontal strip (default), 'grid' for 2-col
   *  square grid (corporate / grid variants prefer the grid). */
  layout?: 'row' | 'grid';
  /** Max thumbnails to render. Default 6. */
  max?: number;
}

export function ProductImageGallery({
  images,
  placeholderBg = '#f3f4f6',
  borderColor = '#e5e7eb',
  style,
  className,
  layout = 'row',
  max = 6,
}: ProductImageGalleryProps) {
  // Skip hero (images[0]) and cap remaining at `max`. Hero is already
  // rendered as the main spread photo by the parent variant.
  const extras = images.slice(1, 1 + max);
  if (extras.length === 0) return null;

  if (layout === 'grid') {
    return (
      <div
        className={className}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          ...style,
        }}
      >
        {extras.map((img, i) => (
          <div
            key={`${img.url}-${i}`}
            className="relative overflow-hidden rounded"
            style={{
              aspectRatio: '1 / 1',
              background: placeholderBg,
              border: `1px solid ${borderColor}`,
            }}
          >
            <img
              src={img.url}
              alt={img.alt ?? ''}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: '8px',
        overflow: 'hidden',
        ...style,
      }}
    >
      {extras.map((img, i) => (
        <div
          key={`${img.url}-${i}`}
          className="relative overflow-hidden rounded shrink-0"
          style={{
            width: '64px',
            height: '64px',
            background: placeholderBg,
            border: `1px solid ${borderColor}`,
          }}
        >
          <img
            src={img.url}
            alt={img.alt ?? ''}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
