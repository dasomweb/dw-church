import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DWChurchClient } from '@dw-church/api-client';
import { useChurchSettings } from '@dw-church/api-client';
import { useAuthStore } from '../stores/auth';
import IntakeWizard from './IntakeWizard';

/**
 * Standalone, full-screen onboarding page (b2bsmart-style) at
 * /t/:slug/onboarding — NOT inside the admin sidebar layout. A newly-provisioned
 * owner lands here on first login (redirected from the dashboard until the
 * initial setup is submitted). Reuses the IntakeWizard for the actual steps;
 * this shell adds the focused header + '나중에 하기'(dashboard) escape hatch.
 */
export default function OnboardingPage({ client }: { client: DWChurchClient }) {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { data: settings } = useChurchSettings();
  const churchName = (settings as { churchName?: string; church_name?: string } | undefined)?.churchName
    || (settings as { church_name?: string } | undefined)?.church_name
    || slug
    || 'True Light';

  // Point the api-client at this tenant's schema (this route is outside the
  // TenantAdminLayout that normally does it).
  useEffect(() => { if (slug) client.setTenantSlug(slug); }, [slug, client]);

  const goDashboard = () => {
    // Remember the skip so the dashboard doesn't bounce them back this session.
    sessionStorage.setItem('tl_onboarding_skip', '1');
    navigate(`/t/${slug}`, { replace: true });
  };

  const handleLogout = () => {
    logout();
    navigate(`/t/${slug}/login`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Focused header — brand + escape hatches, no admin sidebar */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white">T</span>
            <span className="text-base font-bold text-gray-900">{churchName}</span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 ring-1 ring-inset ring-blue-100">초기 셋업</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button onClick={goDashboard} className="text-gray-500 hover:text-gray-900 transition-colors">나중에 하기</button>
            <button onClick={handleLogout} className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">로그아웃</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Welcome intro */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">환영합니다 🎉</h1>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            아래 초기 정보를 입력해 주시면, 입력하신 내용으로 저희가 교회 웹사이트를 제작해 드립니다.
            한 번에 끝내지 않아도 됩니다 — <strong>저장해 두고 나중에 이어서</strong> 입력할 수 있어요.
          </p>
        </div>

        {/* Reuse the existing multi-step intake wizard */}
        <IntakeWizard />

        <p className="mt-6 text-center text-xs text-gray-400">
          입력을 마치지 않았다면 ‘나중에 하기’로 대시보드에 들어갔다가 언제든 다시 돌아올 수 있습니다.
        </p>
      </main>
    </div>
  );
}
