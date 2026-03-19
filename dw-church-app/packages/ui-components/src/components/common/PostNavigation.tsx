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
    <nav className={`dw-flex dw-items-center dw-justify-between dw-gap-4 dw-border-t dw-border-border dw-pt-6 ${className}`}>
      {previousPost ? (
        <a
          href={`${baseUrl}/${previousPost.id}`}
          onClick={handleClick(previousPost.id)}
          className="dw-group dw-flex dw-flex-1 dw-flex-col dw-items-start dw-gap-1 dw-text-left"
        >
          <span className="dw-text-xs dw-text-text-muted">&larr; 이전</span>
          <span className="dw-text-sm dw-font-medium dw-text-text-primary group-hover:dw-text-primary dw-line-clamp-1">
            {previousPost.title}
          </span>
        </a>
      ) : (
        <div className="dw-flex-1" />
      )}
      {nextPost ? (
        <a
          href={`${baseUrl}/${nextPost.id}`}
          onClick={handleClick(nextPost.id)}
          className="dw-group dw-flex dw-flex-1 dw-flex-col dw-items-end dw-gap-1 dw-text-right"
        >
          <span className="dw-text-xs dw-text-text-muted">다음 &rarr;</span>
          <span className="dw-text-sm dw-font-medium dw-text-text-primary group-hover:dw-text-primary dw-line-clamp-1">
            {nextPost.title}
          </span>
        </a>
      ) : (
        <div className="dw-flex-1" />
      )}
    </nav>
  );
}
