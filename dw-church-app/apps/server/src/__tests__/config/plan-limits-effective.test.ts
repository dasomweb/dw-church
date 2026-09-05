/**
 * Effective feature access = base defaults ⊕ per-tenant overrides. This is what
 * the admin gates the sidebar nav + block picker on, and requireFeature gates
 * routes on. 2026-09 model (no tier ladder):
 *   - public website features are BASE (ungated — not gated keys at all),
 *   - 교회 행정 features (목장·새가족) are paid ADD-ONS: OFF by default, ON only
 *     via an explicit override boolean (= 구매/활성화).
 */
import { describe, it, expect } from 'vitest';
import { effectiveFeatures, addonFeatures, isAddon } from '../../config/plan-limits.js';

describe('effectiveFeatures (add-on model)', () => {
  it('base plan: all 행정 add-ons OFF by default', () => {
    const f = effectiveFeatures('base', {});
    expect(f.cells).toBe(false);
    expect(f.newcomer).toBe(false);
    expect(f.newcomer_registration).toBe(false);
  });

  it('override enables an add-on (either direction wins over default)', () => {
    expect(effectiveFeatures('base', { cells: true }).cells).toBe(true);
    expect(effectiveFeatures('base', { newcomer: true }).newcomer).toBe(true);
    expect(effectiveFeatures('base', { cells: false }).cells).toBe(false);
  });

  it('public website features are BASE — not gated keys', () => {
    const f = effectiveFeatures('base', {});
    expect(f.albums).toBeUndefined();
    expect(f.boards).toBeUndefined();
    expect(f.events).toBeUndefined();
  });
});

describe('isAddon', () => {
  it('행정 features are add-ons; web content is not gated', () => {
    expect(isAddon('cells')).toBe(true);
    expect(isAddon('newcomer')).toBe(true);
    expect(isAddon('newcomer_registration')).toBe(true);
    expect(isAddon('albums')).toBe(false); // ungated base (absent from map)
    expect(isAddon('pwa')).toBe(false);    // tier-gated (own add-on flag), not []
  });
});

describe('addonFeatures (billable = enabled add-ons)', () => {
  it('none when no overrides', () => {
    expect(addonFeatures('base', {})).toEqual([]);
  });

  it('an enabled add-on is billable', () => {
    expect(addonFeatures('base', { cells: true })).toEqual(['cells']);
  });

  it('ungated web content is never a billable add-on', () => {
    expect(addonFeatures('base', { albums: true })).toEqual([]);
  });

  it('multiple enabled add-ons are all billable', () => {
    expect(addonFeatures('base', { cells: true, newcomer: true }).sort()).toEqual(['cells', 'newcomer']);
  });
});
