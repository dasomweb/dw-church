import { getSermon } from '@/lib/api';
import { SingleSermonClient } from './SingleSermonClient';
import { notFound } from 'next/navigation';

interface SermonDetailProps {
  params: Promise<{ slug: string; id: string }>;
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
    <div className="mx-auto max-w-4xl px-6 py-12">
      <SingleSermonClient sermon={sermon} slug={slug} />
    </div>
  );
}
