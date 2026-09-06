import { useEffect, useState, useCallback } from 'react';
import { useDWChurchClient, type TranslationRow } from '@dw-church/api-client';
import { useToast, inputClass, CardSkeleton, EmptyState } from '../components';

/**
 * 영어 번역 보정 (관리자). 방문자가 홈에서 ENGLISH 를 켜면 문구가 자동
 * 번역되어 이 목록에 쌓인다. 여기서 어색한 번역을 직접 고치면(보정) 이후로는
 * 자동번역이 그 문구를 덮어쓰지 않는다([[project_homepage_dynamic_wiring]]).
 */
export default function TranslationManagement() {
  const client = useDWChurchClient();
  const { showToast } = useToast();
  const [rows, setRows] = useState<TranslationRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const data = await client.getTranslations('en');
      setRows(data);
    } catch { showToast('error', '불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, [client, showToast]);

  useEffect(() => { void load(); }, [load]);

  const save = async (source: string) => {
    if (!client) return;
    const text = drafts[source] ?? rows.find((r) => r.source === source)?.text ?? '';
    setSavingKey(source);
    try {
      await client.setTranslationOverride(source, 'en', text);
      showToast('success', '보정 저장됨');
      setRows((prev) => prev.map((r) => (r.source === source ? { ...r, text, isOverride: true } : r)));
      setDrafts((d) => { const n = { ...d }; delete n[source]; return n; });
    } catch { showToast('error', '저장 실패'); }
    finally { setSavingKey(null); }
  };

  const reset = async (source: string) => {
    if (!client) return;
    try {
      await client.deleteTranslation(source, 'en');
      showToast('success', '초기화됨 (다음 조회 시 자동번역)');
      setRows((prev) => prev.filter((r) => r.source !== source));
    } catch { showToast('error', '초기화 실패'); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold">영어 번역 보정</h2>
        <p className="text-sm text-gray-500 mt-1">
          홈페이지에서 방문자가 <b>ENGLISH</b> 를 켜면 한국어 문구가 자동으로 영어로 번역되어 아래에 쌓입니다.
          어색한 번역을 직접 고쳐 저장하면(보정) 이후 자동번역이 그 문구를 덮어쓰지 않습니다.
        </p>
      </div>

      {loading && <CardSkeleton />}
      {!loading && rows.length === 0 && (
        <EmptyState icon="🌐" title="아직 번역 문구가 없습니다" description="홈페이지에서 ENGLISH 를 한 번 켜면 문구가 자동 번역되어 여기에 표시됩니다." />
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((r) => {
            const val = drafts[r.source] ?? r.text;
            const dirty = drafts[r.source] !== undefined && drafts[r.source] !== r.text;
            return (
              <div key={r.source} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-xs text-gray-500 flex-1 truncate">{r.source}</span>
                  {r.isOverride && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-600">보정됨</span>}
                </div>
                <textarea
                  value={val}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.source]: e.target.value }))}
                  rows={2}
                  className={inputClass}
                />
                <div className="mt-2 flex justify-end gap-2">
                  {r.isOverride && (
                    <button onClick={() => void reset(r.source)} className="text-xs text-gray-500 hover:text-red-600">자동번역으로 초기화</button>
                  )}
                  <button
                    onClick={() => void save(r.source)}
                    disabled={savingKey === r.source || (!dirty && r.isOverride)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                  >
                    {savingKey === r.source ? '저장 중…' : '보정 저장'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
