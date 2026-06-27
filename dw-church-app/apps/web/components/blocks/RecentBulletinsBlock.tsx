import { getBulletins } from '@/lib/api';
import { getElementStyle } from '@/lib/element-style';
import { DataSection } from './DataSection';
import { RecentBulletinsClient } from './RecentBulletinsClient';

interface RecentBulletinsBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function RecentBulletinsBlock({ props, slug }: RecentBulletinsBlockProps) {
  const limit = (props.limit as number) ?? 4;
  const title = (props.title as string) || '최근 주보';
  const variant = (props.variant as string) || 'list';
  const columns = variant === 'list' ? 1 : (parseInt(variant.replace('grid-', '')) || 3);

  let bulletins;
  try {
    const result = await getBulletins(slug, { perPage: limit });
    bulletins = Array.isArray(result) ? result : (result?.data ?? []);
  } catch {
    bulletins = [];
  }

  if (bulletins.length === 0) {
    return (
      <DataSection props={props}>
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="mb-4 text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
          <p className="text-gray-400 text-sm">등록된 주보가 없습니다.</p>
        </div>
      </DataSection>
    );
  }

  return (
    <DataSection props={props}>
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-2xl sm:text-3xl font-bold font-heading" style={getElementStyle(props, 'title')}>{title}</h2>
        <RecentBulletinsClient bulletins={bulletins} slug={slug} columns={columns} />
      </div>
    </DataSection>
  );
}
