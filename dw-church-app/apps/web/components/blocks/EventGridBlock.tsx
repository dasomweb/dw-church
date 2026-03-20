import { getEvents } from '@/lib/api';
import { EventGridBlockClient } from './EventGridBlockClient';

interface EventGridBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function EventGridBlock({ props, slug }: EventGridBlockProps) {
  const limit = (props.limit as number) ?? 6;

  let events;
  try {
    const result = await getEvents(slug, { perPage: limit });
    events = result.data;
  } catch {
    events = [];
  }

  if (events.length === 0) return null;

  return (
    <section className="px-6 py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">행사/이벤트</h2>
        <EventGridBlockClient events={events} slug={slug} />
      </div>
    </section>
  );
}
