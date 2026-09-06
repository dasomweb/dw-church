import { getHomePage, translateTexts } from '@/lib/api';
import { BlockRenderer } from '@/components/BlockRenderer';
import { buildTenantMetadata } from '@/lib/metadata';
import { getRequestLang, collectTranslatable, applyTranslations } from '@/lib/i18n';
import type { Metadata } from 'next';

interface TenantHomeProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: TenantHomeProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTenantMetadata(slug);
}

export default async function TenantHomePage({ params, searchParams }: TenantHomeProps) {
  const { slug } = await params;
  // ?page= drives pagination for any paginated data block (e.g. video_board).
  const currentPage = Math.max(1, parseInt((await searchParams).page ?? '1', 10) || 1);

  let page;
  try {
    page = await getHomePage(slug);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">페이지를 불러올 수 없습니다</h1>
          <p className="text-gray-500">잠시 후 다시 시도해주세요.</p>
          <p className="text-xs text-gray-400 mt-2">{message}</p>
        </div>
      </div>
    );
  }

  let sections = page.sections
    .filter((s: { isVisible: boolean }) => s.isVisible)
    .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder);

  // 영어 토글 시 정적 블록 텍스트를 자동번역(캐시 우선). 기본 ko 는 무변경.
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
