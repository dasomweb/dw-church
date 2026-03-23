import type { Album } from '@dw-church/api-client';

export interface AlbumCardProps {
  album: Album;
  onClick?: (id: string) => void;
  className?: string;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function AlbumCard({ album, onClick, className = '' }: AlbumCardProps) {
  const thumbnailSrc = album.images?.[0] ?? album.thumbnailUrl;
  const imageCount = album.images?.length ?? 0;

  return (
    <article
      className={`dw-group dw-overflow-hidden dw-rounded-lg dw-bg-white dw-transition-all dw-duration-300 hover:dw--translate-y-1.5 hover:dw-shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${
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
      {/* Cover image 16:9 */}
      <div className="dw-relative dw-w-full dw-overflow-hidden dw-bg-gray-100" style={{ paddingBottom: '56.25%' }}>
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={album.title}
            loading="lazy"
            className="dw-absolute dw-inset-0 dw-h-full dw-w-full dw-object-cover dw-transition-transform dw-duration-500 group-hover:dw-scale-110"
          />
        ) : (
          <div className="dw-absolute dw-inset-0 dw-flex dw-items-center dw-justify-center dw-bg-gray-50">
            <svg className="dw-h-14 dw-w-14 dw-text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Dark overlay on hover */}
        <div className="dw-absolute dw-inset-0 dw-bg-black/0 dw-transition-all dw-duration-300 group-hover:dw-bg-black/20" />

        {/* Image count badge */}
        {imageCount > 0 && (
          <span className="dw-absolute dw-bottom-3 dw-right-3 dw-inline-flex dw-items-center dw-gap-1.5 dw-rounded-full dw-bg-black/60 dw-px-3 dw-py-1 dw-text-xs dw-font-medium dw-text-white dw-backdrop-blur-sm">
            <svg className="dw-h-3.5 dw-w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {imageCount}장
          </span>
        )}
      </div>

      {/* Content */}
      <div className="dw-px-4 dw-pb-4 dw-pt-4">
        <h3 className="dw-line-clamp-2 dw-text-[15px] dw-font-bold dw-leading-snug dw-text-gray-900 dw-transition-colors dw-duration-200 group-hover:dw-text-primary">
          {album.title}
        </h3>

        {album.createdAt && (
          <p className="dw-mt-2 dw-text-[13px] dw-text-gray-400">
            {formatDate(album.createdAt)}
          </p>
        )}
      </div>
    </article>
  );
}
