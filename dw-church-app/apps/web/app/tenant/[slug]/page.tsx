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
  } catch {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">교회를 찾을 수 없습니다</h1>
          <p className="text-gray-500">요청하신 교회 페이지가 존재하지 않습니다.</p>
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
