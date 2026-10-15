/**
 * 테넌트의 **정식(canonical) 주소** 해석.
 *
 * 한 교회가 최대 세 경로로 열린다:
 *   1. https://<교회도메인>/...          ← 커스텀 도메인이 있으면 이게 정식
 *   2. https://<slug>.truelight.app/...  ← 없으면 이게 정식 (있으면 1번으로 308)
 *   3. https://truelight.app/tenant/<slug>/...  ← 플랫폼 내부 경로 (2번으로 308)
 *
 * 리다이렉트가 대부분 모아주지만, canonical/sitemap/JSON-LD/llms.txt 는
 * **절대 URL을 직접 써야** 하므로 한 곳에서 같은 규칙으로 만든다.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.truelight.app';

/** 교회가 연결한 커스텀 도메인 (없으면 null). 미들웨어와 같은 엔드포인트. */
async function getCustomDomain(slug: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/admin/tenants/custom-domain?slug=${encodeURIComponent(slug)}`,
      { headers: { 'x-internal': '1' }, next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const { domain } = (await res.json()) as { domain: string | null };
    return domain || null;
  } catch {
    return null;
  }
}

/** 정식 오리진 — 끝에 슬래시 없음. 예) https://www.atlantayedam.org */
export async function getCanonicalOrigin(slug: string): Promise<string> {
  const domain = await getCustomDomain(slug);
  return `https://${domain ?? `${slug}.truelight.app`}`;
}

/**
 * 정식 절대 URL. path 는 테넌트 기준 경로("/", "/about", "/sermon-note/123").
 * "/tenant/<slug>" 접두사가 섞여 들어와도 떼어낸다(플랫폼 호스트 경유 요청 대비).
 */
export function canonicalUrl(origin: string, slug: string, path: string): string {
  let p = path || '/';
  const prefix = `/tenant/${slug}`;
  if (p === prefix) p = '/';
  else if (p.startsWith(prefix + '/')) p = p.slice(prefix.length);
  if (!p.startsWith('/')) p = `/${p}`;
  // 루트가 아니면 끝 슬래시 제거 — /about 과 /about/ 이 다른 URL 로 색인되는 것 방지.
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return `${origin}${p === '/' ? '/' : p}`;
}
