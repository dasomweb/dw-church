export interface PostNavigationProps {
  previousPost?: { id: number; title: string };
  nextPost?: { id: number; title: string };
  onNavigate?: (id: number) => void;
  baseUrl?: string;
  className?: string;
}

export function PostNavigation({
  previousPost,
  nextPost,
  onNavigate,
  baseUrl = '',
  className = '',
}: PostNavigationProps) {
  if (!previousPost && !nextPost) return null;

  const handleClick = (id: number) => (e: React.MouseEvent) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(id);
    }
  };

  return (
    <nav className={`flex items-center justify-between gap-4 border-t border-border pt-6 ${className}`}>
      {previousPost ? (
        <a
          href={`${baseUrl}/${previousPost.id}`}
          onClick={handleClick(previousPost.id)}
          className="group flex flex-1 flex-col items-start gap-1 text-left"
        >
          <span className="text-xs text-text-muted">&larr; 이전</span>
          <span className="text-sm font-medium text-text-primary group-hover:text-primary line-clamp-1">
            {previousPost.title}
          </span>
        </a>
      ) : (
        <div className="flex-1" />
      )}
      {nextPost ? (
        <a
          href={`${baseUrl}/${nextPost.id}`}
          onClick={handleClick(nextPost.id)}
          className="group flex flex-1 flex-col items-end gap-1 text-right"
        >
          <span className="text-xs text-text-muted">다음 &rarr;</span>
          <span className="text-sm font-medium text-text-primary group-hover:text-primary line-clamp-1">
            {nextPost.title}
          </span>
        </a>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}
