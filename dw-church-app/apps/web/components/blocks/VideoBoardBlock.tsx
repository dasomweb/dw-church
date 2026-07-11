import { getVideos } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
import { Pagination } from '../Pagination';
import VideoBoardClient, { type VideoItem } from './VideoBoardClient';

interface VideoBoardBlockProps {
  props: Record<string, unknown>;
  slug: string;
  /** Current page (from ?page=), threaded through BlockRenderer. */
  page?: number;
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

  const videos: VideoItem[] = data.map((video: any) => ({
    id: video.id ?? '',
    title: video.title ?? '',
    youtubeUrl: video.youtubeUrl ?? video.youtube_url ?? '',
    date: video.videoDate ?? video.video_date ?? video.createdAt ?? video.created_at ?? '',
    categoryName: video.categoryName ?? video.category_name ?? '',
  }));

  return (
    <DataSection props={props} defaultBg="var(--dw-background)">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
        {/* Cards + click-to-play modal live in the client half. */}
        <VideoBoardClient videos={videos} gridClass={gridClass} />
        {/* Shared windowed pagination — same component as sermons/albums/etc. */}
        <Pagination currentPage={currentPage} totalPages={totalPages} hrefForPage={(p) => `?page=${p}`} />
      </div>
    </DataSection>
  );
}
