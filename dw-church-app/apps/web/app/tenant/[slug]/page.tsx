import { getHomePage } from '@/lib/api';
import { BlockRenderer } from '@/components/BlockRenderer';

interface TenantHomeProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantHomePage({ params }: TenantHomeProps) {
  const { slug } = await params;

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
