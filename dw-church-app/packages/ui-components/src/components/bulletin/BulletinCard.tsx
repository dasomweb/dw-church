import type { Bulletin } from '@dw-church/api-client';

export interface BulletinCardProps {
  bulletin: Bulletin;
  onClick?: (id: string) => void;
  className?: string;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function BulletinCard({ bulletin, onClick, className = '' }: BulletinCardProps) {
  const thumbnailSrc = bulletin.images?.[0] ?? bulletin.thumbnailUrl;

  return (
    <article
      className={`group overflow-hidden rounded-lg bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={() => onClick?.(bulletin.id)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(bulletin.id);
        }
      }}
    >
      {/* Thumbnail 16:9 */}
      <div className="relative w-full overflow-hidden bg-gray-50" style={{ paddingBottom: '56.25%' }}>
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={bulletin.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <svg className="h-14 w-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
          </div>
        )}

        {/* Subtle dark overlay */}
        <div className="absolute inset-0 bg-black/5 transition-opacity duration-300 group-hover:bg-black/10" />

        {/* Date badge overlaid on bottom-right */}
        {bulletin.date && (
          <span className="absolute bottom-3 right-3 rounded bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {formatDate(bulletin.date)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-4 pt-4">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-gray-900 transition-colors duration-200 group-hover:text-primary">
          {bulletin.title}
        </h3>

        {bulletin.pdfUrl && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <a
              href={bulletin.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors duration-200 hover:bg-primary hover:text-white"
              aria-label={`${bulletin.title} PDF 다운로드`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              PDF 다운로드
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
