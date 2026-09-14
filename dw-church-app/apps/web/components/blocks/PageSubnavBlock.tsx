import { headers } from 'next/headers';
import { getMenuItems } from '@/lib/api';
import { DataSection } from './DataSection';
import { PageSubnavClient, type SubnavGroup } from './PageSubnavClient';

interface PageSubnavBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

// Mirrors apps/web/app/tenant/[slug]/layout.tsx PLATFORM_HOSTS — bare
// platform hosts serve the storefront under /tenant/{slug}, so nav links
// need that prefix; proxied custom domains / subdomains are already at the
// tenant root.
const PLATFORM_HOSTS = new Set([
  'truelight.app',
  'www.truelight.app',
  'customers.truelight.app',
  'localhost:3002',
]);

interface MenuItem {
  id: string;
  label: string;
  pageSlug?: string;
  externalUrl?: string;
  parentId?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
}

/**
 * page_subnav (storefront) — interior page header band: breadcrumb +
 * page title + a submenu row tied to the site's main menu, with the
 * current page underlined. Fetches the live menu tree (same source +
 * href resolution as the header) so the submenu always matches the nav;
 * the active-item + which-group logic runs client-side (PageSubnavClient)
 * off usePathname(). Renders nothing on pages with no matching menu group.
 */
export async function PageSubnavBlock({ props, slug }: PageSubnavBlockProps) {
  let menuItems: MenuItem[] = [];
  try {
    menuItems = (await getMenuItems(slug)) as MenuItem[];
  } catch {
    return null;
  }
  if (!Array.isArray(menuItems) || menuItems.length === 0) return null;

  // Base path — same rule the layout uses so hrefs match the header exactly.
  const hdrs = await headers();
  const host = (hdrs.get('host') || '').toLowerCase();
  const proxiedCustomDomain = !!hdrs.get('x-tenant-host');
  const basePath = !proxiedCustomDomain && PLATFORM_HOSTS.has(host) ? `/tenant/${slug}` : '';
  const homeHref = basePath || '/';
  const navHref = (item: { pageSlug?: string; externalUrl?: string }): string => {
    if (item.externalUrl) return item.externalUrl;
    if (!item.pageSlug || item.pageSlug === 'home') return basePath || '/';
    return `${basePath}/${item.pageSlug}`;
  };

  // Build the top-level → children tree (visible + sorted), same shape as
  // the header's tree build.
  const groups: SubnavGroup[] = menuItems
    .filter((m) => m.isVisible !== false && !m.parentId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((g) => ({
      id: g.id,
      label: g.label,
      pageSlug: g.pageSlug,
      href: navHref(g),
      children: menuItems
        .filter((c) => c.isVisible !== false && c.parentId === g.id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((c) => ({ id: c.id, label: c.label, pageSlug: c.pageSlug, href: navHref(c) })),
    }));

  if (!groups.some((g) => g.children.length > 0)) return null;

  const parentMenu = (props.parentMenu as string) || '';
  const home = (props.breadcrumbHome as string) || '홈';

  return (
    <DataSection
      props={props}
      defaultBg="var(--dw-surface, #f7f8fa)"
      paddingClassName="px-4 py-10 sm:px-6"
      className="border-b border-black/[0.06]"
    >
      <div className="mx-auto max-w-7xl">
        <PageSubnavClient
          groups={groups}
          props={props}
          parentMenu={parentMenu}
          home={home}
          homeHref={homeHref}
        />
      </div>
    </DataSection>
  );
}
