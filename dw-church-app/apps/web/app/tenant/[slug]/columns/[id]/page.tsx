import { getColumn, getDetailTemplate } from '@/lib/api';
import { SingleColumnClient } from './SingleColumnClient';
import { DetailTemplateRenderer } from '@/components/DetailTemplateRenderer';
import { notFound } from 'next/navigation';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface ColumnDetailProps {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: ColumnDetailProps): Promise<Metadata> {
  const { slug, id } = await params;
  try {
    const column = await getColumn(slug, id);
    return buildTenantMetadata(slug, column?.title ?? '목회칼럼');
  } catch {
    return buildTenantMetadata(slug, '목회칼럼');
  }
}

export default async function ColumnDetailPage({ params }: ColumnDetailProps) {
  const { slug, id } = await params;

  if (!id) {
    notFound();
  }

  let column;
  try {
    column = await getColumn(slug, id);
  } catch {
    notFound();
  }

  const template = await getDetailTemplate(slug, 'column_detail');
  if (template && template.length > 0) {
    return <DetailTemplateRenderer sections={template} slug={slug} item={column} />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <SingleColumnClient column={column} slug={slug} />
    </div>
  );
}
