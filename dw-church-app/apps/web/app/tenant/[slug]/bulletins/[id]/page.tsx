import { getBulletin } from '@/lib/api';
import { SingleBulletinClient } from './SingleBulletinClient';
import { notFound } from 'next/navigation';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface BulletinDetailProps {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: BulletinDetailProps): Promise<Metadata> {
  const { slug, id } = await params;
  try {
    const bulletin = await getBulletin(slug, id);
    return buildTenantMetadata(slug, bulletin?.title ?? '주보');
  } catch {
    return buildTenantMetadata(slug, '주보');
  }
}

export default async function BulletinDetailPage({ params }: BulletinDetailProps) {
  const { slug, id } = await params;

  if (!id) {
    notFound();
  }

  let bulletin;
  try {
    bulletin = await getBulletin(slug, id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <SingleBulletinClient bulletin={bulletin} slug={slug} />
    </div>
  );
}
