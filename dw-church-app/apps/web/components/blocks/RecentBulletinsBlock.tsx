import { getBulletins } from '@/lib/api';
import { RecentBulletinsClient } from './RecentBulletinsClient';

interface RecentBulletinsBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export async function RecentBulletinsBlock({ props, slug }: RecentBulletinsBlockProps) {
  const limit = (props.limit as number) ?? 4;

  let bulletins;
  try {
    const result = await getBulletins(slug, { perPage: limit });
    bulletins = result.data;
  } catch {
    bulletins = [];
  }

  if (bulletins.length === 0) return null;

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">최근 주보</h2>
        <RecentBulletinsClient bulletins={bulletins} slug={slug} />
      </div>
    </section>
  );
}
