import { getAlbums, getPageBySlug } from '@/lib/api';
import { BlockRenderer } from '@/components/BlockRenderer';
import { AlbumGalleryClient } from './AlbumGalleryClient';
import { buildTenantMetadata } from '@/lib/metadata';
import { variantToColumns } from '@/lib/page-props';
import type { Metadata } from 'next';

interface AlbumsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: AlbumsPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTenantMetadata(slug, '앨범');
}

export default async function AlbumsPage({ params, searchParams }: AlbumsPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const currentPage = parseInt(search.page ?? '1', 10);

  let page;
  try { page = await getPageBySlug(slug, 'albums'); } catch { page = null; }
  const sections = page?.sections?.filter((s: any) => s.isVisible).sort((a: any, b: any) => a.sortOrder - b.sortOrder) ?? [];

  const albums = await getAlbums(slug, { page: currentPage, perPage: 12 });

  return (
    <div>
      {sections.map((section: any) => {
        if (section.blockType === 'album_gallery') {
          const variant = section.props?.variant || 'grid-3';
          const columns = variantToColumns(variant, 3);
          return (
            <section key={section.id} className="px-4 py-10 sm:px-6 sm:py-16">
              <div className="mx-auto max-w-7xl">
                {section.props?.title && <h2 className="mb-8 text-center text-3xl font-bold font-heading">{section.props.title}</h2>}
                <AlbumGalleryClient
                  initialData={albums.data ?? []}
                  total={albums.meta?.total ?? 0}
                  totalPages={albums.meta?.totalPages ?? 1}
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
