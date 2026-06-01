/**
 * Curated icon set — vendored, self-hosted, zero runtime dependency.
 *
 * Design note (deviation from docs/ICON-SYSTEM-DESIGN.md §2.1): the
 * doc proposed generating an SVG sprite from `lucide-static` at build
 * time. lucide-static is not installable in the build sandbox and a
 * sprite file added two static-asset paths (apps/web + admin SPA) to
 * keep in sync. We instead vendor the curated subset as path data
 * here and render it inline via <Icon>. Same outcome — a curated,
 * self-hosted, theme-coloured (currentColor) Lucide subset — with no
 * dependency, no build step, no /public path/CSP concerns. Extending
 * is "add one entry here", mirroring the doc's allowlist principle.
 *
 * All paths are Lucide (ISC/MIT), 24×24 viewBox, stroke-based:
 * the <Icon> wrapper supplies fill="none" stroke="currentColor"
 * stroke-width="2" stroke-linecap/linejoin="round". `body` is only
 * the inner shapes.
 */

export interface IconDef {
  /** Inner SVG markup (paths/circles/lines) — no <svg> wrapper. */
  body: string;
  /** Lowercase search terms for the inspector picker. */
  keywords: string[];
}

export const ICONS: Record<string, IconDef> = {
  check: {
    body: '<path d="M20 6 9 17l-5-5"/>',
    keywords: ['check', 'done', 'tick', 'ok', 'complete', '확인', '완료'],
  },
  'check-circle': {
    body: '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
    keywords: ['check', 'circle', 'success', 'done', 'verified', '완료', '성공'],
  },
  'badge-check': {
    body: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
    keywords: ['verified', 'badge', 'trust', 'certified', '인증', '검증'],
  },
  star: {
    body: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    keywords: ['star', 'favorite', 'rating', 'quality', '별', '평점', '추천'],
  },
  heart: {
    body: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    keywords: ['heart', 'love', 'like', 'care', '좋아요', '관심'],
  },
  shield: {
    body: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    keywords: ['shield', 'security', 'protect', 'safe', '보안', '보호', '안전'],
  },
  'shield-check': {
    body: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    keywords: ['shield', 'security', 'verified', 'safe', '보안', '안전', '검증'],
  },
  lock: {
    body: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    keywords: ['lock', 'secure', 'private', 'password', '잠금', '보안'],
  },
  truck: {
    body: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    keywords: ['truck', 'shipping', 'delivery', 'logistics', '배송', '물류', '운송'],
  },
  package: {
    body: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>',
    keywords: ['package', 'box', 'product', 'parcel', '상품', '패키지', '박스'],
  },
  boxes: {
    body: '<path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="m17 16.5-5-3"/><path d="m17 16.5 4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/><path d="M12 8 7.26 5.15"/><path d="m12 8 4.74-2.85"/><path d="M12 13.5V8"/>',
    keywords: ['boxes', 'inventory', 'stock', 'warehouse', '재고', '창고'],
  },
  warehouse: {
    body: '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
    keywords: ['warehouse', 'storage', 'logistics', '창고', '물류'],
  },
  'shopping-bag': {
    body: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    keywords: ['shopping', 'bag', 'shop', 'buy', 'retail', '쇼핑', '구매'],
  },
  'shopping-cart': {
    body: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    keywords: ['cart', 'shopping', 'order', 'checkout', '장바구니', '주문'],
  },
  tag: {
    body: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    keywords: ['tag', 'price', 'label', 'sale', '가격', '태그', '라벨'],
  },
  gift: {
    body: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
    keywords: ['gift', 'present', 'promo', 'reward', '선물', '혜택'],
  },
  'credit-card': {
    body: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    keywords: ['card', 'payment', 'pay', 'billing', '결제', '카드'],
  },
  wallet: {
    body: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    keywords: ['wallet', 'money', 'payment', 'finance', '지갑', '결제'],
  },
  users: {
    body: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    keywords: ['users', 'team', 'people', 'customers', '팀', '고객', '사람'],
  },
  user: {
    body: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    keywords: ['user', 'person', 'account', 'profile', '사용자', '계정'],
  },
  handshake: {
    body: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
    keywords: ['handshake', 'deal', 'partner', 'agreement', 'b2b', '거래', '파트너', '협력'],
  },
  briefcase: {
    body: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    keywords: ['briefcase', 'work', 'business', 'job', '비즈니스', '업무'],
  },
  building: {
    body: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
    keywords: ['building', 'company', 'office', 'corporate', '회사', '건물', '기업'],
  },
  store: {
    body: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
    keywords: ['store', 'shop', 'retail', 'market', '매장', '상점'],
  },
  factory: {
    body: '<path d="M12 16h.01"/><path d="M16 16h.01"/><path d="M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5.30a.85.85 0 0 0-1.34-.7L14 9V5.31a.85.85 0 0 0-1.34-.7L7 9V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M8 16h.01"/>',
    keywords: ['factory', 'manufacturing', 'industry', 'plant', '공장', '제조', '생산'],
  },
  mail: {
    body: '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
    keywords: ['mail', 'email', 'contact', 'message', '메일', '이메일', '문의'],
  },
  phone: {
    body: '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>',
    keywords: ['phone', 'call', 'contact', 'support', '전화', '연락'],
  },
  'message-circle': {
    body: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    keywords: ['message', 'chat', 'comment', 'support', '채팅', '문의', '상담'],
  },
  bell: {
    body: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    keywords: ['bell', 'notification', 'alert', 'reminder', '알림'],
  },
  calendar: {
    body: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    keywords: ['calendar', 'date', 'schedule', 'event', '일정', '날짜', '캘린더'],
  },
  clock: {
    body: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    keywords: ['clock', 'time', 'hours', 'schedule', '시간', '시계'],
  },
  'map-pin': {
    body: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    keywords: ['location', 'map', 'pin', 'address', 'place', '위치', '주소', '지도'],
  },
  globe: {
    body: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    keywords: ['globe', 'world', 'web', 'global', 'international', '글로벌', '세계', '웹'],
  },
  settings: {
    body: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2"/><circle cx="12" cy="12" r="3"/>',
    keywords: ['settings', 'gear', 'config', 'preferences', '설정', '환경설정'],
  },
  wrench: {
    body: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    keywords: ['wrench', 'tool', 'repair', 'maintenance', 'service', '수리', '도구', '정비'],
  },
  database: {
    body: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    keywords: ['database', 'data', 'storage', 'sql', '데이터', '데이터베이스'],
  },
  server: {
    body: '<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
    keywords: ['server', 'hosting', 'infra', 'cloud', '서버', '인프라'],
  },
  cloud: {
    body: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    keywords: ['cloud', 'saas', 'hosting', 'online', '클라우드'],
  },
  code: {
    body: '<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
    keywords: ['code', 'developer', 'programming', 'api', '개발', '코드'],
  },
  cpu: {
    body: '<path d="M12 20v2"/><path d="M12 2v2"/><path d="M17 20v2"/><path d="M17 2v2"/><path d="M2 12h2"/><path d="M2 17h2"/><path d="M2 7h2"/><path d="M20 12h2"/><path d="M20 17h2"/><path d="M20 7h2"/><path d="M7 20v2"/><path d="M7 2v2"/><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
    keywords: ['cpu', 'chip', 'tech', 'hardware', 'processor', '기술', '하드웨어'],
  },
  'bar-chart': {
    body: '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/><path d="M3 20h18"/>',
    keywords: ['chart', 'bar', 'analytics', 'stats', 'report', '차트', '통계', '분석'],
  },
  'trending-up': {
    body: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
    keywords: ['trending', 'growth', 'increase', 'up', 'success', '성장', '상승'],
  },
  target: {
    body: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    keywords: ['target', 'goal', 'aim', 'focus', 'objective', '목표', '타겟'],
  },
  award: {
    body: '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
    keywords: ['award', 'medal', 'achievement', 'quality', 'certified', '수상', '인증', '품질'],
  },
  trophy: {
    body: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    keywords: ['trophy', 'win', 'best', 'award', 'champion', '우승', '최고'],
  },
  rocket: {
    body: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    keywords: ['rocket', 'launch', 'startup', 'fast', 'boost', '런칭', '시작', '빠름'],
  },
  zap: {
    body: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    keywords: ['zap', 'fast', 'power', 'energy', 'speed', 'instant', '빠름', '에너지', '즉시'],
  },
  lightbulb: {
    body: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    keywords: ['lightbulb', 'idea', 'innovation', 'tip', 'creative', '아이디어', '혁신'],
  },
  sparkles: {
    body: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
    keywords: ['sparkles', 'ai', 'magic', 'new', 'premium', 'shine', 'AI', '신규', '프리미엄'],
  },
  leaf: {
    body: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    keywords: ['leaf', 'eco', 'green', 'nature', 'organic', 'sustainable', '친환경', '자연', '에코'],
  },
  recycle: {
    body: '<path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/><path d="m14 16-3 3 3 3"/><path d="M8.293 13.596 7.196 9.5 3.1 10.598"/><path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/><path d="m13.378 9.633 4.096 1.098 1.097-4.096"/>',
    keywords: ['recycle', 'eco', 'sustainable', 'green', '재활용', '친환경'],
  },
  droplet: {
    body: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    keywords: ['droplet', 'water', 'liquid', 'clean', '물', '액체'],
  },
  sun: {
    body: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    keywords: ['sun', 'energy', 'solar', 'bright', 'day', '태양', '에너지'],
  },
  'file-text': {
    body: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    keywords: ['file', 'document', 'doc', 'report', 'paper', '문서', '서류'],
  },
  'clipboard-check': {
    body: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    keywords: ['clipboard', 'check', 'task', 'checklist', 'quality', '점검', '체크리스트', '품질'],
  },
  book: {
    body: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    keywords: ['book', 'catalog', 'guide', 'manual', 'docs', '책', '카탈로그', '가이드'],
  },
  'book-open': {
    body: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    keywords: ['book', 'open', 'read', 'catalog', 'magazine', '카탈로그', '읽기', '매거진'],
  },
  newspaper: {
    body: '<path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M15 22H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 0 2 2 2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2"/><rect width="8" height="4" x="6" y="6" rx="1"/>',
    keywords: ['news', 'newspaper', 'press', 'blog', 'article', '뉴스', '소식', '블로그'],
  },
  camera: {
    body: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    keywords: ['camera', 'photo', 'image', 'gallery', '사진', '카메라'],
  },
  play: {
    body: '<polygon points="6 3 20 12 6 21 6 3"/>',
    keywords: ['play', 'video', 'media', 'start', '재생', '영상'],
  },
  search: {
    body: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
    keywords: ['search', 'find', 'magnifier', 'lookup', '검색', '찾기'],
  },
  eye: {
    body: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    keywords: ['eye', 'view', 'preview', 'visible', 'watch', '미리보기', '보기'],
  },
  'thumbs-up': {
    body: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
    keywords: ['thumbs', 'like', 'approve', 'good', 'satisfaction', '좋아요', '만족', '추천'],
  },
  headphones: {
    body: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm0 0a9 9 0 1 1 18 0m0 0v3a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z"/>',
    keywords: ['headphones', 'support', 'service', 'help', 'contact', '고객지원', '상담', '서비스'],
  },
  'life-buoy': {
    body: '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/>',
    keywords: ['support', 'help', 'rescue', 'service', 'assistance', '지원', '도움', '구조'],
  },
  'refresh-cw': {
    body: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    keywords: ['refresh', 'update', 'sync', 'reload', 'renew', '갱신', '동기화', '새로고침'],
  },
  layers: {
    body: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
    keywords: ['layers', 'stack', 'levels', 'tiers', 'plans', '계층', '단계', '플랜'],
  },
  monitor: {
    body: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    keywords: ['monitor', 'screen', 'desktop', 'display', 'web', '모니터', '화면', '웹'],
  },
  smartphone: {
    body: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
    keywords: ['smartphone', 'mobile', 'phone', 'app', '모바일', '스마트폰', '앱'],
  },
  'dollar-sign': {
    body: '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    keywords: ['dollar', 'money', 'price', 'cost', 'finance', '가격', '비용', '금액'],
  },
  percent: {
    body: '<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    keywords: ['percent', 'discount', 'sale', 'rate', 'off', '할인', '비율', '세일'],
  },
  scale: {
    body: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    keywords: ['scale', 'balance', 'compare', 'legal', 'fair', '균형', '비교', '법률'],
  },
  'graduation-cap': {
    body: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    keywords: ['graduation', 'education', 'learn', 'training', 'course', '교육', '학습', '강의'],
  },
  palette: {
    body: '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
    keywords: ['palette', 'design', 'color', 'creative', 'art', '디자인', '색상', '창작'],
  },
  'heart-pulse': {
    body: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
    keywords: ['health', 'medical', 'care', 'pulse', 'wellness', '건강', '의료', '케어'],
  },
  plug: {
    body: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
    keywords: ['plug', 'power', 'electric', 'connect', 'energy', '전원', '전기', '연결'],
  },
  anchor: {
    body: '<path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/>',
    keywords: ['anchor', 'stable', 'marine', 'port', 'reliable', '안정', '해양', '신뢰'],
  },
  plane: {
    body: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    keywords: ['plane', 'flight', 'travel', 'export', 'shipping', '항공', '여행', '수출'],
  },
  'pie-chart': {
    body: '<path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>',
    keywords: ['pie', 'chart', 'analytics', 'share', 'stats', '차트', '점유율', '통계'],
  },
  gauge: {
    body: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    keywords: ['gauge', 'speed', 'performance', 'meter', 'dashboard', '성능', '속도', '계기'],
  },
  hammer: {
    body: '<path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"/>',
    keywords: ['hammer', 'build', 'construction', 'tool', 'repair', '건설', '시공', '제작'],
  },
  ruler: {
    body: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
    keywords: ['ruler', 'measure', 'precision', 'design', 'size', '측정', '정밀', '치수'],
  },
};

/** Sorted icon name list — drives the inspector picker grid order. */
export const ICON_NAMES: string[] = Object.keys(ICONS).sort();

/** True when `name` is a known curated icon. */
export function isKnownIcon(name: string): boolean {
  return name in ICONS;
}
