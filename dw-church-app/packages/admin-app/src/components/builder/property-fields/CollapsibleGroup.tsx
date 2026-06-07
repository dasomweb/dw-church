/**
 * CollapsibleGroup — `<details>` + `<summary>` shell used for the
 * inspector's secondary groups (Effects, Spacing, advanced toggles).
 *
 * Why exists
 *   Two places in ElementInspector hand-rolled the exact same recipe:
 *
 *     <details className="border-t border-gray-100 pt-3">
 *       <summary className="cursor-pointer text-[11px] font-semibold
 *           text-gray-600 uppercase tracking-wider hover:text-gray-900">
 *         …group title…
 *       </summary>
 *       <div className="mt-3 space-y-3">…body…</div>
 *     </details>
 *
 *   Centralising it (1) freezes the visual style so a future "tracking-
 *   wide" tweak lands once, and (2) lets the group keep a uniform spacing
 *   rhythm (border-top divider, pt-3 above summary, mt-3 to body, space-y-3
 *   between children) that the rest of the inspector follows.
 *
 *   `defaultOpen` mirrors the native `open` attribute — controlled state
 *   isn't needed; the browser owns it.
 */

import type { ReactNode } from 'react';

export interface CollapsibleGroupProps {
  /** Group title shown in the summary row (uppercase / tracked). */
  title: string;
  /** Open by default. Mirrors the native <details open> attribute. */
  defaultOpen?: boolean;
  /** Body content. The component supplies `space-y-3` for vertical
   *  rhythm; callers don't need to add their own. */
  children: ReactNode;
}

export function CollapsibleGroup({ title, defaultOpen = false, children }: CollapsibleGroupProps) {
  return (
    <details className="border-t border-gray-100 pt-3" open={defaultOpen}>
      <summary className="cursor-pointer text-[11px] font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900">
        {title}
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}
