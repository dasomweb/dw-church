import type { Bulletin } from '@dw-church/api-client';
import { DateBadge } from '../common/DateBadge';

export interface BulletinCardProps {
  bulletin: Bulletin;
  onClick?: (id: string) => void;
  className?: string;
}

export function BulletinCard({ bulletin, onClick, className = '' }: BulletinCardProps) {
  const thumbnailSrc = bulletin.images?.[0] ?? bulletin.thumbnailUrl;

  return (
    <article
      className={`dw-group dw-overflow-hidden dw-rounded-lg dw-border dw-border-border dw-bg-surface dw-shadow-sm dw-transition-shadow hover:dw-shadow-md ${
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
      {/* Thumbnail */}
      <div className="dw-aspect-[4/3] dw-overflow-hidden dw-bg-surface-alt">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={bulletin.title}
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
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="dw-flex dw-flex-col dw-gap-2 dw-p-4">
        <h3 className="dw-line-clamp-2 dw-text-base dw-font-semibold dw-text-text-primary group-hover:dw-text-primary dw-transition-colors">
          {bulletin.title}
        </h3>

        <div className="dw-flex dw-items-center dw-justify-between dw-gap-2">
          <DateBadge date={bulletin.date} format="short" />

          {bulletin.pdfUrl && (
            <a
              href={bulletin.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="dw-inline-flex dw-items-center dw-gap-1 dw-rounded dw-bg-primary dw-px-3 dw-py-1.5 dw-text-xs dw-font-medium dw-text-white hover:dw-bg-primary-hover dw-transition-colors"
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
              PDF
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
