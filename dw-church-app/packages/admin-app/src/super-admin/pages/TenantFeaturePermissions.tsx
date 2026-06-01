/**
 * Tenant Feature Permissions — controls which modules a tenant can see
 * in their own admin (/t/:slug/). Backed by a new
 * `tenants.enabled_modules` JSON column (added via runtime migration in
 * the existing schema-manager pattern, not Prisma migrate).
 *
 * Per-module entries are listed by the dw-church content module catalog
 * — sermons, bulletins, columns, albums, banners, events, staff,
 * history, boards. Plus the two "design layer" modules (pages, theme)
 * the tenant admin can opt out of when the super-admin is the only
 * design editor.
 *
 * Stays a placeholder for the server side until Phase 7a-server lands
 * the GET/PUT /api/v1/admin/tenants/:id/enabled-modules endpoints — for
 * now it shows the state from the cached tenant summary so the UI is
 * navigable.
 */
import { useState } from 'react';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../components';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';

interface ModuleDef { key: string; label: string; group: string; defaultOn: boolean }

const MODULES: ModuleDef[] = [
  // 콘텐츠 — 9 dw-church content modules
  { key: 'sermons',   label: '설교',     group: '콘텐츠', defaultOn: true },
  { key: 'bulletins', label: '주보',     group: '콘텐츠', defaultOn: true },
  { key: 'columns',   label: '목회칼럼', group: '콘텐츠', defaultOn: true },
  { key: 'albums',    label: '앨범',     group: '콘텐츠', defaultOn: true },
  { key: 'banners',   label: '배너',     group: '콘텐츠', defaultOn: true },
  { key: 'events',    label: '행사',     group: '콘텐츠', defaultOn: true },
  { key: 'staff',     label: '교역자',   group: '콘텐츠', defaultOn: true },
  { key: 'history',   label: '연혁',     group: '콘텐츠', defaultOn: true },
  { key: 'boards',    label: '게시판',   group: '콘텐츠', defaultOn: true },
  // 디자인 — tenant admin can opt-out when super-admin owns design
  { key: 'theme',     label: '테마',           group: '디자인', defaultOn: true },
  { key: 'pages',     label: '페이지 빌더',    group: '디자인', defaultOn: true },
  { key: 'menus',     label: '메뉴',           group: '디자인', defaultOn: true },
  // 설정
  { key: 'domains',   label: '도메인',         group: '설정', defaultOn: true },
  { key: 'users',     label: '사용자',         group: '설정', defaultOn: true },
  { key: 'billing',   label: '결제',           group: '설정', defaultOn: true },
];

export default function TenantFeaturePermissions() {
  const session = useAuthStore((s) => s.session);
  const { tenant } = useSuperAdminTenant();
  const { showToast } = useToast();
  void session;
  // Local state seed — until the server endpoint ships, treat all
  // modules as on. The toggle UI is functional; persistence will land
  // when the server PUT /enabled-modules route is in.
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULES.map((m) => [m.key, m.defaultOn])),
  );

  const toggle = (key: string) => {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
    showToast('success', `${MODULES.find((m) => m.key === key)?.label} 설정이 변경되었습니다. (서버 적용은 Phase 7a-server 에서)`);
  };

  const groups = Array.from(new Set(MODULES.map((m) => m.group)));

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">기능 권한</h1>
      <p className="text-sm text-gray-500 mb-6">
        테넌트({tenant?.name ?? '...'}) 어드민이 사용할 수 있는 모듈을 켜고 끕니다. 끄면 해당 모듈은 사이드바에서 숨겨지고 API도 403을 반환합니다.
      </p>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <header className="px-4 py-2.5 bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {group}
            </header>
            <ul className="divide-y divide-gray-100">
              {MODULES.filter((m) => m.group === group).map((m) => (
                <li key={m.key} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{m.label}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{m.key}</div>
                  </div>
                  <button
                    onClick={() => toggle(m.key)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled[m.key] ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled[m.key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
        ⚠ 서버 측 강제 (enabled_modules 컬럼 + 미들웨어 게이트) 는 Phase 7a-server 에서 추가됩니다. 현재는 UI 만 동작.
      </div>
    </div>
  );
}
