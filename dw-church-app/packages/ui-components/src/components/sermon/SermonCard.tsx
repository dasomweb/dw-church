import type { Sermon } from '@dw-church/api-client';
import { DateBadge } from '../common/DateBadge';

export interface SermonCardProps {
  sermon: Sermon;
  onClick?: (id: string) => void;
  className?: string;
}

function extractYoutubeId(url: string): string | null {
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

export function SermonCard({ sermon, onClick, className = '' }: SermonCardProps) {
  const thumbnailUrl = getThumbnailUrl(sermon);

  return (
    <article
      className={`dw-group dw-cursor-pointer dw-overflow-hidden dw-rounded dw-border dw-border-border dw-bg-surface dw-transition-shadow hover:dw-shadow-md ${className}`}
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
      {thumbnailUrl && (
        <div className="dw-relative dw-w-full dw-overflow-hidden" style={{ paddingBottom: '56.25%' }}>
          <img
            src={thumbnailUrl}
            alt={sermon.title}
            className="dw-absolute dw-inset-0 dw-h-full dw-w-full dw-object-cover dw-transition-transform group-hover:dw-scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="dw-p-4">
        <h3 className="dw-line-clamp-2 dw-text-base dw-font-semibold dw-text-text-primary group-hover:dw-text-primary">
          {sermon.title}
        </h3>
        <p className="dw-mt-1 dw-text-sm dw-text-text-secondary">{sermon.preacher}</p>
        {sermon.scripture && (
          <p className="dw-mt-1 dw-text-sm dw-text-text-muted">{sermon.scripture}</p>
        )}
        <div className="dw-mt-2">
          <DateBadge date={sermon.date} format="short" />
        </div>
      </div>
    </article>
  );
}
