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

describe('feature gates (add-on model)', () => {
  it('행정 add-ons (목장·새가족) are OFF by default on every plan', () => {
    // No tier includes them → only a per-tenant override activates them.
    for (const plan of ['light', 'basic', 'plus', 'pro']) {
      expect(planAllowsFeature(plan, 'cells')).toBe(false);
      expect(planAllowsFeature(plan, 'newcomer')).toBe(false);
      expect(planAllowsFeature(plan, 'newcomer_registration')).toBe(false);
    }
  });

  it('public website features are BASE — allowed on every plan (ungated)', () => {
    for (const key of ['sermons', 'albums', 'boards', 'events', 'columns', 'video', 'banners']) {
      expect(planAllowsFeature('basic', key)).toBe(true);
      expect(tiersForFeature(key)).toEqual(['basic', 'plus', 'pro']);
    }
  });
});
