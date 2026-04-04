import { getHistory } from '@/lib/api';
import { HistoryTimelineBlockClient } from './HistoryTimelineBlockClient';

interface HistoryTimelineBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function HistoryTimelineBlock({ slug }: HistoryTimelineBlockProps) {
  let history;
  try {
    history = await getHistory(slug);
  } catch {
    history = [];
  }

  if (history.length === 0) return null;

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">교회 연혁</h2>
        <HistoryTimelineBlockClient history={history} slug={slug} />
      </div>
    </section>
  );
}
