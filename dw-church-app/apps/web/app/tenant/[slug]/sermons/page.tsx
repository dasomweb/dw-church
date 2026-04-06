import { getSermons } from '@/lib/api';
import { getBlockProps, variantToColumns } from '@/lib/page-props';
import { SermonListClient } from './SermonListClient';
import { PageHeroBanner } from '@/components/PageHeroBanner';
import { buildTenantMetadata } from '@/lib/metadata';
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
  const page = parseInt(search.page ?? '1', 10);
  const category = search.category;
  const searchQuery = search.search;

  const [sermons, blockProps] = await Promise.all([
    getSermons(slug, { page, perPage: 12, category, search: searchQuery }),
    getBlockProps(slug, 'sermons', 'recent_sermons'),
  ]);

  const variant = (blockProps.variant as string) || 'grid-3';
  const columns = variantToColumns(variant, 3);

  return (
    <div>
      <PageHeroBanner tenantSlug={slug} pageSlug="sermons" fallbackTitle="설교" fallbackSubtitle="말씀을 통해 은혜를 나눕니다" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <SermonListClient
          initialData={sermons.data ?? []}
          total={sermons.meta?.total ?? 0}
          totalPages={sermons.meta?.totalPages ?? 1}
          currentPage={page}
          slug={slug}
          currentSearch={searchQuery}
          currentCategory={category}
          columns={columns}
        />
      </div>
    </div>
  );
}
