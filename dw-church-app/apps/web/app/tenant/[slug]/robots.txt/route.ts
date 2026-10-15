import { getCanonicalOrigin } from '@/lib/tenant-site';

/**
 * 테넌트별 robots.txt.
 *
 * 교회 도메인에서 /robots.txt 로 열린다(미들웨어가 /tenant/<slug>/robots.txt 로 rewrite).
 * sitemap 을 자기 정식 주소로 가리켜야 검색엔진이 그 교회 사이트맵을 찾는다.
 *
 * 관리자/로그인 경로는 색인 대상이 아니라 막는다. AI 크롤러는 막지 않는다 —
 * 교회 입장에선 AI 답변에 노출되는 쪽이 이득이고, 그게 AEO/GEO 의 전제다.
 */
export const revalidate = 3600;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await ctx.params;
  const origin = await getCanonicalOrigin(slug);

  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /login',
    'Disallow: /reset-password',
    'Disallow: /forgot-password',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
