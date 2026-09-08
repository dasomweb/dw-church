/**
 * Scoped-staff RBAC — capability model.
 *
 * A user with role='staff' carries an explicit `permissions` list. Owners/admins
 * (and super_admin, support) are NOT staff and keep full access — capability
 * enforcement applies ONLY to role='staff'.
 *
 * Each capability guards a set of API path prefixes. A staff request to a guarded
 * prefix is allowed only if the staff holds the matching capability. Paths that
 * are NOT guarded here (auth, entitlements, settings/theme reads, uploads, the
 * admin shell bootstrap) pass through for any authenticated user — so the admin
 * console still loads for a scoped staff. The client mirrors this map for nav.
 */
export const CAPABILITIES = [
  'content', // 콘텐츠 (설교·주보·앨범·행사·배너·교역자·게시판·페이지 등)
  'membership', // 교적관리
  'smallgroup', // 스몰그룹 전체 관리
  'group_report', // 목장 보고서 (목자용 — 자기 목장만)
  'newcomer', // 새가족
  'donation_cert', // 헌금 납입증명서 (예정 — 권한 슬롯)
  'vbs', // 여름성경학교 (예정 — 권한 슬롯)
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export function isCapability(x: unknown): x is Capability {
  return typeof x === 'string' && (CAPABILITIES as readonly string[]).includes(x);
}

export function sanitizePermissions(input: unknown): Capability[] {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.filter(isCapability)));
}

/**
 * API path prefix → capability required. Ordered longest-first at match time.
 * Only sensitive module endpoints are listed; everything else is ungated.
 */
const PATH_CAPABILITY: { prefix: string; cap: Capability }[] = [
  // membership (교적)
  { prefix: '/api/v1/members', cap: 'membership' },
  { prefix: '/api/v1/households', cap: 'membership' },
  { prefix: '/api/v1/appointments', cap: 'membership' },
  { prefix: '/api/v1/attendance', cap: 'membership' },
  { prefix: '/api/v1/member-', cap: 'membership' },
  // small group — the report endpoint is shared: allowed for BOTH smallgroup and
  // group_report (handled specially below), so it is not listed here.
  { prefix: '/api/v1/groups', cap: 'smallgroup' },
  { prefix: '/api/v1/group-', cap: 'smallgroup' },
  { prefix: '/api/v1/cells', cap: 'smallgroup' },
  // newcomer (새가족)
  { prefix: '/api/v1/newcomers', cap: 'newcomer' },
  // content module endpoints
  { prefix: '/api/v1/sermons', cap: 'content' },
  { prefix: '/api/v1/bulletins', cap: 'content' },
  { prefix: '/api/v1/columns', cap: 'content' },
  { prefix: '/api/v1/albums', cap: 'content' },
  { prefix: '/api/v1/videos', cap: 'content' },
  { prefix: '/api/v1/events', cap: 'content' },
  { prefix: '/api/v1/banners', cap: 'content' },
  { prefix: '/api/v1/staff', cap: 'content' },
  { prefix: '/api/v1/history', cap: 'content' },
  { prefix: '/api/v1/verses', cap: 'content' },
  { prefix: '/api/v1/boards', cap: 'content' },
  { prefix: '/api/v1/schedules', cap: 'content' },
  { prefix: '/api/v1/pages', cap: 'content' },
  { prefix: '/api/v1/sections', cap: 'content' },
  { prefix: '/api/v1/menus', cap: 'content' },
  { prefix: '/api/v1/forms', cap: 'content' },
  { prefix: '/api/v1/form-submissions', cap: 'content' },
  { prefix: '/api/v1/theme', cap: 'content' },
];

/**
 * Decide whether a role='staff' user with `permissions` may call `path`.
 * Returns true = allowed. Non-guarded paths always allowed.
 *
 * The 목장 보고서 endpoint (/api/v1/meeting-reports) is allowed for a staff who
 * holds EITHER 'smallgroup' or 'group_report' (a 목자 gets group_report only).
 */
export function staffMayAccess(permissions: Capability[], path: string): boolean {
  const p = path.split('?')[0]!;

  // Shared report endpoint: smallgroup OR group_report.
  if (p.startsWith('/api/v1/meeting-reports')) {
    return permissions.includes('smallgroup') || permissions.includes('group_report');
  }

  // Longest-prefix match against the guarded list.
  let matched: Capability | null = null;
  let matchedLen = -1;
  for (const { prefix, cap } of PATH_CAPABILITY) {
    if (p.startsWith(prefix) && prefix.length > matchedLen) {
      matched = cap;
      matchedLen = prefix.length;
    }
  }
  if (!matched) return true; // ungated (auth, entitlements, uploads, shell bootstrap)
  return permissions.includes(matched);
}
