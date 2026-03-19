export interface YoutubeEmbedProps {
  url: string;
  title?: string;
  className?: string;
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?\s/]+)/,
  );
  return match?.[1] ?? null;
}

export function YoutubeEmbed({ url, title = 'YouTube Video', className = '' }: YoutubeEmbedProps) {
  const videoId = extractYoutubeId(url);

  if (!videoId) return null;

  return (
    <div
      className={`dw-relative dw-w-full dw-overflow-hidden dw-rounded ${className}`}
      style={{ paddingBottom: '56.25%' }}
    >
      <iframe
        className="dw-absolute dw-inset-0 dw-h-full dw-w-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
