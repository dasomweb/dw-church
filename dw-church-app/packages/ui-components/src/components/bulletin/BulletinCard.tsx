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
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function BulletinCard({ bulletin, onClick, className = '' }: BulletinCardProps) {
  return (
    <article
      className={`group flex items-center justify-between border-b border-gray-200 px-4 py-4 transition-colors hover:bg-gray-50 ${
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
      {/* Left: date + title */}
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
        <span className="shrink-0 text-sm font-medium text-gray-500">
          {formatDate(bulletin.date)}
        </span>
        <h3 className="text-[15px] font-semibold text-gray-900 transition-colors group-hover:text-primary">
          {bulletin.title}
        </h3>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-3">
        {onClick && (
          <span className="hidden text-sm font-medium text-primary sm:inline">
            주보보기
          </span>
        )}
        {bulletin.pdfUrl && (
          <a
            href={bulletin.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-primary hover:text-white"
            aria-label={`${bulletin.title} PDF 다운로드`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            다운로드
          </a>
        )}
      </div>
    </article>
  );
}
