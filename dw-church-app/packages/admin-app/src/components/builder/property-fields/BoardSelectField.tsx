import { useEffect, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';

interface Board { id: string; title: string; slug: string }

/**
 * Dynamic board dropdown for the board block. Lists the tenant's registered
 * boards (from /api/v1/boards) so the operator picks instead of typing a slug.
 * Stores the board slug; empty = none selected.
 *
 * Fetches directly through the client (not a React-Query hook): under the
 * super-admin builder a hook's static query key can hold a stale/empty cache
 * from before the tenant slug was set. A fresh fetch on mount always uses the
 * current X-Tenant-Slug header.
 */
export function BoardSelectField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const client = useDWChurchClient();
  const [boards, setBoards] = useState<Board[]>([]);

  useEffect(() => {
    if (!client) return;
    let alive = true;
    (async () => {
      try {
        const res = await client.adapter.get<{ data: Board[] }>('/api/v1/boards');
        if (alive) setBoards(res?.data ?? []);
      } catch { /* leave empty */ }
    })();
    return () => { alive = false; };
  }, [client]);

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none bg-white"
    >
      <option value="">선택…</option>
      {boards.map((b) => (
        <option key={b.id} value={b.slug}>{b.title}</option>
      ))}
    </select>
  );
}
