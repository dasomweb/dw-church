'use client';

import { HistoryTimeline } from '@dw-church/ui-components';
import type { History } from '@dw-church/api-client';

interface HistoryTimelineClientProps {
  history: History[];
  variant?: string;
}

export function HistoryTimelineClient({ history, variant = 'left' }: HistoryTimelineClientProps) {
  return <HistoryTimeline data={history} />;
}
