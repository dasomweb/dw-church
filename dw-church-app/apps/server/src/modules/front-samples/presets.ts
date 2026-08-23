/**
 * Per-design home-page block presets (Feature ①, "option A").
 * When an applicant picks one of the 22 homepage samples, the tenant's `home`
 * page_sections are (re)built from the matching preset here — an approximation
 * of that sample's layout using the app's real Block system.
 *
 * Keyed by the sample `id` ("00".."21", see admin-app canvas-index.ts). Each
 * preset is an ordered list of { block_type, props }. block_type is snake_case;
 * prop KEYS are camelCase (matching the block components). Images point at our
 * self-hosted sample pool (R2 _samples/frontpage) as starting placeholders the
 * operator replaces — no dynamic content (sermons/staff/etc.) is ever seeded.
 * NOTE: audio-sermon (음성설교) is intentionally NOT supported anywhere here.
 */
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error-handler.js';

export interface PresetSection { block_type: string; props: Record<string, unknown> }

const IMG = 'https://pub-674328f08783498389f7857dc6e1ab00.r2.dev/_samples/frontpage';

// ── section builders (real prop keys, camelCase) ────────────────────────────
const hero = (
  title: string,
  subtitle: string,
  o: Partial<Record<string, unknown>> = {},
): PresetSection => ({
  block_type: 'hero_banner',
  props: {
    variant: 'image-overlay', title, subtitle, height: 'lg', textAlign: 'center',
    width: 'full-bleed', backgroundImageUrl: `${IMG}/worship-2.jpg`,
    overlayColor: '#0b1220', overlayOpacity: 0.45,
    buttonText: '예배 안내', buttonUrl: '/worship',
    secondaryButtonText: '오시는 길', secondaryButtonUrl: '/location',
    ...o,
  },
});
// "한눈에 보는" 예배 안내 3-up (프론트 샘플 다수의 특징 섹션). 값은 시작용
// 플레이스홀더 — 셋업 때 교회 실제 정보로 교체한다.
const infoColumns = (): PresetSection => ({
  block_type: 'info_columns',
  props: {
    title: '예배 안내', columns: '3',
    items: [
      { title: '주일예배', content: '오전 11:00' },
      { title: '수요예배', content: '저녁 7:30' },
      { title: '오시는 길', content: '교회 주소를 입력하세요' },
    ],
  },
});
const weekSchedule = (): PresetSection => ({
  block_type: 'week_schedule',
  props: {
    title: '이번 주 교회는',
    items: [
      { title: '주일', content: '주일예배 · 오전 11:00 · 본당' },
      { title: '수', content: '수요예배 · 저녁 7:30' },
      { title: '금', content: '금요기도회 · 저녁 8:00' },
      { title: '토', content: '청년모임 · 오후 5:00' },
    ],
  },
});
const sermons = (variant = 'grid-4'): PresetSection => ({ block_type: 'recent_sermons', props: { title: '최근 설교', limit: 4, variant } });
const bulletins = (variant = 'grid-4'): PresetSection => ({ block_type: 'recent_bulletins', props: { title: '주보', limit: 4, variant } });
const events = (): PresetSection => ({ block_type: 'event_grid', props: { title: '교회 행사', limit: 4, variant: 'grid-4' } });
const albums = (variant = 'grid-4'): PresetSection => ({ block_type: 'album_gallery', props: { title: '포토 갤러리', limit: 8, variant } });
const verse = (): PresetSection => ({ block_type: 'quote_block', props: { variant: 'verse', eyebrow: '오늘의 말씀', quote: '수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라', reference: '마태복음 11:28', buttonText: '지난 말씀 보기', buttonUrl: '/sermons' } });

// ── 시안 11(라이브 종합형) 시그니처 섹션 블록들 (card-11 콘텐츠 그대로) ──
const heroOverlap = (): PresetSection => ({
  block_type: 'hero_overlap',
  props: {
    eyebrow: 'SAEGIL CHURCH', title: '함께 자라고\n함께 살아가는 교회', subtitle: '주일 아침, 당신의 자리를 비워두고 기다립니다.',
    backgroundImageUrl: `${IMG}/worship-2.jpg`,
    cards: [
      { title: '주일예배', rows: [{ label: '1부', value: '오전 9:00' }, { label: '2부', value: '오전 11:00' }, { label: 'EM (English)', value: '오후 1:00' }] },
      { title: '주중예배', rows: [{ label: '수요예배', value: '오후 7:30' }, { label: '새벽기도', value: '오전 5:30' }, { label: '금요기도회', value: '오후 8:00' }] },
      { title: '처음 오시는 분께', rows: [{ label: '주차', value: '무료 150대' }, { label: '자녀', value: '영유아실·주일학교' }, { label: '위치', value: 'Wilshire & Normandie' }] },
    ],
  },
});
const sermonFeature = (): PresetSection => ({
  block_type: 'sermon_feature',
  props: {
    eyebrow: '설교 말씀', title: '이번 주 말씀', moreLabel: '설교 아카이브 전체보기 →',
    featured: { imageUrl: `${IMG}/sermon-1.jpg`, title: '우리를 부르시는 손길', meta: '김성호 담임목사 · 로마서 8:28 · 8월 9일 주일' },
    items: [
      { imageUrl: `${IMG}/worship-2.jpg`, title: '기다리는 마음', meta: '8월 2일 · 주일 2부' },
      { imageUrl: `${IMG}/group-1.jpg`, title: '낮은 자리에서', meta: '7월 26일 · 주일 2부' },
      { imageUrl: `${IMG}/sermon-1.jpg`, title: '함께 걷는 길', meta: '7월 19일 · 주일 2부' },
    ],
    footerLabel: '수요 · 새벽 설교 듣기',
  },
});
const ministries = (): PresetSection => ({
  block_type: 'features_grid',
  props: {
    eyebrow: '사역', title: '이렇게 섬기고 있습니다', variant: 'image-card', columns: '4',
    items: [
      { title: '주일학교', description: '유치부부터 중고등부까지 주일 9시·11시에 모입니다.', imageUrl: `${IMG}/group-1.jpg` },
      { title: 'EM · 청년부', description: 'English Ministry 주일 오후 1시, 2세와 유학생이 함께합니다.', imageUrl: `${IMG}/group-2.jpg` },
      { title: '한글학교', description: '토요일 오전, 2세 아이들이 한국어와 문화를 배웁니다.', imageUrl: `${IMG}/serving-1.jpg` },
      { title: '선교', description: '네 가정의 선교사를 파송하고 기도로 후원합니다.', imageUrl: `${IMG}/serving-2.jpg` },
    ],
  },
});
const newsSplit = (): PresetSection => ({
  block_type: 'news_split',
  props: {
    title: '주보 · 공지', tabs: ['교회 일정', '부서 소식'], moreLabel: '더보기 +',
    items: [
      { tag: '주보', title: '8월 16일 주일 주보 (PDF)', date: '08.15', primary: true },
      { tag: '공지', title: '가을 성경공부 신청 안내 (9/1 개강)', date: '08.12' },
      { tag: '행사', title: '전교인 여름 수련회 사진이 올라왔습니다', date: '08.08' },
      { tag: '공지', title: '주일학교 교사 모집 (~8/31)', date: '08.05' },
    ],
    sideTitle: '마음을 나눠주세요', sideDesc: '기도 제목과 심방 요청은 담당 교역자에게만 전달되며, 원치 않으면 공개되지 않습니다.',
    buttons: [{ label: '기도 요청하기', primary: true }, { label: '심방 신청하기' }],
    links: ['새가족 등록', '소그룹 신청', '차량 카풀 안내'],
  },
});
const givingBand = (): PresetSection => ({ block_type: 'cta_section', props: { variant: 'inline-banner', bgMode: 'accent', title: '함께 나누는 헌금', subtitle: '계좌이체와 간편송금으로 언제든 참여하실 수 있습니다.', buttonText: '온라인 헌금하기', buttonUrl: '/giving', secondaryButtonText: '헌금 안내', secondaryButtonUrl: '/giving' } });
const galleryMosaic = (): PresetSection => ({ block_type: 'image_gallery', props: { title: '교회의 하루하루', variant: 'masonry', images: [`${IMG}/retreat-1.jpg`, `${IMG}/worship-1.jpg`, `${IMG}/serving-2.jpg`, `${IMG}/group-1.jpg`, `${IMG}/group-2.jpg`, `${IMG}/pray-1.jpg`] } });
const bentoGrid = (): PresetSection => ({
  block_type: 'bento_grid',
  props: {
    columns: 6,
    tiles: [
      { kind: 'photo', colSpan: 4, rowSpan: 3, imageUrl: `${IMG}/worship-2.jpg`, title: '따뜻한 이웃이 되는 교회', subtitle: '주일 9:00 · 11:00  |  수요 19:30' },
      { kind: 'card', colSpan: 2, bg: 'brand', eyebrow: '이번 주일', title: '8월 16일', subtitle: '1부 9:00 · 2부 11:00' },
      { kind: 'photo', colSpan: 2, rowSpan: 2, imageUrl: `${IMG}/sermon-1.jpg`, eyebrow: '▶ 최신 설교', title: '우리를 부르시는 손길' },
      { kind: 'list', colSpan: 3, title: '주보 · 공지', moreLabel: '더보기', items: [{ label: '8월 16일 주일 주보', date: '08.15' }, { label: '가을 성경공부 신청', date: '08.12' }, { label: '주일학교 교사 모집', date: '08.05' }] },
      { kind: 'pair', colSpan: 3, cards: [{ title: '처음 오시나요?', text: '새가족 안내 · 주차 · 예배 순서' }, { title: '온라인 헌금', text: '계좌이체 · 간편송금' }] },
      { kind: 'photo', colSpan: 2, imageUrl: `${IMG}/worship-2.jpg` },
      { kind: 'photo', colSpan: 2, imageUrl: `${IMG}/group-1.jpg` },
      { kind: 'photo', colSpan: 2, imageUrl: `${IMG}/serving-2.jpg` },
      { kind: 'card', colSpan: 3, bg: 'surface', title: '공동체', text: '구역 모임과 주일학교, EM이 매주 모입니다.' },
      { kind: 'card', colSpan: 3, bg: 'surface', title: '이웃을 향해', text: '한인 시니어센터, 푸드뱅크, 선교지 후원.' },
    ],
  },
});
const announce = (): PresetSection => ({ block_type: 'cta_section', props: { variant: 'announcement-bar', eyebrow: '다가오는 행사', title: '가을 성경공부 「마가복음 6주 과정」', subtitle: '9월 5일 시작 · 매주 목요일 저녁 8시', buttonText: '신청하기', buttonUrl: '/events' } });
const quickLinks = (): PresetSection => ({ block_type: 'quick_links', props: { title: '바로가기', items: [
  { title: '기도 요청', content: '/prayer' },
  { title: '소그룹 신청', content: '/smallgroup' },
  { title: '온라인 헌금', content: '/giving' },
] } });
const columns = (): PresetSection => ({ block_type: 'recent_columns', props: { title: '목회 칼럼', limit: 3, variant: 'grid-3' } });
const board = (): PresetSection => ({ block_type: 'board', props: { title: '교회 소식', boardSlug: 'notice', limit: 5, variant: 'list' } });
const location = (): PresetSection => ({ block_type: 'location_map', props: { title: '오시는 길', address: '', zoom: 15 } });
const contact = (): PresetSection => ({ block_type: 'contact_info', props: {} });
const pastor = (o: Partial<Record<string, unknown>> = {}): PresetSection => ({
  block_type: 'pastor_message',
  props: { title: '담임목사 인사말', eyebrow: '환영합니다', pastorName: '', pastorTitle: '담임목사', message: '', imageUrl: `${IMG}/sermon-1.jpg`, variant: 'left', ...o },
});
const newcomer = (): PresetSection => ({ block_type: 'newcomer_info', props: { title: '처음 오시나요?', subtitle: '편안하게 오세요, 자리를 비워 두었습니다.', content: '', imageUrl: `${IMG}/group-2.jpg` } });
// 스토리 스크롤 행 (좌우 교차): eyebrow + 제목 + 본문 + 버튼 + 이미지. 시안 16.
const story = (eyebrow: string, title: string, content: string, imageUrl: string, layout: 'left' | 'right', buttonText: string): PresetSection => ({
  block_type: 'text_image',
  props: { eyebrow, title, content, imageUrl, variant: layout, bgMode: 'none', buttonText, buttonUrl: '#' },
});

// ── the 22 presets, keyed by sample id ──────────────────────────────────────
const P: Record<string, PresetSection[]> = {
  // 미주 한인 이민교회
  '00': [hero('타국에서 만난 하나님의 가족', '주일 예배로 여러분을 초대합니다', { backgroundImageUrl: `${IMG}/worship-2.jpg` }), infoColumns(), verse(), sermons('grid-4'), pastor(), albums('grid-4'), announce(), location(), contact()],
  '01': [hero('A Church Where We Grow Together', '한 자리를 비워 두고 기다립니다', { variant: 'split-image', imageUrl: `${IMG}/worship-1.jpg`, imageSide: 'right', backgroundImageUrl: `${IMG}/worship-1.jpg` }), infoColumns(), verse(), sermons('grid-3'), newcomer(), announce(), location(), contact()],
  '02': [hero('낯선 곳에서의 첫 걸음, 함께 걷겠습니다', '정착과 신앙, 우리가 돕겠습니다', { backgroundImageUrl: `${IMG}/group-1.jpg` }), newcomer(), infoColumns(), verse(), sermons('grid-3'), location(), contact()],
  '03': [hero('말씀 앞에 함께 섭니다', '', { variant: 'text-only', bgMode: 'gradient', height: 'md' }), infoColumns(), verse(), bulletins('grid-2'), sermons('list'), board(), announce(), location()],
  '04': [hero('이번 주, 우리 교회는', '한 주의 예배와 모임을 안내합니다', { backgroundImageUrl: `${IMG}/church-2.jpg` }), weekSchedule(), infoColumns(), verse(), events(), sermons('grid-4'), bulletins('grid-4'), location(), contact()],
  // 소형·개척 교회
  '05': [hero('작지만 서로를 아는 교회', '', { backgroundImageUrl: `${IMG}/church-1.jpg` }), pastor({ variant: 'left' }), infoColumns(), verse(), sermons('grid-3'), quickLinks(), location(), contact()],
  '06': [hero('여기 한 자리를 비워 두었습니다', '넉넉한 마음으로 맞이합니다', { variant: 'text-only', bgMode: 'gradient', height: 'md' }), pastor(), infoColumns(), verse(), sermons('list'), contact()],
  '07': [hero('주일 오전 11시, 이곳에서 만나요', '오시는 길을 안내합니다', { backgroundImageUrl: `${IMG}/church-1.jpg` }), location(), infoColumns(), announce(), sermons('grid-3'), contact()],
  '08': [hero('언제 어디서나, 함께 예배합니다', '', { height: 'md', backgroundImageUrl: `${IMG}/worship-2.jpg` }), infoColumns(), verse(), sermons('grid-2'), bulletins('grid-2'), location(), contact()],
  '09': [hero('함께 모이는 우리 교회', '', { height: 'md', backgroundImageUrl: `${IMG}/group-2.jpg` }), infoColumns(), sermons('list'), board(), location(), contact()],
  '10': [hero('거실에 둘러앉아 말씀을 나눕니다', '가정처럼 따뜻한 공동체', { backgroundImageUrl: `${IMG}/group-1.jpg` }), weekSchedule(), verse(), pastor(), albums('grid-3'), sermons('grid-3'), contact()],
  // 완성도 레이아웃 시안
  '11': [heroOverlap(), verse(), announce(), sermonFeature(), ministries(), newsSplit(), galleryMosaic(), givingBand()],
  '12': [hero('함께 자라고 함께 살아가는 교회', '', { backgroundImageUrl: `${IMG}/worship-1.jpg` }), infoColumns(), sermons('featured'), bulletins('grid-3'), events(), columns(), quickLinks(), location(), contact()],
  '13': [bentoGrid(), location(), contact()],
  '14': [hero('고요한 저녁, 말씀 앞에 나아갑니다', '누구든 오실 수 있습니다', { backgroundImageUrl: `${IMG}/worship-2.jpg`, overlayOpacity: 0.55 }), infoColumns(), sermons('grid-3'), newcomer(), albums('grid-4'), location(), contact()],
  '15': [hero('이번 주 예배 안내', '필요한 것을 한 화면에서', { height: 'md', backgroundImageUrl: `${IMG}/church-2.jpg` }), infoColumns(), sermons('grid-2'), bulletins('grid-2'), events(), board(), location(), contact()],
  '16': [
    hero('주일 11시, 함께 모입니다', 'LA 코리아타운에서 32년째 한인 가족들과 함께합니다', { backgroundImageUrl: `${IMG}/worship-2.jpg`, textAlign: 'center' }),
    story('예배', '말씀 앞에 함께 섭니다', '주일 오전 9시와 11시, 수요일 저녁 7시 30분, 매일 새벽 5시 30분에 모입니다. 예배 순서와 주차 안내는 미리 확인하실 수 있습니다.', `${IMG}/worship-2.jpg`, 'left', '예배 시간 전체 보기'),
    story('말씀', '우리를 부르시는 손길', '로마서 8장 28절 · 김성호 담임목사 · 8월 9일 주일 2부. 지난 설교는 영상과 설교문으로 모두 남아 있습니다.', `${IMG}/sermon-1.jpg`, 'right', '설교 영상 보기'),
    story('공동체', '함께 신앙생활 합니다', '구역 모임과 주일학교, EM이 매주 모입니다. 처음 오신 분은 새가족반에서 여섯 주 동안 함께합니다.', `${IMG}/group-1.jpg`, 'left', '소그룹 둘러보기'),
    bulletins('grid-3'), galleryMosaic(), givingBand(),
  ],
  '17': [hero('우리는 서로의 이웃입니다', '', { variant: 'text-only', bgMode: 'gradient', height: 'md', textAlign: 'center' }), infoColumns(), sermons('grid-3'), albums('grid-3'), location(), contact()],
  '18': [hero('이번 주 교회는 이렇게 모입니다', '', { backgroundImageUrl: `${IMG}/church-2.jpg` }), weekSchedule(), events(), sermons('grid-4'), albums('grid-4'), location(), contact()],
  '19': [hero('함께한 시간들', '교회의 사진이 이야기가 됩니다', { variant: 'page-hero', backgroundImageUrl: `${IMG}/retreat-1.jpg` }), galleryMosaic(), sermonFeature(), newcomer(), contact()],
  '20': [heroOverlap(), verse(), sermonFeature(), ministries(), newsSplit(), galleryMosaic(), givingBand()],
  '21': [hero('주일 11시, 당신의 자리가 있습니다', '', { height: 'full', backgroundImageUrl: `${IMG}/worship-2.jpg`, overlayOpacity: 0.5 }), infoColumns(), sermons('grid-4'), newcomer(), albums('grid-4'), location(), contact()],
};

// ── per-design THEME profiles (colors + fonts) ──────────────────────────────
// Applying a design also sets the tenant's active theme so the home actually
// LOOKS like the sample (not just the same blocks in the tenant's old theme).
// Shape mirrors themes.settings legacy blob; getThemeTokens bridges it to
// --dw-* CSS vars the storefront + blocks read. tokensV2 is intentionally
// dropped so these colors win.
interface ThemeProfile { colors: Record<string, string>; fonts: Record<string, string> }
const F_SANS = { heading: 'Pretendard', body: 'Pretendard', korean: 'Pretendard' };
const F_SERIF = { heading: 'Noto Serif KR', body: 'Pretendard', korean: 'Pretendard' };
const DEFAULT_LIGHT: ThemeProfile = {
  colors: { primary: '#2563eb', secondary: '#64748b', accent: '#f59e0b', background: '#ffffff', surface: '#f8fafc', text: '#0f172a', muted: '#64748b', border: '#e5e7eb' },
  fonts: F_SANS,
};
const DARK: ThemeProfile = {
  colors: { primary: '#2b7fff', secondary: '#7fb0ff', accent: '#7fb0ff', background: '#0b1220', surface: '#111a2b', text: '#eaf1fb', muted: '#9db0cc', border: '#25344f' },
  fonts: F_SANS,
};
const WARM: ThemeProfile = {
  colors: { primary: '#a45a34', secondary: '#c98a5e', accent: '#d9a066', background: '#fbf8f4', surface: '#f3ece3', text: '#2b2320', muted: '#8a7d70', border: '#e7ddd0' },
  fonts: F_SERIF,
};
const SERIF_MINIMAL: ThemeProfile = {
  colors: { primary: '#3f4650', secondary: '#6b7280', accent: '#3f4650', background: '#ffffff', surface: '#f7f7f6', text: '#1f2328', muted: '#6b7280', border: '#e7e7e5' },
  fonts: F_SERIF,
};
const EDITORIAL: ThemeProfile = {
  colors: { primary: '#16181d', secondary: '#4b5563', accent: '#1466d6', background: '#ffffff', surface: '#f4f5f7', text: '#16181d', muted: '#61697a', border: '#e5e7eb' },
  fonts: F_SANS,
};
const THEME_PRESETS: Record<string, ThemeProfile> = {
  '05': WARM, '10': WARM,
  '06': SERIF_MINIMAL, '17': SERIF_MINIMAL,
  '11': EDITORIAL, '13': EDITORIAL, '16': EDITORIAL, '20': EDITORIAL,
  '14': DARK,
};
function getThemeProfile(design: string): ThemeProfile {
  return THEME_PRESETS[design] ?? DEFAULT_LIGHT;
}

async function applyThemeToTenant(schema: string, profile: ThemeProfile): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<{ settings: Record<string, unknown> | null }[]>(
    `SELECT settings FROM "${schema}".themes WHERE is_active = true LIMIT 1`,
  );
  const cur = (rows[0]?.settings ?? {}) as Record<string, unknown>;
  const settings = {
    templateName: 'modern',
    colors: profile.colors,
    fonts: profile.fonts,
    customCss: (cur.customCss as string) || '',
    // NOTE: tokensV2 intentionally omitted → legacy→tokens bridge uses these colors.
  };
  const affected = await prisma.$executeRawUnsafe(
    `UPDATE "${schema}".themes SET settings = $1::jsonb WHERE is_active = true`,
    JSON.stringify(settings),
  );
  if (!affected) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".themes (name, is_active, settings) VALUES ('modern', true, $1::jsonb)`,
      JSON.stringify(settings),
    );
  }
}

export function hasPreset(design: string | null | undefined): boolean {
  return Boolean(design && P[design]);
}

export function getPreset(design: string): PresetSection[] | null {
  return P[design] ? P[design].map((s) => ({ block_type: s.block_type, props: { ...s.props } })) : null;
}

/** Design ids that have a preset (for the admin UI). */
export const PRESET_IDS = Object.keys(P);

/**
 * Rebuild a tenant's `home` page_sections from the chosen design preset.
 * Idempotent: clears existing home sections then inserts the preset. Never
 * touches content-module tables. Returns the number of sections written.
 */
export async function applyDesignToTenant(slug: string, design: string): Promise<{ design: string; sections: number }> {
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) throw new AppError('BAD_SLUG', 400, '잘못된 테넌트 slug입니다.');
  const sections = getPreset(design);
  if (!sections) throw new AppError('BAD_DESIGN', 400, '알 수 없는 디자인입니다.');
  const schema = `tenant_${slug}`;

  // schema must exist (tenant provisioned)
  const exists = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM information_schema.schemata WHERE schema_name = $1`, schema,
  );
  if (!exists[0]?.n) throw new AppError('NO_SCHEMA', 404, '테넌트 스키마를 찾을 수 없습니다.');

  // find (or create) the home page
  let rows = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM "${schema}".pages WHERE slug = 'home' LIMIT 1`);
  if (!rows[0]) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".pages (title, slug, is_home, status, sort_order) VALUES ('홈', 'home', true, 'published', 0) ON CONFLICT DO NOTHING`,
    );
    rows = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM "${schema}".pages WHERE slug = 'home' LIMIT 1`);
  }
  const pageId = rows[0]?.id;
  if (!pageId) throw new AppError('NO_HOME', 500, '홈 페이지를 만들 수 없습니다.');

  await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".page_sections WHERE page_id = $1::uuid`, pageId);
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i]!;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schema}".page_sections (page_id, block_type, props, sort_order, is_visible)
       VALUES ($1::uuid, $2, $3::jsonb, $4, true)`,
      pageId, sec.block_type, JSON.stringify(sec.props), i,
    );
  }

  // Also set the tenant theme to this design's profile so the home LOOKS like
  // the sample (colors/fonts/dark). Non-fatal — a theme failure must not undo
  // the section rebuild.
  try {
    await applyThemeToTenant(schema, getThemeProfile(design));
  } catch (err) {
    console.warn(`[applyDesign] theme for '${design}' on ${slug} skipped:`, err);
  }

  return { design, sections: sections.length };
}

/**
 * "시안 그대로 적용" — set the tenant home to a single custom_html block holding
 * the sample's real HTML (header/footer already stripped client-side). Renders
 * pixel-faithful to the sample inside the live site chrome. html is sanitized
 * (scripts/handlers removed) before storage.
 */
export async function applyExactHtmlToTenant(slug: string, html: string): Promise<{ ok: true }> {
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) throw new AppError('BAD_SLUG', 400, '잘못된 테넌트 slug입니다.');
  const clean = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
  const schema = `tenant_${slug}`;
  const exists = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM information_schema.schemata WHERE schema_name = $1`, schema,
  );
  if (!exists[0]?.n) throw new AppError('NO_SCHEMA', 404, '테넌트 스키마를 찾을 수 없습니다.');
  let rows = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM "${schema}".pages WHERE slug = 'home' LIMIT 1`);
  if (!rows[0]) {
    await prisma.$executeRawUnsafe(`INSERT INTO "${schema}".pages (title, slug, is_home, status, sort_order) VALUES ('홈', 'home', true, 'published', 0) ON CONFLICT DO NOTHING`);
    rows = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM "${schema}".pages WHERE slug = 'home' LIMIT 1`);
  }
  const pageId = rows[0]?.id;
  if (!pageId) throw new AppError('NO_HOME', 500, '홈 페이지를 만들 수 없습니다.');
  await prisma.$executeRawUnsafe(`DELETE FROM "${schema}".page_sections WHERE page_id = $1::uuid`, pageId);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "${schema}".page_sections (page_id, block_type, props, sort_order, is_visible)
     VALUES ($1::uuid, 'custom_html', $2::jsonb, 0, true)`,
    pageId, JSON.stringify({ html: clean }),
  );
  return { ok: true };
}
