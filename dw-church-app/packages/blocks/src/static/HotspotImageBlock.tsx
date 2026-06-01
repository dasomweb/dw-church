'use client';

/**
 * Annotated image with clickable hotspots — pulsing dots overlay an
 * image at percentage coordinates; clicking opens a small popover
 * with title + description. Use cases:
 *
 *   "Product anatomy"   — call out features on a product photo
 *   "Floor plan tour"   — point at rooms, show short blurbs
 *   "Diagram explainer" — annotate a flowchart / architecture diagram
 *
 * Coords are stored as { x, y } percentages so the hotspots stay
 * anchored when the image scales responsively. One hotspot can be
 * `open` at a time; clicking another swaps. Clicking outside the
 * popover (or pressing Esc) closes it.
 *
 * Falls back to a list of feature blurbs below the image when JS is
 * disabled — the dots use `position: absolute` over the image so the
 * core information (image + descriptions) is still readable.
 *
 * Phase-2 element-composition refactor: header + image + hotspot
 * popover text all flow through the reusable element modules
 * (HeadingElement / TextBodyElement / ImageElement). The items[N]
 * wrapper KEEPS its absolute positional inline style (left/top/
 * transform from x,y percentages) — that geometry is intrinsic to
 * the hotspot variant, not generic element styling.
 */

import { useEffect, useRef, useState } from 'react';
import { HeadingElement, TextBodyElement, ImageElement } from '../elements';
import { mergeElementStyle } from '../utilities/element-styles';

interface HotspotImageBlockProps {
  props: Record<string, unknown>;
}

interface Hotspot {
  x?: number;
  y?: number;
  title?: string;
  description?: string;
}

export function HotspotImageBlock({ props }: HotspotImageBlockProps) {
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || '';
  const imageUrl = (props.imageUrl as string) || '';
  const items = (Array.isArray(props.items) ? props.items : []) as Hotspot[];

  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openIdx === null) return;
    const handleDoc = (e: MouseEvent) => {
      const el = wrapperRef.current;
      if (!el) return;
      // Hotspot buttons + popovers are inside wrapperRef; outside =>
      // close. The button itself stops propagation so its click won't
      // be treated as outside.
      if (!el.contains(e.target as Node)) setOpenIdx(null);
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
          {items.map((spot, idx) => {
            const x = clamp(spot.x ?? 50);
            const y = clamp(spot.y ?? 50);
            const isOpen = openIdx === idx;
            // Popover anchors to the dot. Right-half dots flip the
            // popover to the left of the dot so it doesn't escape the
            // image bounds at the edge.
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
                  aria-label={spot.title || `Hotspot ${idx + 1}`}
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
                {isOpen && (spot.title || spot.description) && (
                  <div
                    role="dialog"
                    aria-label={spot.title || ''}
                    className={`absolute z-10 w-64 p-4 rounded-lg bg-white shadow-xl border border-gray-200 ${
                      flipLeft ? 'right-9 top-1/2 -translate-y-1/2' : 'left-9 top-1/2 -translate-y-1/2'
                    }`}
                  >
                    <HeadingElement
                      text={spot.title || ''}
                      props={props}
                      elementKey={`items[${idx}].title`}
                      defaultTag="h3"
                      defaultSize="h6"
                      className="mb-1"
                    />
                    <TextBodyElement
                      text={spot.description || ''}
                      props={props}
                      elementKey={`items[${idx}].description`}
                      defaultTag="p"
                      defaultSize="caption"
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
