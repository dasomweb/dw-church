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
    expect(normalizePlan('light')).toBe('light');
    expect(normalizePlan('basic')).toBe('basic');
    expect(normalizePlan('plus')).toBe('plus');
    expect(normalizePlan('pro')).toBe('pro');
  });

  it('folds legacy + marketing aliases', () => {
    expect(normalizePlan('free')).toBe('light');
    expect(normalizePlan('essential')).toBe('light');
    expect(normalizePlan('ministry')).toBe('basic');
    expect(normalizePlan('outreach')).toBe('pro');
    expect(normalizePlan('enterprise')).toBe('pro');
  });

  it('is case/whitespace insensitive', () => {
    expect(normalizePlan('  PRO ')).toBe('pro');
    expect(normalizePlan('Basic')).toBe('basic');
  });

  it('defaults unknown/empty to the smallest paid tier (light)', () => {
    expect(normalizePlan('')).toBe('light');
    expect(normalizePlan(null)).toBe('light');
    expect(normalizePlan(undefined)).toBe('light');
    expect(normalizePlan('mystery')).toBe('light');
  });
});

describe('planLimits — admin/page quotas', () => {
  it('returns the documented 2/3/5/10 admin ladder', () => {
    expect(planLimits('light').maxAdmins).toBe(2);
    expect(planLimits('basic').maxAdmins).toBe(3);
    expect(planLimits('plus').maxAdmins).toBe(5);
    expect(planLimits('pro').maxAdmins).toBe(10);
  });

  it('admin + page quotas increase monotonically with tier', () => {
    const order = ['light', 'basic', 'plus', 'pro'] as const;
    for (let i = 1; i < order.length; i++) {
      expect(PLAN_LIMITS[order[i]!].maxAdmins).toBeGreaterThan(PLAN_LIMITS[order[i - 1]!].maxAdmins);
      expect(PLAN_LIMITS[order[i]!].maxPages).toBeGreaterThanOrEqual(PLAN_LIMITS[order[i - 1]!].maxPages);
    }
  });

  it('resolves limits through aliases too', () => {
    expect(planLimits('enterprise').maxAdmins).toBe(10); // → pro
    expect(planLimits('free').maxAdmins).toBe(2); // → light
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
    expect(planAllowsFeature('light', 'sermons')).toBe(true);
    expect(tiersForFeature('sermons')).toEqual(['light', 'basic', 'plus', 'pro']);
  });

  it('tiersForFeature returns the gated set for known features', () => {
    expect(tiersForFeature('cells')).toEqual(['plus', 'pro']);
    expect(tiersForFeature('newcomer_registration')).toEqual(['pro']);
  });
});
