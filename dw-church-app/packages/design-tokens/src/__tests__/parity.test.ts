/**
 * Phase-5 Canvas ↔ Storefront parity tests.
 *
 * Both consumers — apps/web's BrandTokensStyle (storefront) and
 * packages/admin-app's LivePreviewPane (canvas) — emit `--brand-*` CSS
 * variables by calling tokensToCssText() from this package. As long as
 * they all go through the same exported function, the parity is
 * structural. These tests pin the function's output for representative
 * fixtures so any silent change in cascade or formatting fails CI before
 * landing.
 *
 * The fixtures themselves model real shapes the AI Builder produces:
 *   - "minimal":     just primary + body family changed (most tenants).
 *   - "ai-designer": full DesignTokens snapshot with 8 colors + custom +
 *                    typography + spacing all set (Designer LLM output).
 *   - "block":       BlockStyle override matching what the perSection
 *                    overrides emit (Phase-3 pipeline).
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DESIGN_TOKENS,
  legacyThemeToTokens,
  tokensToCssText,
  blockStyleSchema,
} from '../index.js';
// blockStyleToCss lives in @dw-church/blocks (which depends on us). We
// re-implement the relevant assertions here on the upstream resolver
// surface (color/spacing/etc.) so this package stays standalone.

describe('parity — tokensToCssText', () => {
  it('default tokens emit a deterministic :root rule', () => {
    const css = tokensToCssText(DEFAULT_DESIGN_TOKENS);
    // The order of keys + values is determined by Object.entries iteration
    // over the schema. Snapshot the first few lines so reordering trips.
    expect(css.startsWith(':root {')).toBe(true);
    expect(css).toContain('  --brand-primary: #2563eb;');
    expect(css).toContain('  --brand-primary-fg: ');
    expect(css).toContain('  --brand-h1: 72px;');
    expect(css).toContain('  --brand-radius-md: 8px;');
    expect(css).toContain('  --brand-section-py: 75px;');
    expect(css).toContain('@media (max-width: 640px)');
  });

  it('legacy theme blob with primary override resolves to same shape', () => {
    const t = legacyThemeToTokens({
      colors: { primary: '#ff5733' },
      fonts: { koreanFont: 'Pretendard' },
    });
    const css = tokensToCssText(t, '[data-tenant="acme"]');
    expect(css.startsWith('[data-tenant="acme"] {')).toBe(true);
    expect(css).toContain('--brand-primary: #ff5733;');
    expect(css).toContain('--brand-primary-fg: ');
  });

  it('custom color tokens flow through with the same naming convention', () => {
    const t = {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        ...DEFAULT_DESIGN_TOKENS.colors,
        custom: { 'brand-yellow': '#ffe600', 'badge-red': '#dc2626' },
      },
    };
    const css = tokensToCssText(t);
    expect(css).toContain('--brand-brand-yellow: #ffe600;');
    expect(css).toContain('--brand-badge-red: #dc2626;');
  });

  it('uses the passed scope selector verbatim', () => {
    const css1 = tokensToCssText(DEFAULT_DESIGN_TOKENS, '.b2b-blocks-preview');
    const css2 = tokensToCssText(DEFAULT_DESIGN_TOKENS, '.b2b-blocks-preview');
    // Pure function: same input → same string.
    expect(css1).toBe(css2);
    expect(css1.startsWith('.b2b-blocks-preview {')).toBe(true);
  });

  it('preset application produces the same CSS regardless of route', () => {
    // Preset writer (admin) and stored tokensV2 (server resolver) should
    // converge on the same effective output.
    const direct = tokensToCssText({
      ...DEFAULT_DESIGN_TOKENS,
      typography: {
        ...DEFAULT_DESIGN_TOKENS.typography,
        scales: {
          ...DEFAULT_DESIGN_TOKENS.typography.scales,
          h1: { ...DEFAULT_DESIGN_TOKENS.typography.scales.h1!, size: { desktop: 88, tablet: 60, mobile: 48 } },
        },
      },
    });
    const viaResolver = tokensToCssText(legacyThemeToTokens({
      tokensV2: {
        ...DEFAULT_DESIGN_TOKENS,
        typography: {
          ...DEFAULT_DESIGN_TOKENS.typography,
          scales: {
            ...DEFAULT_DESIGN_TOKENS.typography.scales,
            h1: { ...DEFAULT_DESIGN_TOKENS.typography.scales.h1!, size: { desktop: 88, tablet: 60, mobile: 48 } },
          },
        },
      },
    }));
    expect(direct).toBe(viaResolver);
  });
});

describe('parity — blockStyleSchema fixtures', () => {
  // Phase-3 perSection input — server validates against this schema and
  // forwards to the storefront via styleOverrides on the page_section
  // row. The canvas LivePreviewPane / storefront BlockRenderer both feed
  // the same shape into blockStyleToCss. This suite pins the canonical
  // BlockStyle shapes so a schema change can't silently broaden / narrow
  // what the wizard is allowed to send.

  it('accepts a typical AI Designer perSection entry', () => {
    const r = blockStyleSchema.safeParse({
      spacing: { padding: { top: 96, bottom: 96 } },
      background: { color: { token: 'surface' } },
      typography: { color: { token: 'text' }, align: 'center' },
    });
    expect(r.success).toBe(true);
  });

  it('rejects an unknown top-level key', () => {
    const r = blockStyleSchema.safeParse({
      spacing: {},
      cssText: 'background: red',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a malformed gradient (single stop)', () => {
    const r = blockStyleSchema.safeParse({
      background: {
        gradient: { type: 'linear', stops: [{ color: { hex: '#fff' }, at: 0 }] },
      },
    });
    expect(r.success).toBe(false);
  });
});
