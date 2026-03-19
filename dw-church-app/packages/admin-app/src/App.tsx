import { lazy, Suspense, useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DWChurchClient } from '@dw-church/api-client';
import { DWChurchProvider } from '@dw-church/ui-components';
import { AdminLayout } from './layouts/AdminLayout';

// Lazy-loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BulletinManagement = lazy(() => import('./pages/BulletinManagement'));
const SermonManagement = lazy(() => import('./pages/SermonManagement'));
const ColumnManagement = lazy(() => import('./pages/ColumnManagement'));
const AlbumManagement = lazy(() => import('./pages/AlbumManagement'));
const BannerManagement = lazy(() => import('./pages/BannerManagement'));
const EventManagement = lazy(() => import('./pages/EventManagement'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const HistoryManagement = lazy(() => import('./pages/HistoryManagement'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

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

export function App({ config }: { config: AppConfig }) {
  const client = useMemo(
    () => new DWChurchClient({ baseUrl: config.baseUrl }),
    [config.baseUrl],
  );

  return (
    <DWChurchProvider client={client}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="bulletins" element={<BulletinManagement />} />
              <Route path="sermons" element={<SermonManagement />} />
              <Route path="columns" element={<ColumnManagement />} />
              <Route path="albums" element={<AlbumManagement />} />
              <Route path="banners" element={<BannerManagement />} />
              <Route path="events" element={<EventManagement />} />
              <Route path="staff" element={<StaffManagement />} />
              <Route path="history" element={<HistoryManagement />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DWChurchProvider>
  );
}
