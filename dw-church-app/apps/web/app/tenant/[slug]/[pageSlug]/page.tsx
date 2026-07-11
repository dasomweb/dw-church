import { getPageBySlug } from '@/lib/api';
import { BlockRenderer } from '@/components/BlockRenderer';
import { notFound } from 'next/navigation';

interface DynamicPageProps {
  params: Promise<{ slug: string; pageSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function DynamicPage({ params, searchParams }: DynamicPageProps) {
  const { slug, pageSlug } = await params;
  // ?page= drives pagination for any paginated data block on the page (video_board).
  const currentPage = Math.max(1, parseInt((await searchParams).page ?? '1', 10) || 1);

  let page;
  try {
    page = await getPageBySlug(slug, pageSlug);
  } catch {
    notFound();
  }

  return (
    <div>
      {page.sections
        .filter((s) => s.isVisible)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((section) => (
          <BlockRenderer key={section.id} section={section} slug={slug} page={currentPage} />
        ))}
    </div>
  );
}
