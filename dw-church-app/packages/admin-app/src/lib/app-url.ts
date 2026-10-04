// SPA 경로 빌더 — Vite base('/admin/')를 붙여 정식 경로를 만든다.
//
// react-router 의 <Link>/navigate 는 basename 이 자동으로 붙지만,
// window.open·window.location.href·raw <a href> 는 basename 을 거치지 않는다.
// 그런 곳에서 `/t/<slug>` 를 그대로 쓰면 `truelight.app/t/<slug>` 가 되어
// 플랫폼 최상위 경로로 나가버린다(admin 서버 catch-all 302 에 의존하던 레거시).
// 반드시 이 헬퍼를 써서 `/admin/t/<slug>` 로 나가게 한다.
export function appPath(path: string): string {
  const base = (import.meta.env.BASE_URL as string) || '/';
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export function appUrl(path: string): string {
  return `${window.location.origin}${appPath(path)}`;
}
