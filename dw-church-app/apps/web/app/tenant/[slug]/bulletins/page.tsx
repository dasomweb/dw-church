import { getBulletins } from '@/lib/api';
import { getBlockProps } from '@/lib/page-props';
import { BulletinListClient } from './BulletinListClient';
import { PageHeroBanner } from '@/components/PageHeroBanner';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface BulletinsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: BulletinsPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTenantMetadata(slug, '주보');
}

export default async function BulletinsPage({ params, searchParams }: BulletinsPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const page = parseInt(search.page ?? '1', 10);

  const [bulletins, blockProps] = await Promise.all([
    getBulletins(slug, { page, perPage: 12 }),
    getBlockProps(slug, 'bulletins', 'recent_bulletins'),
  ]);

  const variant = (blockProps.variant as string) || 'list';
  const columns = variant === 'list' ? 1 : (parseInt(variant.replace('grid-', '')) || 3);

  return (
    <div>
      <PageHeroBanner tenantSlug={slug} pageSlug="bulletins" fallbackTitle="주보" fallbackSubtitle="매주 교회 소식을 전합니다" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <BulletinListClient
          initialData={bulletins.data ?? []}
          total={bulletins.meta?.total ?? 0}
          totalPages={bulletins.meta?.totalPages ?? 1}
          currentPage={page}
          slug={slug}
          columns={columns}
        />
      </div>
    </div>
  );
}
