import { getSermon } from '@/lib/api';
import { SingleSermonClient } from './SingleSermonClient';
import { notFound } from 'next/navigation';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface SermonDetailProps {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: SermonDetailProps): Promise<Metadata> {
  const { slug, id } = await params;
  try {
    const sermon = await getSermon(slug, id);
    return buildTenantMetadata(slug, sermon?.title ?? '설교');
  } catch {
    return buildTenantMetadata(slug, '설교');
  }
}

export default async function SermonDetailPage({ params }: SermonDetailProps) {
  const { slug, id } = await params;

  if (!id) {
    notFound();
  }

  let sermon;
  try {
    sermon = await getSermon(slug, id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <SingleSermonClient sermon={sermon} slug={slug} />
    </div>
  );
}
