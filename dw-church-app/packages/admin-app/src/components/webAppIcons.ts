// Curated modern line-icon set for the web-app bottom tab bar. The operator
// picks one per tab in the admin; the storefront renders by key. Keep KEYS in
// sync with packages/admin-app/src/components/webAppIcons.ts (same set).
// Each `d` is a single path string (heroicons-outline style, 24px, round caps).

export interface WebAppIcon {
  key: string;
  label: string;
  d: string;
}

export const WEB_APP_ICONS: WebAppIcon[] = [
  { key: 'home',     label: '홈',      d: 'M3 11l9-8 9 8M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10' },
  { key: 'info',     label: '안내',    d: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01' },
  { key: 'mic',      label: '설교',    d: 'M12 14a3 3 0 003-3V6a3 3 0 00-6 0v5a3 3 0 003 3zM19 11a7 7 0 01-14 0M12 18v3M8 21h8' },
  { key: 'book',     label: '말씀',    d: 'M4 5a2 2 0 012-2h12a1 1 0 011 1v14a1 1 0 01-1 1H6a2 2 0 01-2-2V5zM4 5a2 2 0 002 2h13M9 7v13' },
  { key: 'doc',      label: '주보',    d: 'M9 13h6m-6 4h4m1-14H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5' },
  { key: 'photo',    label: '사진',    d: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'video',    label: '영상',    d: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { key: 'users',    label: '공동체',  d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5 5 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { key: 'user',     label: '교역자',  d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0' },
  { key: 'pin',      label: '오시는길', d: 'M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10zM12 13a2 2 0 100-4 2 2 0 000 4z' },
  { key: 'calendar', label: '행사',    d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'chat',     label: '게시판',  d: 'M8 10h8M8 14h5M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.4A8 8 0 1121 12z' },
  { key: 'bell',     label: '공지',    d: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { key: 'pencil',   label: '칼럼',    d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { key: 'mail',     label: '문의',    d: 'M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zM3.5 7.5l8.5 6 8.5-6' },
  { key: 'phone',    label: '연락',    d: 'M3 5a2 2 0 012-2h2.6a1 1 0 01.96.73l1 3.5a1 1 0 01-.27 1L8 9.6a13 13 0 006.4 6.4l1.37-1.29a1 1 0 011-.27l3.5 1a1 1 0 01.73.96V19a2 2 0 01-2 2A16 16 0 013 5z' },
  { key: 'heart',    label: '섬김',    d: 'M12 20s-7-4.35-9.5-8.5A5 5 0 0112 5a5 5 0 019.5 6.5C19 15.65 12 20 12 20z' },
  { key: 'gift',     label: '헌금',    d: 'M20 12v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8M3 8h18v4H3zM12 8v13M12 8S9.5 3.5 7 5s1 3 5 3zM12 8s2.5-4.5 5-3-1 3-5 3z' },
  { key: 'star',     label: '별',      d: 'M12 4l2.35 4.76 5.25.76-3.8 3.7.9 5.23L12 16.9l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76z' },
  { key: 'cross',    label: '십자가',  d: 'M10 3h4v5h5v4h-5v9h-4v-9H5V8h5z' },
  { key: 'grid',     label: '기본',    d: 'M4 5h6v6H4zM14 5h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z' },
];

const ICON_MAP: Record<string, string> = Object.fromEntries(WEB_APP_ICONS.map((i) => [i.key, i.d]));

/** Path for an explicit icon key, falling back to the generic grid icon. */
export function iconPathByKey(key?: string | null): string {
  return (key && ICON_MAP[key]) || ICON_MAP.grid!;
}
