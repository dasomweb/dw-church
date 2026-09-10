import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLogin, DWChurchApiError, useDWChurchClient } from '@dw-church/api-client';
import { useAuthStore } from '../stores/auth';
import { detectHostMode } from '../lib/tenant-scope';
import { firstStaffPath } from '../lib/capabilities';
import { reportSecurityEvent } from '../lib/security';

// truelight.app/login(중앙 콘솔)은 admin.truelight.app 로 서빙된다. 여기서 로그인한
// 테넌트 관리자는 자기 테넌트 도메인 관리자로 보낸다(대표님 정책).
const CENTRAL_CONSOLE_HOST = 'admin.truelight.app';
const isCentralConsole = () =>
  typeof window !== 'undefined' && window.location.hostname === CENTRAL_CONSOLE_HOST;

// 크로스 오리진 세션 핸드오프: 중앙 콘솔에서 인증한 세션을 테넌트 도메인으로 넘길 때
// URL fragment(#s=...)로 전달한다(fragment 는 서버로 전송되지 않음). UTF-8(한글 이름 등)
// 안전하게 base64 인코딩.
function encodeHandoff(session: unknown): string {
  return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(session)))));
}
function decodeHandoff(hash: string): any | null {
  try {
    const m = /[#&]s=([^&]+)/.exec(hash);
    if (!m || !m[1]) return null;
    return JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
  } catch { return null; }
}

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const apiClient = useDWChurchClient();
  const setSession = useAuthStore((s) => s.setSession);
  const [searchParams] = useSearchParams();
  const { slug: urlSlug } = useParams<{ slug?: string }>();
  const prefillEmail = searchParams.get('email') ?? '';
  const prefillPassword = searchParams.get('password') ?? '';
  const autoLogin = searchParams.get('auto') === '1';
  const redirectParam = searchParams.get('redirect');
  const [errorMsg, setErrorMsg] = useState('');
  const autoFired = useRef(false);

  // When the super admin opens this page from the tenant detail modal
  // (?email=support-<slug>@truelight.app), drop any existing session so the
  // form shows instead of PublicOnly redirecting back to /super-admin.
  useEffect(() => {
    if (prefillEmail) {
      sessionStorage.removeItem('dw-church-session');
      setSession(null);
    }
  }, [prefillEmail, setSession]);

  // 세션 핸드오프 수신: 중앙 콘솔에서 자기 테넌트 도메인으로 넘어오면 URL fragment 의
  // 세션을 복원하고 fragment 를 즉시 제거한 뒤 관리자 홈으로 진입한다.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.location.hash.includes('s=')) return;
    const session = decodeHandoff(window.location.hash);
    if (session?.accessToken) {
      setSession(session);
      // fragment 제거(히스토리에 토큰이 남지 않게).
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      const staffLeaf = session.user?.role === 'staff' ? firstStaffPath(session.user.permissions ?? []) : null;
      navigate(staffLeaf ? `/${staffLeaf}` : '/', { replace: true });
    }
    // 최초 마운트 1회만.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ defaultValues: { email: prefillEmail, password: prefillPassword } });

  const postLoginDestination = (session: { user?: { isSuperAdmin?: boolean; tenantSlug?: string; role?: string; permissions?: string[] } }) => {
    // Explicit redirect param wins (set when auth gate kicked us here).
    if (redirectParam) return redirectParam;
    // Scoped staff land directly on their first permitted page (the layout guard
    // is the safety net; this avoids a flash of the owner dashboard).
    const staffLeaf = session.user?.role === 'staff' ? firstStaffPath(session.user.permissions ?? []) : null;
    // Host mode (tenant's own domain): the admin lives at the root (/) — no
    // /t/:slug. The session's tenantSlug scopes everything.
    if (detectHostMode()) return staffLeaf ? `/${staffLeaf}` : '/';
    // Super admin always lands on the platform dashboard.
    if (session.user?.isSuperAdmin) return '/super-admin';
    // Prefer the URL slug (so support logins land inside the tenant they
    // signed in for), fall back to the user's own tenant slug.
    const slug = urlSlug || session.user?.tenantSlug;
    if (staffLeaf) return slug ? `/t/${slug}/${staffLeaf}` : `/${staffLeaf}`;
    return slug ? `/t/${slug}` : '/';
  };

  const onSubmit = async (data: LoginFormData) => {
    setErrorMsg('');
    sessionStorage.removeItem('dw-church-session');
    try {
      const session = await loginMutation.mutateAsync(data);

      // 중앙 콘솔(admin.truelight.app = truelight.app/login) 정책 라우팅:
      //  - 슈퍼어드민 → 슈퍼어드민 콘솔.
      //  - 테넌트 관리자(owner/admin/staff/editor) → 자기 테넌트 도메인 관리자로 세션 핸드오프.
      //  - 일반회원(member) → 권한없음(중앙 로그인 대상 아님) + 감사 로그. (회원은 <테넌트>/login 사용)
      if (isCentralConsole()) {
        const u = session.user;
        if (u?.isSuperAdmin) {
          setSession(session);
          navigate('/super-admin', { replace: true });
          return;
        }
        const role = u?.role ?? 'member';
        const slug = u?.tenantSlug;
        if (role === 'member' || !slug) {
          // 방금 발급된 토큰을 클라이언트에 즉시 부착해 위반을 기록(서버 requireAuth).
          try { apiClient?.setToken(session.accessToken); } catch { /* noop */ }
          await reportSecurityEvent(apiClient, { eventType: 'central_login_denied', targetPath: '/login' });
          setSession(null);
          setErrorMsg('이 계정은 중앙 관리자 로그인 대상이 아닙니다. 소속 교회 홈페이지 주소 뒤에 /login 을 붙여 로그인하세요.');
          return;
        }
        // 테넌트 관리자 → 자기 테넌트 도메인으로. 서브도메인은 커스텀 도메인이 있으면
        // 미들웨어가 자동 308 하므로 커스텀 도메인에도 도달한다.
        setSession(session);
        window.location.href = `https://${slug}.truelight.app/admin/login#s=${encodeHandoff(session)}`;
        return;
      }

      setSession(session);
      navigate(postLoginDestination(session), { replace: true });
    } catch (err: unknown) {
      autoFired.current = false; // 자동로그인 실패 시 재시도/수동입력 허용
      if (err instanceof DWChurchApiError) {
        if (err.status === 401) {
          setErrorMsg('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else {
          setErrorMsg(`서버 오류가 발생했습니다. (${err.status})`);
        }
      } else {
        const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
        setErrorMsg(message);
      }
    }
  };

  // 데모 부스 자동 로그인: /login?email=..&password=..&auto=1 (임시 데모 계정 전용).
  // iPad 부스에서 QR 스캔 → 폼 입력 없이 바로 로그인. auto=1 명시가 있어야만 동작하며
  // 실패하면 폼이 그대로 남아 수동 입력 가능. (데모 테넌트는 매일 새벽 스냅샷으로 초기화됨)
  useEffect(() => {
    if (autoLogin && prefillEmail && prefillPassword && !autoFired.current && !loginMutation.isPending) {
      autoFired.current = true;
      void onSubmit({ email: prefillEmail, password: prefillPassword });
    }
    // onSubmit is stable enough for this one-shot; deps kept minimal intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLogin, prefillEmail, prefillPassword]);

  // 자동로그인 진행 중에는 부스 화면에 폼 대신 로딩 화면을 보여준다(오류 시 폼 노출).
  if (autoLogin && prefillEmail && prefillPassword && !errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-5">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.35 7.5 12 10.82 4.65 7.5 12 4.18z" />
          </svg>
        </div>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-4" />
        <p className="text-sm text-gray-500">데모 관리자에 접속 중입니다…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://pub-674328f08783498389f7857dc6e1ab00.r2.dev/shared/login-bg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <h2 className="text-4xl font-bold mb-3">True Light</h2>
          <p className="text-lg opacity-90 max-w-md">교회 웹사이트를 쉽고 빠르게 관리하세요</p>
          <p className="text-sm opacity-60 mt-2">truelight.app</p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50 lg:bg-white">
        <div className="w-full max-w-md">
          {/* Logo (mobile) */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.35 7.5 12 10.82 4.65 7.5 12 4.18z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">True Light</h1>
            <p className="text-sm text-gray-500 mt-1">관리자 로그인</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                이메일
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email', { required: '이메일을 입력하세요' })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="admin@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password', { required: '비밀번호를 입력하세요' })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loginMutation.isPending ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              to={urlSlug ? `/t/${urlSlug}/forgot-password` : '/forgot-password'}
              className="text-gray-500 hover:text-blue-600 transition-colors"
            >
              비밀번호를 잊으셨나요?
            </Link>
            <Link to="/register" className="text-blue-600 font-medium hover:text-blue-800 transition-colors">
              교회 등록 →
            </Link>
          </div>

          <p className="mt-10 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} True Light. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
