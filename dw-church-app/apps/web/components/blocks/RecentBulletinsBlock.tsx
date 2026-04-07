import { getBulletins } from '@/lib/api';
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

  if (bulletins.length === 0) return null;

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">{title}</h2>
        <RecentBulletinsClient bulletins={bulletins} slug={slug} columns={columns} />
      </div>
    </section>
  );
}
