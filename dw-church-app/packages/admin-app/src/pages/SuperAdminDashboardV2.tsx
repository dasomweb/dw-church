import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../components';
import { useAdminApi } from '../super-admin/shared/use-admin-api';
import { TabIcon } from '../super-admin/shared/admin-ui';
import type { GlobalStats } from '../super-admin/shared/types';
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
import DomainsTab from '../super-admin/tabs/DomainsTab';
import ApplicationsTab from '../super-admin/tabs/ApplicationsTab';
import UsersTab from '../super-admin/tabs/UsersTab';
import MonitoringTab from '../super-admin/tabs/MonitoringTab';
import OverviewTab from '../super-admin/tabs/OverviewTab';
import TenantsTab from '../super-admin/tabs/TenantsTab';
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
