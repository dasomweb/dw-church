import { useState, useEffect } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner, EmptyState } from '../shared/admin-ui';
import { formatBytes } from '../shared/format';
import type { GlobalStats, TenantsResponse } from '../shared/types';

// ═══════════════════════════════════════════════════════════
// ─── Tab: Storage ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
interface StorageTenant {
  id: string;
  name: string;
  fileCount: number;
  storageUsed: number;
  dbSize: number;
}

export default function StorageTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [tenants, setTenants] = useState<StorageTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStorage, setTotalStorage] = useState(0);
  const [totalDbSize, setTotalDbSize] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, tenantsRes] = await Promise.all([
          apiFetch<GlobalStats>('/stats'),
          apiFetch<TenantsResponse>('/tenants?page=1&perPage=100'),
        ]);
        if (cancelled) return;

        setTotalStorage(statsRes.totalStorage ?? 0);
        setTotalDbSize((statsRes as unknown as Record<string, unknown>).dbSizeBytes as number ?? 0);

        // Build storage list from tenants, sorted by total size descending
        const storageList: StorageTenant[] = ((tenantsRes.data ?? []) as unknown as Record<string, unknown>[])
          .map((t: Record<string, unknown>) => ({
            id: t.id as string,
            name: t.name as string,
            fileCount: (t.stats as Record<string, number>)?.sermonCount ?? 0,
            storageUsed: (t.stats as Record<string, number>)?.storageUsed ?? 0,
            dbSize: (t.stats as Record<string, number>)?.dbSizeBytes ?? 0,
          }))
          .sort((a: StorageTenant, b: StorageTenant) => (b.storageUsed + b.dbSize) - (a.storageUsed + a.dbSize));

        setTenants(storageList);
      } catch (err) {
        if (!cancelled) showToast('error', err instanceof Error ? err.message : '저장공간 데이터 로딩 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiFetch, showToast]);

  if (loading) return <Spinner />;

  const totalCombined = totalStorage + totalDbSize;
  // Assume a soft limit for visual display (e.g., 100GB)
  const softLimitBytes = 100 * 1024 * 1024 * 1024;
  const usagePct = Math.min(Math.round((totalCombined / softLimitBytes) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Total Usage */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">전체 저장공간 사용량</h2>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePct > 80 ? 'bg-red-500' : usagePct > 50 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            {formatBytes(totalCombined)}
          </span>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">R2 저장공간: </span>
            <span className="font-medium">{formatBytes(totalStorage)}</span>
          </div>
          <div>
            <span className="text-gray-500">DB 크기: </span>
            <span className="font-medium">{formatBytes(totalDbSize)}</span>
          </div>
        </div>
      </div>

      {/* Per-tenant Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">교회별 저장공간 (크기순)</h2>
        </div>
        {tenants.length === 0 ? (
          <EmptyState message="저장공간 데이터가 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 font-medium text-xs">
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">교회명</th>
                  <th className="px-5 py-3">파일수</th>
                  <th className="px-5 py-3">R2 크기</th>
                  <th className="px-5 py-3">DB 크기</th>
                  <th className="px-5 py-3">합계</th>
                  <th className="px-5 py-3 w-48">비율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map((t, idx) => {
                  const total = t.storageUsed + t.dbSize;
                  const pct = totalCombined > 0 ? Math.round((total / totalCombined) * 100) : 0;
                  return (
                    <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-5 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{t.name}</td>
                      <td className="px-5 py-3 text-gray-500">{t.fileCount}</td>
                      <td className="px-5 py-3 text-gray-500">{formatBytes(t.storageUsed)}</td>
                      <td className="px-5 py-3 text-gray-500">{formatBytes(t.dbSize)}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{formatBytes(total)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
