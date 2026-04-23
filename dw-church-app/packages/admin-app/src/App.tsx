import { lazy, Suspense, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { DWChurchClient } from '@dw-church/api-client';
import { DWChurchProvider } from '@dw-church/ui-components';
import { AdminLayout } from './layouts/AdminLayout';
import { useAuthStore, isTokenExpiringSoon } from './stores/auth';
import { ToastProvider } from './components';

// Lazy-loaded pages — Auth
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));

// Lazy-loaded pages — Admin
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BulletinManagement = lazy(() => import('./pages/BulletinManagement'));
const SermonManagement = lazy(() => import('./pages/SermonManagement'));
const ColumnManagement = lazy(() => import('./pages/ColumnManagement'));
const AlbumManagement = lazy(() => import('./pages/AlbumManagement'));
const BannerManagement = lazy(() => import('./pages/BannerManagement'));
const EventManagement = lazy(() => import('./pages/EventManagement'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const HistoryManagement = lazy(() => import('./pages/HistoryManagement'));
const BoardManagement = lazy(() => import('./pages/BoardManagement'));
const PageEditor = lazy(() => import('./pages/PageEditor'));
const PageWizard = lazy(() => import('./pages/PageWizard'));
const MenuEditor = lazy(() => import('./pages/MenuEditor'));
const ThemeEditor = lazy(() => import('./pages/ThemeEditor'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DomainSettings = lazy(() => import('./pages/DomainSettings'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboardV2'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));

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
                <Route path="theme" element={<ThemeEditor />} />
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
