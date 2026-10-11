// API base URL 해석 — main.tsx(클라이언트 생성)와 로그인 화면(세션 전 공개 조회)이
// 같은 규칙을 쓰도록 한 곳에 둔다.
// 관리자 SPA 는 여러 오리진(admin.truelight.app + 각 교회 도메인 /admin)에서 돌기 때문에
// same-origin "/api" 프록시를 쓸 수 없고, 항상 API 의 절대 호스트를 부른다.
// 인증은 Bearer 토큰(쿠키 없음), 서버 CORS 는 origin:'*' credentials:false.
export function resolveApiBaseUrl(restUrlOverride?: string): string {
  if (restUrlOverride) return restUrlOverride;
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL as string;
  if (import.meta.env.DEV) return window.location.origin; // vite dev proxy
  return 'https://api.truelight.app';
}

/**
 * api-client 를 안 쓰고 raw fetch 하는 화면들이 쓰는 절대 URL 빌더.
 *
 * 상대경로 `fetch('/api/v1/...')` 는 **admin.truelight.app 에서만** 동작한다.
 * 슈퍼어드민 콘솔(truelight.app/admin/...)과 각 교회 도메인(<테넌트>/admin)에서는
 * 그 경로가 API 가 아니라 **스토어프론트/마케팅 사이트**로 가서 404 HTML 을 받는다
 * (실측: truelight.app·yedam.truelight.app·www.atlantawakechurch.org 모두 404 text/html,
 *  admin.truelight.app 만 401 JSON). 도메인 설정 "도메인 추가 실패" 의 원인.
 *
 * 새 코드는 api-client 를 쓰고, raw fetch 가 꼭 필요하면 이 함수를 쓴다.
 */
export function apiUrl(path: string): string {
  const base = resolveApiBaseUrl().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
