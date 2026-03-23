export interface EmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function EmptyState({
  title = '데이터가 없습니다',
  description,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded border border-dashed border-border bg-surface-alt px-6 py-12 text-center ${className}`}
    >
      <p className="text-lg font-medium text-text-primary">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      )}
    </div>
  );
}
