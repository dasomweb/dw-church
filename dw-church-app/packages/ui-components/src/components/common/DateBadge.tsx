export interface DateBadgeProps {
  date: string;
  format?: 'short' | 'long' | 'year-month';
  className?: string;
}

function formatDate(dateStr: string, format: 'short' | 'long' | 'year-month'): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  switch (format) {
    case 'short':
      return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
    case 'long':
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    case 'year-month':
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
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
