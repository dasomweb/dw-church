import { getBulletins } from '@/lib/api';
import { BulletinListClient } from './BulletinListClient';

interface BulletinsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function BulletinsPage({ params, searchParams }: BulletinsPageProps) {
  const { slug } = await params;
  const search = await searchParams;
  const page = parseInt(search.page ?? '1', 10);

  const bulletins = await getBulletins(slug, { page, perPage: 12 });

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold font-heading">주보</h1>
      <BulletinListClient
        initialData={bulletins.data}
        total={bulletins.total}
        totalPages={bulletins.totalPages}
        currentPage={page}
        slug={slug}
      />
    </div>
  );
}
