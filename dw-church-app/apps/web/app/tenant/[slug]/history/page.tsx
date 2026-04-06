import { getHistory } from '@/lib/api';
import { HistoryTimelineClient } from './HistoryTimelineClient';
import { PageHeroBanner } from '@/components/PageHeroBanner';
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
    <div>
      <PageHeroBanner tenantSlug={slug} pageSlug="history" fallbackTitle="교회 연혁" fallbackSubtitle="교회의 발자취를 돌아봅니다" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <HistoryTimelineClient history={history} />
      </div>
    </div>
  );
}
