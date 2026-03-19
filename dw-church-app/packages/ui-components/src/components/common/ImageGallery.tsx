import { useState, useCallback } from 'react';

export interface ImageGalleryProps {
  images: string[];
  columns?: number;
  gap?: number;
  className?: string;
}

export function ImageGallery({ images, columns = 3, gap = 8, className = '' }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i)), []);
  const next = useCallback(
    () => setLightboxIndex((i) => (i !== null && i < images.length - 1 ? i + 1 : i)),
    [images.length],
  );

  if (!images.length) return null;

  return (
    <>
      <div
        className={`dw-grid ${className}`}
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => openLightbox(i)}
            className="dw-overflow-hidden dw-rounded dw-border-0 dw-bg-transparent dw-p-0 dw-cursor-pointer"
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              className="dw-h-full dw-w-full dw-object-cover dw-transition-transform hover:dw-scale-105"
              style={{ aspectRatio: '1' }}
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="dw-fixed dw-inset-0 dw-z-50 dw-flex dw-items-center dw-justify-center dw-bg-black/80"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="dw-absolute dw-left-4 dw-top-1/2 -dw-translate-y-1/2 dw-rounded-full dw-bg-white/20 dw-p-3 dw-text-white hover:dw-bg-white/40"
            aria-label="Previous"
          >
            &larr;
          </button>
          <img
            src={images[lightboxIndex]}
            alt=""
            className="dw-max-h-[90vh] dw-max-w-[90vw] dw-rounded-lg dw-object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="dw-absolute dw-right-4 dw-top-1/2 -dw-translate-y-1/2 dw-rounded-full dw-bg-white/20 dw-p-3 dw-text-white hover:dw-bg-white/40"
            aria-label="Next"
          >
            &rarr;
          </button>
          <button
            onClick={closeLightbox}
            className="dw-absolute dw-right-4 dw-top-4 dw-rounded-full dw-bg-white/20 dw-p-2 dw-text-white hover:dw-bg-white/40"
            aria-label="Close"
          >
            &times;
          </button>
          <span className="dw-absolute dw-bottom-4 dw-left-1/2 -dw-translate-x-1/2 dw-text-sm dw-text-white/70">
            {lightboxIndex + 1} / {images.length}
          </span>
        </div>
      )}
    </>
  );
}
