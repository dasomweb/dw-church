import { getBulletins, getPageBySlug } from '@/lib/api';
import { BlockRenderer } from '@/components/BlockRenderer';
import { BulletinListClient } from './BulletinListClient';
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
  const currentPage = parseInt(search.page ?? '1', 10);

  let page;
  try { page = await getPageBySlug(slug, 'bulletins'); } catch { page = null; }
  const sections = page?.sections?.filter((s: any) => s.isVisible).sort((a: any, b: any) => a.sortOrder - b.sortOrder) ?? [];

  // Respect the block's "표시 개수" (limit) as page size; fall back to 12.
  const perPage = Number(sections.find((s: any) => s.blockType === 'recent_bulletins')?.props?.limit) || 12;
  const bulletins = await getBulletins(slug, { page: currentPage, perPage });

  return (
    <div>
      {sections.map((section: any) => {
        if (section.blockType === 'recent_bulletins') {
          const variant = section.props?.variant || 'list';
          const columns = variant === 'list' ? 1 : (parseInt(variant.replace('grid-', '')) || 3);
          return (
            <section key={section.id} className="px-4 py-10 sm:px-6 sm:py-16">
              <div className="mx-auto max-w-7xl">
                {section.props?.title && <h2 className="mb-8 text-center text-3xl font-bold font-heading">{section.props.title}</h2>}
                <BulletinListClient
                  initialData={bulletins.data ?? []}
                  total={bulletins.meta?.total ?? 0}
                  totalPages={bulletins.meta?.totalPages ?? 1}
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
