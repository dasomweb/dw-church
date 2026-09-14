import type { CSSProperties } from 'react';
import { HeadingElement } from '../elements';

interface PageSubnavItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface PageSubnavBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

/**
 * Page header + sub-navigation (editor-canvas / fallback preview).
 *
 * On the STOREFRONT this block_type is overridden by the async
 * apps/web version, which fetches the tenant's live menu tree and
 * highlights the current page. This shared component is the sync preview
 * shown in the super-admin builder canvas (and a safe fallback): it
 * renders the page-header band — breadcrumb + title + a row of submenu
 * items — from `props` (operator-supplied `items`, or a small sample so
 * the design is visible before menus resolve).
 *
 * Fully token-driven; no tenant hardcoding.
 */
export function PageSubnavBlock({ props }: PageSubnavBlockProps) {
  const home = (props.breadcrumbHome as string) || '홈';
  const parentLabel = (props.parentLabel as string) || (props.parentMenu as string) || '';
  const manual = Array.isArray(props.items) ? (props.items as PageSubnavItem[]) : [];
  // Sample submenu shown in the editor when the operator hasn't pinned
  // explicit items (storefront replaces these with live menu children).
  const items: PageSubnavItem[] = manual.length
    ? manual
    : [
        { label: '하위 메뉴 1', active: true },
        { label: '하위 메뉴 2' },
        { label: '하위 메뉴 3' },
        { label: '하위 메뉴 4' },
      ];
  const active = items.find((it) => it.active) ?? items[0];
  // Title defaults to the PARENT group label (e.g. "교회소개"), with the
  // active child shown in the breadcrumb/submenu — matches the design.
  const title = (props.title as string) || parentLabel || active?.label || '페이지 제목';

  const bandStyle: CSSProperties = {
    background: 'var(--dw-surface, var(--surface, #f7f8fa))',
    borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
    paddingBlock: '2.5rem',
  };
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

  const crumbs = [home, parentLabel, active?.label].filter(Boolean) as string[];

  return (
    <section style={bandStyle}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav aria-label="breadcrumb" style={crumbStyle}>
          {crumbs.join(' · ')}
        </nav>
        <HeadingElement text={title} props={props} elementKey="title" defaultTag="h1" defaultSize="h2" />
        <div style={navStyle}>
          {items.map((it, i) => {
            const isActive = it === active;
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
            };
            return it.href ? (
              <a key={i} href={it.href} style={linkStyle}>{it.label}</a>
            ) : (
              <span key={i} style={linkStyle}>{it.label}</span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
