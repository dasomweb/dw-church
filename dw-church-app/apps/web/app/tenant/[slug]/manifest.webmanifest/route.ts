import { getChurchSettings, getThemeTokens } from '@/lib/api';

// Per-tenant PWA web manifest. Served at /tenant/{slug}/manifest.webmanifest and
// referenced from the layout's generateMetadata only when the tenant is on the
// Pro plan (features.pwa). Kept resilient: any failure falls back to a minimal
// but valid manifest so installability never hard-breaks the page.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let name = slug;
  // 교회가 로고를 아직 안 올렸을 때 쓰는 기본 아이콘. **실제 파일이 있어야 한다** —
  // 아이콘이 404 면 안드로이드 크롬이 설치 자체를 거부한다(192px 이상 1개가 필수).
  // maskable 은 원형 크롭에서 잘리지 않도록 안전영역을 비운 별도 이미지.
  let icons: { src: string; sizes: string; type?: string; purpose?: string }[] = [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ];

  try {
    const settings = await getChurchSettings(slug);
    name =
      settings?.churchName ?? settings?.church_name ?? settings?.name ?? slug;
    // Prefer logo, then favicon, for the install icon.
    const iconUrl =
      settings?.logoUrl ??
      settings?.logo_url ??
      settings?.faviconUrl ??
      settings?.favicon_url ??
      null;
    if (iconUrl) {
      // 교회 로고가 있으면 그걸 쓰되, maskable 기본값은 남겨둔다 — 로고는 보통
      // 여백 없이 꽉 찬 이미지라 원형 크롭에서 잘린다.
      icons = [
        { src: iconUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ];
    }
  } catch {
    // fall back to defaults declared above
  }

  const shortName = name.length > 12 ? `${name.slice(0, 12)}` : name;

  // theme_color = tenant brand primary (drives the installed app's status bar /
  // splash). Falls back to the default blue if tokens are unavailable.
  let themeColor = '#2563eb';
  try {
    const tokens = await getThemeTokens(slug);
    const primary = tokens?.colors?.system?.primary ?? tokens?.colors?.primary;
    if (typeof primary === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(primary)) themeColor = primary;
  } catch { /* keep default */ }

  // start_url/scope are root ("/") — the manifest is served on the tenant's
  // canonical host (its subdomain or custom domain) where "/" IS the tenant
  // root (the middleware rewrites "/" → /tenant/{slug}). Using /tenant/{slug}
  // here would double-prefix on those hosts and break the installed app.
  const manifest = {
    // id 를 교회별로 분리해 한 기기에 두 교회를 설치해도 서로 덮어쓰지 않게 한다
    // (요청서 §5-1). 오리진이 달라도 id 가 같으면 같은 앱으로 취급될 수 있다.
    id: `/?church=${slug}`,
    name,
    short_name: shortName,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    lang: 'ko',
    icons,
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
