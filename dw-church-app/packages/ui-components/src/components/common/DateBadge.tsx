export interface DateBadgeProps {
  date: string;
  format?: 'short' | 'long' | 'year-month';
  className?: string;
}

function formatDate(dateStr: string, format: 'short' | 'long' | 'year-month'): string {
  // Content dates are stored as UTC-midnight ISO strings (e.g.
  // "2023-07-09T00:00:00.000Z"). Parse the YYYY-MM-DD prefix directly instead of
  // new Date(...).getDate() — in a negative-offset (US) timezone the latter would
  // shift the day back by one. Fall back to Date parsing only for non-ISO input.
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let y: number, mo: number, d: number;
  if (m) {
    y = Number(m[1]); mo = Number(m[2]); d = Number(m[3]);
  } else {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    y = date.getFullYear(); mo = date.getMonth() + 1; d = date.getDate();
  }

  switch (format) {
    case 'short':
      return `${y}.${mo}.${d}`;
    case 'long':
      return `${y}년 ${mo}월 ${d}일`;
    case 'year-month':
      return `${y}년 ${mo}월`;
    default:
      return dateStr;
  }
}

export function DateBadge({ date, format = 'short', className = '' }: DateBadgeProps) {
  return (
    <span
      className={`inline-block rounded bg-surface-alt px-2 py-0.5 text-xs font-medium text-text-secondary ${className}`}
    >
      {formatDate(date, format)}
    </span>
  );
}
