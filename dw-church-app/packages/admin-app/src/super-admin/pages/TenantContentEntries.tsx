// Tenant content entries — super-admin > 콘텐츠. Manages the reusable CONTENT
// layer (content_entries) separated from page DESIGN. List, rename, delete.
// Per-field content editing happens in the page editor inspector when a block
// is linked to an entry; this page is the library/overview.
import { useCallback, useEffect, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';
import { useToast } from '../../components';

interface EntryRow {
  id: string;
  type: string;
  name: string;
  data?: Record<string, unknown>;
  updatedAt?: string;
}

export default function TenantContentEntries() {
  const client = useDWChurchClient();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const res = await client.adapter.get<{ data: EntryRow[] }>('/api/v1/content-entries');
      setEntries(res?.data ?? []);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '콘텐츠 항목을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [client, showToast]);

  useEffect(() => { void load(); }, [load]);

  const rename = async (entry: EntryRow) => {
    if (!client) return;
    const name = window.prompt('항목 이름', entry.name);
    if (!name || name === entry.name) return;
    try {
      await client.adapter.put(`/api/v1/content-entries/${entry.id}`, { name });
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, name } : e)));
      showToast('success', '이름 변경됨');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '변경 실패');
    }
  };

  const remove = async (entry: EntryRow) => {
    if (!client) return;
    if (!window.confirm(`"${entry.name}" 항목을 삭제할까요? 이 항목을 참조하는 블록은 다시 직접 입력 상태가 됩니다.`)) return;
    try {
      await client.adapter.delete(`/api/v1/content-entries/${entry.id}`);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      showToast('success', '삭제됨');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '삭제 실패');
    }
  };

  // Group by type for a tidy overview.
  const byType = entries.reduce<Record<string, EntryRow[]>>((acc, e) => {
    (acc[e.type] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">콘텐츠 항목</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          여러 페이지에서 재사용할 수 있는 콘텐츠입니다. 디자인(블록 스타일)과 분리되어 있어, 한 곳에서 내용을 고치면 연결된 모든 블록에 반영됩니다.
          새 항목은 페이지 빌더의 블록 인스펙터 → "재사용 콘텐츠"에서 만듭니다.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-500">불러오는 중…</div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-400">
          아직 콘텐츠 항목이 없습니다. 페이지 빌더에서 블록을 선택하고 "현재 내용을 항목으로 저장"을 눌러 만드세요.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byType).map(([type, rows]) => (
            <div key={type}>
              <h2 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-gray-400">{type}</h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {rows.map((e, i) => (
                  <div key={e.id} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900">{e.name}</div>
                      <div className="text-[10px] text-gray-400">필드 {Object.keys(e.data ?? {}).length}개</div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button type="button" onClick={() => rename(e)}
                        className="rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50">이름 변경</button>
                      <button type="button" onClick={() => remove(e)}
                        className="rounded border border-gray-300 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
