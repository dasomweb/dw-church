import { getPageBySlug } from '@/lib/api';
import { BlockRenderer } from '@/components/BlockRenderer';
import { notFound } from 'next/navigation';

interface DynamicPageProps {
  params: Promise<{ slug: string; pageSlug: string }>;
}

export default async function DynamicPage({ params }: DynamicPageProps) {
  const { slug, pageSlug } = await params;

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
          <BlockRenderer key={section.id} section={section} slug={slug} />
        ))}
    </div>
  );
}
