import { getVideos } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';

interface VideoBoardBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

// youtubeUrl → embed id. Mirrors @dw-church/ui-components YoutubeEmbed, inlined
// here so this async Server Component doesn't import the ui-components barrel
// (which pulls in client-only React Query hooks → "use client" build error).
function extractYoutubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?\s/]+)/);
  return match?.[1] ?? null;
}

function VideoEmbed({ url, title }: { url: string; title: string }) {
  const videoId = extractYoutubeId(url);
  if (!videoId) return null;
  return (
    <div className="relative w-full overflow-hidden" style={{ paddingBottom: '56.25%' }}>
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

export async function VideoBoardBlock({ props, slug }: VideoBoardBlockProps) {
  const limit = (props.limit as number) ?? 6;
  const title = (props.title as string) || '영상';
  const category = (props.category as string) || '';
  const variant = (props.variant as string) || 'grid-2';
  // grid-1 → single column (large); grid-2 → 1 col mobile / 2 col desktop.
  const columns = variant === 'grid-1' ? 1 : 2;

  let data: any[] = [];
  try {
    const result = await getVideos(slug, { perPage: limit, category });
    data = Array.isArray(result) ? result : (result?.data ?? []);
  } catch {
    data = [];
  }

  if (data.length === 0) {
    return (
      <DataSection props={props}>
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
          <p className="text-gray-400 text-sm">등록된 영상이 없습니다.</p>
        </div>
      </DataSection>
    );
  }

  const gridClass = columns === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2';

  return (
    <DataSection props={props} defaultBg="var(--dw-background)">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
        <div className={`grid ${gridClass} gap-8`}>
          {data.map((video: any) => {
            const videoTitle = video.title ?? '';
            const youtubeUrl = video.youtubeUrl ?? video.youtube_url ?? '';
            const date = video.videoDate ?? video.video_date ?? video.createdAt ?? video.created_at ?? '';
            const categoryName = video.categoryName ?? video.category_name ?? '';
            const id = video.id ?? '';

            return (
              <div key={id} className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
                <VideoEmbed url={youtubeUrl} title={videoTitle} />
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold font-heading text-base leading-snug line-clamp-2">{videoTitle}</h3>
                  <div className="mt-3 pt-3 border-t border-black/[0.05] flex items-center justify-between text-xs text-gray-400">
                    {date ? <span>{formatDate(date)}</span> : <span />}
                    {categoryName && <span className="text-[var(--dw-primary)]">{categoryName}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DataSection>
  );
}
