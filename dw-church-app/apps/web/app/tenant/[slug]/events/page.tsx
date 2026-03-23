import { getEvents } from '@/lib/api';
import { EventGridClient } from './EventGridClient';

interface EventsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function EventsPage({ params, searchParams }: EventsPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const page = parseInt(search.page ?? '1', 10);

  const events = await getEvents(slug, { page, perPage: 12 });

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold font-heading">행사/이벤트</h1>
      <EventGridClient
        initialData={events.data ?? []}
        total={events.meta?.total ?? 0}
        totalPages={events.meta?.totalPages ?? 1}
        currentPage={page}
        slug={slug}
      />
    </div>
  );
}
