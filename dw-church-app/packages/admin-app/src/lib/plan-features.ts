/**
 * Client-side plan gating maps. The SERVER computes which features a tenant has
 * (plan defaults ⊕ per-tenant overrides) and returns them from
 * GET /admin/entitlements as { [featureKey]: boolean }. These maps say WHICH
 * sidebar nav items and page-editor blocks belong to WHICH feature, so the UI
 * can hide what the plan doesn't include. Anything not listed here is ungated
 * (always available — e.g. sermons/bulletins/staff on 라이트).
 *
 * Feature keys MUST match apps/server/src/config/plan-limits.ts FEATURE_TIERS.
 */

/** Tenant-admin sidebar nav `to` path → gated feature key. */
export const NAV_FEATURE: Record<string, string> = {
  albums: 'albums',
  history: 'history',
  columns: 'columns',
  videos: 'video',
  boards: 'boards',
  events: 'events',
  banners: 'banners',
  cells: 'cells',
  newcomers: 'newcomer',
  members: 'membership',        // 교적관리 애드온
  'member-dashboard': 'membership',
  households: 'membership',
  appointments: 'membership',
  attendance: 'membership',
  'member-visits': 'membership',
  'member-records': 'membership',
  'member-codes': 'membership',
  'member-settings': 'membership',
  groups: 'smallgroup',            // 스몰그룹 애드온
  'group-reports': 'smallgroup',
  'group-monitor': 'smallgroup',
  'group-queue': 'smallgroup',
  'group-courses': 'smallgroup',
  'group-terms': 'smallgroup',
  'group-settings': 'smallgroup',
};

/** Page-editor block_type → gated feature key. */
export const BLOCK_FEATURE: Record<string, string> = {
  album_gallery: 'albums',
  history_timeline: 'history',
  recent_columns: 'columns',
  video_board: 'video',
  board: 'boards',
  event_grid: 'events',
  banner_slider: 'banners',
  hero_image_slider: 'banners',
  cell_grid: 'cells',
  cell_report: 'cells',
  newcomer_info: 'newcomer',
  newcomer_form: 'newcomer',
};

/**
 * True when a feature is available. `features` is the server's effective map.
 * Ungated keys (absent from the map) default to true; a feature is blocked only
 * when explicitly false. While entitlements are still loading (empty map), we
 * default to true so nothing flickers away then back.
 */
export function featureAllowed(features: Record<string, boolean>, key: string | undefined): boolean {
  if (!key) return true;
  return features[key] !== false;
}
