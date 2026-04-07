import { getSermons, getPageBySlug } from '@/lib/api';
import { BlockRenderer } from '@/components/BlockRenderer';
import { SermonListClient } from './SermonListClient';
import { buildTenantMetadata } from '@/lib/metadata';
import { variantToColumns } from '@/lib/page-props';
import type { Metadata } from 'next';

interface SermonsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; category?: string; search?: string }>;
}

export async function generateMetadata({ params }: SermonsPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTenantMetadata(slug, '설교');
}

export default async function SermonsPage({ params, searchParams }: SermonsPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const currentPage = parseInt(search.page ?? '1', 10);

  let page;
  try { page = await getPageBySlug(slug, 'sermons'); } catch { page = null; }
  const sections = page?.sections?.filter((s: any) => s.isVisible).sort((a: any, b: any) => a.sortOrder - b.sortOrder) ?? [];

  const sermons = await getSermons(slug, { page: currentPage, perPage: 12, category: search.category, search: search.search });

  return (
    <div>
      {sections.map((section: any) => {
        // Replace the content block with paginated version
        if (section.blockType === 'recent_sermons') {
          const variant = section.props?.variant || 'grid-4';
          const columns = variantToColumns(variant, 4);
          return (
            <section key={section.id} className="px-4 py-10 sm:px-6 sm:py-16" style={{ backgroundColor: 'var(--dw-surface)' }}>
              <div className="mx-auto max-w-7xl">
                {section.props?.title && <h2 className="mb-8 text-center text-3xl font-bold font-heading">{section.props.title}</h2>}
                <SermonListClient
                  initialData={sermons.data ?? []}
                  total={sermons.meta?.total ?? 0}
                  totalPages={sermons.meta?.totalPages ?? 1}
                  currentPage={currentPage}
                  slug={slug}
                  currentSearch={search.search}
                  currentCategory={search.category}
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
