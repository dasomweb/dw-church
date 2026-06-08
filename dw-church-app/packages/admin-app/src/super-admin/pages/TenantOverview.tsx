/**
 * Tenant overview — landing page at /super-admin/t/:slug. Mirrors the
 * "관리 도구" card grid + "공개 사이트" / "고객 어드민으로 진입" footer
 * from the B2BSmart super-admin screenshot the user shared. The cards
 * just deep-link into the existing sidebar destinations — operators
 * land here, scan the grid, click in.
 */
import { useNavigate, useParams } from 'react-router-dom';
import { useSuperAdminTenant } from '../SuperAdminTenantLayout';

interface Card { to: string; icon: string; title: string; subtitle: string }

const CARDS: Card[] = [
  { to: 'pages',             icon: '📄', title: '페이지 빌더', subtitle: '섹션 구성 + AI 추천 / 재생성' },
  { to: 'theme',             icon: '🎨', title: '테마',         subtitle: '컬러 팔레트 · 글꼴 · 커스텀 CSS' },
  { to: 'ai-context',        icon: '🧠', title: 'AI 컨텍스트',  subtitle: '사업 프로파일 · 마케팅 전략' },
  { to: 'reference-photos',  icon: '📷', title: '참조 사진',    subtitle: 'AI 이미지 생성 시 참고할 매장·제품·팀 사진' },
  { to: 'domains',           icon: '🌐', title: '도메인',       subtitle: '커스텀 도메인 / SSL' },
  { to: 'users',             icon: '👥', title: '사용자',       subtitle: '테넌트 관리자 계정' },
  { to: 'billing',           icon: '💳', title: '결제',         subtitle: '구독 플랜 / 청구 내역' },
  { to: 'danger',            icon: '⚠️', title: '위험구역',     subtitle: '비활성화 / 삭제' },
];

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

export default function TenantOverview() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { tenant, loading } = useSuperAdminTenant();
  const navigate = useNavigate();

  // "어드민 진입" — open the tenant admin directly in a new tab. The
  // super_admin's existing session passes RequireTenantAccess (it returns
  // children for isSuper), and the api-client rebinds X-Tenant-Slug from the
  // URL, so no temp password / re-login is needed.
  const enterAdmin = () => {
    if (!slug) return;
    window.open(`/t/${slug}`, '_blank', 'noopener');
  };

  const siteUrl = tenant?.customDomain
    ? `https://${tenant.customDomain}`
    : tenant ? `https://${tenant.slug}.truelight.app` : '#';

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb + title */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <button onClick={() => navigate('/super-admin')} className="hover:text-gray-900">모든 테넌트</button>
        <span>›</span>
        <span className="text-gray-900">{tenant?.name ?? slug}</span>
        {tenant && (
          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${PLAN_BADGE[tenant.plan] ?? 'bg-gray-100 text-gray-600'}`}>
            {tenant.plan.toUpperCase()}
          </span>
        )}
      </div>

      {/* Hero block */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {loading ? '...' : tenant?.name ?? slug}
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-mono">{slug}</p>
          {tenant?.customDomain && (
            <a href={`https://${tenant.customDomain}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
              {tenant.customDomain} ↗
            </a>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {tenant && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${tenant.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                {tenant.isActive ? 'active' : 'inactive'}
              </span>
              <span className="text-xs uppercase font-semibold text-gray-500">{tenant.plan}</span>
            </div>
          )}
          <button
            onClick={() => navigate(`/super-admin/t/${slug}/pages`)}
            className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg text-sm font-medium shadow-sm hover:from-violet-600 hover:to-purple-700"
          >
            ☆ AI 빌더 시작
          </button>
        </div>
      </div>

      {/* 관리 도구 cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">관리 도구</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CARDS.map((c) => (
            <button
              key={c.to}
              onClick={() => navigate(`/super-admin/t/${slug}/${c.to}`)}
              className={`text-left p-4 rounded-xl border bg-white hover:shadow-md transition ${
                c.to === 'danger'
                  ? 'border-amber-200 hover:border-amber-300'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">{c.icon}</span>
                <span className="font-semibold text-gray-900">{c.title}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{c.subtitle}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Public site row */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">공개 사이트</div>
          <div className="text-xs text-gray-500 mt-0.5">
            방문자가 보는 스토어프론트를 새 탭에서 엽니다. ({tenant?.customDomain ?? `${slug}.truelight.app`})
          </div>
        </div>
        <a
          href={siteUrl}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-md bg-gray-100 text-sm hover:bg-gray-200"
        >
          사이트 보기 ↗
        </a>
      </div>

      {/* Enter customer admin row */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">테넌트 어드민으로 진입</div>
          <div className="text-xs text-gray-500 mt-0.5">
            현재 super-admin 세션 그대로 새 탭에서 이 테넌트의 어드민이 열립니다 (재로그인 불필요).
          </div>
        </div>
        <button
          onClick={enterAdmin}
          disabled={!tenant}
          className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          어드민 진입 ↗
        </button>
      </div>
    </div>
  );
}
