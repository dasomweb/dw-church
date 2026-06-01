/**
 * ImageElement — reusable image module.
 *
 * Renders an <img> with operator-overridable sizing (maxWidth /
 * maxHeight / aspectRatio / objectFit / borderRadius / opacity). Routes
 * through mergeElementStyle so the operator's elementStyles[key] picks
 * applied even when the block author supplies sensible defaults.
 * data-element-type="image" lets ElementInspector show image-specific
 * controls (alt text, object-fit dropdown, aspect ratio, focal point).
 *
 * Used by hero / gallery / hotspot / shoppable / lookbook / before-after
 * etc. so every image slot gets the same plumbing.
 */

import type { CSSProperties } from 'react';
import { mergeElementStyle } from '../utilities/element-styles';
import { imgAttrs, type ImageSlot } from '../utilities/responsive-image';

interface ImageElementProps {
  /** Image URL. Empty → renders a placeholder slot the operator can
   *  click to add an image. */
  url: string;
  /** Alt text for accessibility. Operator-supplied. */
  alt?: string;
  /** The owning section's props bag. */
  props: Record<string, unknown>;
  /** Stable key matching data-element. */
  elementKey: string;
  /** Image size category for responsive srcset (matches responsive-image
   *  utility's ImageSlot — hero-bg / split-side / card-grid / etc.). */
  sizeCategory?: ImageSlot;
  /** Loading priority — set 'high' for LCP candidates (above-the-fold hero). */
  imageFetchPriority?: 'high' | 'low' | 'auto';
  /** Loading strategy — eager for above-the-fold, lazy for below. */
  imageLoading?: 'eager' | 'lazy';
  /** Layout-only className. */
  className?: string;
  /** Block-level extra base style (objectFit / aspectRatio defaults). */
  baseStyle?: CSSProperties;
  /** Mobile-specific src — uses <picture> when present. */
  mobileUrl?: string;
  /** Placeholder body when url is empty (admin canvas guidance). */
  placeholderText?: string;
  /** Set when the image should fill its (absolutely-positioned) parent —
   *  hero / cover backgrounds, split-image columns, card-image slots.
   *  Without this the default `height: auto` (inline) wins over the
   *  caller's `h-full` className and the image stretches to its native
   *  height, overflowing the parent (because the wrapper rarely has
   *  overflow:hidden in full-bleed layouts) and visually invading the
   *  next section. */
  fillParent?: boolean;
}

export function ImageElement({
  url,
  alt = '',
  props,
  elementKey,
  sizeCategory = 'card-grid',
  imageFetchPriority,
  imageLoading = 'lazy',
  className,
  baseStyle,
  mobileUrl,
  placeholderText = 'Add an image',
  fillParent = false,
}: ImageElementProps) {
  const base: CSSProperties = {
    display: 'block',
    maxWidth: '100%',
    height: fillParent ? '100%' : 'auto',
    ...baseStyle,
  };
  const style = mergeElementStyle(base, props, elementKey);
  if (!url) {
    return (
      <div
        data-element={elementKey}
        data-element-type="image"
        className={className}
        style={{
          ...style,
          aspectRatio: (baseStyle?.aspectRatio as string) ?? '16 / 9',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--bg-subtle, #f5f5f5)',
          color: 'var(--text-muted)',
          fontSize: 'var(--fs-sm)',
        }}
      >
        {placeholderText}
      </div>
    );
  }
  // imgAttrs already supplies loading/decoding/sizes/srcset; spread it
  // first then override only when the caller explicitly asks (high
  // priority for LCP, eager when above-the-fold).
  const responsive = imgAttrs(sizeCategory, url);
  const imgEl = (
    <img
      data-element={elementKey}
      data-element-type="image"
      src={url}
      alt={alt}
      {...responsive}
      {...(imageLoading !== undefined ? { loading: imageLoading } : {})}
      {...(imageFetchPriority !== undefined ? { fetchPriority: imageFetchPriority } : {})}
      className={className}
      style={style}
    />
  );
  if (mobileUrl) {
    return (
      <picture>
        <source media="(max-width: 767px)" srcSet={mobileUrl} />
        {imgEl}
      </picture>
    );
  }
  return imgEl;
}
