import { getChurchSettings } from './api';
import type { Metadata } from 'next';

export async function buildTenantMetadata(slug: string, pageName?: string, description?: string): Promise<Metadata> {
  let settings;
  try {
    settings = await getChurchSettings(slug);
  } catch {
    // fallback
  }
  // settings 는 api.ts 의 apiFetch 가 camelize 해서 돌려준다 → church_name 은 churchName.
  // 예전엔 `settings?.name` 만 봤는데 그런 키가 없어서 항상 slug 로 떨어졌고,
  // 그 결과 테넌트 첫 화면 <title>/og:title 이 "grace" 처럼 **슬러그**로 노출됐다.
  // 레이아웃(generateMetadata)과 같은 순서로 해석한다.
  const name = settings?.churchName ?? settings?.church_name ?? settings?.name ?? slug;
  const seoTitle = settings?.seoTitle ?? settings?.seo_title ?? name;
  const desc =
    description ?? settings?.seoDescription ?? settings?.seo_description ?? settings?.description ?? `${name} - 교회 웹사이트`;
  const ogImageUrl = settings?.ogImageUrl ?? settings?.og_image_url ?? null;
  // 레이아웃이 title.template = '%s | {교회명}' 을 걸어두므로, 하위 라우트에서
  // 교회명을 또 붙이면 "설교노트 | 교회명 | 교회명" 처럼 두 번 나온다(실측 확인).
  // → pageName 만 돌려주고 교회명은 템플릿이 붙이게 한다.
  // 루트 페이지(pageName 없음)는 템플릿이 적용되지 않는 같은 세그먼트라 absolute 로 고정.
  const ogTitle = pageName ? `${pageName} | ${name}` : seoTitle;
  return {
    title: pageName ? pageName : { absolute: seoTitle },
    description: desc,
    openGraph: {
      title: ogTitle,
      description: desc,
      type: 'website',
      ...(ogImageUrl ? { images: [{ url: ogImageUrl, width: 1200, height: 630 }] } : {}),
    },
  };
}
