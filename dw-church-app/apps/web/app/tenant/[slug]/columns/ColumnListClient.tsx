'use client';

import { useRouter } from 'next/navigation';
import type { Column } from '@dw-church/api-client';

interface ColumnListClientProps {
  initialData: Column[];
  total: number;
  totalPages: number;
  currentPage: number;
  slug: string;
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  const plain = text.replace(/<[^>]*>/g, '');
  return plain.length > max ? `${plain.slice(0, max)}...` : plain;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function ColumnListClient({
  initialData,
  total,
  totalPages,
  currentPage,
  slug,
}: ColumnListClientProps) {
  const router = useRouter();

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return `/columns${qs ? '?' + qs : ''}`;
  };

  return (
    <div>
      {initialData.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {initialData.map((column) => (
            <article
              key={column.id}
              className="group cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              onClick={() => router.push(`/columns/${column.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/columns/${column.id}`);
                }
              }}
            >
              {/* Thumbnail */}
              <div className="aspect-[16/9] overflow-hidden bg-gray-100">
                {column.thumbnailUrl ? (
                  <img
                    src={column.thumbnailUrl}
                    alt={column.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="flex flex-col gap-2 p-4">
                <h3 className="line-clamp-2 text-base font-semibold text-gray-900 transition-colors group-hover:text-[var(--dw-primary)]">
                  {column.title}
                </h3>
                <p className="line-clamp-3 text-sm text-gray-500">
                  {truncate(column.content, 100)}
                </p>
                <time className="text-xs text-gray-400">
                  {formatDate(column.createdAt)}
                </time>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-gray-500">
          등록된 칼럼이 없습니다.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={buildUrl(p)}
              className={`rounded-lg px-4 py-2 text-sm ${
                p === currentPage
                  ? 'bg-[var(--dw-primary)] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
      <p className="mt-4 text-center text-sm text-gray-500">
        총 {total}개의 칼럼
      </p>
    </div>
  );
}
