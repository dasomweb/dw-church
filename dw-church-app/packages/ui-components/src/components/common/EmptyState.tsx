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
      className={`dw-flex dw-flex-col dw-items-center dw-justify-center dw-rounded dw-border dw-border-dashed dw-border-border dw-bg-surface-alt dw-px-6 dw-py-12 dw-text-center ${className}`}
    >
      <p className="dw-text-lg dw-font-medium dw-text-text-primary">{title}</p>
      {description && (
        <p className="dw-mt-1 dw-text-sm dw-text-text-muted">{description}</p>
      )}
    </div>
  );
}
