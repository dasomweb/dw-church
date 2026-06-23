import { useState, useEffect, useCallback } from 'react';
import { handoffSessionToNewTab } from '../../stores/auth';
import { useToast } from '../../components';
import { AIBuilderModal } from '../../components/super-admin/AIBuilderModal';
import { MigrationDialog } from '../../components/super-admin/MigrationDialog';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner, EmptyState, StatusBadge, VerifyBadge } from '../shared/admin-ui';
import { formatDate, formatBytes } from '../shared/format';
import { PLAN_COLORS } from '../shared/constants';
import type { Tenant, TenantDetail, TenantsResponse } from '../shared/types';

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
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">교회 수정 -- {tenant.slug}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">교회명</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">플랜</label>
            <select
              value={form.plan}
              onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="basic">Basic ($99/월) — 콘텐츠 편집</option>
              <option value="pro">Pro ($149/월) — + 페이지 추가</option>
              <option value="enterprise">Enterprise — 별도 협의</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded"
              />
              활성 상태
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
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
  tenantId,
  onClose,
  onUpdated,
}: {
  tenantId: string;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [supportInfo, setSupportInfo] = useState<{ email: string; active: boolean; expiresAt: string | null } | null>(null);
  const [rotatedPassword, setRotatedPassword] = useState<{ password: string; expiresAt: string } | null>(null);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // API returns { tenant, stats, users, domains } — flatten into the
        // shape the modal reads. Field renames: storageUsedBytes → storageUsed,
        // dbSizeBytes → dbSize. `verified` stays as `verified` on domains.
        type ApiResponse = {
          tenant: { id: string; slug: string; name: string; plan: string; isActive: boolean; createdAt: string };
          stats: {
            sermonCount: number; userCount: number; fileCount: number;
            storageUsedBytes: number; dbSizeBytes: number;
          };
          users: TenantDetail['users'];
          domains: { id: string; domain: string; isVerified: boolean }[];
        };
        const data = await apiFetch<ApiResponse>(`/tenants/${tenantId}/stats`);
        if (cancelled) return;
        const flat: TenantDetail = {
          ...data.tenant,
          sermonCount: data.stats.sermonCount,
          userCount: data.stats.userCount,
          fileCount: data.stats.fileCount,
          storageUsed: data.stats.storageUsedBytes,
          dbSize: data.stats.dbSizeBytes,
          users: data.users,
          domains: data.domains.map((d) => ({ id: d.id, domain: d.domain, verified: d.isVerified })),
        };
        setDetail(flat);
        setEditName(flat.name);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '상세 정보를 불러올 수 없습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiFetch, tenantId]);

  const handlePlanChange = async (newPlan: string) => {
    if (!detail || savingPlan) return;
    setSavingPlan(true);
    try {
      await apiFetch(`/tenants/${tenantId}`, {
        method: 'PUT',
        body: JSON.stringify({ plan: newPlan }),
      });
      setDetail({ ...detail, plan: newPlan });
      showToast('success', `플랜이 ${newPlan.toUpperCase()}로 변경되었습니다.`);
      onUpdated?.();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '플랜 변경 실패');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleNameSave = async () => {
    if (!detail || savingName || editName === detail.name || !editName.trim()) return;
    setSavingName(true);
    try {
      await apiFetch(`/tenants/${tenantId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editName.trim() }),
      });
      setDetail({ ...detail, name: editName.trim() });
      showToast('success', '교회 이름이 변경되었습니다.');
      onUpdated?.();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '이름 변경 실패');
    } finally {
      setSavingName(false);
    }
  };

  // Load support-user status whenever the modal opens for a tenant.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await apiFetch<{ email: string; active: boolean; expiresAt: string | null }>(
          `/tenants/${tenantId}/support-info`,
        );
        if (!cancelled) setSupportInfo(info);
      } catch {
        // non-fatal — section just won't render
      }
    })();
    return () => { cancelled = true; };
  }, [apiFetch, tenantId]);

  const handleRotatePassword = async () => {
    if (rotating) return;
    setRotating(true);
    try {
      const result = await apiFetch<{ email: string; password: string; expiresAt: string }>(
        `/tenants/${tenantId}/rotate-support-password`,
        { method: 'POST' },
      );
      setRotatedPassword({ password: result.password, expiresAt: result.expiresAt });
      setSupportInfo({ email: result.email, active: true, expiresAt: result.expiresAt });
      showToast('success', '임시 비밀번호가 발급되었습니다. 지금 복사해두세요.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '비밀번호 발급 실패');
    } finally {
      setRotating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('success', '클립보드에 복사되었습니다.');
    } catch {
      showToast('error', '복사에 실패했습니다.');
    }
  };

  const siteUrl = detail ? `https://${detail.slug}.truelight.app` : '#';
  // Tenant-scoped login URL: /t/<slug>/login?email=support-<slug>@...
  // Opens in a new tab, LoginPage clears any prior session (via ?email=),
  // and post-login drops the support user into /t/<slug>. URL-scoped login
  // keeps the super admin's own tab intact.
  const tenantAdminUrl = detail
    ? `/t/${detail.slug}/login?email=${encodeURIComponent(`support-${detail.slug}@truelight.app`)}`
    : '#';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{loading ? '교회 상세' : detail?.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {loading && <Spinner />}
        {error && <p className="text-red-600 text-sm py-4">{error}</p>}

        {detail && (
          <div className="space-y-5">
            {/* Editable: Church Name */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">교회 이름</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={handleNameSave}
                  disabled={savingName || editName === detail.name || !editName.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingName ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>

            {/* Editable: Plan */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">플랜</label>
              <div className="flex gap-2">
                {/* free 는 신규 plan 으로는 노출 안 하지만, 기존에 free 로 생성된
                    테넌트가 있으면 그대로 표시되도록 array 에는 남겨둠. */}
                {['basic', 'pro', 'enterprise', 'free'].map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePlanChange(p)}
                    disabled={savingPlan || detail.plan === p}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      detail.plan === p
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    {p.toUpperCase()}
                    {detail.plan === p && <span className="ml-1">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Info (readonly) */}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs">Slug</p>
                <p className="font-mono font-medium">{detail.slug}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs">상태</p>
                <StatusBadge active={detail.isActive} />
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs">생성일</p>
                <p className="font-medium">{formatDate(detail.createdAt)}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{detail.sermonCount}</p>
                <p className="text-xs text-blue-500">설교</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{detail.userCount}</p>
                <p className="text-xs text-green-500">사용자</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{formatBytes(detail.storageUsed)}</p>
                <p className="text-xs text-purple-500">R2 저장공간</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{formatBytes(detail.dbSize)}</p>
                <p className="text-xs text-amber-500">DB 크기</p>
              </div>
            </div>

            {/* Users */}
            {detail.users.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">사용자 ({detail.users.length}명)</h4>
                <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                  {detail.users.map((u) => (
                    <div key={u.id} className="px-3 py-2 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-900">{u.name}</span>
                        <span className="text-gray-400 ml-2">{u.email}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        u.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Domains */}
            {detail.domains.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">도메인</h4>
                <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                  {detail.domains.map((d) => (
                    <div key={d.id} className="px-3 py-2 flex items-center justify-between text-sm">
                      <span className="font-mono text-gray-900">{d.domain}</span>
                      <VerifyBadge verified={d.verified} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Support access — per-tenant maintenance account */}
            {supportInfo && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-indigo-900">지원 계정 (유지보수용)</h4>
                  {supportInfo.active && supportInfo.expiresAt ? (
                    <span className="text-xs text-indigo-700">
                      만료: {new Date(supportInfo.expiresAt).toLocaleString('ko-KR')}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">비밀번호 미발급</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-indigo-200 rounded px-2 py-1.5 text-xs font-mono text-indigo-900">
                    {supportInfo.email}
                  </code>
                  <button
                    onClick={() => copyToClipboard(supportInfo.email)}
                    className="px-2 py-1.5 text-xs bg-white border border-indigo-200 rounded hover:bg-indigo-100"
                  >
                    복사
                  </button>
                </div>
                {rotatedPassword && (
                  <div className="flex items-center gap-2 rounded bg-amber-50 border border-amber-300 p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-amber-800 font-semibold mb-0.5">⚠ 지금만 표시됩니다 — 24시간 후 자동 만료</p>
                      <code className="block truncate text-xs font-mono text-amber-900">
                        {rotatedPassword.password}
                      </code>
                    </div>
                    <button
                      onClick={() => copyToClipboard(rotatedPassword.password)}
                      className="shrink-0 px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 font-medium"
                    >
                      복사
                    </button>
                  </div>
                )}
                <button
                  onClick={handleRotatePassword}
                  disabled={rotating}
                  className="w-full py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {rotating ? '발급 중...' : supportInfo.active ? '새 비밀번호 재발급 (이전 무효화)' : '임시 비밀번호 발급 (24시간 유효)'}
                </button>
                <p className="text-[11px] text-indigo-700 leading-tight">
                  위 계정으로 로그인하면 이 교회의 관리자 페이지에 접근할 수 있습니다.
                  슈퍼어드민 계정과 분리되어 각 교회별로 작업 이력이 남습니다.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <a
                href={siteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                사이트 방문
              </a>
              <a
                href={tenantAdminUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                관리자 페이지
              </a>
              <a
                href={`${siteUrl}/sermons`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
              >
                설교
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── Tab: Tenants ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function TenantsTab({ refreshKey = 0 }: { refreshKey?: number }) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [viewingTenantId, setViewingTenantId] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  // Phase 11-A1: AI 빌더 modal — ✨ row 버튼이 누르면 이 modal 열림. PlannerWizard
  // (8-step) 가 modal 안에서 동작 → 완료 시 buildPages 호출. b2bsmart 의 UX 동일.
  const [aiBuilderTenant, setAiBuilderTenant] = useState<Tenant | null>(null);
  // Phase 12-δ: MigrationDialog — 행의 "📥 가져오기" 버튼이 누르면 열림.
  // URL 입력 → /migrate-url 호출 → 결과 카운트 표시.
  const [migrateTenant, setMigrateTenant] = useState<Tenant | null>(null);

  // Delete safeguard — GitHub/Railway 방식. 단순 confirm 대신 slug 를 직접
  // 타이핑해야 삭제 버튼이 활성화됨 (되돌릴 수 없는 작업이라 오삭제 방지).
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      // Newest-first so a just-created church appears at the top.
      const res = await apiFetch<TenantsResponse>(`/tenants?page=${currentPage}&perPage=20`);
      setTenants(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '교회 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, currentPage, showToast]);

  useEffect(() => {
    void fetchTenants();
    // Parent bumps refreshKey after creating a new tenant — this dependency
    // triggers an immediate refetch so the new row shows up without reload.
  }, [fetchTenants, refreshKey]);

  const handleToggleActive = async (tenant: Tenant) => {
    const action = tenant.isActive ? '비활성화' : '활성화';
    if (!window.confirm(`"${tenant.name}"을(를) ${action}하시겠습니까?`)) return;
    try {
      await apiFetch(`/tenants/${tenant.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });
      showToast('success', `${action}되었습니다.`);
      void fetchTenants();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : `${action} 실패`);
    }
  };

  // Opens the type-to-confirm modal instead of an easily-dismissed confirm().
  const handleDelete = (tenant: Tenant) => {
    setDeleteText('');
    setDeleteTarget(tenant);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteText !== deleteTarget.slug || deleting) return;
    setDeleting(true);
    try {
      await apiFetch(`/tenants/${deleteTarget.id}`, { method: 'DELETE' });
      showToast('success', `"${deleteTarget.name}" 교회가 삭제되었습니다.`);
      setDeleteTarget(null);
      void fetchTenants();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setDeleting(false);
    }
  };

  const filteredTenants = search
    ? tenants.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : tenants;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="교회명 또는 Slug로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-72 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-gray-400 hover:text-gray-600">
            초기화
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <Spinner />
        ) : filteredTenants.length === 0 ? (
          <EmptyState message={search ? '검색 결과가 없습니다.' : '등록된 교회가 없습니다.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 font-medium text-xs whitespace-nowrap">
                  <th className="px-4 py-3 min-w-[140px]">교회명</th>
                  <th className="px-3 py-3">Slug</th>
                  <th className="px-3 py-3">플랜</th>
                  <th className="px-3 py-3">상태</th>
                  <th className="px-3 py-3 text-right">설교</th>
                  <th className="px-3 py-3 text-right">저장</th>
                  <th className="px-3 py-3 text-right">DB</th>
                  <th className="px-3 py-3 text-right">사용자</th>
                  <th className="px-3 py-3">마지막</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTenants.map((t, idx) => (
                  <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{t.name}</td>
                    <td className="px-3 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{t.slug}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[t.plan] || 'bg-gray-100'}`}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <StatusBadge active={t.isActive} />
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-right tabular-nums">{t.stats?.sermonCount ?? '-'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs text-right whitespace-nowrap tabular-nums">{t.stats ? formatBytes(t.stats.storageUsed) : '-'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs text-right whitespace-nowrap tabular-nums">{t.dbSize != null ? formatBytes(t.dbSize) : '-'}</td>
                    <td className="px-3 py-3 text-gray-500 text-right tabular-nums">{t.stats?.userCount ?? '-'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{t.lastActivityAt ? formatDate(t.lastActivityAt) : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-nowrap items-center justify-end">
                        {/* 사이트 — 스토어프론트를 새 탭에서 열기. 가장 가벼운 액션.
                            B2BSmart 의 row 순서 (사이트/보기/AI빌더/수정) 와 동일. */}
                        <a
                          href={t.customDomain ? `https://${t.customDomain}` : `https://${t.slug}.truelight.app`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 text-xs text-gray-600 border border-gray-200 hover:bg-gray-50 rounded transition-colors whitespace-nowrap"
                          title={`${t.name} — 실제 사이트(스토어프론트)를 새 탭에서 보기`}
                        >
                          🌐 사이트
                        </a>
                        {/* 요약 — 테넌트 상세 모달 (빠른 트리아지: 통계 + 이름/플랜 편집 +
                            지원 계정 발급 + 사이트 방문). 일상 운영의 메인 surface. */}
                        <button
                          onClick={() => setViewingTenantId(t.id)}
                          className="px-2 py-1 text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 rounded transition-colors whitespace-nowrap"
                          title={`${t.name} — 빠른 요약(통계·플랜) + 지원 계정`}
                        >
                          📊 요약
                        </button>
                        {/* 가져오기 — Phase 12-δ: 기존 사이트 URL 입력으로 자동
                            마이그레이션. 이모지 제거로 헤더 공간 절약. */}
                        <button
                          onClick={() => setMigrateTenant(t)}
                          className="px-2 py-1 text-xs text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded transition-colors whitespace-nowrap"
                          title={`${t.name} — 기존 교회 사이트를 AI가 분석해 사이트맵·섹션·디자인을 자동 구성 (정적 구조/디자인. 설교·주보 등 동적 콘텐츠는 각 관리 페이지에서 개별 가져오기)`}
                        >
                          🚚 마이그레이션
                        </button>
                        {/* AI 빌더 — Phase 11-A1: AIBuilderModal (PlannerWizard 8-step).
                            기존 ✨ 이모지 제거 + 한 줄 유지. */}
                        <button
                          onClick={() => setAiBuilderTenant(t)}
                          className="px-2.5 py-1 text-xs bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded hover:from-violet-600 hover:to-purple-700 transition-colors font-semibold shadow-sm whitespace-nowrap"
                          title={`${t.name} — AI로 사이트 자동 생성 시작`}
                        >
                          ✨ AI 빌더
                        </button>
                        {/* 진입 — 슈퍼어드민 세션으로 테넌트 관리자 화면(/t/:slug)에 바로
                            진입. 게이트가 super_admin 을 통과시키고, AdminLayout 이
                            X-Tenant-Slug 를 이 테넌트로 맞춰 콘텐츠 모듈(설교/주보/칼럼…)을
                            그대로 운영할 수 있음. 지원 계정 로그인 불필요. */}
                        <button
                          onClick={() => {
                            // Open the tenant admin in a NEW TAB so the super-admin
                            // dashboard stays put. sessionStorage is per-tab, so hand
                            // the session off via localStorage first or the new tab
                            // boots logged out.
                            handoffSessionToNewTab();
                            window.open(`${window.location.origin}/t/${t.slug}`, '_blank', 'noopener');
                          }}
                          className="px-2.5 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors font-medium whitespace-nowrap"
                          title={`${t.name} — 교회(테넌트) 관리자 화면 (새 탭). 교회 운영자가 보는 설교·주보·칼럼 등 콘텐츠 관리 화면으로 진입합니다.`}
                        >
                          👤 교회 관리자
                        </button>
                        {/* 콘솔 — 슈퍼어드민 per-tenant 깊은 편집 콘솔 (/super-admin/t/:slug). */}
                        <button
                          onClick={() => {
                            window.location.href = `${window.location.origin}/super-admin/t/${t.slug}`;
                          }}
                          className="px-2.5 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors font-medium whitespace-nowrap"
                          title={`${t.name} — 슈퍼어드민 편집 콘솔. 페이지 빌더·테마·디자인 등 사이트를 직접 만드는 화면으로 진입합니다.`}
                        >
                          🎨 사이트 편집
                        </button>
                        {/* ⋮ 더보기 — 비활성화/삭제 (드물게 쓰는 destructive). 한 줄
                            유지 + 실수로 누를 위험 낮추기. CSS-only dropdown은
                            blur 처리 까다로워서 details/summary 의 native toggle 사용. */}
                        <details className="relative">
                          <summary
                            className="list-none cursor-pointer px-2 py-1 text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 rounded whitespace-nowrap select-none"
                            title="더보기"
                          >
                            ⋮
                          </summary>
                          <div className="absolute right-0 mt-1 z-20 w-36 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                            <button
                              onClick={() => handleToggleActive(t)}
                              className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                                t.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'
                              }`}
                            >
                              {t.isActive ? '비활성화' : '활성화'}
                            </button>
                            <button
                              onClick={() => handleDelete(t)}
                              className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                            >
                              삭제
                            </button>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1.5 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              이전
            </button>
            <span className="text-gray-500">
              {currentPage} / {totalPages} 페이지
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1.5 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {viewingTenantId && (
        <TenantDetailModal tenantId={viewingTenantId} onClose={() => setViewingTenantId(null)} onUpdated={() => void fetchTenants()} />
      )}
      {aiBuilderTenant && (
        <AIBuilderModal
          tenant={{ id: aiBuilderTenant.id, slug: aiBuilderTenant.slug, name: aiBuilderTenant.name }}
          onClose={() => setAiBuilderTenant(null)}
          onCompleted={() => void fetchTenants()}
        />
      )}
      <MigrationDialog
        tenant={migrateTenant ? { id: migrateTenant.id, slug: migrateTenant.slug, name: migrateTenant.name } : { id: '', slug: '', name: '' }}
        open={!!migrateTenant}
        onClose={() => setMigrateTenant(null)}
        onCompleted={() => void fetchTenants()}
      />
      {editingTenant && (
        <EditTenantModal
          tenant={editingTenant}
          onClose={() => setEditingTenant(null)}
          onSaved={() => void fetchTenants()}
        />
      )}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-red-700">⚠️ 교회(테넌트) 삭제</h3>
            <p className="mt-3 text-sm text-gray-700">
              <strong>"{deleteTarget.name}"</strong> 의 모든 데이터(페이지·콘텐츠·이미지·사용자)가
              <strong className="text-red-700"> 영구 삭제</strong>되며 되돌릴 수 없습니다.
            </p>
            <p className="mt-4 text-sm text-gray-700">
              계속하려면 아래에 <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-red-700">{deleteTarget.slug}</code> 를 입력하세요.
            </p>
            <input
              autoFocus
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void confirmDelete(); }}
              placeholder={deleteTarget.slug}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={() => void confirmDelete()}
                disabled={deleteText !== deleteTarget.slug || deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {deleting ? '삭제 중…' : '영구 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
