import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../components';

// snake_case → camelCase
function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function camelizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(camelizeKeys);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [toCamel(k), camelizeKeys(v)])
    );
  }
  return obj;
}

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
  lastActivityAt?: string;
  dbSize?: number;
}

interface GlobalStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalSermons: number;
  totalStorage: number;
  totalDbSize: number;
  planBreakdown: { plan: string; count: number }[];
}

interface TenantsResponse {
  data: Tenant[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

interface Domain {
  id: string;
  domain: string;
  tenantId: string;
  tenantName: string;
  verified: boolean;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantName: string;
  isActive: boolean;
  isLocked: boolean;
  createdAt: string;
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  customDomain?: string;
  sermonCount: number;
  userCount: number;
  storageUsed: number;
  dbSize: number;
  fileCount: number;
  users: { id: string; email: string; name: string; role: string }[];
  domains: { id: string; domain: string; verified: boolean }[];
}

// ─── Constants ───────────────────────────────────────────
const PLAN_PRICES: Record<string, number> = { basic: 29, pro: 79, free: 0 };
const PLAN_COLORS: Record<string, string> = {
  pro: 'bg-purple-100 text-purple-700',
  basic: 'bg-blue-100 text-blue-700',
  free: 'bg-gray-100 text-gray-600',
};

type TabId = 'overview' | 'tenants' | 'domains' | 'users' | 'storage' | 'migration';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: '개요', icon: '📊' },
  { id: 'tenants', label: '교회 관리', icon: '⛪' },
  { id: 'domains', label: '도메인 관리', icon: '🌐' },
  { id: 'users', label: '사용자 관리', icon: '👥' },
  { id: 'storage', label: '저장공간', icon: '💾' },
  { id: 'migration', label: '마이그레이션', icon: '🔄' },
];

// ─── Helpers ─────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// ─── API Helper Hook ─────────────────────────────────────
function useAdminApi() {
  const session = useAuthStore((s) => s.session);

  const apiFetch = useCallback(
    async <T,>(path: string, options?: RequestInit): Promise<T> => {
      const host = window.location.hostname;
      const baseUrl = host.startsWith('admin.')
        ? `https://api.${host.replace('admin.', '')}`
        : (import.meta.env.VITE_API_BASE_URL as string) || '';

      const headers: Record<string, string> = {
        Authorization: `Bearer ${session?.accessToken || ''}`,
        ...(options?.headers as Record<string, string>),
      };
      if (options?.body) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(`${baseUrl}/api/v1/admin${path}`, {
        ...options,
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return camelizeKeys(json) as T;
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
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'cyan' | 'rose' | 'indigo';
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    cyan: 'from-cyan-500 to-cyan-600',
    rose: 'from-rose-500 to-rose-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">
        <span className={`bg-gradient-to-r ${colorMap[color]} bg-clip-text text-transparent`}>
          {value}
        </span>
      </p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────
function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`} />
      {label ?? (active ? '활성' : '비활성')}
    </span>
  );
}

function VerifyBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${verified ? 'bg-green-500' : 'bg-yellow-500'}`} />
      {verified ? '검증됨' : '대기중'}
    </span>
  );
}

// ─── Loading Spinner ─────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}

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
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">새 교회 생성</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">교회명 *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="베델믿음교회"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug *</label>
            <input
              required
              value={form.slug}
              onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="bethelfaith"
            />
            <p className="text-xs text-gray-400 mt-0.5">{form.slug || 'slug'}.truelight.app</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">관리자 이메일 *</label>
            <input
              required
              type="email"
              value={form.ownerEmail}
              onChange={(e) => set('ownerEmail', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">관리자 이름 *</label>
            <input
              required
              value={form.ownerName}
              onChange={(e) => set('ownerName', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">플랜</label>
            <select
              value={form.plan}
              onChange={(e) => set('plan', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="free">Free</option>
              <option value="basic">Basic ($29/월)</option>
              <option value="pro">Pro ($79/월)</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '생성 중...' : '교회 생성'}
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
              <option value="free">Free</option>
              <option value="basic">Basic ($29/월)</option>
              <option value="pro">Pro ($79/월)</option>
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
}: {
  tenantId: string;
  onClose: () => void;
}) {
  const apiFetch = useAdminApi();
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<TenantDetail>(`/tenants/${tenantId}/stats`);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '상세 정보를 불러올 수 없습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiFetch, tenantId]);

  const siteUrl = detail ? `https://${detail.slug}.truelight.app` : '#';

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
            {/* Basic Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs">Slug</p>
                <p className="font-mono font-medium">{detail.slug}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs">플랜</p>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[detail.plan] || 'bg-gray-100'}`}>
                  {detail.plan.toUpperCase()}
                </span>
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
                href={`${siteUrl}/sermons`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
              >
                설교 페이지
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── User Role Change Modal ──────────────────────────────
function RoleChangeModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(user.role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch(`/users/${user.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      showToast('success', '역할이 변경되었습니다.');
      onSaved();
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '역할 변경 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">역할 변경</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{user.name} ({user.email})</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '변경 중...' : '변경'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Password Reset Modal ────────────────────────────────
function PasswordResetModal({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('error', '비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/users/${user.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword }),
      });
      showToast('success', '비밀번호가 변경되었습니다.');
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '비밀번호 변경 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">비밀번호 리셋</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{user.name} ({user.email})</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="새 비밀번호 (8자 이상)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tenant Transfer Modal ───────────────────────────────
function TenantTransferModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState(user.tenantId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`"${user.name}"의 테넌트를 변경하시겠습니까?`)) return;
    setLoading(true);
    try {
      await apiFetch(`/users/${user.id}/tenant`, {
        method: 'PUT',
        body: JSON.stringify({ tenantId }),
      });
      showToast('success', '테넌트가 변경되었습니다.');
      onSaved();
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '테넌트 변경 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">테넌트 변경</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{user.name} ({user.email})</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">새 테넌트 ID</label>
            <input
              required
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="tenant-uuid"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '변경 중...' : '변경'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── Tab: Overview ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function OverviewTab({
  stats,
  loading,
  onCreateChurch,
}: {
  stats: GlobalStats | null;
  loading: boolean;
  onCreateChurch: () => void;
}) {
  if (loading && !stats) return <Spinner />;

  const mrr = stats
    ? stats.planBreakdown.reduce((sum, p) => sum + (PLAN_PRICES[p.plan] ?? 0) * p.count, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard title="전체 교회" value={stats?.totalTenants ?? 0} color="blue" />
        <StatCard title="활성 교회" value={stats?.activeTenants ?? 0} color="green" />
        <StatCard title="전체 사용자" value={stats?.totalUsers ?? 0} color="indigo" />
        <StatCard title="전체 설교" value={stats?.totalSermons ?? 0} color="purple" />
        <StatCard title="총 저장공간" value={formatBytes(stats?.totalStorage ?? 0)} color="cyan" />
        <StatCard title="DB 크기" value={formatBytes(stats?.totalDbSize ?? 0)} color="rose" />
        <StatCard title="월 매출(MRR)" value={`$${mrr.toLocaleString()}`} color="amber" />
      </div>

      {/* Plan Distribution */}
      {stats && stats.planBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">플랜 분포</h2>
          <div className="flex flex-wrap gap-4">
            {stats.planBreakdown.map((p) => {
              const total = stats.totalTenants || 1;
              const pct = Math.round((p.count / total) * 100);
              return (
                <div key={p.plan} className="flex items-center gap-3">
                  <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold ${PLAN_COLORS[p.plan] || 'bg-gray-100'}`}>
                    {p.plan.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{p.count}</span>
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          p.plan === 'pro' ? 'bg-purple-500' : p.plan === 'basic' ? 'bg-blue-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">빠른 작업</h2>
        <div className="flex gap-3">
          <button
            onClick={onCreateChurch}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + 교회 추가
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── Tab: Tenants ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function TenantsTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [viewingTenantId, setViewingTenantId] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
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
  }, [fetchTenants]);

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

  const handleDelete = async (tenant: Tenant) => {
    if (!window.confirm(`"${tenant.name}" 교회를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 교회의 모든 데이터가 삭제됩니다.`)) return;
    try {
      await apiFetch(`/tenants/${tenant.id}`, { method: 'DELETE' });
      showToast('success', '삭제되었습니다.');
      void fetchTenants();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
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
                <tr className="bg-gray-50 text-left text-gray-500 font-medium text-xs">
                  <th className="px-5 py-3">교회명</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3">플랜</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">설교수</th>
                  <th className="px-5 py-3">저장공간</th>
                  <th className="px-5 py-3">DB크기</th>
                  <th className="px-5 py-3">사용자수</th>
                  <th className="px-5 py-3">마지막활동</th>
                  <th className="px-5 py-3">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTenants.map((t, idx) => (
                  <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-5 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{t.slug}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[t.plan] || 'bg-gray-100'}`}>
                        {t.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge active={t.isActive} />
                    </td>
                    <td className="px-5 py-3 text-gray-500">{t.stats?.sermonCount ?? '-'}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{t.stats ? formatBytes(t.stats.storageUsed) : '-'}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{t.dbSize != null ? formatBytes(t.dbSize) : '-'}</td>
                    <td className="px-5 py-3 text-gray-500">{t.stats?.userCount ?? '-'}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{t.lastActivityAt ? formatDate(t.lastActivityAt) : '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setViewingTenantId(t.id)}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          상세
                        </button>
                        <button
                          onClick={() => {
                            // Open tenant admin page in new window (switch-tenant then redirect)
                            window.open(`${window.location.origin}/?tenant=${t.slug}`, '_blank');
                          }}
                          className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded transition-colors font-medium"
                        >
                          관리
                        </button>
                        <button
                          onClick={() => setEditingTenant(t)}
                          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleToggleActive(t)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            t.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {t.isActive ? '비활성화' : '활성화'}
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
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
        <TenantDetailModal tenantId={viewingTenantId} onClose={() => setViewingTenantId(null)} />
      )}
      {editingTenant && (
        <EditTenantModal
          tenant={editingTenant}
          onClose={() => setEditingTenant(null)}
          onSaved={() => void fetchTenants()}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── Tab: Domains ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function DomainsTab() {
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

// ═══════════════════════════════════════════════════════════
// ─── Tab: Users ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function UsersTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [roleChangeUser, setRoleChangeUser] = useState<User | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [tenantTransferUser, setTenantTransferUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: User[]; total: number } | User[]>('/users');
      setUsers(Array.isArray(res) ? res : res.data ?? []);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '사용자 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleToggleLock = async (user: User) => {
    const action = user.isLocked ? '해제' : '잠금';
    if (!window.confirm(`"${user.name}" 사용자를 ${action}하시겠습니까?`)) return;
    try {
      const endpoint = user.isLocked ? 'unlock' : 'lock';
      await apiFetch(`/users/${user.id}/${endpoint}`, { method: 'PUT' });
      showToast('success', `${action}되었습니다.`);
      void fetchUsers();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : `${action} 실패`);
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.role === 'super_admin') {
      showToast('error', 'Super Admin은 비활성화할 수 없습니다.');
      return;
    }
    const action = user.isActive ? '비활성화' : '활성화';
    if (!window.confirm(`"${user.name}" 사용자를 ${action}하시겠습니까?`)) return;
    try {
      await apiFetch(`/users/${user.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      showToast('success', `${action}되었습니다.`);
      void fetchUsers();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : `${action} 실패`);
    }
  };

  const filteredUsers = search
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.tenantName.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  const roleColors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    member: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="이메일, 이름, 교회명으로 검색..."
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
        ) : filteredUsers.length === 0 ? (
          <EmptyState message={search ? '검색 결과가 없습니다.' : '사용자가 없습니다.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 font-medium text-xs">
                  <th className="px-5 py-3">이메일</th>
                  <th className="px-5 py-3">이름</th>
                  <th className="px-5 py-3">역할</th>
                  <th className="px-5 py-3">교회명</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">생성일</th>
                  <th className="px-5 py-3">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u, idx) => (
                  <tr key={u.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-5 py-3 text-gray-900">{u.email}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${roleColors[u.role] || 'bg-gray-100'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{u.tenantName}</td>
                    <td className="px-5 py-3">
                      {u.role === 'super_admin' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          활성
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            u.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          {u.isActive ? '활성' : '비활성'}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setRoleChangeUser(u)}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          역할변경
                        </button>
                        <button
                          onClick={() => setPasswordResetUser(u)}
                          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          비밀번호리셋
                        </button>
                        <button
                          onClick={() => handleToggleLock(u)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            u.isLocked ? 'text-green-600 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'
                          }`}
                        >
                          {u.isLocked ? '해제' : '잠금'}
                        </button>
                        <button
                          onClick={() => setTenantTransferUser(u)}
                          className="px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        >
                          테넌트변경
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

      {/* Modals */}
      {roleChangeUser && (
        <RoleChangeModal
          user={roleChangeUser}
          onClose={() => setRoleChangeUser(null)}
          onSaved={() => void fetchUsers()}
        />
      )}
      {passwordResetUser && (
        <PasswordResetModal
          user={passwordResetUser}
          onClose={() => setPasswordResetUser(null)}
        />
      )}
      {tenantTransferUser && (
        <TenantTransferModal
          user={tenantTransferUser}
          onClose={() => setTenantTransferUser(null)}
          onSaved={() => void fetchUsers()}
        />
      )}
    </div>
  );
}

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

function StorageTab() {
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
        setTotalDbSize((statsRes as Record<string, unknown>).dbSizeBytes as number ?? 0);

        // Build storage list from tenants, sorted by total size descending
        const storageList: StorageTenant[] = (tenantsRes.data ?? [])
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

// ─── Tab: Migration ──────────────────────────────────────

interface AnalyzedPage {
  url: string;
  title: string;
  imageCount: number;
  textPreview: string;
}

// AI analysis types for non-WP sites
interface AiAnalyzedPage {
  url: string;
  title: string;
  type: 'static' | 'dynamic';
  category: string;
  suggestedBlocks: { blockType: string; props: Record<string, unknown> }[];
  extractedContent: {
    title?: string;
    textContent?: string;
    images?: string[];
    staffMembers?: { name: string; role: string; photoUrl: string; bio: string }[];
    sermons?: { title: string; date: string; scripture: string; youtubeUrl: string }[];
    events?: { title: string; date: string; description: string }[];
  };
  confidence: number;
}

interface AiPageMatch {
  sourceUrl: string;
  sourceTitle: string;
  targetPageId: string | null;
  targetPageTitle: string;
  targetPageSlug: string;
  confidence: number;
  blocks: { blockType: string; props: Record<string, unknown> }[];
}

interface AiTenantPage {
  id: string;
  title: string;
  slug: string;
}

interface AnalyzedSite {
  url: string;
  title: string;
  pageCount: number;
  menu: { label: string; href: string; children: { label: string; href: string }[] }[];
  pages: AnalyzedPage[];
}

interface MigrationSummary {
  pages: number;
  posts: number;
  sermons: number;
  bulletins: number;
  columns: number;
  events: number;
  staff: number;
  albums: number;
  history: number;
  boards: number;
  boardPosts: number;
  images: number;
  worshipTimes: number;
}

// Minimal type for the extracted data returned by the WP mapper
interface ExtractedPreview {
  churchInfo: { name: string; address: string; phone: string; email: string; description: string; logoUrl: string };
  sermons: { title: string; date: string; youtubeUrl: string }[];
  bulletins: { title: string; date: string }[];
  columns: { title: string }[];
  staff: { name: string; role: string }[];
  events: { title: string; date: string }[];
  albums: { title: string; images: string[] }[];
  history: { year: string; title: string }[];
  boards: { boardSlug: string; posts: { title: string }[] }[];
  pages: { title: string; slug: string }[];
  worshipTimes: { name: string; day: string; time: string }[];
  images: string[];
}

function MigrationTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [siteUrl, setSiteUrl] = useState('');
  const [targetSlug, setTargetSlug] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [site, setSite] = useState<AnalyzedSite | null>(null);
  const [isWordPress, setIsWordPress] = useState<boolean | null>(null);
  const [extracted, setExtracted] = useState<ExtractedPreview | null>(null);
  const [summary, setSummary] = useState<MigrationSummary | null>(null);
  const [previewSection, setPreviewSection] = useState<string | null>(null);
  const [confirmApply, setConfirmApply] = useState(false);
  const [tenants, setTenants] = useState<{ slug: string; name: string }[]>([]);

  // AI analysis state (non-WP flow)
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiPages, setAiPages] = useState<AiAnalyzedPage[] | null>(null);
  const [aiMatches, setAiMatches] = useState<AiPageMatch[]>([]);
  const [aiTenantPages, setAiTenantPages] = useState<AiTenantPage[]>([]);
  const [aiExtracted, setAiExtracted] = useState<ExtractedPreview | null>(null);
  const [aiSummary, setAiSummary] = useState<Record<string, number> | null>(null);
  const [aiStep, setAiStep] = useState<1 | 2 | 3 | 4>(1);
  const [aiApplying, setAiApplying] = useState(false);

  // Fetch available tenants
  useEffect(() => {
    apiFetch<{ data: { slug: string; name: string }[] }>('/tenants?page=1&perPage=100')
      .then((res) => setTenants(res.data))
      .catch(() => {});
  }, [apiFetch]);

  const handleAnalyze = async () => {
    if (!siteUrl.trim() || !targetSlug) {
      showToast('error', '사이트 URL과 테넌트를 선택하세요');
      return;
    }
    setAnalyzing(true);
    setSite(null);
    setExtracted(null);
    setSummary(null);
    setPreviewSection(null);
    setConfirmApply(false);
    // Reset AI flow state for unified matching
    setAiPages(null);
    setAiMatches([]);
    setAiStep(1);
    try {
      const res = await apiFetch<{
        success: boolean;
        isWordPress: boolean;
        site: AnalyzedSite;
        extracted: ExtractedPreview | null;
        summary: MigrationSummary | null;
      }>('/migration/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: siteUrl.trim(), maxPages: 30, forceWordPress: true }),
      });
      setSite(res.site);
      setExtracted(res.extracted ?? null);
      setSummary(res.summary ?? null);

      // After WP data fetch, proceed to matching step
      // Use site.pages (from WP API) for the matching UI
      const sitePages = res.site?.pages || [];
      const wpPages: AiAnalyzedPage[] = sitePages.map((p: any) => ({
        url: p.url || '',
        title: p.title || '',
        type: 'static' as const,
        category: 'other' as const,
        confidence: 0.8,
        suggestedBlocks: [],
      }));
      setAiPages(wpPages);
      setAiExtracted(res.extracted ?? null);
      setAiSummary(res.summary ? {
        sermons: res.summary.sermons, staff: res.summary.staff, events: res.summary.events,
        bulletins: res.summary.bulletins, columns: res.summary.columns, albums: res.summary.albums,
      } : null);

      // Fetch tenant pages for matching
      const tenantRes = await apiFetch<{ data: AiTenantPage[] }>(`/tenants/${targetSlug}/pages`).catch(() => ({ data: [] as AiTenantPage[] }));
      setAiTenantPages(tenantRes.data || []);

      // Auto-match by slug/title similarity
      const matches: AiPageMatch[] = wpPages.map((src) => {
        const match = (tenantRes.data || []).find((tp: AiTenantPage) =>
          tp.slug === src.url || tp.title === src.title
        );
        return {
          sourceUrl: src.url,
          sourceTitle: src.title,
          targetPageId: match?.id || null,
          targetPageTitle: match?.title || src.title,
          targetPageSlug: match?.slug || src.url,
          confidence: match ? 0.9 : 0.3,
          blocks: src.suggestedBlocks || [],
          action: match ? 'match' as const : 'create' as const,
        };
      });
      setAiMatches(matches);
      setAiStep(2);

      showToast('success', `WordPress 데이터 가져오기 완료 - ${res.site.pageCount}개 페이지`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'WordPress 데이터 가져오기 실패');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = async () => {
    if (!targetSlug || !site) return;
    if (!confirmApply) {
      setConfirmApply(true);
      return;
    }

    setApplying(true);
    try {
      // If we have WP extracted data, use it directly. Otherwise fallback to basic page data.
      const applyData = extracted
        ? extracted
        : {
            churchInfo: { name: site.title },
            pages: site.pages.map((p) => ({
              slug: p.url.replace(site.url, '').replace(/^\//, '') || 'home',
              sections: [
                { blockType: 'hero_banner', props: { title: p.title } },
                { blockType: 'text_only', props: { title: p.title, content: p.textPreview } },
              ],
            })),
          };

      const res = await apiFetch<{ success: boolean; result: Record<string, number> }>('/migration/apply', {
        method: 'POST',
        body: JSON.stringify({ tenantSlug: targetSlug, data: applyData }),
      });
      const r = res.result;
      const parts = [
        r.sermons ? `설교 ${r.sermons}` : '',
        r.staff ? `교역자 ${r.staff}` : '',
        r.events ? `행사 ${r.events}` : '',
        r.bulletins ? `주보 ${r.bulletins}` : '',
        r.columns ? `칼럼 ${r.columns}` : '',
        r.albums ? `앨범 ${r.albums}` : '',
        r.pages ? `페이지 ${r.pages}` : '',
        r.settings ? `설정 ${r.settings}` : '',
      ].filter(Boolean);
      showToast('success', `반영 완료: ${parts.join(', ') || '변경 없음'}`);
      setConfirmApply(false);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '반영 실패');
    } finally {
      setApplying(false);
    }
  };

  // ─── AI Analysis (non-WP) handlers ──────────────────────
  const handleAiAnalyze = async () => {
    if (!siteUrl.trim() || !targetSlug) return;
    setAiAnalyzing(true);
    setAiPages(null);
    setAiMatches([]);
    setAiExtracted(null);
    setAiSummary(null);
    setAiStep(1);
    try {
      const res = await apiFetch<{
        success: boolean;
        pages: AiAnalyzedPage[];
        suggestedMatches: AiPageMatch[];
        extracted: ExtractedPreview;
        summary: Record<string, number>;
        tenantPages: AiTenantPage[];
      }>('/migration/analyze-ai', {
        method: 'POST',
        body: JSON.stringify({ siteUrl: siteUrl.trim(), tenantSlug: targetSlug }),
      });
      setAiPages(res.pages);
      setAiMatches(res.suggestedMatches);
      setAiExtracted(res.extracted);
      setAiSummary(res.summary);
      setAiTenantPages(res.tenantPages);
      setAiStep(2);
      showToast('success', `AI 분석 완료 - ${res.pages.length}개 페이지 분류됨`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'AI 분석 실패');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleAiMatchChange = (sourceUrl: string, targetPageId: string | null) => {
    setAiMatches((prev) =>
      prev.map((m) => {
        if (m.sourceUrl !== sourceUrl) return m;
        if (targetPageId === null) {
          return { ...m, targetPageId: null, targetPageTitle: m.sourceTitle, targetPageSlug: '' };
        }
        const tp = aiTenantPages.find((p) => p.id === targetPageId);
        if (!tp) return m;
        return { ...m, targetPageId: tp.id, targetPageTitle: tp.title, targetPageSlug: tp.slug };
      }),
    );
  };

  const handleAiApply = async () => {
    if (!targetSlug || !aiMatches.length) return;
    setAiApplying(true);
    try {
      const res = await apiFetch<{ success: boolean; result: Record<string, number> }>('/migration/apply-matched', {
        method: 'POST',
        body: JSON.stringify({
          tenantSlug: targetSlug,
          matches: aiMatches
            .filter((m) => m.targetPageId !== null || m.blocks.length > 0)
            .map((m) => ({
              sourceUrl: m.sourceUrl,
              targetPageId: m.targetPageId,
              targetSlug: m.targetPageSlug,
              blocks: m.blocks,
            })),
          dynamicContent: aiExtracted,
        }),
      });
      const r = res.result;
      const parts = [
        r.sermons ? `설교 ${r.sermons}` : '',
        r.staff ? `교역자 ${r.staff}` : '',
        r.events ? `행사 ${r.events}` : '',
        r.bulletins ? `주보 ${r.bulletins}` : '',
        r.pages ? `페이지 ${r.pages}` : '',
      ].filter(Boolean);
      showToast('success', `마이그레이션 완료: ${parts.join(', ') || '변경 없음'}`);
      setAiStep(4);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '마이그레이션 반영 실패');
    } finally {
      setAiApplying(false);
    }
  };

  // Summary stat items for display
  const summaryItems = summary
    ? [
        { label: '페이지', value: summary.pages, color: 'blue' },
        { label: '설교', value: summary.sermons, color: 'indigo' },
        { label: '교역자', value: summary.staff, color: 'green' },
        { label: '행사', value: summary.events, color: 'orange' },
        { label: '주보', value: summary.bulletins, color: 'pink' },
        { label: '칼럼', value: summary.columns, color: 'purple' },
        { label: '앨범', value: summary.albums, color: 'teal' },
        { label: '연혁', value: summary.history, color: 'gray' },
        { label: '게시판', value: summary.boardPosts, color: 'yellow' },
        { label: '이미지', value: summary.images, color: 'red' },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Step 1: Input URL */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">사이트 마이그레이션</h3>
        <p className="text-xs text-gray-500 mb-4">사이트 유형을 선택하세요.</p>
        <div className="flex bg-gray-100 rounded-lg p-0.5 mb-4 w-fit">
          <button
            type="button"
            onClick={() => setIsWordPress(true)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${isWordPress === true ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            WordPress
          </button>
          <button
            type="button"
            onClick={() => setIsWordPress(false)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${isWordPress === false ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            일반 사이트
          </button>
        </div>

        {isWordPress !== null && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">사이트 URL</label>
              <input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://example-church.com"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              {isWordPress && <p className="text-[10px] text-gray-400 mt-1">사이트 주소만 입력하세요. REST API는 자동으로 연결됩니다.</p>}
              {!isWordPress && <p className="text-[10px] text-gray-400 mt-1">AI가 페이지를 분석하여 정적/동적 콘텐츠를 자동 분류합니다</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">마이그레이션 대상 테넌트</label>
              <select value={targetSlug} onChange={(e) => setTargetSlug(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">테넌트 선택</option>
                {tenants.map((t) => <option key={t.slug} value={t.slug}>{t.name} ({t.slug})</option>)}
              </select>
            </div>
            <button
              onClick={isWordPress ? handleAnalyze : handleAiAnalyze}
              disabled={analyzing || aiAnalyzing || !siteUrl.trim() || !targetSlug}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {analyzing || aiAnalyzing ? '진행 중...' : isWordPress ? 'WordPress 데이터 가져오기' : 'AI 사이트 분석'}
            </button>
          </div>
        )}
      </div>

      {/* WordPress Detection Badge */}
      {isWordPress !== null && site && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
          isWordPress
            ? 'bg-blue-50 border border-blue-200 text-blue-700'
            : 'bg-amber-50 border border-amber-200 text-amber-700'
        }`}>
          <span>{isWordPress ? 'WP' : 'AI'}</span>
          <span>
            {isWordPress
              ? 'WordPress REST API 감지 - 구조화된 데이터 추출 가능'
              : 'WordPress 미감지 - AI 분석 모드 사용 가능'}
          </span>
          {!isWordPress && !aiPages && (
            <button
              onClick={handleAiAnalyze}
              disabled={aiAnalyzing || !targetSlug}
              className="ml-auto bg-amber-600 text-white px-4 py-1 rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {aiAnalyzing ? 'AI 분석 중...' : 'AI 분석 시작'}
            </button>
          )}
        </div>
      )}

      {/* AI tenant selector (needed before AI analysis) */}
      {isWordPress === false && site && !aiPages && !aiAnalyzing && (
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-xs text-gray-500 mb-2">AI 분석을 위해 대상 테넌트를 먼저 선택하세요 (페이지 매칭에 사용됩니다):</p>
          <select
            value={targetSlug}
            onChange={(e) => setTargetSlug(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full"
          >
            <option value="">테넌트 선택</option>
            {tenants.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name} ({t.slug})</option>
            ))}
          </select>
        </div>
      )}

      {/* AI Analyzing Progress */}
      {aiAnalyzing && (
        <div className="bg-white rounded-xl border border-amber-200 p-8 text-center">
          <div className="animate-pulse">
            <p className="text-2xl mb-2">AI</p>
            <p className="text-sm text-amber-700 font-medium">AI 분석 중...</p>
            <p className="text-xs text-gray-400 mt-2">Gemini AI가 각 페이지를 분류하고 콘텐츠를 추출하고 있습니다.</p>
            <p className="text-xs text-gray-400">페이지 수에 따라 1~2분 소요될 수 있습니다.</p>
          </div>
        </div>
      )}

      {/* AI Step 2: Analysis Results */}
      {aiPages && aiStep >= 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">AI 분석 결과</h3>
          <p className="text-xs text-gray-500 mb-4">
            {aiPages.length}개 페이지 분석 완료 |
            정적: {aiPages.filter((p) => p.type === 'static').length}개,
            동적: {aiPages.filter((p) => p.type === 'dynamic').length}개
          </p>

          {/* Category summary chips */}
          {aiSummary && (
            <div className="flex flex-wrap gap-2 mb-4">
              {aiSummary.static > 0 && (
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">정적 {aiSummary.static}</span>
              )}
              {aiSummary.dynamic > 0 && (
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">동적 {aiSummary.dynamic}</span>
              )}
              {aiSummary.sermons > 0 && (
                <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs">설교 {aiSummary.sermons}</span>
              )}
              {aiSummary.staff > 0 && (
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">교역자 {aiSummary.staff}</span>
              )}
              {aiSummary.events > 0 && (
                <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs">행사 {aiSummary.events}</span>
              )}
            </div>
          )}

          {/* Pages table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">페이지</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 w-20">유형</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 w-24">카테고리</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 w-20">확신도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {aiPages.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-800 truncate">{p.title || '(제목 없음)'}</p>
                      <p className="text-xs text-gray-400 truncate">{p.url}</p>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        p.type === 'static'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {p.type === 'static' ? '정적' : '동적'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-600">{p.category}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs font-medium ${
                        p.confidence >= 0.7 ? 'text-green-600' :
                        p.confidence >= 0.4 ? 'text-amber-600' : 'text-red-500'
                      }`}>
                        {Math.round(p.confidence * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => setAiStep(3)}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            페이지 매칭 확인 &rarr;
          </button>
        </div>
      )}

      {/* AI Step 3: Page Matching */}
      {aiPages && aiStep >= 3 && aiStep < 4 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">페이지 매칭</h3>
          <p className="text-xs text-gray-500 mb-4">
            소스 페이지와 대상 테넌트 페이지를 매칭하세요. 자동 매칭된 항목을 확인하고 필요 시 수정하세요.
          </p>

          <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
            {aiMatches.map((m, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${
                m.targetPageId ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}>
                {/* Source page */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{m.sourceTitle}</p>
                  <p className="text-xs text-gray-400 truncate">{m.sourceUrl}</p>
                </div>

                <span className="text-gray-300 text-lg flex-shrink-0">&rarr;</span>

                {/* Target page selector */}
                <div className="flex-1">
                  <select
                    value={m.targetPageId || '__new__'}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleAiMatchChange(m.sourceUrl, val === '__new__' ? null : val);
                    }}
                    className={`w-full border rounded-lg px-2 py-1.5 text-sm ${
                      m.targetPageId ? 'border-green-300 bg-white' : 'border-gray-300 bg-white'
                    }`}
                  >
                    <option value="__new__">+ 새 페이지 생성</option>
                    {aiTenantPages.map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {tp.title} (/{tp.slug})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Confidence badge */}
                <span className={`text-xs font-medium flex-shrink-0 w-10 text-center ${
                  m.confidence >= 0.6 ? 'text-green-600' :
                  m.confidence >= 0.3 ? 'text-amber-600' : 'text-gray-400'
                }`}>
                  {Math.round(m.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>

          {/* Dynamic content summary */}
          {aiExtracted && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">추출된 동적 콘텐츠:</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {aiExtracted.sermons.length > 0 && (
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">설교 {aiExtracted.sermons.length}건</span>
                )}
                {aiExtracted.staff.length > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">교역자 {aiExtracted.staff.length}명</span>
                )}
                {aiExtracted.events.length > 0 && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">행사 {aiExtracted.events.length}건</span>
                )}
                {aiExtracted.bulletins.length > 0 && (
                  <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded">주보 {aiExtracted.bulletins.length}건</span>
                )}
                {aiExtracted.albums.length > 0 && (
                  <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded">앨범 {aiExtracted.albums.length}건</span>
                )}
                {aiExtracted.pages.length > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">정적 페이지 {aiExtracted.pages.length}건</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setAiStep(2)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              &larr; 뒤로
            </button>
            <button
              onClick={handleAiApply}
              disabled={aiApplying}
              className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {aiApplying ? '반영 중...' : '마이그레이션 적용'}
            </button>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            주의: 매칭된 페이지의 섹션 콘텐츠가 덮어씌워지고, 동적 콘텐츠가 추가됩니다.
          </p>
        </div>
      )}

      {/* AI Step 4: Result */}
      {aiStep === 4 && (
        <div className="bg-white rounded-xl border border-green-200 p-6">
          <h3 className="text-base font-semibold text-green-800 mb-2">마이그레이션 완료</h3>
          <p className="text-sm text-green-700">AI 기반 마이그레이션이 성공적으로 완료되었습니다.</p>
          <p className="text-xs text-gray-500 mt-2">
            대상 테넌트: {targetSlug} | 이미지는 원본 URL을 유지합니다 (R2 업로드는 별도 진행).
          </p>
        </div>
      )}

      {/* Step 2: Analysis Result (WP or basic HTML mode) */}
      {site && !aiPages && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">2단계: 분석 결과</h3>

          {/* Summary stats grid - WP mode shows detailed breakdown */}
          {summaryItems.length > 0 ? (
            <div className="grid grid-cols-5 gap-3 mb-6">
              {summaryItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setPreviewSection(previewSection === item.label ? null : item.label)}
                  className={`rounded-lg p-3 text-center transition-colors cursor-pointer ${
                    previewSection === item.label
                      ? 'bg-blue-100 border-2 border-blue-400'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <p className="text-xl font-bold text-gray-800">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{site.pageCount}</p>
                <p className="text-xs text-blue-500">페이지</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{site.menu.length}</p>
                <p className="text-xs text-green-500">메뉴 항목</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{site.pages.reduce((sum, p) => sum + p.imageCount, 0)}</p>
                <p className="text-xs text-purple-500">이미지</p>
              </div>
            </div>
          )}

          {/* Detailed preview per category (WP mode) */}
          {previewSection && extracted && (
            <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700">{previewSection} 미리보기</h4>
              </div>
              <div className="max-h-64 overflow-y-auto p-3 space-y-2 text-sm">
                {previewSection === '설교' && extracted.sermons.map((s, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium truncate flex-1">{s.title}</span>
                    <span className="text-xs text-gray-400 ml-2">{s.date}</span>
                    {s.youtubeUrl && <span className="text-xs text-red-400 ml-2">YT</span>}
                  </div>
                ))}
                {previewSection === '교역자' && extracted.staff.map((s, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-gray-400">{s.role}</span>
                  </div>
                ))}
                {previewSection === '행사' && extracted.events.map((e, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium truncate flex-1">{e.title}</span>
                    <span className="text-xs text-gray-400 ml-2">{e.date}</span>
                  </div>
                ))}
                {previewSection === '주보' && extracted.bulletins.map((b, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium truncate flex-1">{b.title}</span>
                    <span className="text-xs text-gray-400 ml-2">{b.date}</span>
                  </div>
                ))}
                {previewSection === '칼럼' && extracted.columns.map((c, i) => (
                  <div key={i} className="p-2 bg-gray-50 rounded">
                    <span className="font-medium">{c.title}</span>
                  </div>
                ))}
                {previewSection === '앨범' && extracted.albums.map((a, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium truncate flex-1">{a.title}</span>
                    <span className="text-xs text-gray-400 ml-2">{a.images.length}장</span>
                  </div>
                ))}
                {previewSection === '연혁' && extracted.history.map((h, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium truncate flex-1">{h.title}</span>
                    <span className="text-xs text-gray-400 ml-2">{h.year}</span>
                  </div>
                ))}
                {previewSection === '게시판' && extracted.boards.map((board, i) => (
                  <div key={i} className="mb-2">
                    <p className="text-xs font-semibold text-gray-500 mb-1">{board.boardSlug} ({board.posts.length})</p>
                    {board.posts.slice(0, 5).map((p, j) => (
                      <div key={j} className="p-1 pl-3 text-gray-600">{p.title}</div>
                    ))}
                    {board.posts.length > 5 && (
                      <p className="pl-3 text-xs text-gray-400">... 외 {board.posts.length - 5}건</p>
                    )}
                  </div>
                ))}
                {previewSection === '페이지' && extracted.pages.map((p, i) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium truncate flex-1">{p.title}</span>
                    <span className="text-xs text-gray-400 ml-2">/{p.slug}</span>
                  </div>
                ))}
                {previewSection === '이미지' && (
                  <div>
                    <p className="text-gray-500 mb-2">{extracted.images.length}개 이미지 발견 (R2 업로드 대기)</p>
                    {extracted.images.slice(0, 10).map((url, i) => (
                      <p key={i} className="text-xs text-gray-400 truncate">{url}</p>
                    ))}
                    {extracted.images.length > 10 && (
                      <p className="text-xs text-gray-400 mt-1">... 외 {extracted.images.length - 10}개</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Menu structure */}
          {site.menu.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">메뉴 구조</h4>
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                {site.menu.map((m, i) => (
                  <div key={i}>
                    <span className="font-medium">{m.label}</span>
                    {m.children.length > 0 && (
                      <div className="ml-4 text-gray-500">
                        {m.children.map((c, j) => (
                          <div key={j}>└ {c.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pages */}
          <h4 className="text-sm font-semibold text-gray-700 mb-2">발견된 페이지</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {site.pages.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.title || '(제목 없음)'}</p>
                  <p className="text-xs text-gray-400 truncate">{p.url}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.textPreview}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{p.imageCount}장</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Apply with confirmation (WP or basic HTML mode — hidden during AI flow) */}
      {site && !aiPages && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">3단계: 데이터 반영</h3>
          <p className="text-xs text-gray-500 mb-4">
            분석된 데이터를 어떤 테넌트에 반영할지 선택하세요.
            {isWordPress
              ? ' WordPress API에서 추출한 구조화된 데이터(설교, 교역자, 행사 등)가 직접 반영됩니다.'
              : ' 동적 데이터(설교, 교역자 등)는 API로, 정적 콘텐츠는 페이지 섹션으로 반영됩니다.'}
          </p>

          {/* Confirmation summary */}
          {confirmApply && summary && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-semibold text-amber-800 mb-2">반영 확인</p>
              <p className="text-xs text-amber-700 mb-2">
                아래 데이터가 "{targetSlug}" 테넌트에 반영됩니다:
              </p>
              <div className="grid grid-cols-4 gap-2 text-xs text-amber-700">
                {summary.sermons > 0 && <span>설교 {summary.sermons}건</span>}
                {summary.staff > 0 && <span>교역자 {summary.staff}명</span>}
                {summary.events > 0 && <span>행사 {summary.events}건</span>}
                {summary.bulletins > 0 && <span>주보 {summary.bulletins}건</span>}
                {summary.columns > 0 && <span>칼럼 {summary.columns}건</span>}
                {summary.albums > 0 && <span>앨범 {summary.albums}건</span>}
                {summary.pages > 0 && <span>페이지 {summary.pages}건</span>}
                {summary.history > 0 && <span>연혁 {summary.history}건</span>}
                {summary.boardPosts > 0 && <span>게시글 {summary.boardPosts}건</span>}
                {summary.images > 0 && <span>이미지 {summary.images}개 (R2 업로드 대기)</span>}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {applying ? '반영 중...' : '확인, 반영합니다'}
                </button>
                <button
                  onClick={() => setConfirmApply(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {!confirmApply && (
            <div className="flex gap-2">
              <select
                value={targetSlug}
                onChange={(e) => setTargetSlug(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm flex-1"
              >
                <option value="">테넌트 선택</option>
                {tenants.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.name} ({t.slug})</option>
                ))}
              </select>
              <button
                onClick={handleApply}
                disabled={applying || !targetSlug}
                className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {applying ? '반영 중...' : '데이터 반영'}
              </button>
            </div>
          )}
          <p className="text-xs text-amber-600 mt-2">
            주의: 이 작업은 기존 데이터와 병합됩니다. 중복 데이터가 생길 수 있습니다.
          </p>
        </div>
      )}

      {/* Info */}
      {!site && !analyzing && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-4xl mb-3">🔄</p>
          <p className="text-sm text-gray-500">기존 교회 웹사이트의 URL을 입력하면<br />페이지 구조와 콘텐츠를 자동으로 분석합니다.</p>
          <div className="mt-4 text-xs text-gray-400 space-y-1">
            <p>WordPress 사이트는 REST API로 구조화된 데이터를 자동 추출합니다.</p>
            <p>지원: 설교, 교역자, 행사, 연혁, 예배시간, 갤러리, 주보, 칼럼, 정적 페이지</p>
            <p>이미지는 R2 스토리지로 자동 마이그레이션됩니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── Main Dashboard Component ────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function SuperAdminDashboardV2() {
  const apiFetch = useAdminApi();
  const session = useAuthStore((s) => s.session);
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<GlobalStats>('/stats');
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다.');
    } finally {
      setStatsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  if (error && !stats) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-xl">
        <p className="font-bold text-lg mb-1">Super Admin 접근 오류</p>
        <p className="text-sm">{error}</p>
        <p className="text-xs mt-3 text-red-500">SUPER_ADMIN_EMAILS 환경 변수에 현재 로그인 이메일이 포함되어 있는지 확인하세요.</p>
      </div>
    );
  }

  const handleLogout = () => {
    useAuthStore.getState().logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-blue-600">True Light</span>
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">Super Admin</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">{session?.user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
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

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab
            stats={stats}
            loading={statsLoading}
            onCreateChurch={() => setShowCreateModal(true)}
          />
        )}
        {activeTab === 'tenants' && <TenantsTab />}
        {activeTab === 'domains' && <DomainsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'storage' && <StorageTab />}
        {activeTab === 'migration' && <MigrationTab />}
      </div>

      {/* Create Church Modal */}
      {showCreateModal && (
        <CreateChurchModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            void fetchStats();
          }}
        />
      )}
      </div>
    </div>
  );
}
