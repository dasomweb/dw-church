import { getChurchSettings } from '@/lib/api';

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

  const manifest = {
    name,
    short_name: shortName,
    start_url: `/tenant/${slug}`,
    scope: `/tenant/${slug}`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
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
