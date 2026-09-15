import type { CSSProperties } from 'react';

interface InfoBarBlockProps {
  props: Record<string, unknown>;
  slug?: string;
}

// Each cell = a small label + a bold value. Accepts label/value (super-admin
// ItemsEditor) OR title/description (tenant CardItemsEditor) so both editors work.
interface BarItem {
  label?: string;
  value?: string;
  title?: string;
  description?: string;
}

/**
 * info_bar — a compact, full-bleed horizontal BAND of N cells, each a small
 * label + a bold value. The church "예배시간 바" under the hero (주일 1부 / 2부 /
 * 금요기도회 / 새벽예배) is the canonical use, but it's generic: quick stats, a
 * contact quick-info strip, hours, etc.
 *
 * Distinct from info_columns (white hairline grid of title + multi-row cells):
 * this is a solid colored band with white text and one value per cell.
 *
 * Band color + text color are props (default = brand band, white text) and the
 * band color resolves palette keys (primary/accent/…) so it tracks the theme.
 * Column count is honoured via the container-query grid (responsive, no dynamic
 * Tailwind classes). Reusable on any tenant.
 */
const BAND_PALETTE: Record<string, string> = {
  primary:   'var(--dw-primary, var(--brand-primary, #1466d6))',
  secondary: 'var(--dw-secondary, var(--brand-secondary, #64748b))',
  accent:    'var(--dw-accent, var(--brand-accent, #2b7fff))',
  surface:   'var(--dw-surface, var(--surface, #f7f8fa))',
  text:      'var(--dw-text, var(--brand-text, #16181d))',
};

function resolveBand(v: string): string {
  const s = (v || '').trim();
  if (!s) return BAND_PALETTE.primary!;
  if (s.startsWith('#') || s.startsWith('rgb') || s.startsWith('hsl') || s.startsWith('var(') || s.startsWith('color-mix(')) {
    return s;
  }
  return BAND_PALETTE[s] ?? `var(--${s}, ${BAND_PALETTE.primary})`;
}

export function InfoBarBlock({ props }: InfoBarBlockProps) {
  const items = (Array.isArray(props.items) ? props.items : []) as BarItem[];
  if (items.length === 0) return null;

  const columns = Math.min(Math.max(Number(props.columns) || items.length, 1), 6);
  const mobileColumns = ((props.mobileColumns as string) ?? '2') as '1' | '2';
  const background = resolveBand((props.background as string) || 'primary');
  const textColor = (props.textColor as string) || '#ffffff';
  const align = (props.align as string) === 'center' ? 'center' : 'left';

  const cqVars = {
    '--cq-base': mobileColumns,
    '--cq-sm': '2',
    '--cq-lg': String(columns),
  } as CSSProperties;
  const labelColor = `color-mix(in srgb, ${textColor} 78%, transparent)`;

  return (
    <section style={{ background }}>
      <div className="b2b-cq-host mx-auto max-w-7xl px-4 sm:px-6" style={{ paddingBlock: '1.6rem' }}>
        <ul className="b2b-cq-grid list-none p-0 m-0" style={{ ...cqVars, gap: '1rem 2rem' }}>
          {items.map((it, i) => {
            const label = it.label ?? it.title ?? '';
            const value = it.value ?? it.description ?? '';
            return (
              <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: align, color: textColor, minWidth: 0 }}>
                {label && <span style={{ fontSize: 'var(--fs-sm, 13px)', fontWeight: 600, color: labelColor }}>{label}</span>}
                {value && <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{value}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
