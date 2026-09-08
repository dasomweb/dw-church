// Scoped-staff RBAC (client) — mirrors apps/server/src/modules/auth/capabilities.ts.
// A user with role='staff' sees ONLY the nav items its capability list allows.
// Owners/admins are unaffected (full nav). Keep these keys in sync with the server.

export type Capability =
  | 'content'
  | 'membership'
  | 'smallgroup'
  | 'group_report'
  | 'newcomer'
  | 'donation_cert'
  | 'vbs';

export const CAP_LABELS: Record<Capability, string> = {
  content: '콘텐츠',
  membership: '교적관리',
  smallgroup: '스몰그룹',
  group_report: '목장 보고서',
  newcomer: '새가족',
  donation_cert: '헌금 납입증명서',
  vbs: '여름성경학교',
};

export const CAP_HINTS: Record<Capability, string> = {
  content: '설교·주보·앨범·행사·배너·게시판·페이지 등',
  membership: '교인 명부·세대·출석·심방',
  smallgroup: '목장/구역 조직·리포트·자료실 전체',
  group_report: '자기 목장의 리포트 작성만 (목자용)',
  newcomer: '새가족 등록·정착 관리',
  donation_cert: '연말 소득공제용 헌금 납입증명서 (예정)',
  vbs: '여름성경학교 신청 관리 (예정)',
};

// 준비 중(권한 슬롯만 존재, 실제 기능은 이후 구축) — UI에서 '예정' 표시.
export const CAP_COMING_SOON: Capability[] = ['donation_cert', 'vbs'];

// 체크박스 UI 그룹핑
export const CAP_GROUPS: { label: string; caps: Capability[] }[] = [
  { label: '모듈 접근', caps: ['content', 'membership', 'smallgroup', 'newcomer'] },
  { label: '특수 기능', caps: ['group_report', 'donation_cert', 'vbs'] },
];

// nav 'to' → 필요한 capability. 여기 없는 nav(설정·도메인·사용자·청구 등)는 staff에게 숨김.
const NAV_CAP: Record<string, Capability> = {
  analytics: 'content', sermons: 'content', bulletins: 'content', columns: 'content',
  verses: 'content', albums: 'content', videos: 'content', schedules: 'content',
  events: 'content', banners: 'content', staff: 'content', history: 'content',
  boards: 'content', forms: 'content', 'form-submissions': 'content',
  translations: 'content', pages: 'content', menus: 'content',
  'member-dashboard': 'membership', members: 'membership', households: 'membership',
  appointments: 'membership', attendance: 'membership', 'member-visits': 'membership',
  'member-records': 'membership', 'member-codes': 'membership', 'member-settings': 'membership',
  'group-dashboard': 'smallgroup', groups: 'smallgroup', 'group-monitor': 'smallgroup',
  'group-courses': 'smallgroup', 'group-terms': 'smallgroup', 'group-queue': 'smallgroup',
  'group-notices': 'smallgroup', 'group-resources': 'smallgroup', 'group-settings': 'smallgroup',
  cells: 'smallgroup',
  newcomers: 'newcomer', 'newcomers-register': 'newcomer',
};

// staff가 항상 볼 수 있는 nav (모듈 무관)
const STAFF_ALWAYS_NAV = new Set(['support']);

export function sanitizeCaps(input: unknown): Capability[] {
  const all = Object.keys(CAP_LABELS) as Capability[];
  if (!Array.isArray(input)) return [];
  return all.filter((c) => input.includes(c));
}

/** role='staff'가 이 nav 항목을 볼 수 있는가. */
export function staffCanSeeNav(perms: string[], to: string): boolean {
  if (STAFF_ALWAYS_NAV.has(to)) return true;
  // 목장 리포트 작성은 스몰그룹 전체 권한 또는 목자(group_report) 권한이면 노출.
  if (to === 'group-reports') return perms.includes('smallgroup') || perms.includes('group_report');
  const cap = NAV_CAP[to];
  return !!cap && perms.includes(cap);
}

// staff 로그인 후 착지할 첫 페이지(권한 우선순위).
const LANDING_BY_CAP: [Capability, string][] = [
  ['newcomer', 'newcomers'],
  ['group_report', 'group-reports'],
  ['smallgroup', 'group-dashboard'],
  ['membership', 'member-dashboard'],
  ['content', 'pages'],
];

export function firstStaffPath(perms: string[]): string {
  for (const [cap, to] of LANDING_BY_CAP) if (perms.includes(cap)) return to;
  return 'support';
}
