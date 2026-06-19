import { describe, it, expect } from 'vitest';
import {
  designTokensSchema,
  blockStyleSchema,
  DEFAULT_DESIGN_TOKENS,
  FONT_SIZE_PRESETS,
  SPACING_PRESETS,
  tokensToCssVars,
  tokensToCssText,
  relativeLuminance,
  contrastRatio,
  pickForeground,
  paletteWithFg,
  resolveColorToHex,
  resolveColorToCss,
  legacyThemeToTokens,
  applyFontSizePreset,
  applySpacingPreset,
  detectFontSizePreset,
  detectSpacingPreset,
} from '../index.js';

describe('designTokensSchema', () => {
  it('validates DEFAULT_DESIGN_TOKENS', () => {
    const result = designTokensSchema.safeParse(DEFAULT_DESIGN_TOKENS);
    expect(result.success).toBe(true);
  });

  it('rejects missing system color slot', () => {
    const broken = {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        ...DEFAULT_DESIGN_TOKENS.colors,
        system: { ...DEFAULT_DESIGN_TOKENS.colors.system, primary: undefined } as unknown as typeof DEFAULT_DESIGN_TOKENS.colors.system,
      },
    };
    expect(designTokensSchema.safeParse(broken).success).toBe(false);
  });

  it('backfills header defaults when the blob omits it (pre-header token snapshots)', () => {
    // tokensV2 blobs persisted before `header` existed must still parse — the
    // schema default fills logoHeight/navFontSize so the storefront header
    // renders at its previous size instead of undefined.
    const { header: _omit, ...withoutHeader } = DEFAULT_DESIGN_TOKENS;
    void _omit;
    const result = designTokensSchema.safeParse(withoutHeader);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.header).toEqual({ logoHeight: 40, navFontSize: 14, navFontWeight: 500 });
    }
  });
});

describe('header tokens', () => {
  it('emits --brand-logo-height / --brand-nav-font-size from header tokens', () => {
    const tokens = { ...DEFAULT_DESIGN_TOKENS, header: { logoHeight: 64, navFontSize: 18, navFontWeight: 700 } };
    const vars = tokensToCssVars(tokens);
    expect(vars['--brand-logo-height']).toBe('64px');
    expect(vars['--brand-nav-font-size']).toBe('18px');
    expect(vars['--brand-nav-font-weight']).toBe('700');
  });

  it('legacyThemeToTokens backfills header for a tokensV2 blob missing it', () => {
    // Simulate a stored snapshot that predates the header field.
    const { header: _omit, ...v2WithoutHeader } = DEFAULT_DESIGN_TOKENS;
    void _omit;
    const tokens = legacyThemeToTokens({ tokensV2: v2WithoutHeader as typeof DEFAULT_DESIGN_TOKENS });
    expect(tokens.header).toEqual({ logoHeight: 40, navFontSize: 14, navFontWeight: 500 });
    // And the css emit still produces the vars (no NaN/undefined).
    const vars = tokensToCssVars(tokens);
    expect(vars['--brand-logo-height']).toBe('40px');
    expect(vars['--brand-nav-font-size']).toBe('14px');
  });
});

describe('blockStyleSchema', () => {
  it('accepts an empty object', () => {
    expect(blockStyleSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a typography override using a token color', () => {
    const r = blockStyleSchema.safeParse({
      typography: { color: { token: 'primary' }, weight: 'bold' },
    });
    expect(r.success).toBe(true);
  });

  it('rejects unknown keys at the top level', () => {
    const r = blockStyleSchema.safeParse({ typography: {}, garbage: true });
    expect(r.success).toBe(false);
  });
});

describe('FONT_SIZE_PRESETS', () => {
  it('default preset matches DEFAULT_DESIGN_TOKENS h1 desktop', () => {
    expect(FONT_SIZE_PRESETS.default.h1.desktop).toBe(
      DEFAULT_DESIGN_TOKENS.typography.scales.h1!.size.desktop,
    );
  });

  it('all four density presets are monotone-increasing on h1', () => {
    expect(FONT_SIZE_PRESETS.compact.h1.desktop).toBeLessThan(FONT_SIZE_PRESETS.default.h1.desktop);
    expect(FONT_SIZE_PRESETS.default.h1.desktop).toBeLessThan(FONT_SIZE_PRESETS.large.h1.desktop);
    expect(FONT_SIZE_PRESETS.large.h1.desktop).toBeLessThan(FONT_SIZE_PRESETS.xlarge.h1.desktop);
  });

  it('SPACING_PRESETS sectionPaddingY is monotone', () => {
    expect(SPACING_PRESETS.cozy.sectionPaddingY).toBeLessThan(SPACING_PRESETS.default.sectionPaddingY);
    expect(SPACING_PRESETS.default.sectionPaddingY).toBeLessThan(SPACING_PRESETS.airy.sectionPaddingY);
    expect(SPACING_PRESETS.airy.sectionPaddingY).toBeLessThan(SPACING_PRESETS.spacious.sectionPaddingY);
  });
});

describe('tokensToCssVars', () => {
  const vars = tokensToCssVars(DEFAULT_DESIGN_TOKENS);

  it('emits 8 system color slots', () => {
    expect(vars['--brand-primary']).toBe('#2563eb');
    expect(vars['--brand-surface']).toBe('#f1f5f9');
  });

  it('emits typography family + per-scale size in px', () => {
    expect(vars['--brand-font-heading']).toContain('Inter');
    expect(vars['--brand-h1']).toBe('72px');
    expect(vars['--brand-body']).toBe('16px');
  });

  it('emits radius and container-max', () => {
    expect(vars['--brand-radius-md']).toBe('8px');
    expect(vars['--brand-container-max']).toBe('1200px');
  });

  it('emits spacing tokens', () => {
    expect(vars['--brand-section-py']).toBe('75px');
    expect(vars['--brand-gap-grid']).toBe('24px');
  });

  it('emits transform / letter-spacing for overline', () => {
    expect(vars['--brand-overline-transform']).toBe('uppercase');
    expect(vars['--brand-overline-letter-spacing']).toBe('1.5px');
  });

  it('passes a custom color through', () => {
    const t = {
      ...DEFAULT_DESIGN_TOKENS,
      colors: {
        ...DEFAULT_DESIGN_TOKENS.colors,
        custom: { 'brand-yellow': '#ffe600' },
      },
    };
    expect(tokensToCssVars(t)['--brand-brand-yellow']).toBe('#ffe600');
  });
});

describe('tokensToCssText', () => {
  it('wraps in :root by default', () => {
    const css = tokensToCssText(DEFAULT_DESIGN_TOKENS);
    expect(css).toMatch(/^:root \{/);
    expect(css).toContain('--brand-primary: #2563eb;');
  });

  it('accepts a custom scope', () => {
    const css = tokensToCssText(DEFAULT_DESIGN_TOKENS, '.b2b-blocks-preview');
    expect(css).toMatch(/^\.b2b-blocks-preview \{/);
  });

  it('emits mobile media-query block when sizes differ', () => {
    const css = tokensToCssText(DEFAULT_DESIGN_TOKENS);
    expect(css).toContain('@media (max-width: 640px)');
    expect(css).toContain('--brand-h1: 42px');
  });
});

describe('contrast helpers', () => {
  it('relativeLuminance ranges 0..1', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 4);
  });

  it('contrastRatio of black-vs-white is 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('pickForeground returns light text on dark bg', () => {
    expect(pickForeground('#1e293b')).toBe('#FFFFFF');
    expect(pickForeground('#ffffff')).toBe('#1A1A1A');
  });

  it('paletteWithFg adds {slot}-fg keys passing WCAG AA on default palette', () => {
    const sys = DEFAULT_DESIGN_TOKENS.colors.system;
    const aug = paletteWithFg(sys);
    expect(aug['primary-fg']).toBeDefined();
    expect(aug['background-fg']).toBeDefined();
    expect(aug['surface-fg']).toBeDefined();
    // Every fg should clear AA against its own bg.
    for (const slot of Object.keys(sys)) {
      const bg = (sys as Record<string, string>)[slot]!;
      const fg = aug[`${slot}-fg`]!;
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('tokensToCssVars emits {slot}-fg variables', () => {
    const v = tokensToCssVars(DEFAULT_DESIGN_TOKENS);
    expect(v['--brand-primary-fg']).toBeDefined();
    expect(v['--brand-accent-fg']).toBeDefined();
    expect(v['--brand-background-fg']).toBeDefined();
  });

  it('palette with a noxious yellow primary still finds AA-passing fg', () => {
    const sys = { ...DEFAULT_DESIGN_TOKENS.colors.system, primary: '#facc15' };
    const aug = paletteWithFg(sys);
    expect(contrastRatio(aug['primary-fg']!, '#facc15')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('applyFontSizePreset', () => {
  it('large preset bumps h1 desktop to 88', () => {
    const t = applyFontSizePreset(DEFAULT_DESIGN_TOKENS, 'large');
    expect(t.typography.scales.h1!.size.desktop).toBe(88);
    expect(t.typography.scales.h1!.size.mobile).toBe(48);
  });

  it('preserves weight / lineHeight from input', () => {
    const t = applyFontSizePreset(DEFAULT_DESIGN_TOKENS, 'compact');
    expect(t.typography.scales.h1!.weight).toBe(DEFAULT_DESIGN_TOKENS.typography.scales.h1!.weight);
    expect(t.typography.scales.h1!.lineHeight).toBeCloseTo(
      DEFAULT_DESIGN_TOKENS.typography.scales.h1!.lineHeight,
    );
  });

  it('does not mutate the input tokens', () => {
    const before = DEFAULT_DESIGN_TOKENS.typography.scales.h1!.size.desktop;
    applyFontSizePreset(DEFAULT_DESIGN_TOKENS, 'xlarge');
    expect(DEFAULT_DESIGN_TOKENS.typography.scales.h1!.size.desktop).toBe(before);
  });
});

describe('applySpacingPreset', () => {
  it('airy preset sets section padding to 100', () => {
    const t = applySpacingPreset(DEFAULT_DESIGN_TOKENS, 'airy');
    expect(t.spacing.sectionPaddingY).toBe(100);
  });
});

describe('detect*Preset', () => {
  it('detects default font preset on DEFAULT_DESIGN_TOKENS', () => {
    expect(detectFontSizePreset(DEFAULT_DESIGN_TOKENS)).toBe('default');
  });

  it('detects default spacing preset on DEFAULT_DESIGN_TOKENS', () => {
    expect(detectSpacingPreset(DEFAULT_DESIGN_TOKENS)).toBe('default');
  });

  it('detects compact after applying compact', () => {
    const t = applyFontSizePreset(DEFAULT_DESIGN_TOKENS, 'compact');
    expect(detectFontSizePreset(t)).toBe('compact');
  });

  it('returns null on custom sizes', () => {
    const t: typeof DEFAULT_DESIGN_TOKENS = {
      ...DEFAULT_DESIGN_TOKENS,
      typography: {
        ...DEFAULT_DESIGN_TOKENS.typography,
        scales: {
          ...DEFAULT_DESIGN_TOKENS.typography.scales,
          h1: { ...DEFAULT_DESIGN_TOKENS.typography.scales.h1!, size: { desktop: 99, mobile: 50 } },
        },
      },
    };
    expect(detectFontSizePreset(t)).toBeNull();
  });
});

describe('legacyThemeToTokens', () => {
  it('returns DEFAULTS for null input', () => {
    const t = legacyThemeToTokens(null);
    expect(t.colors.system.primary).toBe('#2563eb');
    expect(t.containerMax).toBe(1200);
  });

  it('returns deep-equal tokensV2 content', () => {
    const out = legacyThemeToTokens({ tokensV2: DEFAULT_DESIGN_TOKENS });
    expect(out).toEqual(DEFAULT_DESIGN_TOKENS);
    // Cloned, so editor mutations to the result don't ripple into the source.
    expect(out).not.toBe(DEFAULT_DESIGN_TOKENS);
  });

  it('tokensV2 typography wins; legacy typography is ignored when tokensV2 is present', () => {
    // Regression: the legacy `typography` overlay used to clobber tokensV2 on
    // every read, reverting the super-admin editor's saved scale edits to the
    // stale seed value ("변경전 내용이 그대로"). tokensV2 is authoritative — the
    // legacy overlay applies ONLY when tokensV2 is absent.
    const customV2: typeof DEFAULT_DESIGN_TOKENS = {
      ...DEFAULT_DESIGN_TOKENS,
      typography: {
        ...DEFAULT_DESIGN_TOKENS.typography,
        scales: {
          ...DEFAULT_DESIGN_TOKENS.typography.scales,
          h1: { ...DEFAULT_DESIGN_TOKENS.typography.scales.h1!, size: { desktop: 64, mobile: 40 } },
        },
      },
    };
    const out = legacyThemeToTokens({
      tokensV2: customV2,
      typography: { h1: { fontSize: '90px' } },
    });
    // tokensV2 h1 (64) wins — the legacy 90px is ignored.
    expect(out.typography.scales.h1!.size.desktop).toBe(64);
    // Other scales come from tokensV2 untouched.
    expect(out.typography.scales.h2).toEqual(customV2.typography.scales.h2);
  });

  it('legacy typography overlays defaults when there is NO tokensV2', () => {
    const out = legacyThemeToTokens({ typography: { h1: { fontSize: '90px' } } });
    expect(out.typography.scales.h1!.size.desktop).toBe(90);
  });

  it('overlays legacy colors onto defaults', () => {
    const t = legacyThemeToTokens({
      colors: { primary: '#ff5733', accent: '#facc15' },
    });
    expect(t.colors.system.primary).toBe('#ff5733');
    expect(t.colors.system.accent).toBe('#facc15');
    expect(t.colors.system.background).toBe('#ffffff'); // default preserved
  });

  it('parses px font-size on h1', () => {
    const t = legacyThemeToTokens({
      typography: { h1: { fontSize: '88px', fontWeight: 'bold', lineHeight: '1.05' } },
    });
    expect(t.typography.scales.h1!.size.desktop).toBe(88);
    expect(t.typography.scales.h1!.weight).toBe(700);
    expect(t.typography.scales.h1!.lineHeight).toBeCloseTo(1.05);
  });

  it('maps legacy paragraph onto body scale', () => {
    const t = legacyThemeToTokens({
      typography: { paragraph: { fontSize: '17px', lineHeight: '1.7' } },
    });
    expect(t.typography.scales.body!.size.desktop).toBe(17);
    expect(t.typography.scales.body!.lineHeight).toBeCloseTo(1.7);
  });
});

describe('resolveColorToCss / resolveColorToHex', () => {
  it('token wins over hex in CSS resolution', () => {
    expect(resolveColorToCss({ token: 'primary', hex: '#ff0000' })).toBe('var(--brand-primary)');
  });

  it('hex used when token is absent (CSS)', () => {
    expect(resolveColorToCss({ hex: '#ff0000' })).toBe('#ff0000');
  });

  it('hex resolution uses tokens snapshot', () => {
    expect(resolveColorToHex({ token: 'primary' }, DEFAULT_DESIGN_TOKENS)).toBe('#2563eb');
  });

  it('falls back when token is unknown', () => {
    expect(resolveColorToHex({ token: 'unknown-slot' }, DEFAULT_DESIGN_TOKENS, '#000')).toBe('#000');
  });
});
