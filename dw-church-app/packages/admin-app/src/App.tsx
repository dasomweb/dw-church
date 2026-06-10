import { lazy, Suspense, useEffect, useMemo, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';

// Wrap React.lazy so a STALE CHUNK auto-reloads the page once instead of
// rendering a blank screen. After a deploy the hashed chunk filenames change;
// a tab still running the old app requests an old chunk on navigation, the
// dynamic import 404s, and Suspense (no error boundary) shows blank — the
// classic "click a menu → blank, refresh fixes it". Here we reload ONCE
// automatically (guarded by sessionStorage so a genuinely-missing chunk can't
// loop), which fetches the fresh index.html + chunk names transparently.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem('chunk-reloaded');
      return mod;
    } catch (err) {
      if (typeof window !== 'undefined' && !sessionStorage.getItem('chunk-reloaded')) {
        sessionStorage.setItem('chunk-reloaded', '1');
        window.location.reload();
        return new Promise<{ default: T }>(() => {}); // halt render until reload
      }
      throw err;
    }
  });
}
import { DWChurchClient } from '@dw-church/api-client';
import { DWChurchProvider } from '@dw-church/ui-components';
import { AdminLayout } from './layouts/AdminLayout';
import { useAuthStore, isTokenExpiringSoon } from './stores/auth';
import { ToastProvider } from './components';

// Lazy-loaded pages — Auth
const LoginPage = lazyWithReload(() => import('./pages/LoginPage'));
const RegisterPage = lazyWithReload(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazyWithReload(() => import('./pages/ForgotPasswordPage'));

// Lazy-loaded pages — Admin
const Dashboard = lazyWithReload(() => import('./pages/Dashboard'));
const BulletinManagement = lazyWithReload(() => import('./pages/BulletinManagement'));
const SermonManagement = lazyWithReload(() => import('./pages/SermonManagement'));
const ColumnManagement = lazyWithReload(() => import('./pages/ColumnManagement'));
const AlbumManagement = lazyWithReload(() => import('./pages/AlbumManagement'));
const BannerManagement = lazyWithReload(() => import('./pages/BannerManagement'));
const EventManagement = lazyWithReload(() => import('./pages/EventManagement'));
const StaffManagement = lazyWithReload(() => import('./pages/StaffManagement'));
const HistoryManagement = lazyWithReload(() => import('./pages/HistoryManagement'));
const BoardManagement = lazyWithReload(() => import('./pages/BoardManagement'));
const PageEditor = lazyWithReload(() => import('./pages/PageEditor'));
const PageWizard = lazyWithReload(() => import('./pages/PageWizard'));
const MenuEditor = lazyWithReload(() => import('./pages/MenuEditor'));
// ThemeEditor (tenant-admin) deprecated — friendly notice 로 대체.
// 2026-06-01: 테마 = 슈퍼어드민 owned (테마셋 라이브러리 기반).
const ThemeDeprecatedNotice = lazyWithReload(() => import('./pages/ThemeDeprecatedNotice'));
const UserManagement = lazyWithReload(() => import('./pages/UserManagement'));
const SettingsPage = lazyWithReload(() => import('./pages/SettingsPage'));
const DomainSettings = lazyWithReload(() => import('./pages/DomainSettings'));
const SuperAdminDashboard = lazyWithReload(() => import('./pages/SuperAdminDashboardV2'));
const ProfilePage = lazyWithReload(() => import('./pages/ProfilePage'));
const BillingPage = lazyWithReload(() => import('./pages/BillingPage'));

// Super-admin per-tenant console (Phase 2). Lives at /super-admin/t/:slug/*
// — a distinct surface from the tenant-admin /t/:slug, with its own
// 14-section sidebar. Placeholders fill out the routes that get real UIs
// in later phases (theme editor in Phase 3, page builder inspector in
// Phase 4, etc.).
const SuperAdminTenantLayout = lazyWithReload(() => import('./super-admin/SuperAdminTenantLayout').then((m) => ({ default: m.SuperAdminTenantLayout })));
const TenantOverview = lazyWithReload(() => import('./super-admin/pages/TenantOverview'));
const TenantThemeEditor = lazyWithReload(() => import('./super-admin/pages/TenantThemeEditor'));
const TenantPageEditor = lazyWithReload(() => import('./super-admin/pages/TenantPageEditor'));
const TenantFeaturePermissions = lazyWithReload(() => import('./super-admin/pages/TenantFeaturePermissions'));
const TenantDangerZone = lazyWithReload(() => import('./super-admin/pages/TenantDangerZone'));
const TenantAIContext = lazyWithReload(() => import('./super-admin/pages/TenantAIContext'));
const TenantMediaLibrary = lazyWithReload(() => import('./super-admin/pages/TenantMediaLibrary'));
const TenantTemplates = lazyWithReload(() => import('./super-admin/pages/TenantTemplates'));
const TenantReferencePhotos = lazyWithReload(() => import('./super-admin/pages/TenantReferencePhotos'));
const TenantContentEntries = lazyWithReload(() => import('./super-admin/pages/TenantContentEntries'));

export interface AppConfig {
  baseUrl: string;
  nonce?: string;
  postId?: number;
  postType?: string;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

/** Auth gate: redirect to /login if not authenticated. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Tenant gate: user's JWT tenantSlug must match the URL's :slug, or they must
 * be a super admin (which is allowed into any tenant). Mismatches indicate
 * either a copy-pasted URL for another org or a stale session — kick them to
 * the tenant-scoped login so the correct credentials can be entered.
 */
function RequireTenantAccess({ children }: { children: React.ReactNode }) {
  const { slug = '' } = useParams<{ slug: string }>();
  const session = useAuthStore((s) => s.session);
  const location = useLocation();

  const isSuper = !!session?.user?.isSuperAdmin;
  const userSlug = session?.user?.tenantSlug ?? '';

  if (isSuper) return <>{children}</>;
  if (slug && userSlug === slug) return <>{children}</>;

  const redirect = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/t/${slug}/login?redirect=${redirect}`} replace />;
}

/** Already authed? Bounce away from login/register unless intentionally forcing the form. */
function PublicOnly({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return <PageLoader />;

  // ?email= on the login URL signals "I'm switching identity" (super admin
  // entering a tenant as its support user). LoginPage handles the clearing.
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const wantsLoginForm = !!params?.has('email');

  if (isAuthenticated && !wantsLoginForm) {
    const user = useAuthStore.getState().session?.user;
    const fallback = user?.isSuperAdmin
      ? '/super-admin'
      : user?.tenantSlug ? `/t/${user.tenantSlug}` : '/login';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session);
  if (!session?.user?.isSuperAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Landing route: send users to their natural home. */
function RoleHomeRedirect() {
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) return <PageLoader />;
  const user = session?.user;
  if (!user) return <Navigate to="/login" replace />;
  if (user.isSuperAdmin) return <Navigate to="/super-admin" replace />;
  if (user.tenantSlug) return <Navigate to={`/t/${user.tenantSlug}`} replace />;
  return <Navigate to="/login" replace />;
}

/**
 * Layout wrapper that wires the current URL's :slug into the API client so
 * every data call picks up the right X-Tenant-Slug header. Without this, a
 * super admin visiting /t/grace/sermons would still send the old session's
 * tenantSlug header and read the wrong schema.
 */
function TenantAdminLayout({ client }: { client: DWChurchClient }) {
  const { slug = '' } = useParams<{ slug: string }>();
  useEffect(() => {
    if (slug) client.setTenantSlug(slug);
  }, [slug, client]);
  return <AdminLayout />;
}

const REFRESH_CHECK_INTERVAL_MS = 4 * 60 * 1000;

export function App({ config }: { config: AppConfig }) {
  const session = useAuthStore((s) => s.session);
  const hydrate = useAuthStore((s) => s.hydrate);
  const refresh = useAuthStore((s) => s.refresh);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => { hydrate(); }, [hydrate]);

  const client = useMemo(() => {
    return new DWChurchClient({
      baseUrl: config.baseUrl,
      token: session?.accessToken,
      tenantSlug: session?.user?.tenantSlug,
    });
  }, [config.baseUrl, session?.accessToken, session?.user?.tenantSlug]);

  useEffect(() => {
    if (session?.refreshToken && !isAuthenticated) refresh(client);
  }, [session?.refreshToken, isAuthenticated, refresh, client]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      const currentSession = useAuthStore.getState().session;
      if (isTokenExpiringSoon(currentSession)) refresh(client);
    }, REFRESH_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, refresh, client]);

  return (
    <ToastProvider>
      <DWChurchProvider client={client}>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
              <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
              <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />

              {/* Tenant-scoped login (support account sign-in, direct tenant links) */}
              <Route path="/t/:slug/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
              <Route path="/t/:slug/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />

              {/* Super admin */}
              <Route
                path="/super-admin"
                element={
                  <RequireAuth>
                    <RequireSuperAdmin>
                      <SuperAdminDashboard />
                    </RequireSuperAdmin>
                  </RequireAuth>
                }
              />

              {/* Super admin — per-tenant console (Phase 2 shell + placeholders) */}
              <Route
                path="/super-admin/t/:slug"
                element={
                  <RequireAuth>
                    <RequireSuperAdmin>
                      <SuperAdminTenantLayout />
                    </RequireSuperAdmin>
                  </RequireAuth>
                }
              >
                <Route index element={<TenantOverview />} />
                <Route path="pages" element={<TenantPageEditor />} />
                <Route path="content" element={<TenantContentEntries />} />
                <Route path="templates" element={<TenantTemplates />} />
                <Route path="menus" element={<MenuEditor />} />
                <Route path="theme" element={<TenantThemeEditor />} />
                <Route path="ai-context" element={<TenantAIContext />} />
                <Route path="reference-photos" element={<TenantReferencePhotos />} />
                <Route path="media" element={<TenantMediaLibrary />} />
                {/* Phase 7a — reuse the existing tenant-admin pages for the
                    settings group. They already read the URL :slug param and
                    the api-client header that SuperAdminTenantLayout sets,
                    so they "just work" mounted under the super-admin route. */}
                <Route path="domains" element={<DomainSettings />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="feature-permissions" element={<TenantFeaturePermissions />} />
                <Route path="danger" element={<TenantDangerZone />} />
              </Route>

              {/* Profile — any authenticated user */}
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />

              {/* Tenant admin — URL slug is source of truth */}
              <Route
                path="/t/:slug"
                element={
                  <RequireAuth>
                    <RequireTenantAccess>
                      <TenantAdminLayout client={client} />
                    </RequireTenantAccess>
                  </RequireAuth>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="bulletins" element={<BulletinManagement />} />
                <Route path="sermons" element={<SermonManagement />} />
                <Route path="columns" element={<ColumnManagement />} />
                <Route path="albums" element={<AlbumManagement />} />
                <Route path="banners" element={<BannerManagement />} />
                <Route path="events" element={<EventManagement />} />
                <Route path="staff" element={<StaffManagement />} />
                <Route path="history" element={<HistoryManagement />} />
                <Route path="boards" element={<BoardManagement />} />
                <Route path="pages" element={<PageEditor />} />
                <Route path="page-wizard" element={<PageWizard />} />
                <Route path="menus" element={<MenuEditor />} />
                <Route path="theme" element={<ThemeDeprecatedNotice />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="domains" element={<DomainSettings />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="billing" element={<BillingPage />} />
              </Route>

              {/* Root: role-based redirect */}
              <Route path="/" element={<RoleHomeRedirect />} />
              <Route path="*" element={<RoleHomeRedirect />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </DWChurchProvider>
    </ToastProvider>
  );
}
