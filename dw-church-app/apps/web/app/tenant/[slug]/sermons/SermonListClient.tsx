'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SermonList } from '@dw-church/ui-components';
import type { Sermon } from '@dw-church/api-client';

interface SermonListClientProps {
  initialData: Sermon[];
  total: number;
  totalPages: number;
  currentPage: number;
  slug: string;
  currentSearch?: string;
  currentCategory?: string;
}

export function SermonListClient({
  initialData,
  total,
  totalPages,
  currentPage,
  slug,
  currentSearch,
  currentCategory,
}: SermonListClientProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(currentSearch ?? '');

  const buildUrl = useCallback(
    (overrides: { page?: number; search?: string | null; category?: string | null }) => {
      const params = new URLSearchParams();
      // null = explicitly remove, undefined = keep current
      const search = overrides.search === null ? '' : (overrides.search ?? currentSearch);
      const category = overrides.category === null ? '' : (overrides.category ?? currentCategory);
      const page = overrides.page ?? 1;

      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (page > 1) params.set('page', String(page));

      const qs = params.toString();
      return `/sermons${qs ? '?' + qs : ''}`;
    },
    [currentSearch, currentCategory],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl({ search: searchInput, page: 1 }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    router.push(buildUrl({ category: value || undefined, page: 1 }));
  };

  const handleClearFilters = () => {
    setSearchInput('');
    router.push('/sermons');
  };

  const hasActiveFilters = !!currentSearch || !!currentCategory;

  return (
    <div>
      {/* Search & Filter Bar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="설교 제목, 설교자로 검색..."
              className="min-h-[44px] w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-[var(--dw-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--dw-primary)]"
            />
          </div>
          <button
            type="submit"
            className="min-h-[44px] rounded-lg bg-[var(--dw-primary)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            검색
          </button>
        </form>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="min-h-[44px] text-sm text-gray-500 hover:text-gray-700 underline"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* Active filter indicators */}
      {hasActiveFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500">적용된 필터:</span>
          {currentSearch && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-gray-700">
              검색: &ldquo;{currentSearch}&rdquo;
              <button
                onClick={() => {
                  setSearchInput('');
                  router.push(buildUrl({ search: null, page: 1 }));
                }}
                className="ml-1 text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </span>
          )}
          {currentCategory && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-gray-700">
              카테고리: {currentCategory}
              <button
                onClick={() => router.push(buildUrl({ category: null, page: 1 }))}
                className="ml-1 text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </span>
          )}
        </div>
      )}

      {/* Sermon List */}
      {initialData.length > 0 ? (
        <SermonList data={initialData} onItemClick={(id) => router.push(`/sermons/${id}`)} />
      ) : (
        <div className="py-16 text-center text-gray-500">
          {hasActiveFilters
            ? '검색 결과가 없습니다. 다른 검색어를 시도해보세요.'
            : '등록된 설교가 없습니다.'}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={buildUrl({ page: p })}
              className={`min-h-[44px] min-w-[44px] rounded-lg px-3 py-2 text-sm sm:px-4 ${
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
        총 {total}개의 설교
      </p>
    </div>
  );
}
