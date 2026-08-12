/**
 * Plan-limits config tests — quota table + alias normalization + feature gates.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizePlan,
  planLimits,
  planAllowsFeature,
  tiersForFeature,
  PLAN_LIMITS,
} from '../../config/plan-limits.js';

describe('normalizePlan', () => {
  it('maps canonical tiers to themselves', () => {
    expect(normalizePlan('basic')).toBe('basic');
    expect(normalizePlan('plus')).toBe('plus');
    expect(normalizePlan('pro')).toBe('pro');
  });

  it('folds legacy + marketing aliases (light merged into basic)', () => {
    expect(normalizePlan('light')).toBe('basic');
    expect(normalizePlan('free')).toBe('basic');
    expect(normalizePlan('essential')).toBe('basic');
    expect(normalizePlan('ministry')).toBe('basic');
    expect(normalizePlan('outreach')).toBe('pro');
    expect(normalizePlan('enterprise')).toBe('pro');
  });

  it('is case/whitespace insensitive', () => {
    expect(normalizePlan('  PRO ')).toBe('pro');
    expect(normalizePlan('Basic')).toBe('basic');
  });

  it('defaults unknown/empty to the entry tier (basic)', () => {
    expect(normalizePlan('')).toBe('basic');
    expect(normalizePlan(null)).toBe('basic');
    expect(normalizePlan(undefined)).toBe('basic');
    expect(normalizePlan('mystery')).toBe('basic');
  });
});

describe('planLimits — admin/page quotas', () => {
  it('returns the documented 3/5/10 admin ladder (basic is the entry)', () => {
    expect(planLimits('basic').maxAdmins).toBe(3);
    expect(planLimits('plus').maxAdmins).toBe(5);
    expect(planLimits('pro').maxAdmins).toBe(10);
  });

  it('admin + page quotas increase monotonically with tier', () => {
    const order = ['basic', 'plus', 'pro'] as const;
    for (let i = 1; i < order.length; i++) {
      expect(PLAN_LIMITS[order[i]!].maxAdmins).toBeGreaterThan(PLAN_LIMITS[order[i - 1]!].maxAdmins);
      expect(PLAN_LIMITS[order[i]!].maxPages).toBeGreaterThanOrEqual(PLAN_LIMITS[order[i - 1]!].maxPages);
    }
  });

  it('resolves limits through aliases too', () => {
    expect(planLimits('enterprise').maxAdmins).toBe(10); // → pro
    expect(planLimits('light').maxAdmins).toBe(3); // → basic (merged)
    expect(planLimits('free').maxAdmins).toBe(3); // → basic
  });
});

describe('feature gates', () => {
  it('cells (목장) requires plus or pro', () => {
    expect(planAllowsFeature('light', 'cells')).toBe(false);
    expect(planAllowsFeature('basic', 'cells')).toBe(false);
    expect(planAllowsFeature('plus', 'cells')).toBe(true);
    expect(planAllowsFeature('pro', 'cells')).toBe(true);
  });

  it('newcomer registration requires pro', () => {
    expect(planAllowsFeature('plus', 'newcomer_registration')).toBe(false);
    expect(planAllowsFeature('pro', 'newcomer_registration')).toBe(true);
  });

  it('ungated features are allowed on every tier', () => {
    expect(planAllowsFeature('basic', 'sermons')).toBe(true);
    expect(tiersForFeature('sermons')).toEqual(['basic', 'plus', 'pro']);
  });

  it('tiersForFeature returns the gated set for known features', () => {
    expect(tiersForFeature('cells')).toEqual(['plus', 'pro']);
    expect(tiersForFeature('newcomer_registration')).toEqual(['pro']);
  });
});
