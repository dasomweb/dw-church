import { getEvents } from '@/lib/api';
import { EventGridClient } from './EventGridClient';
import { PageHeroBanner } from '@/components/PageHeroBanner';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface EventsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: EventsPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTenantMetadata(slug, '행사');
}

export default async function EventsPage({ params, searchParams }: EventsPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const page = parseInt(search.page ?? '1', 10);

  const events = await getEvents(slug, { page, perPage: 12 });

  return (
    <div>
      <PageHeroBanner tenantSlug={slug} pageSlug="events" fallbackTitle="행사/이벤트" fallbackSubtitle="교회의 다양한 행사를 안내합니다" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <EventGridClient
          initialData={events.data ?? []}
          total={events.meta?.total ?? 0}
          totalPages={events.meta?.totalPages ?? 1}
          currentPage={page}
          slug={slug}
        />
      </div>
    </div>
  );
}
