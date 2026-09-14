'use client';

import type { CSSProperties } from 'react';
import { usePathname } from 'next/navigation';

// Title typography mirrors @dw-church/blocks HeadingElement (h2 scale) via the
// same --brand-* tokens, inlined here so this client component doesn't pull the
// blocks barrel into the client bundle. Storefront-only (the super-admin canvas
// uses the shared sync PageSubnavBlock), so no data-element stamping needed.
const H2_TITLE_STYLE: CSSProperties = {
  fontSize: 'var(--brand-h2, var(--fs-h2))',
  fontWeight: 'var(--brand-h2-weight)' as CSSProperties['fontWeight'],
  lineHeight: 'var(--brand-h2-line-height)',
  letterSpacing: 'var(--brand-h2-letter-spacing)',
  fontFamily: 'var(--brand-font-heading)',
  color: 'var(--dw-text, var(--brand-text, #16181d))',
  margin: 0,
};

export interface SubnavChild {
  id: string;
  label: string;
  pageSlug?: string;
  href: string;
}
export interface SubnavGroup {
  id: string;
  label: string;
  pageSlug?: string;
  href: string;
  children: SubnavChild[];
}

interface PageSubnavClientProps {
  groups: SubnavGroup[];
  /** Section props bag (for HeadingElement typography overrides + title). */
  props: Record<string, unknown>;
  /** Operator-picked parent group (page slug / label / id). Empty = auto. */
  parentMenu?: string;
  /** Breadcrumb home label. */
  home: string;
  /** Home href (base path aware). */
  homeHref: string;
}

/** Strip trailing slash + query/hash so hrefs compare cleanly to pathname. */
function normalizePath(p: string): string {
  const noQuery = p.split(/[?#]/)[0] ?? p;
  if (noQuery.length > 1 && noQuery.endsWith('/')) return noQuery.slice(0, -1);
  return noQuery;
}

/**
 * Client half of page_subnav — reads the live pathname to (1) pick which
 * top-level group's submenu to show (operator override → else the group
 * containing the current page → else first group with children) and
 * (2) underline the current page's submenu item. The menu tree + hrefs
 * are computed server-side (PageSubnavBlock) so links match the header.
 */
export function PageSubnavClient({ groups, props, parentMenu, home, homeHref }: PageSubnavClientProps) {
  const pathname = normalizePath(usePathname() || '/');

  const withChildren = groups.filter((g) => g.children.length > 0);
  if (withChildren.length === 0) return null;

  // Which child (across all groups) matches the current URL?
  let currentGroup: SubnavGroup | undefined;
  let currentChild: SubnavChild | undefined;
  for (const g of groups) {
    for (const c of g.children) {
      if (normalizePath(c.href) === pathname) {
        currentGroup = g;
        currentChild = c;
        break;
      }
    }
    if (currentChild) break;
    // Current page could be the group's own landing page (a top-level item).
    if (normalizePath(g.href) === pathname) currentGroup = g;
  }

  // Operator override wins: match parentMenu against slug / label / id.
  const key = (parentMenu || '').trim().toLowerCase();
  const picked = key
    ? withChildren.find(
        (g) =>
          (g.pageSlug || '').toLowerCase() === key ||
          g.label.toLowerCase() === key ||
          g.id.toLowerCase() === key,
      )
    : undefined;

  const displayGroup =
    picked
    ?? (currentGroup && currentGroup.children.length > 0 ? currentGroup : undefined)
    ?? withChildren[0];
  if (!displayGroup) return null;

  const activeChildId = currentChild
    && displayGroup.children.some((c) => c.id === currentChild!.id)
    ? currentChild.id
    : undefined;

  const title = (props.title as string) || displayGroup.label;
  const crumbs: Array<{ label: string; href?: string }> = [
    { label: home, href: homeHref },
    { label: displayGroup.label, href: displayGroup.href },
  ];
  if (currentChild && currentChild.id === activeChildId) crumbs.push({ label: currentChild.label });

  const wrap: CSSProperties = { display: 'flex', flexDirection: 'column' };
  const crumbStyle: CSSProperties = {
    fontSize: 'var(--fs-sm, 0.85rem)',
    color: 'var(--brand-muted, var(--text-muted, #6b7280))',
    marginBottom: '0.75rem',
  };
  const navStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5rem',
    marginTop: '1.5rem',
    borderTop: '1px solid var(--border, rgba(0,0,0,0.06))',
    paddingTop: '1rem',
  };

  return (
    <div style={wrap}>
      <nav aria-label="breadcrumb" style={crumbStyle}>
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            {c.href ? (
              <a href={c.href} style={{ color: 'inherit', textDecoration: 'none' }}>{c.label}</a>
            ) : (
              <span>{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <h1 style={H2_TITLE_STYLE}>{title}</h1>
      <div style={navStyle}>
        {displayGroup.children.map((c) => {
          const isActive = c.id === activeChildId;
          const linkStyle: CSSProperties = {
            fontSize: 'var(--fs-base, 1rem)',
            fontWeight: isActive ? 700 : 500,
            color: isActive
              ? 'var(--dw-primary, var(--brand-primary, #1466d6))'
              : 'var(--brand-muted, var(--text-muted, #4b5563))',
            paddingBottom: '0.5rem',
            borderBottom: isActive
              ? '2px solid var(--dw-primary, var(--brand-primary, #1466d6))'
              : '2px solid transparent',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          };
          return (
            <a key={c.id} href={c.href} style={linkStyle} aria-current={isActive ? 'page' : undefined}>
              {c.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
