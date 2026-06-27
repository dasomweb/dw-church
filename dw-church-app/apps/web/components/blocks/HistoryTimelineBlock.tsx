import { getHistory } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
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
      <DataSection props={props}>
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
          <p className="text-gray-400 text-sm">등록된 연혁이 없습니다.</p>
        </div>
      </DataSection>
    );
  }

  return (
    <DataSection props={props}>
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
        <HistoryTimelineBlockClient history={history} slug={slug} />
      </div>
    </DataSection>
  );
}
