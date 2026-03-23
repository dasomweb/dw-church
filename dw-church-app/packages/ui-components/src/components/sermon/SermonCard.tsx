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
  // Always prefer YouTube hqdefault (maxresdefault often 404s)
  const videoId = extractYoutubeId(sermon.youtubeUrl);
  if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  if (sermon.thumbnailUrl) return sermon.thumbnailUrl;
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
      className={`group cursor-pointer overflow-hidden rounded-lg bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${className}`}
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
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: '56.25%' }}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={sermon.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <svg className="h-14 w-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        {/* Dark gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Category badge on top-left */}
        {sermon.category && (
          <span className="absolute left-3 top-3 rounded bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {sermon.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-4 pt-4">
        {/* Title */}
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-gray-900 transition-colors duration-200 group-hover:text-primary">
          {sermon.title}
        </h3>

        {/* Scripture */}
        {sermon.scripture && (
          <p className="mt-1.5 text-[13px] text-gray-400">{sermon.scripture}</p>
        )}

        {/* Preacher & Date */}
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-[13px] text-gray-500">
          <span className="font-medium">{sermon.preacher}</span>
          <span>{formatDate(sermon.date)}</span>
        </div>
      </div>
    </article>
  );
}
