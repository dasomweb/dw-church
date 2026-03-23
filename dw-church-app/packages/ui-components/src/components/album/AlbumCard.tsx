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
      className={`group overflow-hidden rounded-lg bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${
        onClick ? 'cursor-pointer' : ''
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
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ paddingBottom: '56.25%' }}>
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={album.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <svg className="h-14 w-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/20" />

        {/* YouTube badge */}
        {album.youtubeUrl && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded bg-red-600/90 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
            </svg>
            영상
          </span>
        )}

        {/* Image count badge */}
        {imageCount > 0 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="px-4 pb-4 pt-4">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-gray-900 transition-colors duration-200 group-hover:text-primary">
          {album.title}
        </h3>

        {album.createdAt && (
          <p className="mt-2 text-[13px] text-gray-400">
            {formatDate(album.createdAt)}
          </p>
        )}
      </div>
    </article>
  );
}
