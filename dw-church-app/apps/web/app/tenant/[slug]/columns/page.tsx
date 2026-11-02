import { getColumns, getColumnCategories, getPageBySlug } from '@/lib/api';
import { BlockRenderer } from '@/components/BlockRenderer';
import { ColumnListClient } from './ColumnListClient';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface ColumnsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; category?: string }>;
}

export async function generateMetadata({ params }: ColumnsPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTenantMetadata(slug, '저널');
}

export default async function ColumnsPage({ params, searchParams }: ColumnsPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const currentPage = parseInt(search.page ?? '1', 10);
  const activeCategory = (search.category ?? '').trim() || undefined;

  let page;
  try { page = await getPageBySlug(slug, 'columns'); } catch { page = null; }
  const sections = page?.sections?.filter((s: any) => s.isVisible).sort((a: any, b: any) => a.sortOrder - b.sortOrder) ?? [];

  // Respect the recent_columns block's "표시 개수" (limit) as the page size —
  // operators set it expecting it to control how many show. Fall back to 12.
  const columnsBlock = sections.find((s: any) => s.blockType === 'recent_columns');
  const perPage = Number(columnsBlock?.props?.limit) || 12;
  // 블록에 카테고리가 고정돼 있으면 그 연재 전용 목록 페이지가 된다. 아니면
  // ?category= 로 방문자가 탭을 고른다.
  const pinnedCategory = ((columnsBlock?.props?.category as string) || '').trim() || undefined;
  const category = pinnedCategory ?? activeCategory;
  const [columns, categories] = await Promise.all([
    getColumns(slug, { page: currentPage, perPage, category }),
    // 블록이 카테고리를 고정했으면 탭을 띄우지 않는다(운영자가 정한 범위를 벗어난다).
    pinnedCategory ? Promise.resolve([]) : getColumnCategories(slug),
  ]);

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
                  categories={categories}
                  activeCategory={category}
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
