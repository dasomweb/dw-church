'use client';

import { HistoryTimeline } from '@dw-church/ui-components';
import type { History } from '@dw-church/api-client';

interface HistoryTimelineClientProps {
  history: History[];
}

export function HistoryTimelineClient({ history }: HistoryTimelineClientProps) {
  return <HistoryTimeline history={history} />;
}
