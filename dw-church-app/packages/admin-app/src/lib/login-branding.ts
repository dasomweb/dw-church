// 로그인 화면 교회 브랜딩 — 교회 자기 도메인(<slug>.truelight.app 또는 커스텀 도메인)에서
// 로그인할 때 그 교회의 이름/로고를 보여주기 위한 "세션 이전" 공개 조회.
//
// 인증과는 무관하다. 로그인 테넌트는 서버가 이메일로 판정하고(JWT tenantSlug),
// 여기서 구한 slug 는 화면 표시에만 쓴다 — 호스트로 권한을 가르지 않는다.
import { resolveApiBaseUrl } from './api-base';
import { detectHostMode, detectHostSlug } from './tenant-scope';

export interface LoginBranding {
  churchName: string;
  logoUrl: string;
}

/** 호스트 → slug. 서브도메인은 즉시, 커스텀 도메인은 공개 resolve-domain 으로. */
async function resolveSlugFromHost(base: string): Promise<string | null> {
  const direct = detectHostSlug();
  if (direct) return direct;
  try {
    const res = await fetch(
      `${base}/api/v1/admin/tenants/resolve-domain?domain=${encodeURIComponent(window.location.hostname)}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { slug?: string | null };
    return json?.slug ?? null;
  } catch {
    return null;
  }
}

/**
 * 교회 도메인이면 그 교회의 이름/로고를 가져온다. 중앙 콘솔·로컬이거나 조회가
 * 실패하면 null → 로그인 화면은 기존 플랫폼(True Light) 브랜딩을 그대로 쓴다.
 */
export async function fetchLoginBranding(): Promise<LoginBranding | null> {
  if (!detectHostMode()) return null;
  const base = resolveApiBaseUrl();
  const slug = await resolveSlugFromHost(base);
  if (!slug) return null;
  try {
    const res = await fetch(`${base}/api/v1/settings`, { headers: { 'X-Tenant-Slug': slug } });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    // settings 응답은 snake_case(storefront 와 동일). 봉투({data})도 방어적으로 벗긴다.
    const d = ((json as { data?: Record<string, unknown> }).data ?? json) as Record<string, unknown>;
    const churchName = String(d.church_name ?? d.churchName ?? '');
    const logoUrl = String(d.logo_url ?? d.logoUrl ?? '');
    if (!churchName && !logoUrl) return null;
    return { churchName, logoUrl };
  } catch {
    return null;
  }
}
