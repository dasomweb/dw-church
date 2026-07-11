import { getVideos } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
import { Pagination } from '../Pagination';

interface VideoBoardBlockProps {
  props: Record<string, unknown>;
  slug: string;
  /** Current page (from ?page=), threaded through BlockRenderer. */
  page?: number;
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

// A clickable thumbnail (NOT an inline player) — the church asked that videos
// not play directly on the page. Clicking opens the video on YouTube in a new
// tab. Poster uses the stored thumbnail, falling back to YouTube's own image.
function VideoThumbLink({ url, title, thumbnailUrl }: { url: string; title: string; thumbnailUrl?: string }) {
  const videoId = extractYoutubeId(url);
  if (!videoId) return null;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const poster = thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return (
    <a
      href={watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${title} — YouTube에서 보기`}
      className="group relative block w-full overflow-hidden"
      style={{ paddingBottom: '56.25%' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt={title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 transition-transform group-hover:scale-110">
          <svg className="h-6 w-6 translate-x-[1px] text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </span>
    </a>
  );
}

export async function VideoBoardBlock({ props, slug, page = 1 }: VideoBoardBlockProps) {
  const limit = (props.limit as number) ?? 6;
  const title = (props.title as string) || '영상';
  const category = (props.category as string) || '';
  const variant = (props.variant as string) || 'grid-2';
  // grid-1 (large) … grid-4 → columns per row. Always 1 col on mobile.
  const columns = variant === 'grid-1' ? 1 : variant === 'grid-3' ? 3 : variant === 'grid-4' ? 4 : 2;
  const currentPage = Math.max(1, page || 1);

  let data: any[] = [];
  let total = 0;
  try {
    const result = await getVideos(slug, { page: currentPage, perPage: limit, category });
    data = Array.isArray(result) ? result : (result?.data ?? []);
    total = Array.isArray(result) ? result.length : (result?.meta?.total ?? data.length);
  } catch {
    data = [];
  }
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (data.length === 0) {
    return (
      <DataSection props={props}>
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
          <p className="text-gray-400 text-sm">등록된 영상이 없습니다.</p>
        </div>
      </DataSection>
    );
  }

  // Static class strings (no interpolation) so Tailwind's content scan keeps them.
  const gridClass =
    columns === 1 ? 'grid-cols-1'
    : columns === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : columns === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
    : 'grid-cols-1 lg:grid-cols-2';

  return (
    <DataSection props={props} defaultBg="var(--dw-background)">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
        <div className={`grid ${gridClass} gap-8`}>
          {data.map((video: any) => {
            const videoTitle = video.title ?? '';
            const youtubeUrl = video.youtubeUrl ?? video.youtube_url ?? '';
            const date = video.videoDate ?? video.video_date ?? video.createdAt ?? video.created_at ?? '';
            const categoryName = video.categoryName ?? video.category_name ?? '';
            const thumbnailUrl = video.thumbnailUrl ?? video.thumbnail_url ?? '';
            const id = video.id ?? '';

            return (
              <div key={id} className="flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
                <VideoThumbLink url={youtubeUrl} title={videoTitle} thumbnailUrl={thumbnailUrl} />
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
        {/* Shared windowed pagination — same component as sermons/albums/etc. */}
        <Pagination currentPage={currentPage} totalPages={totalPages} hrefForPage={(p) => `?page=${p}`} />
      </div>
    </DataSection>
  );
}
