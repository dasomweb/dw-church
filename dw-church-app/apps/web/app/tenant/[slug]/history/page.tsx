import { getHistory } from '@/lib/api';
import { HistoryTimelineClient } from './HistoryTimelineClient';

interface HistoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { slug } = await params;
  const history = await getHistory(slug);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold font-heading">교회 연혁</h1>
      <HistoryTimelineClient history={history} />
    </div>
  );
}
