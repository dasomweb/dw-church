import { getSermons } from '@/lib/api';
import { SermonListClient } from './SermonListClient';
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

  const sermons = await getSermons(slug, { page, perPage: 12, category, search: searchQuery });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-8 text-3xl font-bold font-heading">설교</h1>
      <SermonListClient
        initialData={sermons.data ?? []}
        total={sermons.meta?.total ?? 0}
        totalPages={sermons.meta?.totalPages ?? 1}
        currentPage={page}
        slug={slug}
        currentSearch={searchQuery}
        currentCategory={category}
      />
    </div>
  );
}
