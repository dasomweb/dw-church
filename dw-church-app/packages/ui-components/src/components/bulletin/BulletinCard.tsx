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
      className={`dw-group dw-overflow-hidden dw-rounded-lg dw-bg-white dw-transition-all dw-duration-300 hover:dw--translate-y-1.5 hover:dw-shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${
        onClick ? 'dw-cursor-pointer' : ''
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
      <div className="dw-relative dw-w-full dw-overflow-hidden dw-bg-gray-50" style={{ paddingBottom: '56.25%' }}>
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={bulletin.title}
            loading="lazy"
            className="dw-absolute dw-inset-0 dw-h-full dw-w-full dw-object-cover dw-transition-transform dw-duration-500 group-hover:dw-scale-105"
          />
        ) : (
          <div className="dw-absolute dw-inset-0 dw-flex dw-items-center dw-justify-center dw-bg-gray-50">
            <svg className="dw-h-14 dw-w-14 dw-text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="dw-absolute dw-inset-0 dw-bg-black/5 dw-transition-opacity dw-duration-300 group-hover:dw-bg-black/10" />

        {/* Date badge overlaid on bottom-right */}
        {bulletin.date && (
          <span className="dw-absolute dw-bottom-3 dw-right-3 dw-rounded dw-bg-black/60 dw-px-2.5 dw-py-1 dw-text-xs dw-font-medium dw-text-white dw-backdrop-blur-sm">
            {formatDate(bulletin.date)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="dw-px-4 dw-pb-4 dw-pt-4">
        <h3 className="dw-line-clamp-2 dw-text-[15px] dw-font-bold dw-leading-snug dw-text-gray-900 dw-transition-colors dw-duration-200 group-hover:dw-text-primary">
          {bulletin.title}
        </h3>

        {bulletin.pdfUrl && (
          <div className="dw-mt-3 dw-border-t dw-border-gray-100 dw-pt-3">
            <a
              href={bulletin.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="dw-inline-flex dw-items-center dw-gap-1.5 dw-rounded dw-bg-gray-100 dw-px-3 dw-py-1.5 dw-text-xs dw-font-medium dw-text-gray-600 dw-transition-colors dw-duration-200 hover:dw-bg-primary hover:dw-text-white"
              aria-label={`${bulletin.title} PDF 다운로드`}
            >
              <svg className="dw-h-3.5 dw-w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
