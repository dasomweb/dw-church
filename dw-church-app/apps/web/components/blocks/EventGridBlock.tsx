import { getEvents } from '@/lib/api';
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

  if (events.length === 0) return null;

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">{title}</h2>
        <EventGridBlockClient events={events} slug={slug} columns={columns} />
      </div>
    </section>
  );
}
