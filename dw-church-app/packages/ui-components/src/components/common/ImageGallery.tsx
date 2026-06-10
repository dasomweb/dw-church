import { useState, useCallback, useRef, useEffect } from 'react';

export interface ImageGalleryProps {
  images: string[];
  columns?: number;
  gap?: number;
  className?: string;
}

// Min horizontal travel (px) to count a touch as a swipe rather than a tap.
const SWIPE_THRESHOLD = 50;

export function ImageGallery({ images, columns = 3, gap = 8, className = '' }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i)), []);
  const next = useCallback(
    () => setLightboxIndex((i) => (i !== null && i < images.length - 1 ? i + 1 : i)),
    [images.length],
  );

  // ── Mobile swipe ──────────────────────────────────────────
  // Swipe left → next photo, swipe right → previous. justSwiped guards the
  // overlay's tap-to-close so a horizontal swipe doesn't also dismiss the
  // lightbox.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const justSwiped = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Only act on a mostly-horizontal swipe past the threshold (so vertical
    // scrolls / small taps are ignored).
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      justSwiped.current = true;
      if (dx < 0) next();
      else prev();
    }
  }, [next, prev]);

  // Keyboard nav (desktop) + lock background scroll while the lightbox is open.
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxIndex, prev, next, closeLightbox]);

  if (!images.length) return null;

  return (
    <>
      <div
        className={`grid ${className}`}
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => openLightbox(i)}
            className="overflow-hidden rounded border-0 bg-transparent p-0 cursor-pointer"
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform hover:scale-105"
              style={{ aspectRatio: '1' }}
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex touch-pan-y select-none items-center justify-center bg-black/80"
          onClick={() => {
            // A horizontal swipe also fires a click on release — don't let it close.
            if (justSwiped.current) { justSwiped.current = false; return; }
            closeLightbox();
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className={`absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white hover:bg-white/40 ${lightboxIndex === 0 ? 'pointer-events-none opacity-30' : ''}`}
            aria-label="Previous"
          >
            &larr;
          </button>
          <img
            src={images[lightboxIndex]}
            alt=""
            draggable={false}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white hover:bg-white/40 ${lightboxIndex === images.length - 1 ? 'pointer-events-none opacity-30' : ''}`}
            aria-label="Next"
          >
            &rarr;
          </button>
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
            aria-label="Close"
          >
            &times;
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/70">
            {lightboxIndex + 1} / {images.length}
          </span>
        </div>
      )}
    </>
  );
}
