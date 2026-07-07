import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useLogout, useChurchSettings } from '@dw-church/api-client';
import { useAuthStore } from '../stores/auth';

// Nav item paths are relative to the current tenant root (/t/:slug). An empty
// string means the tenant dashboard (/t/:slug), "sermons" becomes
// /t/:slug/sermons, etc.
interface NavItem { to: string; label: string; icon: JSX.Element; superAdminOnly?: boolean }
interface NavGroup { label: string; items: NavItem[] }

const I = (d: string) => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d={d} /></svg>;

const navGroups: (NavItem | NavGroup)[] = [
  { to: '', label: '대시보드', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
  { to: 'analytics', label: '방문 통계', icon: I('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z') },

  { label: '콘텐츠', items: [
    // (초기 셋업 메뉴는 운영자 요청으로 숨김 — 온보딩은 첫 로그인 리다이렉트로만 노출)
    { to: 'sermons', label: '설교', icon: I('M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4-1h8M12 4a3 3 0 00-3 3v4a3 3 0 006 0V7a3 3 0 00-3-3z') },
    { to: 'bulletins', label: '주보', icon: I('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z') },
    { to: 'columns', label: '목회칼럼', icon: I('M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z') },
    { to: 'albums', label: '앨범', icon: I('M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z') },
    { to: 'videos', label: '영상(Youtube)', icon: I('M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z') },
    { to: 'schedules', label: '예배 및 모임', icon: I('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM12 14l1.5 1.5L16 13') },
    { to: 'events', label: '행사', icon: I('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z') },
    { to: 'banners', label: '배너', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h12M6 14h8" /></svg> },
    { to: 'staff', label: '교역자', icon: I('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z') },
    { to: 'history', label: '연혁', icon: I('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z') },
    { to: 'boards', label: '게시판', icon: I('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01') },
    { to: 'cells', label: '목장', icon: I('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6') },
    { to: 'newcomers', label: '새가족', icon: I('M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z') },
    { to: 'forms', label: '폼 만들기', icon: I('M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z') },
    { to: 'form-submissions', label: '폼 제출', icon: I('M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z') },
  ]},

  // 디자인 그룹 (Phase 7c — 2026-06-01 변경): 테마 (theme) 항목 제거.
  // 결정: 테마는 슈퍼어드민이 관리하는 "테마셋 라이브러리" 의 통째 적용
  // 형태로 진화 (사용자 요구). 테넌트는 사이트 디자인을 직접 만지지 않고,
  // 슈퍼어드민이 선택해준 테마셋 안에서 페이지 추가/콘텐츠 입력만 함.
  // 페이지/메뉴는 "기본적인 페이지 추가" 수준이라 유지.
  { label: '디자인', items: [
    { to: 'pages', label: '페이지', icon: I('M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z') },
    { to: 'menus', label: '메뉴', icon: I('M4 6h16M4 12h16M4 18h16') },
  ]},

  { label: '설정', items: [
    { to: 'settings', label: '기본 설정', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg> },
    { to: 'domains', label: '도메인', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg> },
    { to: 'users', label: '사용자', icon: I('M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z') },
    { to: 'billing', label: '결제', icon: I('M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z') },
  ]},
];

// Super admin access is determined by the server via isSuperAdmin flag in login response

// Keyed by the last non-slug path segment. Tenant admin URLs look like
// /t/:slug/sermons — we match on "sermons". Empty key = tenant root.
const pageTitlesByLeaf: Record<string, string> = {
  '': '대시보드',
  intake: '초기 콘텐츠 입력',
  bulletins: '주보 관리',
  sermons: '설교 관리',
  columns: '목회컬럼 관리',
  albums: '앨범 관리',
  videos: '영상(Youtube) 관리',
  schedules: '예배 및 모임 관리',
  banners: '배너 관리',
  events: '이벤트 관리',
  staff: '교역자 관리',
  history: '연혁 관리',
  boards: '게시판 관리',
  cells: '목장 관리',
  newcomers: '새가족 관리',
  'forms': '폼 만들기',
  'form-submissions': '폼 제출 관리',
  pages: '페이지 편집',
  menus: '메뉴 관리',
  // 테마는 슈퍼어드민 전용으로 이전 — 라우트는 남기지만 사이드바에서 제거.
  // 직접 URL 로 접근 시 페이지가 보이긴 함 (deprecated). Phase 7d 에서 라우트
  // 자체를 제거하거나 "슈퍼어드민에게 문의" 안내로 교체 예정.
  theme: '테마 설정 (deprecated — 슈퍼어드민 전용)',
  users: '사용자 관리',
  domains: '도메인 설정',
  billing: '결제 관리',
  settings: '설정',
};

const ROLE_LABELS: Record<string, string> = {
  owner: '소유자',
  admin: '관리자',
  editor: '편집자',
};

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { slug = '' } = useParams<{ slug: string }>();
  const logoutMutation = useLogout();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const { data: settings } = useChurchSettings();
  const churchName = (settings as any)?.churchName || (settings as any)?.church_name || slug || 'True Light';

  // Absolute tenant paths — each sidebar link lives under /t/:slug.
  const tenantRoot = `/t/${slug}`;
  const pathFor = (to: string) => (to ? `${tenantRoot}/${to}` : tenantRoot);

  // Page title lookup: strip "/t/:slug/" prefix, use the next segment.
  const leaf = location.pathname.startsWith(tenantRoot)
    ? location.pathname.slice(tenantRoot.length).replace(/^\/+/, '').split('/')[0]
    : '';
  const pageTitle = pageTitlesByLeaf[leaf ?? ''] || '관리';
  const user = session?.user;
  const isSuperAdmin = !!user?.isSuperAdmin;

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // ignore logout API errors
    }
    logout();
    navigate(`/t/${slug}/login`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 h-16 px-6 border-b border-gray-200">
          <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.35 7.5 12 10.82 4.65 7.5 12 4.18z" />
          </svg>
          <span className="text-base sm:text-lg font-bold text-gray-900 truncate">{churchName}</span>
          {/* Mobile close button */}
          <button
            className="ml-auto lg:hidden p-1 text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 overflow-y-auto" style={{ height: 'calc(100% - 4rem)' }}>
          {navGroups.map((entry, i) => {
            if ('to' in entry) {
              // Single nav item (대시보드)
              const dest = pathFor(entry.to);
              return (
                <NavLink
                  key={dest}
                  to={dest}
                  end
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-blue-600" />}
                      {entry.icon}
                      {entry.label}
                    </>
                  )}
                </NavLink>
              );
            }
            return (
              <div key={entry.label} className={i > 0 ? 'mt-4' : 'mt-2'}>
                <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{entry.label}</p>
                <div className="space-y-0.5">
                  {entry.items.filter((item) => !item.superAdminOnly || isSuperAdmin).map((item) => {
                    const dest = pathFor(item.to);
                    return (
                      <NavLink
                        key={dest}
                        to={dest}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Hamburger menu for mobile */}
            <button
              className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{pageTitle}</h1>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-700">{user.name}</span>
                <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </div>
            )}
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  isActive
                    ? 'text-blue-700 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="hidden sm:inline">내 정보</span>
            </NavLink>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="admin-content flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
