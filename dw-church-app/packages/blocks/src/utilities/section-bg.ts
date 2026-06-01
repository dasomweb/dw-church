/**
 * Section background variants — shared resolver so every block agrees
 * on the four bgMode values:
 *
 *   'none'    : transparent. Inherits from the page (typically white).
 *   'subtle'  : light gray. Used to break up a long page of white
 *               sections without going dark. `var(--bg-subtle)`.
 *   'accent'  : brand-accent fill, white text. Use SPARINGLY (1-2 per
 *               page) for the most attention-grabbing CTA-style sections.
 *   'dark'    : near-black background, white text. Used in modern
 *               marketing sites for the "Latest arrivals" / "Davayte
 *               obsudim sotrudnichestvo" / dark-hero rhythm break. The
 *               eye gets a visual reset between long pale sections.
 *
 * The whole point of this helper is to give the AI Builder + the
 * operator a *known* set of section-bg knobs that work everywhere. Page
 * composition rules (in the agents prompt) recommend at most ONE dark
 * section and ONE accent section per page so the rhythm stays
 * intentional — three dark sections in a row look like a mistake, not
 * a design choice.
 */

export type SectionBgMode = 'none' | 'subtle' | 'accent' | 'dark';

/**
 * Returns the Tailwind class string for a given bg mode. Empty string
 * for 'none' so the block stays transparent. Use `text-on-section` in
 * CSS or read sectionTextColor() below if you need to set color of
 * arbitrary children.
 */
export function sectionBgClass(mode: string | undefined): string {
  switch (mode) {
    case 'dark':
      return 'bg-gray-900 text-white';
    case 'accent':
      return 'bg-[var(--accent)] text-[var(--text-on-accent,#ffffff)]';
    case 'subtle':
      return 'bg-[var(--bg-subtle,#f8fafc)]';
    case 'none':
    default:
      return '';
  }
}

/**
 * Whether the bg is dark — useful when a block needs to flip a child
 * element's color (e.g. muted secondary text becomes white/80 on dark
 * sections rather than gray-600 which would disappear).
 */
export function isDarkSection(mode: string | undefined): boolean {
  return mode === 'dark' || mode === 'accent';
}

/**
 * Color for "secondary" text inside a section — e.g. card description
 * paragraphs. Light bg → gray-600; dark bg → white/80.
 */
export function sectionSecondaryTextColor(mode: string | undefined): string {
  return isDarkSection(mode) ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary, #4b5563)';
}

/**
 * Resolve a section's background to either a Tailwind class (legacy
 * bgMode enum path) OR an inline backgroundColor (operator's custom
 * `backgroundColor` prop). When `bgColor` is set it WINS — the operator
 * typed an explicit color into the inspector, that beats the enum default.
 *
 *   bgColor='#1a4d2e'   → { className: '', style: { backgroundColor: '#1a4d2e' } }
 *   bgColor='primary'   → { className: '', style: { backgroundColor: 'var(--accent, ...)' } }
 *   bgColor='' / null   → falls through to sectionBgClass(bgMode)
 *
 * Block renderers spread the return value into <section>:
 *   const bg = sectionBgStyle(props.bgMode, props.backgroundColor);
 *   <section className={bg.className} style={bg.style}>
 */
export function sectionBgStyle(
  bgMode: string | undefined,
  bgColor: string | null | undefined,
): { className: string; style?: { backgroundColor: string } } {
  const trimmed = (bgColor ?? '').toString().trim();
  if (trimmed) {
    return { className: '', style: { backgroundColor: resolveSectionBgColor(trimmed) } };
  }
  return { className: sectionBgClass(bgMode) };
}

// Mirrors overlay-color.ts's palette map so palette keys
// ('primary' / 'accent' / 'background' / 'surface' / 'text' / 'muted' /
// 'border') resolve to whichever CSS variable the tenant layout emits.
// Kept inline here so blocks don't all have to import overlay-color
// just to render a section bg.
const PALETTE_VAR: Record<string, string> = {
  primary:    'var(--accent, var(--dw-primary, currentColor))',
  secondary:  'var(--dw-secondary, currentColor)',
  accent:     'var(--accent, var(--dw-accent, currentColor))',
  background: 'var(--bg, var(--dw-background, transparent))',
  surface:    'var(--bg-subtle, var(--dw-surface, transparent))',
  text:       'var(--text-primary, var(--dw-text, currentColor))',
  muted:      'var(--text-muted, currentColor)',
  border:     'var(--border, currentColor)',
};

function resolveSectionBgColor(color: string): string {
  if (color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl')
      || color.startsWith('var(') || color.startsWith('color-mix(')) {
    return color;
  }
  return PALETTE_VAR[color] ?? `var(--${color}, currentColor)`;
}
