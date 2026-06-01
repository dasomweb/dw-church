'use client';

/**
 * Shoppable image — an editorial photo with numbered hotspots that
 * point at products. This is the SYNC variant used by the admin
 * canvas (and as the storefront fallback when product resolution
 * isn't available): it renders the image + pulsing numbered dots and
 * a label popover. The storefront overrides this block with an async
 * component that resolves each hotspot's `productId` into a real
 * product link + mini card (apps/web/components/blocks/
 * ShoppableImageBlock.tsx). Coords are { x, y } percentages so the
 * dots stay anchored as the image scales responsively.
 *
 * Phase-2 element-composition refactor: header + image + popover
 * label flow through HeadingElement / TextBodyElement / ImageElement.
 * The items[N] absolute-positioned wrapper keeps its inline left/top
 * style — that geometry is the variant's identity, not a style
 * override candidate.
 */

import { useEffect, useRef, useState } from 'react';
import { HeadingElement, TextBodyElement, ImageElement } from '../elements';
import { mergeElementStyle } from '../utilities/element-styles';

interface ShoppableImageBlockProps {
  props: Record<string, unknown>;
}

interface Hotspot {
  x?: number;
  y?: number;
  productId?: string;
  label?: string;
}

export function ShoppableImageBlock({ props }: ShoppableImageBlockProps) {
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || '';
  const imageUrl = (props.imageUrl as string) || '';
  // The array is `items` (not `hotspots`) so the builder's generic
  // items[] collection editor + StructurePane can edit each spot —
  // both bind to props.items by convention.
  const hotspots = (Array.isArray(props.items) ? props.items : []) as Hotspot[];

  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openIdx === null) return;
    const handleDoc = (e: MouseEvent) => {
      const el = wrapperRef.current;
      if (el && !el.contains(e.target as Node)) setOpenIdx(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIdx(null);
    };
    window.addEventListener('mousedown', handleDoc);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleDoc);
      window.removeEventListener('keydown', handleKey);
    };
  }, [openIdx]);

  return (
    <section className="px-4 sm:px-6 py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-6xl">
        {(title || subtitle) && (
          <header className="mb-8 text-center">
            <HeadingElement
              text={title}
              props={props}
              elementKey="title"
              defaultTag="h2"
              defaultSize="h2"
            />
            <HeadingElement
              text={subtitle}
              props={props}
              elementKey="subtitle"
              defaultTag="h5"
              defaultSize="h3"
              className="mt-3"
            />
          </header>
        )}
        <div ref={wrapperRef} className="relative rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
          <ImageElement
            url={imageUrl}
            alt=""
            props={props}
            elementKey="imageUrl"
            sizeCategory="split-side"
            className="block w-full h-auto"
          />
          {hotspots.map((spot, idx) => {
            const x = clamp(spot.x ?? 50);
            const y = clamp(spot.y ?? 50);
            const isOpen = openIdx === idx;
            const flipLeft = x > 60;
            return (
              <div
                key={idx}
                data-element={`items[${idx}]`}
                className="absolute"
                style={mergeElementStyle(
                  { left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' },
                  props,
                  `items[${idx}]`,
                )}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenIdx((cur) => (cur === idx ? null : idx));
                  }}
                  aria-label={spot.label || `Product ${idx + 1}`}
                  aria-expanded={isOpen}
                  className="relative w-7 h-7 grid place-items-center rounded-full bg-[var(--accent,var(--dw-primary))] text-white text-sm font-bold shadow-lg focus:outline-none focus:ring-4 focus:ring-[var(--accent,var(--dw-primary))]/40"
                >
                  {idx + 1}
                  {!isOpen && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-[var(--accent,var(--dw-primary))] animate-ping opacity-60"
                    />
                  )}
                </button>
                {isOpen && spot.label && (
                  <div
                    role="dialog"
                    aria-label={spot.label}
                    className={`absolute z-10 w-56 p-3 rounded-lg bg-white shadow-xl border border-gray-200 ${
                      flipLeft ? 'right-9 top-1/2 -translate-y-1/2' : 'left-9 top-1/2 -translate-y-1/2'
                    }`}
                  >
                    <TextBodyElement
                      text={spot.label}
                      props={props}
                      elementKey={`items[${idx}].label`}
                      defaultTag="p"
                      defaultSize="body"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function clamp(n: number): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 50;
  return Math.min(100, Math.max(0, n));
}
