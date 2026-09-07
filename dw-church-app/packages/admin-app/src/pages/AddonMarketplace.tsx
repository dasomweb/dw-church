/**
 * AddonMarketplace (부가기능) — 테넌트 관리자가 사용 가능한 유료 애드온을 보고
 * 신청하는 페이지. 신청하면 슈퍼어드민 신청함으로 전달되고, 승인 시 활성화된다.
 * (대표님 2026-09-07: "테넌트가 추가 비용 신청을 통해 사용".)
 *
 * 데이터: GET /admin/addon-marketplace → [{ key,label,monthly,yearly,active,requested }]
 * 신청:  POST /admin/addon-requests { featureKey }
 */
import { useCallback, useEffect, useState } from 'react';
import { useDWChurchClient } from '@dw-church/api-client';
import { useToast } from '../components';

interface AddonItem {
  key: string; label: string; monthly: number; yearly: number; active: boolean; requested: boolean;
}
function unwrap<T>(res: unknown): T {
  return ((res as { data?: T })?.data ?? res) as T;
}

export default function AddonMarketplace() {
  const client = useDWChurchClient();
  const { showToast } = useToast();
  const [items, setItems] = useState<AddonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    try {
      const res = await client.adapter.get('/api/v1/admin/addon-marketplace');
      setItems(unwrap<AddonItem[]>(res) ?? []);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  useEffect(() => { void load(); }, [load]);

  const request = async (key: string) => {
    if (!client) return;
    setBusy(key);
    try {
      await client.adapter.post('/api/v1/admin/addon-requests', { featureKey: key });
      showToast('success', '신청이 접수되었습니다. 관리자 승인 후 사용하실 수 있습니다.');
      await load();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '신청 실패');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="admin-content p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">부가기능</h1>
      <p className="text-sm text-gray-500 mb-6">
        필요한 부가기능을 신청하시면 담당자가 확인 후 활성화해 드립니다. 활성화된 기능은 월 요금에 합산되어 청구됩니다.
      </p>

      {loading ? (
        <div className="text-sm text-gray-400">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-400">신청 가능한 부가기능이 없습니다.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.key} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">{it.label}</div>
                <div className="mt-0.5 text-xs text-gray-500">
                  월 ${it.monthly}
                  {it.yearly ? <span className="text-gray-300"> · 연 ${it.yearly}</span> : null}
                </div>
              </div>
              {it.active ? (
                <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">사용 중</span>
              ) : it.requested ? (
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">신청됨 · 검토 중</span>
              ) : (
                <button
                  type="button"
                  onClick={() => request(it.key)}
                  disabled={busy === it.key}
                  className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy === it.key ? '신청 중…' : '신청하기'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
