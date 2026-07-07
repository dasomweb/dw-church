/**
 * Compact, windowed pagination for tenant list pages.
 *
 * Renders a small window of page numbers around the current page plus the
 * first/last page with "…" gaps and prev/next arrows — so the control never
 * grows into a long strip of numbers when there are many pages (e.g. 31 pages
 * of sermons renders as `‹ 1 … 14 15 16 … 31 ›`, not 1..31).
 *
 * hrefForPage lets each caller build its own URL (some pages preserve
 * search/category query params via a buildUrl helper, others are static).
 */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}

// Which page numbers to show: always 1 + last, plus current ±1, with 'gap'
// markers inserted wherever the sequence skips. Keeps the visible set to ~5.
function buildItems(current: number, total: number): (number | 'gap')[] {
  const shown = new Set<number>();
  shown.add(1);
  shown.add(total);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) shown.add(p);
  }
  const sorted = [...shown].sort((a, b) => a - b);
  const items: (number | 'gap')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) items.push('gap');
    items.push(p);
    prev = p;
  }
  return items;
}

const cellBase =
  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 py-2 text-sm sm:px-4';

export function Pagination({ currentPage, totalPages, hrefForPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = buildItems(currentPage, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="페이지 이동">
      {/* Prev arrow */}
      {hasPrev ? (
        <a href={hrefForPage(currentPage - 1)} className={`${cellBase} bg-gray-100 text-gray-700 hover:bg-gray-200`} aria-label="이전 페이지">
          ‹
        </a>
      ) : (
        <span className={`${cellBase} bg-gray-50 text-gray-300`} aria-hidden="true">‹</span>
      )}

      {items.map((item, i) =>
        item === 'gap' ? (
          <span key={`gap-${i}`} className="inline-flex min-h-[44px] items-center justify-center px-1 text-sm text-gray-400" aria-hidden="true">
            …
          </span>
        ) : (
          <a
            key={item}
            href={hrefForPage(item)}
            aria-current={item === currentPage ? 'page' : undefined}
            className={`${cellBase} ${
              item === currentPage
                ? 'bg-[var(--dw-primary)] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {item}
          </a>
        ),
      )}

      {/* Next arrow */}
      {hasNext ? (
        <a href={hrefForPage(currentPage + 1)} className={`${cellBase} bg-gray-100 text-gray-700 hover:bg-gray-200`} aria-label="다음 페이지">
          ›
        </a>
      ) : (
        <span className={`${cellBase} bg-gray-50 text-gray-300`} aria-hidden="true">›</span>
      )}
    </nav>
  );
}
