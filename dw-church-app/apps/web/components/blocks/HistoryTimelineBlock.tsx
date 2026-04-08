import { getHistory } from '@/lib/api';
import { HistoryTimelineBlockClient } from './HistoryTimelineBlockClient';

interface HistoryTimelineBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function HistoryTimelineBlock({ props, slug }: HistoryTimelineBlockProps) {
  const title = (props.title as string) || '교회 연혁';

  let history;
  try {
    history = await getHistory(slug);
  } catch {
    history = [];
  }

  if (history.length === 0) {
    return (
      <section className="px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-3xl font-bold font-heading">{title}</h2>
          <p className="text-gray-400 text-sm">등록된 연혁이 없습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">{title}</h2>
        <HistoryTimelineBlockClient history={history} slug={slug} />
      </div>
    </section>
  );
}
