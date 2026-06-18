/**
 * Plan limits — single source of truth for per-tier quotas and feature gates.
 *
 * Pricing model (2026-06-16, 4-tier ladder shown on truelight.app):
 *   라이트 light  $59/$49  — 2 admin accounts
 *   기본   basic  $99/$79  — 3 admin accounts
 *   플러스 plus  $149/$119 — 5 admin accounts  (+ 목장 셀 관리, 새가족 안내)
 *   프로   pro   $199/$159 — 10 admin accounts (+ 새가족 온라인 등록·관리)
 *
 * The DB `tenant.plan` column is a free-form VarChar(20) that has historically
 * held legacy values ('free'/'enterprise') and may hold the marketing names.
 * normalizePlan() folds every known alias down to one of the 4 canonical tiers
 * so the rest of the server only ever reasons about light/basic/plus/pro.
 */

export type PlanTier = 'light' | 'basic' | 'plus' | 'pro';

// Every value the plan column might hold → canonical tier. Unknown/empty → light
// (the smallest paid tier; never grant more than the customer paid for).
const PLAN_ALIASES: Record<string, PlanTier> = {
  free: 'light',
  starter: 'light',
  essential: 'light',
  light: 'light',
  basic: 'basic',
  ministry: 'basic',
  plus: 'plus',
  pro: 'pro',
  outreach: 'pro',
  enterprise: 'pro',
};

export function normalizePlan(plan: string | null | undefined): PlanTier {
  return PLAN_ALIASES[(plan ?? '').toLowerCase().trim()] ?? 'light';
}

export interface PlanLimits {
  /** Admin/staff login accounts allowed for the tenant, INCLUDING the owner. */
  maxAdmins: number;
  /** Structural pages allowed (enforced when pages are created). */
  maxPages: number;
}

// maxPages = the page count each tier's offering adds up to (counted from the
// tier's included pages; pro is the hard ceiling at 25, the "별도 추가 페이지"
// buffer). 라이트 8 / 기본 15 / 플러스 20 / 프로 25.
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  light: { maxAdmins: 2, maxPages: 8 },
  basic: { maxAdmins: 3, maxPages: 15 },
  plus: { maxAdmins: 5, maxPages: 20 },
  pro: { maxAdmins: 10, maxPages: 25 },
};

export function planLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)];
}

/**
 * Feature gates — content modules / capabilities that only exist on higher
 * tiers. Keyed by a stable feature id; value is the set of tiers that include
 * it. A feature absent from this map is available on every tier.
 */
export const FEATURE_TIERS: Record<string, PlanTier[]> = {
  cells: ['plus', 'pro'], // 목장(셀) 관리
  newcomer_registration: ['pro'], // 새가족 온라인 등록·관리 (공개 등록 폼 + 교인 관리)
  pwa: ['pro'], // 모바일 앱(PWA) — 설치형 + 앱식 하단 네비
};

export function planAllowsFeature(plan: string | null | undefined, feature: string): boolean {
  const allowed = FEATURE_TIERS[feature];
  if (!allowed) return true; // ungated feature
  return allowed.includes(normalizePlan(plan));
}

/** Tiers (canonical names) that include a feature — for requirePlan() gates. */
export function tiersForFeature(feature: string): PlanTier[] {
  return FEATURE_TIERS[feature] ?? ['light', 'basic', 'plus', 'pro'];
}
