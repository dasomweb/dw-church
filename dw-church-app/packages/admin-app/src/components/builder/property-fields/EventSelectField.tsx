import { useEffect, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';

interface EventItem { id: string; title: string; eventDate?: string | null; department?: string | null }

/**
 * Dynamic event dropdown for the featured_event block (다가오는 행사). Lists
 * the tenant's registered events (from /api/v1/events) so the operator PICKS
 * one instead of typing an id. Stores the event id; empty = none selected
 * (the block then renders nothing on the storefront — [[featured_event]]).
 *
 * Fetches directly through the client (not a React-Query hook): under the
 * super-admin builder a hook's static query key can hold a stale/empty cache
 * from before the tenant slug was set. A fresh fetch on mount always uses the
 * current X-Tenant-Slug header (same reasoning as BoardSelectField).
 */
export function EventSelectField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const client = useDWChurchClient();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    let alive = true;
    (async () => {
      try {
        const res = await client.adapter.get<{ data: EventItem[] }>('/api/v1/events?perPage=100');
        if (alive) setEvents(res?.data ?? []);
      } catch { /* leave empty */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [client]);

  return (
    <div>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none bg-white"
      >
        <option value="">선택 안 함 (블록 숨김)</option>
        {events.map((ev) => {
          const d = ev.eventDate ? String(ev.eventDate).slice(0, 10) : '';
          const dept = ev.department ? ` · ${ev.department}` : '';
          return <option key={ev.id} value={ev.id}>{ev.title}{d ? ` (${d})` : ''}{dept}</option>;
        })}
      </select>
      {!loading && events.length === 0 && (
        <p className="mt-1 text-[11px] text-amber-600">등록된 행사가 없습니다. 먼저 [행사 관리]에서 행사를 등록하세요.</p>
      )}
    </div>
  );
}
