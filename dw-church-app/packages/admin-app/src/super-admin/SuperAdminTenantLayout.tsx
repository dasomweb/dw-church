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

// Sidebar matches the screenshot the user provided of B2BSmart's
// super-admin-per-tenant console, in the same order.
interface NavEntry { to: string; label: string; icon: string }
const NAV: NavEntry[] = [
  { to: '',                  label: '개요',              icon: '📊' },
  { to: 'pages',             label: '페이지',            icon: '📄' },
  { to: 'content',           label: '콘텐츠',            icon: '🧩' },
  { to: 'templates',         label: '템플릿',            icon: '✨' },
  { to: 'menus',             label: '메뉴',              icon: '🧭' },
  { to: 'theme',             label: '테마',              icon: '🎨' },
  { to: 'ai-context',        label: 'AI 컨텍스트',       icon: '🧠' },
  { to: 'reference-photos',  label: '참조 사진',         icon: '📷' },
  { to: 'media',             label: '미디어',            icon: '🖼️' },
  { to: 'domains',           label: '도메인',            icon: '🌐' },
  { to: 'settings',          label: '설정',              icon: '⚙️' },
  { to: 'users',             label: '사용자',            icon: '👥' },
  { to: 'billing',           label: '결제',              icon: '💳' },
  { to: 'feature-permissions', label: '기능 권한',       icon: '🧰' },
  { to: 'danger',            label: '위험구역',          icon: '⚠️' },
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
                    `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : item.to === 'danger'
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
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
