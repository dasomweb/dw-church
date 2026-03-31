import { lazy, Suspense, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
const PageEditor = lazy(() => import('./pages/PageEditor'));
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

/** Redirect to /login if not authenticated */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/** Redirect to / if already authenticated */
function PublicOnly({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    // Super admin goes to platform dashboard, tenant admin goes to tenant dashboard
    const user = useAuthStore.getState().session?.user;
    const dest = user?.isSuperAdmin ? '/super-admin' : '/';
    return <Navigate to={dest} replace />;
  }

  return <>{children}</>;
}

/**
 * If user is super_admin and NOT doing a tenant switch (?tenant=),
 * redirect to /super-admin. This prevents super admins from seeing
 * the regular tenant dashboard accidentally.
 */
function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const location = useLocation();

  // Allow tenant switch: /?tenant=slug goes through to tenant dashboard
  const params = new URLSearchParams(location.search);
  if (params.has('tenant')) {
    return <>{children}</>;
  }

  // Super admin without tenant switch → redirect to super-admin dashboard
  if (session?.user?.isSuperAdmin) {
    return <Navigate to="/super-admin" replace />;
  }

  return <>{children}</>;
}

/** Interval in ms for proactive token refresh checks (4 minutes). */
const REFRESH_CHECK_INTERVAL_MS = 4 * 60 * 1000;

/**
 * Handle ?tenant=slug query param: switch the current user's tenant context
 * and reload the dashboard. Used by Super Admin "관리" button.
 */
function TenantSwitcher() {
  const session = useAuthStore((s) => s.session);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tenantSlug = params.get('tenant');
    if (!tenantSlug || !session?.accessToken) return;

    const host = window.location.hostname;
    const baseUrl = host.startsWith('admin.')
      ? `https://api.${host.replace('admin.', '')}`
      : (import.meta.env.VITE_API_BASE_URL as string) || '';

    fetch(`${baseUrl}/api/v1/auth/switch-tenant`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenantSlug }),
    })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        // Server returns new tokens with updated tenant context
        const newSession = {
          accessToken: data.accessToken ?? session.accessToken,
          refreshToken: data.refreshToken ?? session.refreshToken,
          expiresAt: data.expiresAt ?? session.expiresAt,
          user: data.user ?? { ...session.user, tenantSlug },
        };
        localStorage.setItem('dw-church-session', JSON.stringify(newSession));
        // Remove query param and reload
        window.location.href = '/';
      })
      .catch(() => {
        window.location.href = '/';
      });
  }, [session, hydrate]);

  return <PageLoader />;
}

export function App({ config }: { config: AppConfig }) {
  const session = useAuthStore((s) => s.session);
  const hydrate = useAuthStore((s) => s.hydrate);
  const refresh = useAuthStore((s) => s.refresh);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const client = useMemo(() => {
    const c = new DWChurchClient({
      baseUrl: config.baseUrl,
      token: session?.accessToken,
      tenantSlug: session?.user?.tenantSlug,
    });
    return c;
  }, [config.baseUrl, session?.accessToken, session?.user?.tenantSlug]);

  // After hydrate, if session exists but is expired, attempt a refresh
  useEffect(() => {
    if (session?.refreshToken && !isAuthenticated) {
      refresh(client);
    }
  }, [session?.refreshToken, isAuthenticated, refresh, client]);

  // Proactively refresh token every 4 minutes if close to expiry
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const currentSession = useAuthStore.getState().session;
      if (isTokenExpiringSoon(currentSession)) {
        refresh(client);
      }
    }, REFRESH_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated, refresh, client]);

  return (
    <ToastProvider>
    <DWChurchProvider client={client}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <LoginPage />
                </PublicOnly>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnly>
                  <RegisterPage />
                </PublicOnly>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicOnly>
                  <ForgotPasswordPage />
                </PublicOnly>
              }
            />

            {/* Super Admin — separate layout, no tenant sidebar */}
            <Route
              path="super-admin"
              element={
                <RequireAuth>
                  <SuperAdminDashboard />
                </RequireAuth>
              }
            />

            {/* Tenant Admin routes — standard sidebar layout */}
            {/* Super admins are redirected to /super-admin unless ?tenant= switch */}
            <Route
              element={
                <RequireAuth>
                  <SuperAdminGuard>
                    <AdminLayout />
                  </SuperAdminGuard>
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
              <Route path="pages" element={<PageEditor />} />
              <Route path="menus" element={<MenuEditor />} />
              <Route path="theme" element={<ThemeEditor />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="domains" element={<DomainSettings />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Catch-all: super admin → super-admin, tenant admin → / */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DWChurchProvider>
    </ToastProvider>
  );
}
