/**
 * Effective feature access = plan defaults ⊕ per-tenant overrides. This is what
 * the admin gates the sidebar nav + block picker on, so lock the rules:
 *   - a tier grants everything at/above its threshold,
 *   - an explicit override boolean wins over the plan default (either direction).
 */
import { describe, it, expect } from 'vitest';
import { effectiveFeatures, addonFeatures } from '../../config/plan-limits.js';

describe('effectiveFeatures', () => {
  it('light: only ungated + no gated modules', () => {
    const f = effectiveFeatures('light', {});
    expect(f.albums).toBe(false);
    expect(f.video).toBe(false);
    expect(f.cells).toBe(false);
    expect(f.newcomer).toBe(false);
  });

  it('basic: content modules on, plus/pro features off', () => {
    const f = effectiveFeatures('basic', {});
    expect(f.albums).toBe(true);
    expect(f.columns).toBe(true);
    expect(f.video).toBe(true);
    expect(f.boards).toBe(true);
    expect(f.banners).toBe(true);
    expect(f.cells).toBe(false);
    expect(f.newcomer).toBe(false);
  });

  it('plus: adds cells + newcomer, but not pro-only', () => {
    const f = effectiveFeatures('plus', {});
    expect(f.cells).toBe(true);
    expect(f.newcomer).toBe(true);
    expect(f.newcomer_registration).toBe(false);
    expect(f.pwa).toBe(false);
  });

  it('pro: everything on', () => {
    const f = effectiveFeatures('pro', {});
    for (const v of Object.values(f)) expect(v).toBe(true);
  });

  it('override grants a higher-tier feature to a lower plan', () => {
    expect(effectiveFeatures('basic', { cells: true }).cells).toBe(true);
  });

  it('override can also revoke a plan-included feature', () => {
    expect(effectiveFeatures('basic', { albums: false }).albums).toBe(false);
  });

  it('legacy/unknown plan folds to light', () => {
    expect(effectiveFeatures('free', {}).albums).toBe(false);
  });
});

describe('addonFeatures (billable = enabled ABOVE the plan)', () => {
  it('none when no overrides', () => {
    expect(addonFeatures('basic', {})).toEqual([]);
  });

  it('an override granting an above-plan feature is a billable add-on', () => {
    expect(addonFeatures('basic', { cells: true })).toEqual(['cells']);
  });

  it('enabling a feature the plan already includes is NOT an add-on', () => {
    expect(addonFeatures('basic', { albums: true })).toEqual([]);
  });

  it('turning a plan feature OFF is not an add-on (no discount)', () => {
    expect(addonFeatures('basic', { albums: false })).toEqual([]);
  });

  it('multiple above-plan grants are all add-ons', () => {
    expect(addonFeatures('light', { cells: true, newcomer: true }).sort()).toEqual(['cells', 'newcomer']);
  });
});
