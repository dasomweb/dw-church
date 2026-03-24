import type { Bulletin } from '@dw-church/api-client';
import { useBulletin } from '@dw-church/api-client';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface SingleBulletinProps {
  data?: Bulletin;
  postId?: string;
  className?: string;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function SingleBulletin({ data, postId, className = '' }: SingleBulletinProps) {
  const { data: fetched, isLoading } = useBulletin(postId ?? '');
  const bulletin = data ?? fetched;

  if (!data && isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  if (!bulletin) {
    return null;
  }

  return (
    <article className={`mx-auto max-w-3xl ${className}`}>
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          {bulletin.title}
        </h1>
        <p className="mt-2 text-sm text-gray-500">{formatDate(bulletin.date)}</p>
      </header>

      {/* PDF Download */}
      {bulletin.pdfUrl && (
        <div className="mb-8">
          <a
            href={bulletin.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            주보 PDF 다운로드
          </a>
        </div>
      )}

      {/* Bulletin images - stacked vertically */}
      {bulletin.images && bulletin.images.length > 0 && (
        <div className="space-y-2">
          {bulletin.images.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`${bulletin.title} ${idx + 1}페이지`}
              className="w-full rounded-lg shadow-sm"
              loading={idx === 0 ? 'eager' : 'lazy'}
            />
          ))}
        </div>
      )}
    </article>
  );
}
