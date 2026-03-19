export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'dw-h-4 dw-w-4',
  md: 'dw-h-8 dw-w-8',
  lg: 'dw-h-12 dw-w-12',
} as const;

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`dw-flex dw-items-center dw-justify-center dw-p-4 ${className}`}>
      <div
        className={`${sizeClasses[size]} dw-animate-spin dw-rounded-full dw-border-2 dw-border-border dw-border-t-primary`}
        role="status"
        aria-label="Loading"
      >
        <span className="dw-sr-only">Loading...</span>
      </div>
    </div>
  );
}
