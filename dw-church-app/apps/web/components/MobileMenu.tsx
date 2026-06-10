'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

interface NavItem {
  id: string;
  label: string;
  pageId?: string;
  pageSlug?: string;
  externalUrl?: string;
  isVisible: boolean;
  sortOrder: number;
  parentId?: string;
  /** Built by the layout: 2nd-level items under this menu. */
  children?: NavItem[];
}

interface MobileMenuProps {
  /** Top-level menu items, each already carrying its `children` (the layout
   *  builds the tree). Older callers may still pass a flat list — we rebuild
   *  the tree defensively below. */
  navItems: NavItem[];
  /** Public base path for links — `/tenant/{slug}` on the bare platform host,
   *  '' on a proxied custom domain / subdomain (see layout.tsx). */
  basePath?: string;
}

export default function MobileMenu({ navItems, basePath = '' }: MobileMenuProps) {
  const navHref = (item: { pageSlug?: string; externalUrl?: string }): string => {
    if (item.externalUrl) return item.externalUrl;
    if (!item.pageSlug || item.pageSlug === 'home') return basePath || '/';
    return `${basePath}/${item.pageSlug}`;
  };
  /** Does this item point somewhere, or is it just a container for sub-items? */
  const hasDestination = (item: NavItem) =>
    Boolean(item.externalUrl) || Boolean(item.pageSlug && item.pageSlug !== 'home');

  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpanded((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  }, []);

  // Top-level items with their children. If a flat list was passed (no
  // children attached), rebuild the parent→child tree from parentId so the
  // submenu structure still renders.
  const topLevel = navItems.filter((item) => item.isVisible && !item.parentId);
  const childrenOf = (id: string) =>
    navItems.filter((c) => c.isVisible && c.parentId === id).sort((a, b) => a.sortOrder - b.sortOrder);
  const visibleItems = topLevel
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      ...item,
      children: (item.children?.filter((c) => c.isVisible) ?? childrenOf(item.id)).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    }));

  const close = useCallback(() => {
    setIsOpen(false);
    // Return focus to the hamburger button after closing
    setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reveal the main → sub structure by default each time the menu opens:
  // expand every parent that has sub-items (the user can still collapse them).
  useEffect(() => {
    if (!isOpen) return;
    const parentIds = navItems
      .filter((item) => item.isVisible && !item.parentId)
      .filter((item) =>
        (item.children?.some((c) => c.isVisible) ?? false) ||
        navItems.some((c) => c.isVisible && c.parentId === item.id),
      )
      .map((item) => item.id);
    setExpanded(new Set(parentIds));
  }, [isOpen, navItems]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const focusableEls = menu.querySelectorAll<HTMLElement>(
      'a[href], button, [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];

    // Focus the close button on open
    firstEl?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };

    menu.addEventListener('keydown', handleTab);
    return () => menu.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls="mobile-menu-panel"
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[var(--dw-text)] hover:bg-gray-100 transition-colors"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black transition-opacity duration-300 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
        onClick={close}
      />

      {/* Slide-out panel */}
      <div
        id="mobile-menu-panel"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-[var(--dw-background)] shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Close button */}
        <div className="flex items-center justify-end px-6 py-4 border-b border-gray-200">
          <button
            onClick={close}
            aria-label="Close navigation menu"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[var(--dw-text)] hover:bg-gray-100 transition-colors"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 72px)' }}>
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const kids = item.children ?? [];
              const hasKids = kids.length > 0;
              const isExpanded = expanded.has(item.id);

              // Leaf item — plain link.
              if (!hasKids) {
                return (
                  <li key={item.id}>
                    <Link
                      href={navHref(item)}
                      onClick={close}
                      className="block rounded-md px-3 py-3 text-base font-medium text-[var(--dw-text)] hover:bg-gray-100 hover:text-[var(--dw-primary)] transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }

              // Parent with sub-menu — label row + chevron toggle, children indented.
              return (
                <li key={item.id}>
                  <div className="flex items-center">
                    {hasDestination(item) ? (
                      <Link
                        href={navHref(item)}
                        onClick={close}
                        className="flex-1 rounded-md px-3 py-3 text-base font-semibold text-[var(--dw-text)] hover:bg-gray-100 hover:text-[var(--dw-primary)] transition-colors"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(item.id)}
                        className="flex-1 text-left rounded-md px-3 py-3 text-base font-semibold text-[var(--dw-text)] hover:bg-gray-100 transition-colors"
                      >
                        {item.label}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.id)}
                      aria-label={`${item.label} 하위 메뉴 ${isExpanded ? '접기' : '펼치기'}`}
                      aria-expanded={isExpanded}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[var(--dw-text)] hover:bg-gray-100 transition-colors"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  {isExpanded && (
                    <ul className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l border-gray-200 pl-3">
                      {kids.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={navHref(child)}
                            onClick={close}
                            className="block rounded-md px-3 py-2.5 text-sm font-medium text-[var(--dw-text)] opacity-90 hover:bg-gray-100 hover:text-[var(--dw-primary)] hover:opacity-100 transition-colors"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
