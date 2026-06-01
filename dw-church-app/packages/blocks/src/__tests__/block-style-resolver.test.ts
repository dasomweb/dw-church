/**
 * Phase-5 parity tests for blockStyleToCss.
 *
 * Both consumers (apps/web BlockRenderer and packages/admin-app
 * LivePreviewPane) call this exact function with the same BlockStyle
 * input, so the parity is structural — these tests pin the output for
 * canonical inputs so a silent change in cascade or unit handling fails
 * CI before landing.
 */
import { describe, it, expect } from 'vitest';
import type { BlockStyle } from '@dw-church/design-tokens';
import { blockStyleToCss, isHiddenOnBreakpoint } from '../utilities/block-style-resolver';

describe('blockStyleToCss', () => {
  it('empty style → empty object', () => {
    expect(blockStyleToCss(undefined)).toEqual({});
    expect(blockStyleToCss(null)).toEqual({});
    expect(blockStyleToCss({})).toEqual({});
  });

  it('spacing.padding emits 4-side shorthand preserving zeros', () => {
    const css = blockStyleToCss({ spacing: { padding: { top: 96, bottom: 96 } } });
    expect(css.padding).toBe('96px 0px 96px 0px');
  });

  it('spacing.gap emits both `gap` and the cascade-friendly --block-gap variable', () => {
    const css = blockStyleToCss({ spacing: { gap: 24 } }) as Record<string, unknown>;
    expect(css.gap).toBe('24px');
    expect(css['--block-gap']).toBe('24px');
  });

  it('spacing.gap absent → no --block-gap variable in output', () => {
    const css = blockStyleToCss({ spacing: { padding: { top: 10 } } }) as Record<string, unknown>;
    expect(css.gap).toBeUndefined();
    expect(css['--block-gap']).toBeUndefined();
  });

  it('background.color resolves token reference to var()', () => {
    const css = blockStyleToCss({
      background: { color: { token: 'surface' } },
    });
    expect(css.backgroundColor).toBe('var(--brand-surface)');
  });

  it('background.gradient emits CSS gradient with token references', () => {
    const css = blockStyleToCss({
      background: {
        gradient: {
          type: 'linear',
          angle: 135,
          stops: [
            { color: { token: 'primary' }, at: 0 },
            { color: { token: 'secondary' }, at: 100 },
          ],
        },
      },
    });
    expect(css.backgroundImage).toBe(
      'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
    );
  });

  it('shadow preset → token var', () => {
    expect(blockStyleToCss({ shadow: { preset: 'lg' } }).boxShadow).toBe('var(--brand-shadow-lg)');
    expect(blockStyleToCss({ shadow: { preset: 'none' } }).boxShadow).toBe('none');
  });

  it('size.width "full" → 100%', () => {
    expect(blockStyleToCss({ size: { width: 'full' } }).width).toBe('100%');
    expect(blockStyleToCss({ size: { height: 'auto' } }).height).toBe('auto');
    expect(blockStyleToCss({ size: { minHeight: 320 } }).minHeight).toBe('320px');
  });

  it('alignment.justify maps short aliases to flex/space values', () => {
    expect(blockStyleToCss({ alignment: { justify: 'between' } }).justifyContent).toBe('space-between');
    expect(blockStyleToCss({ alignment: { justify: 'start' } }).justifyContent).toBe('flex-start');
  });

  it('typography overrides set color/weight/align/lineHeight/letterSpacing', () => {
    const css = blockStyleToCss({
      typography: {
        color: { token: 'accent' },
        weight: 'bold',
        align: 'center',
        lineHeight: 1.2,
        letterSpacing: -0.5,
        transform: 'uppercase',
      },
    });
    expect(css.color).toBe('var(--brand-accent)');
    expect(css.fontWeight).toBe(700);
    expect(css.textAlign).toBe('center');
    expect(css.lineHeight).toBe(1.2);
    expect(css.letterSpacing).toBe('-0.5px');
    expect(css.textTransform).toBe('uppercase');
  });

  it('combined override emits all fields together', () => {
    const style: BlockStyle = {
      spacing: { padding: { top: 75, bottom: 75 } },
      background: { color: { token: 'surface' } },
      border: { radius: 16 },
      shadow: { preset: 'md' },
    };
    const css = blockStyleToCss(style);
    expect(css.padding).toBe('75px 0px 75px 0px');
    expect(css.backgroundColor).toBe('var(--brand-surface)');
    expect(css.borderRadius).toBe('16px');
    expect(css.boxShadow).toBe('var(--brand-shadow-md)');
  });

  it('is deterministic — same input → same output reference values', () => {
    const a = blockStyleToCss({ spacing: { padding: { top: 10 } } });
    const b = blockStyleToCss({ spacing: { padding: { top: 10 } } });
    expect(a).toEqual(b);
  });
});

describe('isHiddenOnBreakpoint', () => {
  it('false when no responsive config', () => {
    expect(isHiddenOnBreakpoint(undefined, 'mobile')).toBe(false);
    expect(isHiddenOnBreakpoint({}, 'mobile')).toBe(false);
  });

  it('true only for the listed breakpoints', () => {
    const style: BlockStyle = { responsive: { hiddenOn: ['mobile'] } };
    expect(isHiddenOnBreakpoint(style, 'mobile')).toBe(true);
    expect(isHiddenOnBreakpoint(style, 'tablet')).toBe(false);
    expect(isHiddenOnBreakpoint(style, 'desktop')).toBe(false);
  });
});
