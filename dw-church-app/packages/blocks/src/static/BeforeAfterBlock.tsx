'use client';

/**
 * Before/after image comparison slider — operator drags a vertical
 * handle (or pointer-events the image area) to reveal one image
 * progressively over the other. Use cases:
 *
 *   "Renovation" — interior design / construction case studies
 *   "Edit"       — photo retouch / colour grading examples
 *   "Upgrade"    — product redesign before/after
 *
 * Pointer-events handle both mouse and touch in one path; no separate
 * touch handler. Keyboard support: Tab to focus the handle, ←/→ moves
 * by 5%. Falls back to a static side-by-side render when JavaScript
 * is unavailable (slider rendered behind the after image with
 * `position: absolute`, so the after image alone still shows).
 *
 * Phase-2 element-composition refactor: headers and image swap are
 * delegated to HeadingElement / ImageElement modules. The slider
 * state (position, dragging, keyboard) stays here because it owns the
 * interactive behavior. Labels (beforeLabel / afterLabel) stay inline
 * with mergeElementStyle since their absolute-positioned badge
 * styling is intrinsic to the variant, not generic body copy.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { HeadingElement, ImageElement } from '../elements';
import { mergeElementStyle } from '../utilities/element-styles';

interface BeforeAfterBlockProps {
  props: Record<string, unknown>;
}

export function BeforeAfterBlock({ props }: BeforeAfterBlockProps) {
  const title = (props.title as string) || '';
  const subtitle = (props.subtitle as string) || '';
  const beforeImageUrl = (props.beforeImageUrl as string) || '';
  const afterImageUrl = (props.afterImageUrl as string) || '';
  // No English label defaults — operator supplies. See feedback-no-hardcoded-defaults.
  const beforeLabel = (props.beforeLabel as string) || '';
  const afterLabel = (props.afterLabel as string) || '';
  const initial = typeof props.defaultPosition === 'number'
    ? Math.min(95, Math.max(5, props.defaultPosition as number))
    : 50;

  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(initial);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const raw = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, raw)));
  }, []);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      updateFromClientX(e.clientX);
    };
    const handleUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [updateFromClientX]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPosition((p) => Math.max(0, p - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPosition((p) => Math.min(100, p + 5));
    }
  };

  return (
    <section className="px-4 sm:px-6 py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-5xl">
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
        <div
          ref={containerRef}
          className="relative w-full rounded-2xl overflow-hidden bg-gray-100 shadow-md select-none touch-none"
          style={{ aspectRatio: '16 / 9' }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            draggingRef.current = true;
            updateFromClientX(e.clientX);
          }}
        >
          <ImageElement
            url={beforeImageUrl}
            alt={beforeLabel}
            props={props}
            elementKey="beforeImageUrl"
            sizeCategory="split-side"
            fillParent
            className="absolute inset-0 w-full h-full object-cover"
            placeholderText="Add a 'before' image"
          />
          {/* "After" image clipped to position% from the left. The
              image itself fills the container and an inline clipPath
              hides the right portion until the slider crosses. */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          >
            <ImageElement
              url={afterImageUrl}
              alt={afterLabel}
              props={props}
              elementKey="afterImageUrl"
              sizeCategory="split-side"
              fillParent
              className="absolute inset-0 w-full h-full object-cover"
              placeholderText="Add an 'after' image"
            />
          </div>
          {/* Static labels — only visible when the slider hasn't fully
              crossed the corresponding side. The badge background +
              positional offsets are intrinsic to the slider's visual
              variant; the inspector still owns text color / size via
              mergeElementStyle. */}
          {position > 8 && afterLabel && (
            <span
              data-element="afterLabel"
              className="absolute top-4 left-4 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm"
              style={mergeElementStyle(
                { color: '#fff', fontSize: 'var(--brand-caption, var(--fs-xs))', fontWeight: 600 },
                props,
                'afterLabel',
              )}
            >
              {afterLabel}
            </span>
          )}
          {position < 92 && beforeLabel && (
            <span
              data-element="beforeLabel"
              className="absolute top-4 right-4 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm"
              style={mergeElementStyle(
                { color: '#fff', fontSize: 'var(--brand-caption, var(--fs-xs))', fontWeight: 600 },
                props,
                'beforeLabel',
              )}
            >
              {beforeLabel}
            </span>
          )}
          {/* Vertical divider + handle. Sits at position%; the handle
              is a circle the operator can drag (or focus + arrow). */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-md pointer-events-none"
            style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
          />
          <button
            type="button"
            role="slider"
            aria-label="Before/After comparison"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
            onKeyDown={handleKey}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              draggingRef.current = true;
              updateFromClientX(e.clientX);
            }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-[var(--accent,var(--dw-primary))]"
            style={{ left: `${position}%` }}
          >
            <span aria-hidden="true">⇄</span>
          </button>
        </div>
      </div>
    </section>
  );
}
