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
const verse = (): PresetSection => ({ block_type: 'quote_block', props: { variant: 'verse', eyebrow: '오늘의 말씀', quote: '수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라', reference: '마태복음 11:28' } });
const announce = (): PresetSection => ({ block_type: 'cta_section', props: { variant: 'announcement-bar', eyebrow: '다가오는 행사', title: '가을 성경공부 「마가복음 6주 과정」', subtitle: '9월 5일 시작 · 매주 목요일 저녁 8시', buttonText: '신청하기', buttonUrl: '/events' } });
const quickLinks = (): PresetSection => ({ block_type: 'quick_links', props: { title: '바로가기', items: [
  { title: '기도 요청', content: '/prayer' },
  { title: '소그룹 신청', content: '/smallgroup' },
  { title: '온라인 헌금', content: '/giving' },
] } });
const columns = (): PresetSection => ({ block_type: 'recent_columns', props: { title: '목회 칼럼', limit: 3, variant: 'grid-3' } });
const board = (): PresetSection => ({ block_type: 'board', props: { title: '교회 소식', boardSlug: 'notice', limit: 5, variant: 'list' } });
const banner = (): PresetSection => ({ block_type: 'banner_slider', props: { category: 'main' } });
const location = (): PresetSection => ({ block_type: 'location_map', props: { title: '오시는 길', address: '', zoom: 15 } });
const contact = (): PresetSection => ({ block_type: 'contact_info', props: {} });
const pastor = (o: Partial<Record<string, unknown>> = {}): PresetSection => ({
  block_type: 'pastor_message',
  props: { title: '담임목사 인사말', eyebrow: '환영합니다', pastorName: '', pastorTitle: '담임목사', message: '', imageUrl: `${IMG}/sermon-1.jpg`, variant: 'left', ...o },
});
const newcomer = (): PresetSection => ({ block_type: 'newcomer_info', props: { title: '처음 오시나요?', subtitle: '편안하게 오세요, 자리를 비워 두었습니다.', content: '', imageUrl: `${IMG}/group-2.jpg` } });
const textImage = (title: string, imageUrl: string, layout: 'left' | 'right' = 'left'): PresetSection => ({
  block_type: 'text_image', props: { title, subtitle: '', content: '', imageUrl, variant: layout, bgMode: 'none' },
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
  '11': [banner(), hero('함께 자라고 함께 살아가는 교회', '주일 아침, 당신의 자리를 비워두고 기다립니다', { backgroundImageUrl: `${IMG}/worship-2.jpg` }), infoColumns(), verse(), announce(), sermons('grid-4'), events(), albums('grid-4'), quickLinks(), board(), location(), contact()],
  '12': [hero('함께 자라고 함께 살아가는 교회', '', { backgroundImageUrl: `${IMG}/worship-1.jpg` }), infoColumns(), sermons('grid-3'), bulletins('grid-3'), events(), columns(), quickLinks(), location(), contact()],
  '13': [hero('따뜻한 이웃이 되는 교회', '', { backgroundImageUrl: `${IMG}/serving-2.jpg` }), albums('masonry'), sermons('grid-3'), events(), columns(), location(), contact()],
  '14': [hero('고요한 저녁, 말씀 앞에 나아갑니다', '누구든 오실 수 있습니다', { backgroundImageUrl: `${IMG}/worship-2.jpg`, overlayOpacity: 0.55 }), infoColumns(), sermons('grid-3'), newcomer(), albums('grid-4'), location(), contact()],
  '15': [hero('이번 주 예배 안내', '필요한 것을 한 화면에서', { height: 'md', backgroundImageUrl: `${IMG}/church-2.jpg` }), infoColumns(), sermons('grid-2'), bulletins('grid-2'), events(), board(), location(), contact()],
  '16': [hero('우리는 서로의 이웃입니다', '', { backgroundImageUrl: `${IMG}/worship-2.jpg` }), textImage('말씀으로 세워지는 공동체', `${IMG}/sermon-1.jpg`, 'left'), textImage('삶으로 나누는 사랑', `${IMG}/serving-1.jpg`, 'right'), pastor(), sermons('grid-3'), albums('grid-3'), contact()],
  '17': [hero('우리는 서로의 이웃입니다', '', { variant: 'text-only', bgMode: 'gradient', height: 'md', textAlign: 'center' }), infoColumns(), sermons('grid-3'), albums('grid-3'), location(), contact()],
  '18': [hero('이번 주 교회는 이렇게 모입니다', '', { backgroundImageUrl: `${IMG}/church-2.jpg` }), weekSchedule(), events(), sermons('grid-4'), albums('grid-4'), location(), contact()],
  '19': [hero('교회의 사진이 이야기가 됩니다', '', { backgroundImageUrl: `${IMG}/retreat-1.jpg` }), albums('masonry'), infoColumns(), sermons('grid-3'), events(), contact()],
  '20': [hero('주일 예배로 초대합니다', '히어로 위에 예배 안내가 놓입니다', { backgroundImageUrl: `${IMG}/worship-2.jpg` }), infoColumns(), sermons('grid-4'), pastor(), albums('grid-4'), quickLinks(), location(), contact()],
  '21': [hero('주일 11시, 당신의 자리가 있습니다', '', { height: 'full', backgroundImageUrl: `${IMG}/worship-2.jpg`, overlayOpacity: 0.5 }), infoColumns(), sermons('grid-4'), newcomer(), albums('grid-4'), location(), contact()],
};

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
  return { design, sections: sections.length };
}
