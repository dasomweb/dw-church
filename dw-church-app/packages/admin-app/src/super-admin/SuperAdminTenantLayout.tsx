/**
 * SuperAdminTenantLayout — the shell behind every `/super-admin/t/:slug/*`
 * URL. It's a deliberately separate world from the tenant-admin's
 * `/t/:slug/*` shell:
 *
 *   /super-admin/t/grace/...   ← super-admin acting on a specific tenant
 *   /t/grace/...               ← that tenant's own operators
 *
 * The tenant-admin chrome is intentionally kept simple. This one is the
 * "deep" surface — 14 sections (page builder, theme, AI context, etc.)
 * that the super-admin needs but a parish secretary doesn't.
 *
 * Routes mount inside `<Outlet />` and they all use `useTenantContext()`
 * (the API-client slug + the tenant header object) instead of reading
 * `:slug` again. Without that, the API-client would still be sending the
 * super-admin's own tenantSlug on every request and read the wrong
 * schema — the exact bug RequireTenantAccess on the tenant-admin side
 * already fixes for `/t/:slug`.
 */
import { useEffect, useMemo, useState, createContext, useContext } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useDWChurchClient } from '@dw-church/api-client';
import { useAuthStore } from '../stores/auth';

interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  plan: string;
  isActive: boolean;
  customDomain?: string;
}

interface TenantContextValue {
  tenant: TenantSummary | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function useSuperAdminTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useSuperAdminTenant must be used inside SuperAdminTenantLayout');
  return ctx;
}

// Clean line icons (heroicons-style) — no emoji. Single `d` per icon; a few
// use multiple subpaths within the one string.
const Ico = ({ d }: { d: string }) => (
  <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

interface NavEntry { to: string; label: string; icon: JSX.Element }
const NAV: NavEntry[] = [
  { to: '',                  label: '개요',        icon: <Ico d="M4 5h6v6H4zM14 5h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /> },
  { to: 'pages',             label: '페이지',      icon: <Ico d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
  { to: 'content',           label: '콘텐츠',      icon: <Ico d="M4 6a2 2 0 012-2h3v5H4V6zm0 7h5v5H6a2 2 0 01-2-2v-3zm9-9h3a2 2 0 012 2v3h-5V4zm0 7h5v3a2 2 0 01-2 2h-3v-5z" /> },
  { to: 'templates',         label: '템플릿',      icon: <Ico d="M4 5a1 1 0 011-1h14a1 1 0 011 1v3H4V5zm0 5h7v10H5a1 1 0 01-1-1V10zm9 0h7v9a1 1 0 01-1 1h-6V10z" /> },
  { to: 'menus',             label: '메뉴',        icon: <Ico d="M4 6h16M4 12h16M4 18h16" /> },
  { to: 'theme',             label: '테마',        icon: <Ico d="M9.53 16.12a3 3 0 00-5.78 1.13 2.25 2.25 0 01-2.4 2.24 4.5 4.5 0 008.4-2.24c0-.4-.08-.78-.22-1.13zm0 0a16 16 0 003.39-1.62m-5.04-.02a16 16 0 011.62-3.4m3.42 3.42a16 16 0 004.76-4.65l3.88-5.81a1.15 1.15 0 00-1.6-1.6l-5.81 3.88a16 16 0 00-4.65 4.76m3.42 3.42a6.78 6.78 0 00-3.42-3.42" /> },
  { to: 'ai-context',        label: 'AI 컨텍스트', icon: <Ico d="M8 4v2M16 4v2M8 18v2M16 18v2M4 8H2M4 16H2M22 8h-2M22 16h-2M7 7h10v10H7zM10 10h4v4h-4z" /> },
  { to: 'reference-photos',  label: '참조 사진',   icon: <Ico d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
  { to: 'media',             label: '미디어',      icon: <Ico d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /> },
  { to: 'domains',           label: '도메인',      icon: <Ico d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /> },
  { to: 'settings',          label: '기본정보',    icon: <Ico d="M10.33 4.32c.42-1.76 2.92-1.76 3.34 0a1.72 1.72 0 002.58 1.07c1.54-.94 3.3.83 2.37 2.37a1.72 1.72 0 001.06 2.57c1.76.43 1.76 2.93 0 3.35a1.72 1.72 0 00-1.06 2.58c.93 1.54-.83 3.3-2.37 2.37a1.72 1.72 0 00-2.58 1.06c-.42 1.76-2.92 1.76-3.34 0a1.72 1.72 0 00-2.58-1.06c-1.54.93-3.3-.83-2.37-2.37a1.72 1.72 0 00-1.06-2.58c-1.76-.42-1.76-2.92 0-3.35a1.72 1.72 0 001.06-2.57c-.94-1.54.83-3.31 2.37-2.37 1 .6 2.3.07 2.58-1.07zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /> },
  { to: 'users',             label: '사용자',      icon: <Ico d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
  { to: 'billing',           label: '결제',        icon: <Ico d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /> },
  { to: 'feature-permissions', label: '기능 권한', icon: <Ico d="M6 4v6m0 4v6M6 10a2 2 0 100 4 2 2 0 000-4zM18 4v2m0 4v10M18 6a2 2 0 100 4 2 2 0 000-4zM12 4v8m0 4v4M12 12a2 2 0 100 4 2 2 0 000-4z" /> },
  { to: 'danger',            label: '위험구역',    icon: <Ico d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> },
];

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

export function SuperAdminTenantLayout() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const client = useDWChurchClient();
  const session = useAuthStore((s) => s.session);
  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Switch the api-client header so every fetch under this layout reads
  // the right schema. Without this the super-admin's own tenantSlug
  // (often empty) would still be sent. `useDWChurchClient` returns
  // `DWChurchClient | null` (it's null only outside the provider — not
  // possible inside App.tsx which wraps the whole tree).
  useEffect(() => { if (slug && client) client.setTenantSlug(slug); }, [slug, client]);

  const fetchSummary = useMemo(() => async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const host = window.location.hostname;
      const baseUrl = host.startsWith('admin.')
        ? `https://api.${host.replace('admin.', '')}`
        : (import.meta.env.VITE_API_BASE_URL as string) || '';
      const res = await fetch(`${baseUrl}/api/v1/admin/tenants/by-slug/${slug}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const t = json.data ?? json;
      setTenant({
        id: t.id,
        slug: t.slug,
        name: t.name,
        plan: t.plan ?? 'free',
        isActive: t.is_active ?? t.isActive ?? true,
        customDomain: t.custom_domain ?? t.customDomain,
      });
    } catch {
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, slug]);

  useEffect(() => { void fetchSummary(); }, [fetchSummary]);

  // Gate non-super-admins out — even though App.tsx already wraps the
  // route in RequireSuperAdmin, this catches direct navigation glitches
  // and stale sessions where the token outlives the role.
  if (!session?.user?.isSuperAdmin) {
    return (
      <div className="p-6 text-center text-sm text-red-600">슈퍼어드민만 접근 가능합니다.</div>
    );
  }

  const ctxValue: TenantContextValue = { tenant, loading, refresh: fetchSummary };

  return (
    <TenantContext.Provider value={ctxValue}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
          <div className="h-14 px-4 flex items-center border-b border-gray-200 gap-2">
            <button
              onClick={() => navigate('/super-admin')}
              className="text-xs text-gray-500 hover:text-gray-900"
              title="모든 테넌트로 돌아가기"
            >
              ‹ 모든 테넌트
            </button>
          </div>
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="text-xs text-gray-400 uppercase tracking-wider">현재 테넌트</div>
            <div className="mt-0.5 text-sm font-bold text-gray-900 truncate">
              {tenant?.name ?? slug}
            </div>
            {tenant && (
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${PLAN_BADGE[tenant.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                  {tenant.plan.toUpperCase()}
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] ${tenant.isActive ? 'text-green-700' : 'text-red-700'}`}>
                  <span className={`w-1 h-1 rounded-full ${tenant.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  {tenant.isActive ? 'active' : 'inactive'}
                </span>
              </div>
            )}
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {NAV.map((item) => {
              const dest = item.to ? `/super-admin/t/${slug}/${item.to}` : `/super-admin/t/${slug}`;
              return (
                <NavLink
                  key={dest}
                  to={dest}
                  end={!item.to}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : item.to === 'danger'
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-blue-600" />}
                      {item.icon}
                      {item.label}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </TenantContext.Provider>
  );
}
