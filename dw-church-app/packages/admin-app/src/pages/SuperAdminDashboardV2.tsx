import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuthStore, handoffSessionToNewTab } from '../stores/auth';
import { useToast } from '../components';
import { AIBuilderModal } from '../components/super-admin/AIBuilderModal';
import { MigrationDialog } from '../components/super-admin/MigrationDialog';
import { useAdminApi } from '../super-admin/shared/use-admin-api';
import { TabIcon, StatCard, StatusBadge, VerifyBadge, Spinner, EmptyState } from '../super-admin/shared/admin-ui';
import { formatDate, formatBytes } from '../super-admin/shared/format';
import type { SupportTicket } from '../super-admin/shared/support';
import type { Tenant, GlobalStats, TenantsResponse, Domain, User, TenantDetail, Application, ApplicationStatus } from '../super-admin/shared/types';
import { PLAN_PRICES, PLAN_COLORS } from '../super-admin/shared/constants';
import DemoTab from '../super-admin/tabs/DemoTab';
import SiteSettingsTab from '../super-admin/tabs/SiteSettingsTab';
import BroadcastTab from '../super-admin/tabs/BroadcastTab';
import EmailSettingsTab from '../super-admin/tabs/EmailSettingsTab';
import EmailTemplatesTab from '../super-admin/tabs/EmailTemplatesTab';
import PricingTab from '../super-admin/tabs/PricingTab';
import SupportTab from '../super-admin/tabs/SupportTab';
import StorageTab from '../super-admin/tabs/StorageTab';
import IntakeTab from '../super-admin/tabs/IntakeTab';
import ReferenceDataTab from '../super-admin/tabs/ReferenceDataTab';
import GalleryTab from '../super-admin/tabs/GalleryTab';
import BillingTab from '../super-admin/tabs/BillingTab';
// import MigrationTab from './MigrationTab';  // 보류

// ─── Types ───────────────────────────────────────────────
// Domain types moved to ../super-admin/shared/types — imported at the top of this file.

// ─── Constants ───────────────────────────────────────────
// PLAN_PRICES / PLAN_COLORS moved to ../super-admin/shared/constants.

type TabId = 'monitoring' | 'overview' | 'tenants' | 'applications' | 'demo' | 'intake' | 'reference' | 'pricing' | 'billing' | 'email' | 'emailTemplates' | 'broadcast' | 'support' | 'domains' | 'users' | 'storage' | 'gallery' | 'siteSettings';

const TABS: { id: TabId; label: string; icon: JSX.Element }[] = [
  { id: 'monitoring', label: '모니터링', icon: TabIcon('M3 3v18h18M19 9l-5 5-4-4-3 3') },
  { id: 'overview', label: '개요', icon: TabIcon('M4 5h6v6H4zM14 5h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z') },
  { id: 'tenants', label: '교회 관리', icon: TabIcon('M3 21h18M5 21V7l7-4 7 4v14M9 21v-4a3 3 0 016 0v4M9 9h.01M15 9h.01') },
  { id: 'applications', label: '신청서', icon: TabIcon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2') },
  { id: 'demo', label: '데모 체험', icon: TabIcon('M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z') },
  { id: 'intake', label: '초기 입력', icon: TabIcon('M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3') },
  { id: 'reference', label: '참조 데이터', icon: TabIcon('M12 6.25C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v13C4.17 18.48 5.75 18 7.5 18s3.33.48 4.5 1.25m0-13C13.17 5.48 14.75 5 16.5 5s3.33.48 4.5 1.25v13C19.83 18.48 18.25 18 16.5 18s-3.33.48-4.5 1.25m0-13v13') },
  { id: 'pricing', label: '상품/가격', icon: TabIcon('M7 7h.01M3 5v4.586a2 2 0 00.586 1.414l8 8a2 2 0 002.828 0l4.586-4.586a2 2 0 000-2.828l-8-8A2 2 0 009.586 3H5a2 2 0 00-2 2z') },
  { id: 'billing', label: '과금', icon: TabIcon('M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z') },
  { id: 'email', label: '이메일/SMTP', icon: TabIcon('M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z') },
  { id: 'emailTemplates', label: '이메일 템플릿', icon: TabIcon('M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2') },
  { id: 'broadcast', label: '공지·마케팅', icon: TabIcon('M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4 4 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a4 4 0 01-1.564-.317z') },
  { id: 'support', label: '고객지원', icon: TabIcon('M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-6 0a3 3 0 11-6 0 3 3 0 016 0z') },
  { id: 'gallery', label: '이미지 라이브러리', icon: TabIcon('M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z') },
  { id: 'domains', label: '도메인 관리', icon: TabIcon('M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18') },
  { id: 'users', label: '사용자 관리', icon: TabIcon('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z') },
  { id: 'storage', label: '저장공간', icon: TabIcon('M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3-3.582 3-8 3-8-1.343-8-3zM4 7v5c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 12v5c0 1.657 3.582 3 8 3s8-1.343 8-3v-5') },
  { id: 'siteSettings', label: '사이트 설정', icon: TabIcon('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z') },
];

// Grouped navigation for the modern sidebar — related surfaces sit together so
// the 16-item list reads as a few intuitive sections instead of one long row.
const NAV_GROUPS: { label: string; ids: TabId[] }[] = [
  { label: '대시보드', ids: ['monitoring', 'overview'] },
  { label: '운영', ids: ['tenants', 'applications', 'demo', 'intake', 'support'] },
  { label: '매출 · 상품', ids: ['pricing', 'billing'] },
  { label: '이메일', ids: ['email', 'emailTemplates', 'broadcast'] },
  { label: '시스템', ids: ['siteSettings', 'domains', 'users', 'storage', 'gallery', 'reference'] },
];

const TAB_META: Record<TabId, { label: string; icon: JSX.Element }> = Object.fromEntries(
  TABS.map((t) => [t.id, { label: t.label, icon: t.icon }]),
) as Record<TabId, { label: string; icon: JSX.Element }>;

// Support ticket types/helpers and date/byte formatters moved to
// ../super-admin/shared/{support,format} — imported at the top of this file.

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
// ═══════════════════════════════════════════════════════════
// ─── Tab: Monitoring (시스템 모니터링) ────────────────────────
// ═══════════════════════════════════════════════════════════
// Live platform health (GET /health, polled) + aggregated KPIs (/admin/stats)
// + operational queues (신규 신청 / 이단 의심 / 미처리 지원). App-level metrics
// only — there's no Railway infra integration. Health polls every 30s.

function formatUptime(seconds?: number): string {
  if (!seconds || seconds < 0) return '-';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}일 ${h}시간`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function MonitoringTab({
  stats,
  loading,
  onRefresh,
}: {
  stats: GlobalStats | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const apiFetch = useAdminApi();
  const session = useAuthStore((s) => s.session);
  const [health, setHealth] = useState<{ status: string; version?: string; uptime?: number } | null>(null);
  const [healthErr, setHealthErr] = useState(false);
  const [newCount, setNewCount] = useState<number | null>(null);
  const [cultAlertCount, setCultAlertCount] = useState<number | null>(null);
  const [openSupportCount, setOpenSupportCount] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [services, setServices] = useState<{ key: string; label: string; status: string }[] | null>(null);

  const baseUrl = (() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';
  })();

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/health`, {
        headers: { Authorization: `Bearer ${session?.accessToken || ''}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setHealth({ status: j.status ?? 'ok', version: j.version, uptime: j.uptime });
      setHealthErr(false);
    } catch {
      setHealth(null);
      setHealthErr(true);
    }
    setLastUpdated(new Date());
  }, [baseUrl, session?.accessToken]);

  const loadOps = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: Application[] } | Application[]>('/applications');
      const apps = Array.isArray(res) ? res : res.data ?? [];
      setNewCount(apps.filter((a) => a.status === 'new').length);
      setCultAlertCount(apps.filter((a) => a.denominationStatus === 'cult' && !a.denominationVerified).length);
    } catch {
      setNewCount(0);
      setCultAlertCount(0);
    }
    try {
      const res = await apiFetch<{ data: SupportTicket[] } | SupportTicket[]>('/support-tickets');
      const list = Array.isArray(res) ? res : res.data ?? [];
      setOpenSupportCount(list.filter((t) => t.status === 'open' || t.status === 'in_progress').length);
    } catch {
      setOpenSupportCount(0);
    }
  }, [apiFetch]);

  const loadServices = useCallback(async () => {
    try {
      type Svc = { key: string; label: string; status: string };
      const res = await apiFetch<{ data?: { services: Svc[] }; services?: Svc[] }>('/services-health');
      setServices(res.data?.services ?? res.services ?? []);
    } catch {
      setServices([]);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadHealth();
    void loadOps();
    void loadServices();
    // Poll health + service status every 30s so the dots stay live.
    const h = setInterval(() => { void loadHealth(); void loadServices(); }, 30000);
    return () => clearInterval(h);
  }, [loadHealth, loadOps, loadServices]);

  const refreshAll = () => {
    onRefresh();
    void loadHealth();
    void loadOps();
    void loadServices();
  };

  const ok = !!health && health.status === 'ok' && !healthErr;
  const inactiveTenants = stats ? Math.max(0, stats.totalTenants - stats.activeTenants) : 0;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">시스템 모니터링</h2>
          <p className="text-xs text-gray-500">
            {lastUpdated ? `마지막 업데이트 ${lastUpdated.toLocaleTimeString('ko-KR')}` : '불러오는 중…'} · 상태 30초마다 자동 갱신
          </p>
        </div>
        <button
          onClick={refreshAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114-3M20 15a8 8 0 01-14 3" /></svg>
          새로고침
        </button>
      </div>

      {/* System health banner */}
      <div className={`rounded-xl border p-5 ${ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className={`relative grid h-10 w-10 place-items-center rounded-full ${ok ? 'bg-green-100' : 'bg-red-100'}`}>
              <span className={`h-3 w-3 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
              {ok && <span className="absolute h-3 w-3 rounded-full bg-green-400 animate-ping" />}
            </span>
            <div>
              <p className={`text-base font-bold ${ok ? 'text-green-700' : 'text-red-700'}`}>
                {ok ? 'API 서버 정상' : 'API 서버 응답 없음'}
              </p>
              <p className={`text-xs ${ok ? 'text-green-600' : 'text-red-600'}`}>
                {ok ? 'api.truelight.app · /health 200 OK' : '/health 응답 실패 — 서버/네트워크 확인 필요'}
              </p>
            </div>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-[11px] font-medium text-gray-500">버전</p>
              <p className="text-sm font-bold text-gray-900">{health?.version ?? '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500">가동 시간</p>
              <p className="text-sm font-bold text-gray-900">{formatUptime(health?.uptime)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Per-service status — api / db / web / agents pinged server-side */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">서비스 상태</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(services ?? [{ key: 'api', label: 'API 서버', status: '' }, { key: 'db', label: '데이터베이스', status: '' }, { key: 'web', label: '웹사이트', status: '' }, { key: 'agents', label: 'AI 빌더(에이전트)', status: '' }]).map((s) => {
            const up = s.status === 'ok';
            const down = s.status === 'down';
            const unknown = s.status === 'unknown' || s.status === '';
            return (
              <div key={s.key} className={`flex items-center gap-2.5 rounded-lg border p-3 ${up ? 'border-green-200 bg-green-50/50' : down ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-gray-50'}`}>
                <span className={`relative grid h-2.5 w-2.5 place-items-center`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${up ? 'bg-green-500' : down ? 'bg-red-500' : 'bg-gray-300'}`} />
                  {up && <span className="absolute h-2.5 w-2.5 rounded-full bg-green-400 animate-ping" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.label}</p>
                  <p className={`text-[11px] ${up ? 'text-green-600' : down ? 'text-red-600' : 'text-gray-400'}`}>
                    {unknown ? '확인 중…' : up ? '정상' : '응답 없음'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational queues — surface anything that needs action */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-xl border p-5 ${(newCount ?? 0) > 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white'}`}>
          <p className="text-sm font-medium text-gray-500">신규 신청서</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{newCount ?? '-'}</p>
          <p className="mt-0.5 text-xs text-gray-400">검토 대기 중인 신청</p>
        </div>
        <div className={`rounded-xl border p-5 ${(cultAlertCount ?? 0) > 0 ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white'}`}>
          <p className="text-sm font-medium text-gray-500">이단 의심 신청</p>
          <p className={`mt-1 text-3xl font-bold ${(cultAlertCount ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>{cultAlertCount ?? '-'}</p>
          <p className="mt-0.5 text-xs text-gray-400">미확인 cult 분류</p>
        </div>
        <div className={`rounded-xl border p-5 ${(openSupportCount ?? 0) > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'}`}>
          <p className="text-sm font-medium text-gray-500">미처리 지원</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{openSupportCount ?? '-'}</p>
          <p className="mt-0.5 text-xs text-gray-400">대기 + 처리중</p>
        </div>
      </div>

      {/* Platform KPIs */}
      {loading && !stats ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard title="전체 교회" value={stats?.totalTenants ?? 0} color="blue" />
          <StatCard title="활성 교회" value={stats?.activeTenants ?? 0} color="green" subtitle={`비활성 ${inactiveTenants}`} />
          <StatCard title="전체 사용자" value={stats?.totalUsers ?? 0} color="indigo" />
          <StatCard title="전체 설교" value={stats?.totalSermons ?? 0} color="purple" />
          <StatCard title="총 저장공간" value={formatBytes(stats?.totalStorage ?? 0)} color="cyan" />
          <StatCard title="DB 크기" value={formatBytes(stats?.totalDbSize ?? 0)} color="rose" />
        </div>
      )}

      {/* Plan distribution */}
      {stats && stats.planBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">플랜 분포</h3>
          <div className="space-y-2.5">
            {stats.planBreakdown.map((p) => {
              const total = stats.totalTenants || 1;
              const pct = Math.round((p.count / total) * 100);
              return (
                <div key={p.plan} className="flex items-center gap-3">
                  <span className={`inline-flex w-20 justify-center px-2 py-1 rounded-md text-xs font-bold ${PLAN_COLORS[p.plan] || 'bg-gray-100 text-gray-600'}`}>
                    {p.plan.toUpperCase()}
                  </span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p.plan === 'pro' ? 'bg-purple-500' : p.plan === 'basic' ? 'bg-blue-500' : p.plan === 'plus' ? 'bg-indigo-500' : p.plan === 'light' ? 'bg-cyan-500' : 'bg-gray-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm font-bold text-gray-900">{p.count}</span>
                  <span className="w-9 text-right text-xs text-gray-400">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({
  stats,
  loading,
  onCreateChurch,
  onGoToApplications,
}: {
  stats: GlobalStats | null;
  loading: boolean;
  onCreateChurch: () => void;
  onGoToApplications: () => void;
}) {
  const apiFetch = useAdminApi();
  // 운영 대시보드용 신청서 요약 — 신규 신청 수 + 이단 의심(미확인) 경보 수.
  const [newCount, setNewCount] = useState<number | null>(null);
  const [cultAlertCount, setCultAlertCount] = useState<number | null>(null);
  // 미처리 지원 — open/in_progress 상태의 support 티켓 수.
  const [openSupportCount, setOpenSupportCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<{ data: Application[] } | Application[]>('/applications');
        const apps = Array.isArray(res) ? res : res.data ?? [];
        if (cancelled) return;
        setNewCount(apps.filter((a) => a.status === 'new').length);
        setCultAlertCount(
          apps.filter((a) => a.denominationStatus === 'cult' && !a.denominationVerified).length,
        );
      } catch {
        // non-fatal — overview just won't show the application metrics
        if (!cancelled) {
          setNewCount(0);
          setCultAlertCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<{ data: SupportTicket[] } | SupportTicket[]>('/support-tickets');
        const list = Array.isArray(res) ? res : res.data ?? [];
        if (cancelled) return;
        setOpenSupportCount(
          list.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
        );
      } catch {
        // non-fatal — overview just won't show the support metric
        if (!cancelled) setOpenSupportCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  if (loading && !stats) return <Spinner />;

  const mrr = stats
    ? stats.planBreakdown.reduce((sum, p) => sum + (PLAN_PRICES[p.plan] ?? 0) * p.count, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* 이단 의심 경보 배너 — 미확인 cult 신청이 1건 이상이면 노출 */}
      {cultAlertCount != null && cultAlertCount > 0 && (
        <button
          onClick={onGoToApplications}
          className="w-full text-left rounded-xl border border-red-300 bg-red-50 px-5 py-4 hover:bg-red-100 transition-colors"
        >
          <p className="text-sm font-bold text-red-700">
            🚩 이단 의심 신청 {cultAlertCount}건 — 확인이 필요합니다.
          </p>
          <p className="mt-0.5 text-xs text-red-600">클릭하여 신청서 탭에서 검토하세요.</p>
        </button>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-4">
        <StatCard title="전체 교회" value={stats?.totalTenants ?? 0} color="blue" />
        <StatCard title="활성 교회" value={stats?.activeTenants ?? 0} color="green" />
        <StatCard title="전체 사용자" value={stats?.totalUsers ?? 0} color="indigo" />
        <StatCard title="전체 설교" value={stats?.totalSermons ?? 0} color="purple" />
        <StatCard title="총 저장공간" value={formatBytes(stats?.totalStorage ?? 0)} color="cyan" />
        <StatCard title="DB 크기" value={formatBytes(stats?.totalDbSize ?? 0)} color="rose" />
        <StatCard title="월 매출(MRR)" value={`$${mrr.toLocaleString()}`} color="amber" />
      </div>

      {/* 운영 지표 — 신청서 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="신규 신청서" value={newCount ?? '-'} color="blue" subtitle="status = 신규" />
        <StatCard
          title="🚩 이단 의심 신청"
          value={cultAlertCount ?? '-'}
          color="rose"
          subtitle="미확인 cult 분류"
        />
        <StatCard
          title="🎧 미처리 지원"
          value={openSupportCount ?? '-'}
          color="amber"
          subtitle="대기 + 처리중"
        />
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

// ═══════════════════════════════════════════════════════════
// ─── Tab: Applications (신청서 — website-build inbox) ──────
// ═══════════════════════════════════════════════════════════
// ApplicationStatus / Application moved to ../super-admin/shared/types.

// 개척/사역 유형 코드 → 한국어 라벨 (Send Network 모델).
const PLANTING_LABELS: Record<string, string> = {
  standard: '전통/표준 개척', covocational: '자비량/이중직(미자립)', multisite: '다중 사이트',
  multiethnic: '다민족/다언어', replant: '교회 재개척', micro: '마이크로/가정교회', other: '기타',
};

// 이단 대조 상태 배지 — recognized(정규)/watch(확인필요)/cult(이단)/null(미확인).
// denominationVerified 가 true 면 슈퍼어드민이 직접 "정통 교단" 확인한 것이므로
// 상태와 무관하게 "확인됨" 표시를 함께 노출한다.
function DenominationBadge({
  status,
  verified,
}: {
  status: 'recognized' | 'watch' | 'cult' | null;
  verified?: boolean;
}) {
  const map: Record<'recognized' | 'watch' | 'cult', { label: string; cls: string }> = {
    recognized: { label: '✓ 정규 교단', cls: 'bg-green-100 text-green-700' },
    cult: { label: '🚩 이단 의심', cls: 'bg-red-100 text-red-700' },
    watch: { label: '? 확인 필요', cls: 'bg-amber-100 text-amber-700' },
  };
  const fallback = { label: '미확인', cls: 'bg-gray-100 text-gray-600' };
  const entry = status ? map[status] : fallback;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${entry.cls}`}>
        {entry.label}
      </span>
      {verified && (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          ✓ 확인됨
        </span>
      )}
    </span>
  );
}

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: '신규',
  reviewing: '검토중',
  approved: '승인',
  paid: '결제완료',
  converted: '전환됨',
  rejected: '반려',
};

const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-amber-100 text-amber-700',
  approved: 'bg-indigo-100 text-indigo-700',
  paid: 'bg-green-100 text-green-700',
  converted: 'bg-purple-100 text-purple-700',
  rejected: 'bg-red-100 text-red-700',
};

const APPLICATION_STATUS_ORDER: ApplicationStatus[] = [
  'new',
  'reviewing',
  'approved',
  'paid',
  'converted',
  'rejected',
];

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
        APPLICATION_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {APPLICATION_STATUS_LABELS[status] || status}
    </span>
  );
}


function ApplicationsTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [selected, setSelected] = useState<Application | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Application[] } | Application[]>('/applications');
      setApplications(Array.isArray(res) ? res : res.data ?? []);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '신청서 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    void fetchApplications();
  }, [fetchApplications]);

  // newest-first, then apply the status filter
  const sorted = [...applications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const visible =
    statusFilter === 'all' ? sorted : sorted.filter((a) => a.status === statusFilter);

  const filterTabs: { id: 'all' | ApplicationStatus; label: string }[] = [
    { id: 'all', label: '전체' },
    ...APPLICATION_STATUS_ORDER.map((s) => ({ id: s, label: APPLICATION_STATUS_LABELS[s] })),
  ];

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {filterTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatusFilter(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <Spinner />
        ) : visible.length === 0 ? (
          <EmptyState
            message={statusFilter === 'all' ? '아직 신청서가 없습니다' : '해당 상태의 신청서가 없습니다'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 font-medium text-xs">
                  <th className="px-5 py-3">교회명</th>
                  <th className="px-5 py-3">담당자</th>
                  <th className="px-5 py-3">교단</th>
                  <th className="px-5 py-3">플랜</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">신청일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((a, idx) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className={`cursor-pointer hover:bg-blue-50/60 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{a.churchName}</span>
                        <DenominationBadge
                          status={a.denominationStatus}
                          verified={a.denominationVerified}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      <div>{a.contactName}</div>
                      <div className="text-xs text-gray-400">{a.email}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {a.denomination ? (
                        <span className="text-xs">{a.denomination}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {a.plan ? (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            PLAN_COLORS[a.plan] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {a.plan}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                      {a.billingPeriod && (
                        <span className="ml-1 text-xs text-gray-400">{a.billingPeriod}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <ApplicationStatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ApplicationDetailModal
          application={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            void fetchApplications();
          }}
        />
      )}
    </div>
  );
}

function ApplicationDetailModal({
  application,
  onClose,
  onChanged,
}: {
  application: Application;
  onClose: () => void;
  onChanged: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [adminNote, setAdminNote] = useState(application.adminNote ?? '');
  const [paymentLink, setPaymentLink] = useState(application.paymentLink ?? '');
  // 슈퍼어드민이 직접 "정통 교단(이단 아님)" 확인했는지 여부. 저장 시 PATCH 본문에 포함.
  const [denominationVerified, setDenominationVerified] = useState(application.denominationVerified);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Stripe Checkout 링크 자동 생성 중 여부.
  const [generating, setGenerating] = useState(false);

  const busy = saving || sending || deleting || generating;

  // 결제 링크 자동 생성 — 서버가 가격(상품/가격 탭의 단일 출처)으로 Stripe
  // Checkout 세션을 만들어 URL 을 반환한다. 생성된 URL 은 결제 링크 필드에만
  // 채워지고, 실제 발송은 운영자가 기존 "결제 링크 보내기"로 진행한다.
  const handleGenerateCheckoutLink = async () => {
    setGenerating(true);
    try {
      // billingPeriod(camelized). 없으면 연간을 기본으로 사용.
      const period = application.billingPeriod ?? 'yearly';
      const res = await apiFetch<{ data: { url: string; application: Application } }>(
        `/applications/${application.id}/checkout-link`,
        { method: 'POST', body: JSON.stringify({ period }) },
      );
      const url = res.data?.url;
      if (url) setPaymentLink(url);
      showToast('success', "결제 링크가 생성되었습니다. '결제 링크 보내기'로 발송하세요.");
    } catch (err) {
      // Stripe 키 미설정(503 / BILLING_NOT_CONFIGURED)이면 친절한 안내를 노출.
      const msg = err instanceof Error ? err.message : '';
      if (/BILLING_NOT_CONFIGURED|503/i.test(msg)) {
        showToast('error', 'Stripe API 키가 아직 설정되지 않았습니다. 키 설정 후 다시 시도하세요.');
      } else {
        showToast('error', msg || '결제 링크 생성 실패');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/applications/${application.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote, paymentLink, denominationVerified }),
      });
      showToast('success', '저장되었습니다.');
      onChanged();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '저장 실패');
      setSaving(false);
    }
  };

  const handleSendPaymentLink = async () => {
    if (!paymentLink.trim()) {
      showToast('error', '결제 링크를 먼저 입력하세요.');
      return;
    }
    if (!window.confirm('신청자에게 결제 링크 이메일을 보내시겠습니까? (상태가 승인으로 변경됩니다)')) return;
    setSending(true);
    try {
      await apiFetch(`/applications/${application.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentLink, sendPaymentLink: true }),
      });
      showToast('success', '결제 링크를 전송했습니다.');
      onChanged();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '결제 링크 전송 실패');
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`"${application.churchName}" 신청서를 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      await apiFetch(`/applications/${application.id}`, { method: 'DELETE' });
      showToast('success', '삭제되었습니다.');
      onChanged();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '삭제 실패');
      setDeleting(false);
    }
  };

  const Row = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="flex gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="w-24 shrink-0 text-xs font-medium text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 break-all">{value ?? <span className="text-gray-300">—</span>}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold">{application.churchName}</h3>
            <ApplicationStatusBadge status={application.status} />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        {/* 이단 대조 배지 — 모달 상단에 눈에 띄게 노출 */}
        <div className="mb-3">
          <DenominationBadge status={application.denominationStatus} verified={denominationVerified} />
        </div>

        {/* 이단/사이비 경고 — cult 로 분류되었고 아직 확인되지 않은 경우만 */}
        {application.denominationStatus === 'cult' && !denominationVerified && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            🚩 이단/사이비로 의심되는 단체입니다. 승인 전 반드시 확인하세요.
          </div>
        )}

        {/* Read-only details */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-2 mb-4">
          <Row label="담당자" value={application.contactName} />
          <Row label="이메일" value={application.email} />
          <Row label="연락처" value={application.phone} />
          <Row label="교회 주소" value={application.churchAddress} />
          <Row label="소속 교단" value={application.denomination} />
          <Row label="개척/사역 유형" value={application.plantingType ? (PLANTING_LABELS[application.plantingType] || application.plantingType) : null} />
          <Row label="교회 구성원" value={application.memberProfile} />
          <Row label="지역 환경(학군·대학·한인기업 등)" value={application.localContext} />
          <Row label="신앙고백 동의" value={application.faithAffirmed ? '✓ 동의함' : '미동의'} />
          {application.denominationMatch && (
            <Row label="대조 결과" value={`일치: ${application.denominationMatch}`} />
          )}
          <Row
            label="플랜"
            value={
              application.plan
                ? `${application.plan}${application.billingPeriod ? ` (${application.billingPeriod})` : ''}`
                : null
            }
          />
          <Row
            label="기존 사이트"
            value={
              application.existingUrl ? (
                <a
                  href={application.existingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {application.existingUrl}
                </a>
              ) : null
            }
          />
          <Row label="희망 도메인" value={application.desiredDomain} />
          <Row label="메시지" value={application.message ? <span className="whitespace-pre-wrap">{application.message}</span> : null} />
          <Row label="신청일" value={formatDate(application.createdAt)} />
        </div>

        {/* Editable controls */}
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                checked={denominationVerified}
                onChange={(e) => setDenominationVerified(e.target.checked)}
                className="rounded"
              />
              정통 교단 확인 (이단 아님)
            </label>
            <p className="mt-1 text-xs text-gray-400">
              슈퍼어드민이 직접 정통 교단임을 확인한 경우 체크하세요. 저장 시 반영됩니다.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">상태</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {APPLICATION_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {APPLICATION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">관리자 메모</label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="내부 메모 (신청자에게 표시되지 않음)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">결제 링크</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="https://..."
              />
              <button
                type="button"
                onClick={handleGenerateCheckoutLink}
                disabled={busy}
                className="shrink-0 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? '생성 중...' : '결제 링크 자동 생성'}
              </button>
              <button
                type="button"
                onClick={handleSendPaymentLink}
                disabled={busy}
                className="shrink-0 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? '전송 중...' : '결제 링크 보내기'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">'자동 생성'은 상품/가격 탭의 가격으로 Stripe 링크를 만들어 위 칸에 채웁니다. '보내기' 시 신청자에게 이메일이 발송되며 상태가 승인으로 변경됩니다.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-5">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            닫기
          </button>
        </div>
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

// ─── Tab: Migration — imported from MigrationTab.tsx ──────

// ═══════════════════════════════════════════════════════════
// ─── Main Dashboard Component ────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function SuperAdminDashboardV2() {
  const apiFetch = useAdminApi();
  const session = useAuthStore((s) => s.session);

  const [activeTab, setActiveTab] = useState<TabId>('monitoring');
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
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm">T</span>
            <span className="text-lg font-bold tracking-tight text-gray-900">True Light</span>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-inset ring-red-100">Super Admin</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <a href="/profile" className="hidden sm:inline text-gray-500 hover:text-blue-600 transition-colors">{session?.user?.email}</a>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 운영 콘솔 레이아웃 — 좌측 세로 사이드바 + 우측 콘텐츠.
          작은 화면(<lg)에서는 사이드바가 콘텐츠 위로 쌓임(flex-col). */}
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <aside className="lg:w-60 shrink-0">
          <div className="lg:sticky lg:top-[4.5rem] space-y-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">플랫폼 관리</h1>
              <p className="mt-0.5 text-xs text-gray-500">운영 콘솔</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
            >
              <span className="text-base leading-none">＋</span> 교회 추가
            </button>
            <nav className="flex gap-4 lg:block lg:space-y-4 overflow-x-auto lg:overflow-visible">
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="shrink-0">
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{group.label}</p>
                  <div className="flex lg:flex-col gap-0.5">
                    {group.ids.map((id) => {
                      const meta = TAB_META[id];
                      const active = activeTab === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setActiveTab(id)}
                          className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                            active
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-blue-600 hidden lg:block" />}
                          {meta.icon}
                          <span>{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Tab Content */}
        <div className="flex-1 min-w-0 space-y-6">
        {activeTab === 'monitoring' && (
          <MonitoringTab
            stats={stats}
            loading={statsLoading}
            onRefresh={() => void fetchStats()}
          />
        )}
        {activeTab === 'overview' && (
          <OverviewTab
            stats={stats}
            loading={statsLoading}
            onCreateChurch={() => setShowCreateModal(true)}
            onGoToApplications={() => setActiveTab('applications')}
          />
        )}
        {activeTab === 'tenants' && <TenantsTab refreshKey={tenantsRefreshKey} />}
        {activeTab === 'applications' && <ApplicationsTab />}
        {activeTab === 'demo' && <DemoTab />}
        {activeTab === 'siteSettings' && <SiteSettingsTab />}
        {activeTab === 'intake' && <IntakeTab />}
        {activeTab === 'reference' && <ReferenceDataTab />}
        {activeTab === 'pricing' && <PricingTab />}
        {activeTab === 'billing' && <BillingTab />}
        {activeTab === 'email' && <EmailSettingsTab />}
        {activeTab === 'emailTemplates' && <EmailTemplatesTab />}
        {activeTab === 'broadcast' && <BroadcastTab />}
        {activeTab === 'support' && <SupportTab />}
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
