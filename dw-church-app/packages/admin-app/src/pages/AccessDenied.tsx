import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDWChurchClient } from '@dw-church/api-client';
import { reportSecurityEvent, type SecurityEventType } from '../lib/security';
import { detectHostMode } from '../lib/tenant-scope';

/**
 * 권한없음 화면 — 다른 테넌트 관리/슈퍼어드민 등 허용되지 않은 접근 시도에 표시하고,
 * 서버 감사 로그(security_events)에 기록한다(슈퍼어드민 모니터링). 무음 리다이렉트
 * 대신 이 화면을 보여 준다(대표님 정책: "권한없음 표시 + 로그").
 */
export default function AccessDenied({
  eventType,
  targetTenantSlug,
  homeTo,
  homeLabel = '내 홈으로',
}: {
  eventType: SecurityEventType;
  targetTenantSlug?: string;
  homeTo?: string;
  homeLabel?: string;
}) {
  const apiClient = useDWChurchClient();

  useEffect(() => {
    void reportSecurityEvent(apiClient, {
      eventType,
      targetTenantSlug: targetTenantSlug ?? null,
      targetPath: typeof window !== 'undefined' ? window.location.pathname : null,
    });
  }, [apiClient, eventType, targetTenantSlug]);

  const home = homeTo ?? (detectHostMode() ? '/' : '/login');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-5">
        <svg className="w-9 h-9 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0-9a2 2 0 012 2v1H10v-1a2 2 0 012-2zM6 11h12a1 1 0 011 1v7a1 1 0 01-1 1H6a1 1 0 01-1-1v-7a1 1 0 011-1z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900">접근 권한이 없습니다</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        이 페이지에 접근할 권한이 없습니다. 소속 교회 관리자 페이지는 교회 사이트에서 로그인해 이용하세요.
      </p>
      <Link
        to={home}
        className="mt-6 inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        {homeLabel}
      </Link>
    </div>
  );
}
