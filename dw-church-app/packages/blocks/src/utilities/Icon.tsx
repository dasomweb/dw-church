/**
 * Inline vector icon. Renders a curated, self-hosted Lucide-derived
 * icon by name. Colour follows `currentColor` so it inherits the
 * surrounding text / theme colour with no extra wiring; size is a
 * single number (px, square). Unknown names render nothing (caller
 * decides the fallback — e.g. an uploaded image).
 *
 * dangerouslySetInnerHTML is safe here: `body` is static path markup
 * we author in icons.ts, never user input.
 */

import { ICONS } from '../icons/icons';

interface IconProps {
  name: string;
  /** Square size in px. Default 24 (the icon's native viewBox). */
  size?: number;
  /** Accessible label. Omit → decorative (aria-hidden). */
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Editor click-target hook (BlockRenderer resolves the inspector
   * field from the nearest [data-element]). */
  'data-element'?: string;
}

export function Icon({
  name,
  size = 24,
  title,
  className,
  style,
  'data-element': dataElement,
}: IconProps) {
  const def = ICONS[name];
  if (!def) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      data-element={dataElement}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      dangerouslySetInnerHTML={{
        __html: (title ? `<title>${escapeXml(title)}</title>` : '') + def.body,
      }}
    />
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
