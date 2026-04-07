import { getEvents, getPageBySlug } from '@/lib/api';
import { BlockRenderer } from '@/components/BlockRenderer';
import { EventGridClient } from './EventGridClient';
import { buildTenantMetadata } from '@/lib/metadata';
import { variantToColumns } from '@/lib/page-props';
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
  const currentPage = parseInt(search.page ?? '1', 10);

  let page;
  try { page = await getPageBySlug(slug, 'events'); } catch { page = null; }
  const sections = page?.sections?.filter((s: any) => s.isVisible).sort((a: any, b: any) => a.sortOrder - b.sortOrder) ?? [];

  const events = await getEvents(slug, { page: currentPage, perPage: 12 });

  return (
    <div>
      {sections.map((section: any) => {
        if (section.blockType === 'event_grid') {
          const variant = section.props?.variant || 'cards-3';
          const columns = variantToColumns(variant, 3);
          return (
            <section key={section.id} className="px-4 py-10 sm:px-6 sm:py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
              <div className="mx-auto max-w-7xl">
                {section.props?.title && <h2 className="mb-8 text-center text-3xl font-bold font-heading">{section.props.title}</h2>}
                <EventGridClient
                  initialData={events.data ?? []}
                  total={events.meta?.total ?? 0}
                  totalPages={events.meta?.totalPages ?? 1}
                  currentPage={currentPage}
                  slug={slug}
                  columns={columns}
                />
              </div>
            </section>
          );
        }
        return <BlockRenderer key={section.id} section={section} slug={slug} />;
      })}
    </div>
  );
}
