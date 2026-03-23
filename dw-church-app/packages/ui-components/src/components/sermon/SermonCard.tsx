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
      className={`dw-group dw-cursor-pointer dw-overflow-hidden dw-rounded-lg dw-bg-white dw-transition-all dw-duration-300 hover:dw--translate-y-1.5 hover:dw-shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${className}`}
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
      {/* Thumbnail 16:9 with overlay */}
      <div className="dw-relative dw-w-full dw-overflow-hidden" style={{ paddingBottom: '56.25%' }}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={sermon.title}
            className="dw-absolute dw-inset-0 dw-h-full dw-w-full dw-object-cover dw-transition-transform dw-duration-500 group-hover:dw-scale-105"
            loading="lazy"
          />
        ) : (
          <div className="dw-absolute dw-inset-0 dw-flex dw-items-center dw-justify-center dw-bg-gray-100">
            <svg className="dw-h-14 dw-w-14 dw-text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        {/* Dark gradient overlay at bottom */}
        <div className="dw-absolute dw-inset-0 dw-bg-gradient-to-t dw-from-black/40 dw-via-transparent dw-to-transparent" />

        {/* Category badge on top-left */}
        {sermon.category && (
          <span className="dw-absolute dw-left-3 dw-top-3 dw-rounded dw-bg-black/50 dw-px-2.5 dw-py-1 dw-text-xs dw-font-medium dw-text-white dw-backdrop-blur-sm">
            {sermon.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="dw-px-4 dw-pb-4 dw-pt-4">
        {/* Title */}
        <h3 className="dw-line-clamp-2 dw-text-[15px] dw-font-bold dw-leading-snug dw-text-gray-900 dw-transition-colors dw-duration-200 group-hover:dw-text-primary">
          {sermon.title}
        </h3>

        {/* Scripture */}
        {sermon.scripture && (
          <p className="dw-mt-1.5 dw-text-[13px] dw-text-gray-400">{sermon.scripture}</p>
        )}

        {/* Preacher & Date */}
        <div className="dw-mt-3 dw-flex dw-items-center dw-justify-between dw-border-t dw-border-gray-100 dw-pt-3 dw-text-[13px] dw-text-gray-500">
          <span className="dw-font-medium">{sermon.preacher}</span>
          <span>{formatDate(sermon.date)}</span>
        </div>
      </div>
    </article>
  );
}
