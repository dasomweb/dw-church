import { getHistory } from '@/lib/api';
import { HistoryTimelineClient } from './HistoryTimelineClient';
import { buildTenantMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';

interface HistoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: HistoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTenantMetadata(slug, '연혁');
}

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { slug } = await params;
  const history = await getHistory(slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-8 text-3xl font-bold font-heading">교회 연혁</h1>
      <HistoryTimelineClient history={history} />
    </div>
  );
}
