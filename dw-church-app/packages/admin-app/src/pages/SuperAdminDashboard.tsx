import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../components';

// ─── Types ───────────────────────────────────────────────
interface TenantStats {
  sermonCount: number;
  userCount: number;
  storageUsed: number;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  customDomain?: string;
  stats?: TenantStats;
}

interface GlobalStats {
  totalTenants: number;
  activeTenants: number;
  totalSermons: number;
  totalStorage: number;
  planBreakdown: { plan: string; count: number }[];
}

interface TenantsResponse {
  data: Tenant[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

// ─── API helper ──────────────────────────────────────────
function useAdminApi() {
  const session = useAuthStore((s) => s.session);

  const apiFetch = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const host = window.location.hostname;
      const baseUrl = host.startsWith('admin.')
        ? `https://api.${host.replace('admin.', '')}`
        : (import.meta.env.VITE_API_BASE_URL as string) || '';

      const res = await fetch(`${baseUrl}/api/v1/admin${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${session?.accessToken || ''}`,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [session?.accessToken],
  );

  return apiFetch;
}

// ─── Stat Card ───────────────────────────────────────────
function StatCard({
  title,
  value,
  subtitle,
  color = 'blue',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${colorMap[color].split(' ')[1]}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}

// ─── Format helpers ──────────────────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const PLAN_PRICES: Record<string, number> = { basic: 29, pro: 79, free: 0 };
const PLAN_COLORS: Record<string, string> = {
  pro: 'bg-purple-100 text-purple-700',
  basic: 'bg-blue-100 text-blue-700',
  free: 'bg-gray-100 text-gray-600',
};

// ─── Create Church Modal ─────────────────────────────────
function CreateChurchModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerEmail: '',
    ownerName: '',
    plan: 'free',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/tenants', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      showToast('success', `"${form.name}" 교회가 생성되었습니다.`);
      onCreated();
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-4">새 교회 생성</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">교회명 *</label>
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="베델믿음교회" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug *</label>
            <input required value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="bethelfaith" />
            <p className="text-xs text-gray-400 mt-0.5">{form.slug}.truelight.app</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">관리자 이메일 *</label>
            <input required type="email" value={form.ownerEmail} onChange={(e) => set('ownerEmail', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">관리자 이름 *</label>
            <input required value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">플랜</label>
            <select value={form.plan} onChange={(e) => set('plan', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="free">Free</option>
              <option value="basic">Basic ($29/월)</option>
              <option value="pro">Pro ($79/월)</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? '생성 중...' : '교회 생성'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Tenant Modal ───────────────────────────────────
function EditTenantModal({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: Tenant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: tenant.name,
    plan: tenant.plan,
    isActive: tenant.isActive,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch(`/tenants/${tenant.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      showToast('success', '저장되었습니다.');
      onSaved();
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-4">교회 수정 — {tenant.slug}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">교회명</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">플랜</label>
            <select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="free">Free</option>
              <option value="basic">Basic ($29/월)</option>
              <option value="pro">Pro ($79/월)</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              활성 상태
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? '저장 중...' : '저장'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tenant Detail Modal ─────────────────────────────────
function TenantDetailModal({
  tenant,
  onClose,
}: {
  tenant: Tenant;
  onClose: () => void;
}) {
  const siteUrl = `https://${tenant.slug}.truelight.app`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{tenant.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">Slug</p>
              <p className="font-mono font-medium">{tenant.slug}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">플랜</p>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[tenant.plan] || 'bg-gray-100'}`}>
                {tenant.plan}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">상태</p>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {tenant.isActive ? '활성' : '비활성'}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 text-xs">생성일</p>
              <p className="font-medium">{formatDate(tenant.createdAt)}</p>
            </div>
          </div>

          {tenant.stats && (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{tenant.stats.sermonCount}</p>
                <p className="text-xs text-blue-500">설교</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{tenant.stats.userCount}</p>
                <p className="text-xs text-green-500">사용자</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{formatBytes(tenant.stats.storageUsed)}</p>
                <p className="text-xs text-purple-500">저장용량</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <a
              href={siteUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              사이트 방문
            </a>
            <a
              href={`${siteUrl}/sermons`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
            >
              설교 페이지
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function SuperAdminDashboard() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        apiFetch<GlobalStats>('/stats'),
        apiFetch<TenantsResponse>(`/tenants?page=${currentPage}&perPage=20`),
      ]);
      setStats(statsRes);
      setTenants(tenantsRes.data);
      setTotalPages(tenantsRes.meta.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, currentPage]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleDeactivate = async (tenant: Tenant) => {
    const action = tenant.isActive ? '비활성화' : '활성화';
    if (!window.confirm(`"${tenant.name}"을(를) ${action}하시겠습니까?`)) return;

    try {
      await apiFetch(`/tenants/${tenant.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });
      showToast('success', `${action}되었습니다.`);
      void fetchData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : `${action} 실패`);
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    if (!window.confirm(`"${tenant.name}" 교회를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 교회의 모든 데이터가 삭제됩니다.`)) return;

    try {
      await apiFetch(`/tenants/${tenant.id}`, { method: 'DELETE' });
      showToast('success', '삭제되었습니다.');
      void fetchData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const mrr = stats
    ? stats.planBreakdown.reduce((sum, p) => sum + (PLAN_PRICES[p.plan] ?? 0) * p.count, 0)
    : 0;

  const filteredTenants = search
    ? tenants.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase()))
    : tenants;

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-xl">
        <p className="font-bold text-lg mb-1">Super Admin 접근 오류</p>
        <p className="text-sm">{error}</p>
        <p className="text-xs mt-3 text-red-500">SUPER_ADMIN_EMAILS 환경 변수에 현재 로그인 이메일이 포함되어 있는지 확인하세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">플랫폼 관리</h1>
          <p className="mt-1 text-sm text-gray-500">모든 교회 사이트를 통합 관리합니다.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 교회 추가
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="전체 교회" value={stats?.totalTenants ?? 0} subtitle={`활성 ${stats?.activeTenants ?? 0}곳`} color="blue" />
        <StatCard title="전체 설교" value={stats?.totalSermons ?? 0} subtitle="모든 교회 합산" color="green" />
        <StatCard title="저장 용량" value={formatBytes(stats?.totalStorage ?? 0)} subtitle="모든 교회 합산" color="purple" />
        <StatCard title="월 예상 매출" value={`$${mrr.toLocaleString()}`} subtitle="MRR" color="amber" />
      </div>

      {/* Plan Distribution */}
      {stats && stats.planBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">플랜 분포</h2>
          <div className="flex gap-4">
            {stats.planBreakdown.map((p) => (
              <div key={p.plan} className="flex items-center gap-2">
                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${PLAN_COLORS[p.plan] || 'bg-gray-100'}`}>
                  {p.plan.toUpperCase()}
                </span>
                <span className="text-lg font-bold text-gray-900">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Church Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">교회 목록</h2>
          <input
            type="text"
            placeholder="검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm w-48"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 font-medium text-xs">
                <th className="px-5 py-3">교회명</th>
                <th className="px-5 py-3">Slug</th>
                <th className="px-5 py-3">플랜</th>
                <th className="px-5 py-3">상태</th>
                <th className="px-5 py-3">설교</th>
                <th className="px-5 py-3">용량</th>
                <th className="px-5 py-3">생성일</th>
                <th className="px-5 py-3">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">{t.slug}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[t.plan] || 'bg-gray-100'}`}>
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      {t.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{t.stats?.sermonCount ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{t.stats ? formatBytes(t.stats.storageUsed) : '-'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(t.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setViewingTenant(t)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors" title="상세보기">
                        보기
                      </button>
                      <button onClick={() => setEditingTenant(t)} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors" title="수정">
                        수정
                      </button>
                      <button onClick={() => handleDeactivate(t)} className={`px-2 py-1 text-xs rounded transition-colors ${t.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}>
                        {t.isActive ? '비활성화' : '활성화'}
                      </button>
                      <button onClick={() => handleDelete(t)} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors" title="삭제">
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTenants.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                    {search ? '검색 결과가 없습니다.' : '등록된 교회가 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1.5 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-gray-500">
              {currentPage} / {totalPages} 페이지
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1.5 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateChurchModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => void fetchData()}
        />
      )}
      {editingTenant && (
        <EditTenantModal
          tenant={editingTenant}
          onClose={() => setEditingTenant(null)}
          onSaved={() => void fetchData()}
        />
      )}
      {viewingTenant && (
        <TenantDetailModal
          tenant={viewingTenant}
          onClose={() => setViewingTenant(null)}
        />
      )}
    </div>
  );
}
