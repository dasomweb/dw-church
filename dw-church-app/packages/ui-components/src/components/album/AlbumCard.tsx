import type { Album } from '@dw-church/api-client';

export interface AlbumCardProps {
  album: Album;
  onClick?: (id: string) => void;
  className?: string;
}

export function AlbumCard({ album, onClick, className = '' }: AlbumCardProps) {
  const thumbnailSrc = album.images?.[0] ?? album.thumbnailUrl;

  return (
    <article
      className={`dw-group dw-overflow-hidden dw-rounded-lg dw-border dw-border-border dw-bg-surface dw-shadow-sm dw-transition-shadow hover:dw-shadow-md ${
        onClick ? 'dw-cursor-pointer' : ''
      } ${className}`}
      onClick={() => onClick?.(album.id)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(album.id);
        }
      }}
    >
      {/* Thumbnail */}
      <div className="dw-relative dw-aspect-[4/3] dw-overflow-hidden dw-bg-surface-alt">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={album.title}
            loading="lazy"
            className="dw-h-full dw-w-full dw-object-cover dw-transition-transform group-hover:dw-scale-105"
          />
        ) : (
          <div className="dw-flex dw-h-full dw-w-full dw-items-center dw-justify-center dw-text-text-muted">
            <svg className="dw-h-12 dw-w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Image count badge */}
        {album.images?.length > 0 && (
          <span className="dw-absolute dw-bottom-2 dw-right-2 dw-inline-flex dw-items-center dw-gap-1 dw-rounded dw-bg-black/60 dw-px-2 dw-py-1 dw-text-xs dw-font-medium dw-text-white">
            <svg className="dw-h-3.5 dw-w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {album.images.length}
          </span>
        )}
      </div>

      {/* Title */}
      <div className="dw-p-4">
        <h3 className="dw-line-clamp-2 dw-text-base dw-font-semibold dw-text-text-primary group-hover:dw-text-primary dw-transition-colors">
          {album.title}
        </h3>
      </div>
    </article>
  );
}
