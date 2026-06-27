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
  let icons: { src: string; sizes: string; type?: string; purpose?: string }[] = [
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-512.png', sizes: '192x192', type: 'image/png' },
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
      icons = [
        { src: iconUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
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
