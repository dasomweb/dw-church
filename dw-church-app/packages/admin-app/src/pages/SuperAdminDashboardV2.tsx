import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore, handoffSessionToNewTab } from '../stores/auth';
import { useToast } from '../components';
import { AIBuilderModal } from '../components/super-admin/AIBuilderModal';
import { MigrationDialog } from '../components/super-admin/MigrationDialog';
import { resizeImage } from '../utils/resize-image';
// import MigrationTab from './MigrationTab';  // 보류

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
// 결제 모델 (2026-06-01 확정): Free 없음. Basic = 콘텐츠 편집만, Pro = + 페이지 추가,
// Enterprise = 별도 협의 (가격 노출 안 함, MRR 계산은 0 처리).
// "free" 키는 기존 데이터 호환용으로 남겨두지만 가격 0 + 회색 처리.
const PLAN_PRICES: Record<string, number> = { basic: 99, pro: 149, enterprise: 0, free: 0 };
const PLAN_COLORS: Record<string, string> = {
  enterprise: 'bg-amber-100 text-amber-700',
  pro: 'bg-purple-100 text-purple-700',
  basic: 'bg-blue-100 text-blue-700',
  free: 'bg-gray-100 text-gray-600',
};

type TabId = 'overview' | 'tenants' | 'domains' | 'users' | 'storage' | 'gallery';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: '개요', icon: '📊' },
  { id: 'tenants', label: '교회 관리', icon: '⛪' },
  { id: 'gallery', label: '이미지 라이브러리', icon: '🖼️' },
  { id: 'domains', label: '도메인 관리', icon: '🌐' },
  { id: 'users', label: '사용자 관리', icon: '👥' },
  { id: 'storage', label: '저장공간', icon: '💾' },
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
    // 2026-06-01 변경: 기본 plan free → basic. Free 티어 없음.
    plan: 'basic',
  });
  const [slugCheck, setSlugCheck] = useState<
    { state: 'idle' } | { state: 'checking' } | { state: 'ok' } | { state: 'bad'; reason: string }
  >({ state: 'idle' });

  // Debounced slug availability lookup.
  useEffect(() => {
    if (!form.slug) { setSlugCheck({ state: 'idle' }); return; }
    setSlugCheck({ state: 'checking' });
    const handle = setTimeout(async () => {
      try {
        const result = await apiFetch<{ available: boolean; reason?: string }>(
          `/tenants/check-slug?slug=${encodeURIComponent(form.slug)}`,
        );
        if (result.available) setSlugCheck({ state: 'ok' });
        else setSlugCheck({ state: 'bad', reason: result.reason ?? 'invalid_format' });
      } catch {
        setSlugCheck({ state: 'idle' });
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [form.slug, apiFetch]);

  const slugMessage = (() => {
    if (slugCheck.state === 'checking') return { text: '확인 중…', cls: 'text-gray-500' };
    if (slugCheck.state === 'ok')       return { text: '사용 가능합니다', cls: 'text-green-600' };
    if (slugCheck.state === 'bad') {
      const map: Record<string, string> = {
        taken: '이미 사용 중인 slug입니다',
        reserved: '시스템 예약어입니다 (admin, api, www 등)',
        invalid_format: '소문자/숫자/하이픈/언더스코어만 사용, 2글자 이상',
        empty: 'slug를 입력하세요',
      };
      return { text: map[slugCheck.reason] ?? '사용할 수 없습니다', cls: 'text-red-600' };
    }
    return null;
  })();

  const canSubmit = slugCheck.state === 'ok' && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
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
            <div className="relative">
              <input
                required
                value={form.slug}
                onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className={`w-full border rounded-lg px-3 py-2 pr-8 text-sm font-mono outline-none focus:ring-2 ${
                  slugCheck.state === 'ok'  ? 'border-green-400 focus:ring-green-500 focus:border-green-500' :
                  slugCheck.state === 'bad' ? 'border-red-400 focus:ring-red-500 focus:border-red-500' :
                                              'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="bethelfaith"
              />
              {slugCheck.state === 'ok'  && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600">✓</span>}
              {slugCheck.state === 'bad' && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600">✗</span>}
            </div>
            <div className="flex items-center justify-between text-xs mt-0.5">
              <span className="text-gray-400">{form.slug || 'slug'}.truelight.app</span>
              {slugMessage && <span className={slugMessage.cls}>{slugMessage.text}</span>}
            </div>
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
              <option value="basic">Basic ($99/월) — 콘텐츠 편집</option>
              <option value="pro">Pro ($149/월) — + 페이지 추가</option>
              <option value="enterprise">Enterprise — 별도 협의</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
function TenantsTab({ refreshKey = 0 }: { refreshKey?: number }) {
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
// ─── Create User Modal ───────────────────────────────────
// Super admin adds a user directly. Tenant binding is optional (super_admin
// users may have none). If no password is entered the server generates a
// temporary one and returns it ONCE — we surface it so the operator can hand
// it over; it is never stored in plain text.
function CreateUserModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('editor');
  const [tenantSlug, setTenantSlug] = useState('');
  const [password, setPassword] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      showToast('error', '이메일과 이름은 필수입니다.');
      return;
    }
    if (password && password.length < 8) {
      showToast('error', '비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ tempPassword?: string }>('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          role,
          tenantSlug: tenantSlug.trim() || undefined,
          password: password || undefined,
        }),
      });
      onSaved();
      if (res?.tempPassword) {
        // Keep the modal open to display the generated password once.
        setTempPassword(res.tempPassword);
        showToast('success', '사용자가 생성되었습니다. 임시 비밀번호를 전달하세요.');
      } else {
        showToast('success', '사용자가 생성되었습니다.');
        onClose();
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '사용자 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">사용자 추가</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {tempPassword ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              사용자가 생성되었습니다. 아래 임시 비밀번호를 사용자에게 전달하세요.
              <br />
              <span className="text-amber-600">이 비밀번호는 다시 표시되지 않습니다.</span>
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 font-mono text-sm text-gray-900 select-all break-all">
              {tempPassword}
            </div>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(tempPassword).catch(() => {});
                showToast('success', '복사되었습니다.');
              }}
              className="w-full bg-gray-100 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              비밀번호 복사
            </button>
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              완료
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">이메일 *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">이름 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">역할</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="member">Member</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                교회(테넌트) slug <span className="text-gray-400">— 선택</span>
              </label>
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="예: grace-church (비워두면 미지정)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                비밀번호 <span className="text-gray-400">— 비우면 자동 생성</span>
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="최소 8자 (선택)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '생성 중...' : '생성'}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                취소
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function UsersTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [roleChangeUser, setRoleChangeUser] = useState<User | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [tenantTransferUser, setTenantTransferUser] = useState<User | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);

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
        <button
          onClick={() => setShowCreateUser(true)}
          className="ml-auto inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <span>＋</span> 사용자 추가
        </button>
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
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onSaved={() => void fetchUsers()}
        />
      )}
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

interface SharedImage {
  id: string;
  url: string;
  title: string;
  category: string;
  tags: string[];
  isActive: boolean;
}

const GALLERY_CATEGORIES = [
  { id: 'nature', label: '자연' },
  { id: 'flower', label: '꽃' },
  { id: 'sky', label: '하늘' },
  { id: 'park', label: '공원' },
  { id: 'cross', label: '십자가' },
  { id: 'church', label: '교회' },
  { id: 'bible', label: '성경' },
  { id: 'abstract', label: '추상' },
];

function GalleryTab() {
  const { showToast } = useToast();
  const [images, setImages] = useState<SharedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('nature');
  const [showUpload, setShowUpload] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const session = useAuthStore((s) => s.session);
  const token = session?.accessToken;

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/shared-images?active=all', {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      const json = (await res.json()) as { data: SharedImage[] };
      setImages(json.data ?? []);
    } catch {
      showToast('error', '이미지를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, [token]);

  // Drag-drop or batch file select — every file goes up with category=auto
  // (server runs Gemini vision to pick a category).
  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setUploadingCount(list.length);
    let succeeded = 0;
    for (const file of list) {
      try {
        // Shared-library images are reused across many tenants → optimize hard
        // before upload: cap width at 1920px and re-encode as JPEG (q≈0.82).
        // Storage waste is a hard constraint. SVG/PDF/animated pass through.
        let toUpload: File = file;
        try {
          const resized = await resizeImage(file, 'background');
          toUpload = resized.file;
        } catch {
          // Resize failure (e.g. >20MB) → fall back to the original file.
        }
        const qs = new URLSearchParams({ title: file.name, category: 'auto' }).toString();
        const body = new FormData();
        body.append('file', toUpload);
        const res = await fetch(`/api/v1/admin/shared-images/upload?${qs}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token || ''}` },
          body,
        });
        if (!res.ok) throw new Error('upload failed');
        succeeded++;
        setUploadingCount((n) => n - 1);
      } catch {
        setUploadingCount((n) => n - 1);
      }
    }
    showToast(succeeded === list.length ? 'success' : 'error',
      `${succeeded}/${list.length}개 업로드 완료 (AI가 자동 분류했습니다)`);
    void reload();
  };

  const byCategory = images.filter((i) => i.category === activeCategory);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 이미지를 삭제하시겠습니까?\n사용 중인 테넌트에는 자동으로 복사본이 만들어져 경로가 유지됩니다.`)) return;
    try {
      const res = await fetch(`/api/v1/admin/shared-images/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (!res.ok) throw new Error('delete failed');
      const json = (await res.json().catch(() => ({}))) as { copiedToTenants?: number };
      const n = json.copiedToTenants ?? 0;
      showToast('success', n > 0 ? `삭제됨 — 사용 중인 ${n}개 테넌트에 복사본 생성됨` : '삭제되었습니다.');
      void reload();
    } catch {
      showToast('error', '삭제 실패');
    }
  };

  const handleToggleActive = async (img: SharedImage) => {
    try {
      const res = await fetch(`/api/v1/admin/shared-images/${img.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ isActive: !img.isActive }),
      });
      if (!res.ok) throw new Error('update failed');
      void reload();
    } catch {
      showToast('error', '상태 변경 실패');
    }
  };

  return (
    <div
      className="space-y-4"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">공용 이미지 라이브러리</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            드래그&드롭으로 여러 장 업로드 — AI가 카테고리를 자동 판별합니다. AI로 직접 생성할 수도 있어요.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerate(true)}
            className="bg-purple-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-purple-700"
          >
            ✨ AI로 생성
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-indigo-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-indigo-700"
          >
            + 이미지 업로드
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {GALLERY_CATEGORIES.map((c) => {
          const count = images.filter((i) => i.category === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                activeCategory === c.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c.label} {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Drop zone shell — wraps grid so drop works on the entire area */}
      <div className={`relative rounded-lg border-2 border-dashed transition-colors ${
        dragOver ? 'border-indigo-500 bg-indigo-50/40' : 'border-transparent'
      }`}>
        {uploadingCount > 0 && (
          <div className="absolute top-2 right-2 z-10 bg-white shadow px-2.5 py-1 rounded-full text-xs text-indigo-700 border border-indigo-200">
            업로드 중 {uploadingCount}장...
          </div>
        )}
        {loading ? (
          <div className="text-sm text-gray-400 py-10 text-center">불러오는 중...</div>
        ) : byCategory.length === 0 ? (
          <div className="text-sm text-gray-400 py-14 text-center">
            이 카테고리에 등록된 이미지가 없습니다.
            <br />이미지 파일을 여기로 드래그해서 추가하세요.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
            {byCategory.map((img) => (
              <div key={img.id} className={`group relative aspect-video rounded-lg overflow-hidden border ${img.isActive ? 'border-gray-200' : 'border-red-300 opacity-60'}`}>
                <img src={img.url} alt={img.title} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100">
                  <p className="text-white text-xs font-medium truncate">{img.title}</p>
                  <div className="flex gap-1">
                    <button onClick={() => handleToggleActive(img)} className="flex-1 text-[10px] bg-white/90 text-gray-800 py-1 rounded hover:bg-white">
                      {img.isActive ? '비활성' : '활성'}
                    </button>
                    <button onClick={() => handleDelete(img.id, img.title)} className="flex-1 text-[10px] bg-red-500 text-white py-1 rounded hover:bg-red-600">
                      삭제
                    </button>
                  </div>
                </div>
                {!img.isActive && (
                  <span className="absolute top-1 right-1 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">비활성</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <GalleryUploadModal
          defaultCategory={activeCategory}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); void reload(); }}
          token={token}
        />
      )}
      {showGenerate && (
        <GalleryGenerateModal
          onClose={() => setShowGenerate(false)}
          onGenerated={() => { setShowGenerate(false); void reload(); }}
          token={token}
        />
      )}
    </div>
  );
}

// AI generation modal — prompt + aspect-ratio multi-select. Server fans out
// across the chosen ratios, auto-classifies each result, and inserts rows.
const ASPECT_RATIO_OPTIONS: { id: '16:9' | '4:3' | '3:2' | '1:1' | '3:4' | '9:16'; label: string; hint: string }[] = [
  { id: '16:9', label: '16:9', hint: '히어로/배너' },
  { id: '4:3',  label: '4:3',  hint: '표준 와이드' },
  { id: '3:2',  label: '3:2',  hint: '카드' },
  { id: '1:1',  label: '1:1',  hint: '정사각/썸네일' },
  { id: '3:4',  label: '3:4',  hint: '세로 인물' },
  { id: '9:16', label: '9:16', hint: '모바일 전체화면' },
];

function GalleryGenerateModal({
  onClose,
  onGenerated,
  token,
}: {
  onClose: () => void;
  onGenerated: () => void;
  token?: string;
}) {
  const { showToast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [ratios, setRatios] = useState<Record<string, boolean>>({ '16:9': true });
  const [generating, setGenerating] = useState(false);

  const toggle = (r: string) => setRatios((prev) => ({ ...prev, [r]: !prev[r] }));
  const selected = Object.entries(ratios).filter(([, v]) => v).map(([k]) => k);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) { showToast('error', '프롬프트를 입력하세요'); return; }
    if (selected.length === 0) { showToast('error', '비율을 하나 이상 선택하세요'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/v1/admin/shared-images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ prompt: prompt.trim(), aspectRatios: selected }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error?.message || '생성 실패');
      }
      const json = await res.json() as { data: unknown[]; failures?: string[] };
      showToast('success',
        `${json.data.length}장 생성 완료${json.failures?.length ? ` (실패: ${json.failures.join(', ')})` : ''}`);
      onGenerated();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">✨ AI로 이미지 생성</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">프롬프트 *</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="예: 봄꽃이 만개한 공원의 아침 햇살, 파스텔톤, 부드러운 빛"
            className="w-full border rounded-lg px-3 py-2 text-sm leading-relaxed resize-y min-h-[100px]"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            자연 · 풍경 · 빛 · 꽃 중심으로 묘사해주세요. 세부 분위기·색감을 함께 적으면 결과가 더 일관됩니다.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">비율 (복수 선택 가능)</label>
          <div className="grid grid-cols-3 gap-2">
            {ASPECT_RATIO_OPTIONS.map((opt) => {
              const checked = !!ratios[opt.id];
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className={`rounded-lg border px-2 py-2 text-left transition-colors ${
                    checked ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-xs font-semibold ${checked ? 'text-purple-700' : 'text-gray-700'}`}>
                    {opt.label} {checked && '✓'}
                  </p>
                  <p className="text-[10px] text-gray-500">{opt.hint}</p>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            선택한 비율만큼 이미지가 생성됩니다 (비율당 1장). 각각 R2에 저장되고 AI가 카테고리를 자동 분류합니다.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={generating || !prompt.trim() || selected.length === 0}
            className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? '생성 중... (최대 1~2분)' : `${selected.length || 0}장 생성`}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

function GalleryUploadModal({
  defaultCategory,
  onClose,
  onUploaded,
  token,
}: {
  defaultCategory: string;
  onClose: () => void;
  onUploaded: () => void;
  token?: string;
}) {
  const { showToast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  // Default to the category the operator was viewing; 'AI 자동 분류' (auto)
  // lets the server vision-classify each image instead.
  const [category, setCategory] = useState(defaultCategory || 'auto');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | File[]) => {
    const imgs = Array.from(incoming).filter((f) => f.type.startsWith('image/'));
    if (imgs.length === 0) return;
    setFiles((prev) => [...prev, ...imgs]);
  };
  const removeAt = (i: number) => setFiles((prev) => prev.filter((_, x) => x !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) { showToast('error', '이미지를 추가하세요'); return; }
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    let succeeded = 0;
    for (const file of files) {
      try {
        // Shared-library images are reused across tenants → resize to 1920px
        // JPEG before upload. SVG/PDF/animated pass through; >20MB falls back.
        let toUpload: File = file;
        try {
          const resized = await resizeImage(file, 'background');
          toUpload = resized.file;
        } catch { /* keep original */ }
        const qs = new URLSearchParams({
          title: file.name,
          category,
          ...(tags.trim() ? { tags } : {}),
        }).toString();
        const body = new FormData();
        body.append('file', toUpload);
        const res = await fetch(`/api/v1/admin/shared-images/upload?${qs}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token || ''}` },
          body,
        });
        if (res.ok) succeeded++;
      } catch { /* count as failure */ }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setUploading(false);
    showToast(succeeded === files.length ? 'success' : 'error',
      `${succeeded}/${files.length}장 업로드 완료${category === 'auto' ? ' (AI 자동 분류)' : ''}`);
    onUploaded();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">공용 이미지 업로드</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {/* Multi-file drag & drop dropzone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
          }}
          className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragOver ? 'border-indigo-500 bg-indigo-50/60' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
          }`}
        >
          <div className="text-2xl">🖼️</div>
          <p className="mt-1 text-sm font-medium text-gray-700">여기로 여러 이미지를 드래그&드롭</p>
          <p className="text-xs text-gray-400">또는 클릭해서 선택 (여러 장 선택 가능)</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
          />
        </div>

        {/* Selected files */}
        {files.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 divide-y">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="truncate text-gray-700">{f.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-400">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                  <button type="button" onClick={() => removeAt(i)} className="text-red-400 hover:text-red-600">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">카테고리</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="auto">AI 자동 분류</option>
            {GALLERY_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">태그 (쉼표 구분, 선택)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="봄, 꽃, 따뜻한"
            className="w-full border rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={uploading || files.length === 0}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? `업로드 중... ${progress.done}/${progress.total}` : `${files.length > 0 ? files.length + '장 ' : ''}업로드`}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
            취소
          </button>
        </div>
      </form>
    </div>
  );
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

// ─── Tab: Migration — imported from MigrationTab.tsx ──────

// ═══════════════════════════════════════════════════════════
// ─── Main Dashboard Component ────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function SuperAdminDashboardV2() {
  const apiFetch = useAdminApi();
  const session = useAuthStore((s) => s.session);

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Bumped after a successful create — TenantsTab watches this and refetches
  // so the new church shows up immediately without a page reload.
  const [tenantsRefreshKey, setTenantsRefreshKey] = useState(0);

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
            <a href="/profile" className="text-gray-500 hover:text-blue-600 transition-colors">{session?.user?.email}</a>
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
        {activeTab === 'tenants' && <TenantsTab refreshKey={tenantsRefreshKey} />}
        {activeTab === 'gallery' && <GalleryTab />}
        {activeTab === 'domains' && <DomainsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'storage' && <StorageTab />}
        {/* {activeTab === 'migration' && <MigrationTab />} */}
      </div>

      {/* Create Church Modal */}
      {showCreateModal && (
        <CreateChurchModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            void fetchStats();
            setTenantsRefreshKey((n) => n + 1);
            setActiveTab('tenants'); // jump to the list so the new row is visible
          }}
        />
      )}
      </div>
    </div>
  );
}
