import type { Sermon } from '@dw-church/api-client';

export interface SermonCardProps {
  sermon: Sermon;
  onClick?: (id: string) => void;
  className?: string;
}

function extractYoutubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?\s/]+)/,
  );
  return match?.[1] ?? null;
}

function getThumbnailUrl(sermon: Sermon): string {
  if (sermon.thumbnailUrl) return sermon.thumbnailUrl;
  const videoId = extractYoutubeId(sermon.youtubeUrl);
  if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return '';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function SermonCard({ sermon, onClick, className = '' }: SermonCardProps) {
  const thumbnailUrl = getThumbnailUrl(sermon);

  return (
    <article
      className={`dw-group dw-cursor-pointer dw-overflow-hidden dw-rounded-lg dw-border dw-border-border dw-bg-surface dw-transition-shadow hover:dw-shadow-lg ${className}`}
      onClick={() => onClick?.(sermon.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(sermon.id);
        }
      }}
    >
      {/* Thumbnail 16:9 */}
      <div className="dw-relative dw-w-full dw-overflow-hidden dw-bg-gray-100" style={{ paddingBottom: '56.25%' }}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={sermon.title}
            className="dw-absolute dw-inset-0 dw-h-full dw-w-full dw-object-cover dw-transition-transform dw-duration-300 group-hover:dw-scale-105"
            loading="lazy"
          />
        ) : (
          <div className="dw-absolute dw-inset-0 dw-flex dw-items-center dw-justify-center dw-bg-gray-200">
            <svg className="dw-h-12 dw-w-12 dw-text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="dw-p-4">
        {/* Category */}
        {sermon.category && (
          <span className="dw-inline-block dw-rounded dw-bg-primary/10 dw-px-2 dw-py-0.5 dw-text-xs dw-font-medium dw-text-primary">
            {sermon.category}
          </span>
        )}

        {/* Title */}
        <h3 className="dw-mt-2 dw-line-clamp-2 dw-text-base dw-font-bold dw-text-text-primary group-hover:dw-text-primary dw-transition-colors">
          {sermon.title}
        </h3>

        {/* Scripture */}
        {sermon.scripture && (
          <p className="dw-mt-1 dw-text-sm dw-text-text-muted">{sermon.scripture}</p>
        )}

        {/* Preacher & Date */}
        <div className="dw-mt-3 dw-flex dw-items-center dw-justify-between dw-text-sm dw-text-text-secondary">
          <span>{sermon.preacher}</span>
          <span>{formatDate(sermon.date)}</span>
        </div>
      </div>
    </article>
  );
}
