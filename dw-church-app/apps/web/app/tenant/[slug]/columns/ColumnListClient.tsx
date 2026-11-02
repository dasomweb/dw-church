'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Column } from '@dw-church/api-client';
import { Pagination } from '@/components/Pagination';
import { koText } from '@dw-church/blocks';

interface ColumnListClientProps {
  initialData: Column[];
  total: number;
  totalPages: number;
  currentPage: number;
  slug: string;
  /** 공개 중인 글이 있는 카테고리만(글 많은 순). 비어 있으면 탭을 숨긴다. */
  categories?: { category: string; count: number }[];
  /** 지금 보고 있는 카테고리(?category=). 비우면 전체. */
  activeCategory?: string;
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
  categories = [],
  activeCategory,
}: ColumnListClientProps) {
  const router = useRouter();

  // 카테고리를 보던 중 페이지를 넘겨도 그 카테고리에 머물러야 한다.
  const buildUrl = (page: number, category = activeCategory) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return `/columns${qs ? '?' + qs : ''}`;
  };

  const tabClass = (on: boolean) =>
    `rounded-full border px-4 py-1.5 transition-colors ${
      on
        ? 'border-transparent bg-[var(--dw-primary)] text-white'
        : 'border-black/10 text-gray-600 hover:border-black/25'
    }`;

  return (
    <div>
      {/* 카테고리 탭 — 연재가 하나뿐이면 고를 게 없으므로 숨긴다. */}
      {categories.length > 1 && (
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="카테고리">
          <Link href={buildUrl(1, undefined)} className={tabClass(!activeCategory)} style={koText('tab')}>
            전체
          </Link>
          {categories.map((c) => (
            <Link
              key={c.category}
              href={buildUrl(1, c.category)}
              className={tabClass(activeCategory === c.category)}
              style={koText('tab')}
            >
              {c.category}
            </Link>
          ))}
        </nav>
      )}
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
                {/* 카테고리 탭으로 좁혀 본 화면에서는 카드마다 같은 라벨이 반복되므로 숨긴다. */}
                {!activeCategory && column.category && (
                  <p className="text-[var(--dw-primary)]" style={koText('eyebrow')}>{column.category}</p>
                )}
                <h3 className="line-clamp-2 font-semibold text-gray-900 transition-colors group-hover:text-[var(--dw-primary)]" style={koText('cardTitle')}>
                  {column.title}
                </h3>
                <p className="line-clamp-3 text-gray-500" style={koText('summary')}>
                  {truncate(column.content, 100)}
                </p>
                <time className="text-gray-400" style={koText('meta')}>
                  {formatDate(column.publishAt || column.createdAt)}
                </time>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-gray-500" style={koText('summary')}>
          {activeCategory ? `'${activeCategory}' 글이 아직 없습니다.` : '등록된 글이 아직 없습니다.'}
        </div>
      )}

      {/* Pagination */}
      <Pagination currentPage={currentPage} totalPages={totalPages} hrefForPage={(p) => buildUrl(p)} />
      <p className="mt-4 text-center text-gray-500" style={koText('meta')}>
        총 {total}개의 글
      </p>
    </div>
  );
}
