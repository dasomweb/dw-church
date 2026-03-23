'use client';

import type { Column } from '@dw-church/api-client';
import Link from 'next/link';

interface SingleColumnClientProps {
  column: Column;
  slug: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function SingleColumnClient({ column, slug }: SingleColumnClientProps) {
  return (
    <div>
      <Link
        href="/columns"
        className="mb-8 inline-block text-sm text-[var(--dw-primary)] hover:underline"
      >
        &larr; 칼럼 목록
      </Link>

      <article>
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold font-heading sm:text-3xl">
            {column.title}
          </h1>
          <div className="mt-3 text-sm text-gray-500">
            <time>{formatDate(column.createdAt)}</time>
          </div>
        </header>

        {/* Top Image */}
        {column.topImageUrl && (
          <div className="mb-8 overflow-hidden rounded-lg">
            <img
              src={column.topImageUrl}
              alt={column.title}
              className="w-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: column.content }}
        />

        {/* Bottom Image */}
        {column.bottomImageUrl && (
          <div className="mt-8 overflow-hidden rounded-lg">
            <img
              src={column.bottomImageUrl}
              alt=""
              className="w-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* YouTube Video */}
        {column.youtubeUrl && (
          <div className="mt-8">
            <div className="relative aspect-video overflow-hidden rounded-lg">
              <iframe
                src={column.youtubeUrl.replace('watch?v=', 'embed/')}
                title={column.title}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
