import { getSermons } from '@/lib/api';
import { RecentSermonsClient } from './RecentSermonsClient';

interface RecentSermonsBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function RecentSermonsBlock({ props, slug }: RecentSermonsBlockProps) {
  const limit = (props.limit as number) ?? 6;

  let sermons;
  try {
    const result = await getSermons(slug, { perPage: limit });
    sermons = Array.isArray(result) ? result : (result?.data ?? []);
  } catch {
    sermons = [];
  }

  if (sermons.length === 0) return null;

  return (
    <section className="px-6 py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">최근 설교</h2>
        <RecentSermonsClient sermons={sermons} slug={slug} />
      </div>
    </section>
  );
}
