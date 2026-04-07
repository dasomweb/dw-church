import { getColumns, getPageBySlug } from '@/lib/api';
import { BlockRenderer } from '@/components/BlockRenderer';
import { ColumnListClient } from './ColumnListClient';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface ColumnsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: ColumnsPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTenantMetadata(slug, '목회칼럼');
}

export default async function ColumnsPage({ params, searchParams }: ColumnsPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const currentPage = parseInt(search.page ?? '1', 10);

  let page;
  try { page = await getPageBySlug(slug, 'columns'); } catch { page = null; }
  const sections = page?.sections?.filter((s: any) => s.isVisible).sort((a: any, b: any) => a.sortOrder - b.sortOrder) ?? [];

  const columns = await getColumns(slug, { page: currentPage, perPage: 12 });

  return (
    <div>
      {sections.map((section: any) => {
        if (section.blockType === 'text_only' || section.blockType === 'recent_columns') {
          return (
            <section key={section.id} className="px-4 py-10 sm:px-6 sm:py-16">
              <div className="mx-auto max-w-7xl">
                {section.props?.title && <h2 className="mb-8 text-center text-3xl font-bold font-heading">{section.props.title}</h2>}
                <ColumnListClient
                  initialData={columns.data ?? []}
                  total={columns.meta?.total ?? 0}
                  totalPages={columns.meta?.totalPages ?? 1}
                  currentPage={currentPage}
                  slug={slug}
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
