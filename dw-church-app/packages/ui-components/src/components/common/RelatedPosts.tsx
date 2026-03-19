import type { ReactNode } from 'react';

export interface RelatedPostsProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function RelatedPosts({
  title = '관련 게시물',
  children,
  className = '',
}: RelatedPostsProps) {
  return (
    <section className={`dw-mt-12 ${className}`}>
      <h3 className="dw-mb-6 dw-text-lg dw-font-semibold dw-text-text-primary">{title}</h3>
      <div className="dw-grid dw-grid-cols-1 dw-gap-4 sm:dw-grid-cols-2 lg:dw-grid-cols-4">
        {children}
      </div>
    </section>
  );
}
