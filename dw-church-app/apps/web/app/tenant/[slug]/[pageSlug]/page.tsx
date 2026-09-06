import { getPageBySlug, translateTexts } from '@/lib/api';
import { BlockRenderer } from '@/components/BlockRenderer';
import { getRequestLang, collectTranslatable, applyTranslations } from '@/lib/i18n';
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

  let sections = page.sections
    .filter((s: { isVisible: boolean }) => s.isVisible)
    .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder);

  const lang = await getRequestLang();
  if (lang === 'en') {
    const texts = collectTranslatable(sections);
    const map = await translateTexts(slug, texts, 'en');
    sections = applyTranslations(sections, map);
  }

  return (
    <div>
      {sections.map((section: { id: string }) => (
        <BlockRenderer key={section.id} section={section as never} slug={slug} page={currentPage} />
      ))}
    </div>
  );
}
