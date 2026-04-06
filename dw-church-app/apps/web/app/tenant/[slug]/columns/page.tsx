import { getColumns } from '@/lib/api';
import { ColumnListClient } from './ColumnListClient';
import { PageHeroBanner } from '@/components/PageHeroBanner';
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
  const page = parseInt(search.page ?? '1', 10);

  const columns = await getColumns(slug, { page, perPage: 12 });

  return (
    <div>
      <PageHeroBanner tenantSlug={slug} pageSlug="columns" fallbackTitle="목회칼럼" fallbackSubtitle="목사님의 글을 통해 은혜를 나눕니다" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <ColumnListClient
          initialData={columns.data ?? []}
          total={columns.meta?.total ?? 0}
          totalPages={columns.meta?.totalPages ?? 1}
          currentPage={page}
          slug={slug}
        />
      </div>
    </div>
  );
}
