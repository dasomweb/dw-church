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
