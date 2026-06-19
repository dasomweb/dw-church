import { getEvents } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
import { EventGridBlockClient } from './EventGridBlockClient';

interface EventGridBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function EventGridBlock({ props, slug }: EventGridBlockProps) {
  const limit = (props.limit as number) ?? 6;
  const title = (props.title as string) || '행사/이벤트';
  const variant = (props.variant as string) || 'cards-3';
  const columns = variant === 'cards-2' ? 2 : 3;

  let events;
  try {
    const result = await getEvents(slug, { perPage: limit });
    events = Array.isArray(result) ? result : (result?.data ?? []);
  } catch {
    events = [];
  }

  if (events.length === 0) {
    return (
      <DataSection props={props} defaultBg="var(--dw-surface)">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
          <p className="text-gray-400 text-sm">등록된 행사가 없습니다.</p>
        </div>
      </DataSection>
    );
  }

  return (
    <DataSection props={props} defaultBg="var(--dw-surface)">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
        <EventGridBlockClient events={events} slug={slug} columns={columns} />
      </div>
    </DataSection>
  );
}
