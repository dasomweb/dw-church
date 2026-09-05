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

// 라이트(light) tier was merged into 기본(basic) — basic is now the entry tier
// (the base: hosting/maintenance + core features). Legacy 'light'/'free' values
// fold up to basic.
export type PlanTier = 'basic' | 'plus' | 'pro';

// Every value the plan column might hold → canonical tier. Unknown/empty → basic
// (the smallest paid tier / entry).
const PLAN_ALIASES: Record<string, PlanTier> = {
  free: 'basic',
  starter: 'basic',
  essential: 'basic',
  light: 'basic',
  basic: 'basic',
  ministry: 'basic',
  plus: 'plus',
  pro: 'pro',
  outreach: 'pro',
  enterprise: 'pro',
};

export function normalizePlan(plan: string | null | undefined): PlanTier {
  return PLAN_ALIASES[(plan ?? '').toLowerCase().trim()] ?? 'basic';
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
// Feature id → tiers that include it. A feature absent here is on every tier
// (BASE — 모든 테넌트가 씀). A feature mapped to an EMPTY array [] is a paid
// ADD-ON: no tier includes it, so it's OFF by default and only granted via a
// per-tenant `feature_overrides` (활성화 = 구매). See isAddon()/addonFeatures().
//
// 모델 변경 (2026-09): 라이트/기본/플러스/프로 티어 사다리 제거. 공개 웹사이트
// 기능(설교·주보·교역자·예배·오시는길 + 앨범·연혁·칼럼·영상·게시판·행사·배너)은
// 모두 BASE 에 포함(=여기서 제외). 교회 행정 기능(목장·새가족)은 개별 유료 애드온.
// 가격은 feature_pricing 테이블(요금 관리)에서 애드온별로 매김.
// Keys are the SINGLE SOURCE OF TRUTH the admin gates nav + block picker against
// (via GET /admin/entitlements) and requireFeature() gates routes against.
export const FEATURE_TIERS: Record<string, PlanTier[]> = {
  // ── 교회 행정 애드온 (유료, 어느 티어에도 미포함 → override 로 활성화) ──
  cells: [],                  // 목장(셀) 관리
  newcomer: [],               // 새가족 안내 + 새가족 등록 폼
  newcomer_registration: [],  // 새가족 온라인 등록·관리 (교인 관리)
  // ── PWA 는 자체 애드온 플래그(web_app_addon 컬럼)로 스토어프론트에서 제어 ──
  pwa: ['pro'],               // 모바일 앱(PWA) — admin 게이팅만; 구매는 web_app_addon
};

/** Every gated feature id — used to build the effective-features map. */
export const FEATURE_KEYS = Object.keys(FEATURE_TIERS);

/** A feature that no tier includes ([]) — sold only as a paid per-tenant add-on. */
export function isAddon(feature: string): boolean {
  const t = FEATURE_TIERS[feature];
  return Array.isArray(t) && t.length === 0;
}

export function planAllowsFeature(plan: string | null | undefined, feature: string): boolean {
  const allowed = FEATURE_TIERS[feature];
  if (!allowed) return true; // ungated feature (BASE — every tenant)
  return allowed.includes(normalizePlan(plan));
}

/** Tiers (canonical names) that include a feature — for requirePlan() gates. */
export function tiersForFeature(feature: string): PlanTier[] {
  return FEATURE_TIERS[feature] ?? ['basic', 'plus', 'pro'];
}

/**
 * Effective feature access for a tenant: the plan default, overridden per-tenant
 * where an explicit boolean is set (super-admin "기능 권한" exceptions). Returns
 * a boolean for every gated feature key so the admin can gate nav + blocks.
 */
export function effectiveFeatures(
  plan: string | null | undefined,
  overrides: Record<string, unknown> | null | undefined,
): Record<string, boolean> {
  const ov = overrides ?? {};
  const out: Record<string, boolean> = {};
  for (const key of FEATURE_KEYS) {
    out[key] = typeof ov[key] === 'boolean' ? (ov[key] as boolean) : planAllowsFeature(plan, key);
  }
  return out;
}

/**
 * Billable add-ons: features turned ON for a tenant that its plan does NOT
 * already include. A plan is a discounted bundle, so plan-included features are
 * never add-ons; only overrides that grant a feature ABOVE the plan are charged
 * at the feature's à-la-carte price. (Turning a plan feature OFF is not a
 * discount — the plan price is a fixed package.)
 */
export function addonFeatures(
  plan: string | null | undefined,
  overrides: Record<string, unknown> | null | undefined,
): string[] {
  const ov = overrides ?? {};
  return FEATURE_KEYS.filter((key) => ov[key] === true && !planAllowsFeature(plan, key));
}
