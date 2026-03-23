export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  buildHref?: (page: number) => string;
  className?: string;
}

/**
 * Build the list of page indicators to display.
 * Always shows first, last, current, and one neighbour on each side.
 * Gaps are represented by `null`.
 */
function getPageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push(null); // ellipsis
    }
    result.push(sorted[i]);
  }

  return result;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  buildHref,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);
  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;

  const baseBtn =
    'dw-inline-flex dw-items-center dw-justify-center dw-min-w-[2rem] dw-h-8 dw-rounded dw-text-sm dw-font-medium dw-transition-colors';
  const activeClass = 'dw-bg-primary dw-text-on-primary';
  const inactiveClass =
    'dw-text-text-primary hover:dw-bg-surface-alt';
  const disabledClass = 'dw-text-text-muted dw-pointer-events-none dw-opacity-50';

  function renderItem(
    label: React.ReactNode,
    page: number,
    opts?: { disabled?: boolean; ariaCurrent?: boolean; ariaLabel?: string },
  ) {
    const { disabled, ariaCurrent, ariaLabel } = opts ?? {};
    const cls = `${baseBtn} ${ariaCurrent ? activeClass : disabled ? disabledClass : inactiveClass}`;

    if (buildHref && !disabled) {
      return (
        <a
          key={ariaLabel ?? String(page)}
          href={buildHref(page)}
          className={cls}
          aria-current={ariaCurrent ? 'page' : undefined}
          aria-label={ariaLabel}
        >
          {label}
        </a>
      );
    }

    return (
      <button
        key={ariaLabel ?? String(page)}
        type="button"
        className={cls}
        disabled={disabled}
        aria-current={ariaCurrent ? 'page' : undefined}
        aria-label={ariaLabel}
        onClick={() => !disabled && onPageChange?.(page)}
      >
        {label}
      </button>
    );
  }

  return (
    <nav
      aria-label="페이지 탐색"
      className={`dw-flex dw-items-center dw-justify-center dw-gap-1 ${className}`}
    >
      {/* First */}
      {renderItem(
        <span aria-hidden="true">&laquo;</span>,
        1,
        { disabled: isFirst, ariaLabel: '첫 페이지' },
      )}

      {/* Previous */}
      {renderItem(
        <span aria-hidden="true">&lsaquo;</span>,
        currentPage - 1,
        { disabled: isFirst, ariaLabel: '이전 페이지' },
      )}

      {/* Page numbers */}
      {pages.map((p, idx) =>
        p === null ? (
          <span
            key={`ellipsis-${idx}`}
            className="dw-inline-flex dw-items-center dw-justify-center dw-min-w-[2rem] dw-h-8 dw-text-sm dw-text-text-muted"
            aria-hidden="true"
          >
            &hellip;
          </span>
        ) : (
          renderItem(p, p, {
            ariaCurrent: p === currentPage,
            ariaLabel: `${p} 페이지`,
          })
        ),
      )}

      {/* Next */}
      {renderItem(
        <span aria-hidden="true">&rsaquo;</span>,
        currentPage + 1,
        { disabled: isLast, ariaLabel: '다음 페이지' },
      )}

      {/* Last */}
      {renderItem(
        <span aria-hidden="true">&raquo;</span>,
        totalPages,
        { disabled: isLast, ariaLabel: '마지막 페이지' },
      )}
    </nav>
  );
}
