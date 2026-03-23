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
    <section className={`mt-12 ${className}`}>
      <h3 className="mb-6 text-lg font-semibold text-text-primary">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </section>
  );
}
