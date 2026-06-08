import { getSermon, getDetailTemplate } from '@/lib/api';
import { SingleSermonClient } from './SingleSermonClient';
import { DetailTemplateRenderer } from '@/components/DetailTemplateRenderer';
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

  // If the operator designed a 설교 상세 템플릿 (page kind=sermon_detail),
  // render it with this sermon's data bound in. Otherwise fall back to the
  // built-in fixed layout.
  const template = await getDetailTemplate(slug, 'sermon_detail');
  if (template && template.length > 0) {
    return <DetailTemplateRenderer sections={template} slug={slug} item={sermon} />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <SingleSermonClient sermon={sermon} slug={slug} />
    </div>
  );
}
