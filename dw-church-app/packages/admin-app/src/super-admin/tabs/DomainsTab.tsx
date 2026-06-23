import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner, EmptyState, VerifyBadge } from '../shared/admin-ui';
import { formatDate } from '../shared/format';
import type { Domain } from '../shared/types';

// ═══════════════════════════════════════════════════════════
// ─── Tab: Domains ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function DomainsTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Domain[] } | Domain[]>('/domains');
      setDomains(Array.isArray(res) ? res : res.data ?? []);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '도메인 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    void fetchDomains();
  }, [fetchDomains]);

  const handleVerify = async (domain: Domain) => {
    try {
      await apiFetch(`/domains/${domain.id}/verify`, { method: 'PUT' });
      showToast('success', `"${domain.domain}" 도메인이 검증되었습니다.`);
      void fetchDomains();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '검증 실패');
    }
  };

  const handleDelete = async (domain: Domain) => {
    if (!window.confirm(`"${domain.domain}" 도메인을 삭제하시겠습니까?`)) return;
    try {
      await apiFetch(`/domains/${domain.id}`, { method: 'DELETE' });
      showToast('success', '도메인이 삭제되었습니다.');
      void fetchDomains();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {loading ? (
        <Spinner />
      ) : domains.length === 0 ? (
        <EmptyState message="등록된 커스텀 도메인이 없습니다." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 font-medium text-xs">
                <th className="px-5 py-3">도메인</th>
                <th className="px-5 py-3">교회명</th>
                <th className="px-5 py-3">검증상태</th>
                <th className="px-5 py-3">생성일</th>
                <th className="px-5 py-3">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {domains.map((d, idx) => (
                <tr key={d.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-5 py-3 font-mono text-gray-900">{d.domain}</td>
                  <td className="px-5 py-3 text-gray-700">{d.tenantName}</td>
                  <td className="px-5 py-3">
                    <VerifyBadge verified={d.verified} />
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(d.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      {!d.verified && (
                        <button
                          onClick={() => handleVerify(d)}
                          className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors"
                        >
                          수동검증
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(d)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
