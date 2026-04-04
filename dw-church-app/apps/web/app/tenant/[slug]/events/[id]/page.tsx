import { getEvent } from '@/lib/api';
import { SingleEventClient } from './SingleEventClient';
import { notFound } from 'next/navigation';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface EventDetailProps {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: EventDetailProps): Promise<Metadata> {
  const { slug, id } = await params;
  try {
    const event = await getEvent(slug, id);
    return buildTenantMetadata(slug, event?.title ?? '행사');
  } catch {
    return buildTenantMetadata(slug, '행사');
  }
}

export default async function EventDetailPage({ params }: EventDetailProps) {
  const { slug, id } = await params;

  if (!id) {
    notFound();
  }

  let event;
  try {
    event = await getEvent(slug, id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <SingleEventClient event={event} slug={slug} />
    </div>
  );
}
