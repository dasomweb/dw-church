import { getSermons } from '@/lib/api';
import { RecentSermonsClient } from './RecentSermonsClient';

interface RecentSermonsBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function RecentSermonsBlock({ props, slug }: RecentSermonsBlockProps) {
  const limit = (props.limit as number) ?? 6;
  const title = (props.title as string) || '최근 설교';
  const variant = (props.variant as string) || 'grid-3';
  const columns = variant === 'grid-2' ? 2 : variant === 'list' ? 1 : variant === 'grid-4' ? 4 : 3;

  let sermons;
  try {
    const result = await getSermons(slug, { perPage: limit });
    sermons = Array.isArray(result) ? result : (result?.data ?? []);
  } catch {
    sermons = [];
  }

  if (sermons.length === 0) {
    return (
      <section className="px-4 py-10 sm:px-6 sm:py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-3xl font-bold font-heading">{title}</h2>
          <p className="text-gray-400 text-sm">등록된 설교가 없습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">{title}</h2>
        <RecentSermonsClient sermons={sermons} slug={slug} columns={columns} />
      </div>
    </section>
  );
}
