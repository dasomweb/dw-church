/**
 * AI Page Generator — generates page block composition from a prompt.
 * Uses Gemini to understand the request and outputs a structured block list.
 * Then creates the page + sections via the existing pages service.
 */

import { generateText } from './service.js';
import * as pageService from '../pages/service.js';
import { blockTypes } from '../pages/schema.js';

interface GeneratedBlock {
  blockType: string;
  props: Record<string, unknown>;
}

interface GeneratedPage {
  title: string;
  slug: string;
  blocks: GeneratedBlock[];
}

// Block descriptions for AI context
const BLOCK_DESCRIPTIONS = `
Available block types and their props:

STATIC BLOCKS (content stored in props):
- hero_banner: { title, subtitle, height(sm/md/lg/full), layout(full/contained), overlayColor, overlayOpacity }
- text_image: { title, content, imageUrl }
- text_only: { title, content }
- pastor_message: { title, name, message, photoUrl }
- church_intro: { title, content, imageUrl }
- mission_vision: { title, content }
- worship_times: { title, services: [{name, day, time, location}] }
- location_map: { title, address }
- contact_info: { title, phone, address, email }
- newcomer_info: { title, content, imageUrl }
- image_gallery: { title, images[] }
- video: { title, youtubeUrl }
- quote_block: { title, content }
- divider: {}

DYNAMIC BLOCKS (data from DB, props control display):
- recent_sermons: { title, limit(number), variant(grid-2/grid-3/grid-4) }
- recent_bulletins: { title, limit, variant }
- recent_columns: { title, limit, variant }
- album_gallery: { title, limit, variant }
- staff_grid: { title, limit, variant }
- event_grid: { title, limit, variant(cards-2/cards-3/cards-4) }
- history_timeline: { title }
- board: { title, boardSlug }
- banner_slider: { title }
`;

// Page composition guidelines — Korean / immigration church standard
const PAGE_GUIDELINES = `
CHURCH PAGE COMPOSITION GUIDELINES (Korean / Immigration church):

═══ 1. 홈 (home) ═══
hero_banner(CTA: 예배안내, 새가족등록) → worship_times(이번주 예배, 주보 링크) → recent_sermons(limit:3) → text_only(비전 문구 + 담임목사 서명) → event_grid(limit:3, 공지/소식) → location_map(미니맵) → newcomer_info(새가족 CTA)

═══ 2. 교회 소개 ═══

2-1 인사말 (about/greeting):
hero_banner → pastor_message(담임목사 사진+인사말 Rich Text) → mission_vision(비전/사명 선언문)

2-2 교회 역사 (about/history):
hero_banner → history_timeline(연도별 이벤트+사진) → text_image(교회 사진)

2-3 담임목사 소개 (about/pastor):
hero_banner → pastor_message(프로필 사진+이름+약력+설교 스타일) → contact_info(이메일 문의)

2-4 교역자 소개 (about/staff):
hero_banner → staff_grid(variant:grid-4, 사진+이름+직분+담당사역)

2-5 신앙고백/비전 (about/beliefs):
hero_banner → text_only(신앙고백 본문) → text_image(핵심가치 아이콘+설명) → quote_block(비전 성경구절)

═══ 3. 예배 안내 ═══

3-1 예배 시간표 (worship/schedule):
hero_banner → worship_times(예배명+요일+시간+장소+대상+담당교역자) → text_image(특별예배 공지: 부활절/성탄절 등)

3-2 주보 (worship/bulletin):
hero_banner → recent_bulletins(limit:12, variant:grid-4, PDF뷰어/다운로드)

3-3 오시는 길 (worship/directions):
hero_banner → location_map(Google Maps, 위도/경도) → text_image(주소+주차안내+대중교통)

═══ 4. 사역 부서 ═══

4-1 아동부/주일학교 (ministry/children):
hero_banner → text_image(대상연령+교육철학+교사소개) → event_grid(limit:4, 일정) → board(boardSlug:children, 등록안내)

4-2 청년부 (ministry/youth):
hero_banner → text_image(부서소개+간증) → image_gallery(활동사진) → event_grid(limit:4) → board(boardSlug:youth, 등록)

4-3 장년부/구역 (ministry/adults):
hero_banner → text_image(구역 목록: 구역명+구역장+모임시간/장소) → text_only(성경공부 일정) → board(boardSlug:adults)

4-4 선교부 (ministry/missions):
hero_banner → text_image(선교지 현황: 국가별 선교사 카드) → text_only(선교 후원 안내) → board(boardSlug:missions)

═══ 5. 미디어 ═══

5-1 설교 영상 (media/sermons):
hero_banner → recent_sermons(limit:12, variant:grid-4, YouTube+제목+날짜+설교자+성경본문, 검색+필터)

5-2 갤러리 (media/gallery):
hero_banner → album_gallery(limit:12, variant:grid-4, 행사명+날짜+사진)

5-3 찬양/악보 (media/worship-songs):
hero_banner → board(boardSlug:worship-songs, 제목+작사작곡+악보PDF)

═══ 6. 공동체 ═══

6-1 공지사항 (community/notices):
hero_banner → board(boardSlug:notices, 제목+작성일+고정공지+첨부파일)

6-2 교회 소식 (community/news):
hero_banner → event_grid(limit:12, variant:cards-3, 이미지+제목+요약+날짜)

6-3 기도 요청 (community/prayer):
hero_banner → text_only(기도요청 안내) → board(boardSlug:prayer)

6-4 새가족 등록 (community/new-member):
hero_banner → newcomer_info(환영메시지, 한국어/영어 이중안내) → text_image(등록절차+FAQ) → worship_times → location_map → contact_info

═══ 7. 연락처/헌금 ═══

7-1 연락처 (contact):
hero_banner → contact_info(주소+전화+이메일+운영시간) → location_map(Google Maps) → text_only(문의안내)

7-2 온라인 헌금 (giving):
hero_banner → text_only(헌금종류: 십일조+감사헌금+선교헌금+건축헌금) → text_image(헌금방법: Zelle+Venmo+Check 안내) → text_only(온라인 결제 링크)

═══ 이민교회 특화 ═══
- 새가족 등록: 한국어/영어 이중 안내, 미국 거주 기간, 관심 사역 체크박스
- 헌금: Zelle/Venmo/Check 우선 안내 (신용카드 부담 최소화)
- 시간대: 미국 현지 타임존 표기 (EST/PST)
- 설교: YouTube 연동 우선
- 주보: PDF 한/영 버전 별도

RULES:
- hero_banner는 항상 첫 블록 (height: "md", layout: "full")
- 정적 블록 content에는 실제 교회에서 바로 사용할 수 있는 자연스러운 한국어 문구 작성
- worship_times services: 주일1부(오전7시), 주일2부(오전9:30), 주일3부(오전11:30), 수요예배(저녁7:30), 금요기도(저녁8시) 형태
- 동적 블록(recent_sermons 등)은 표시 설정만 props로 지정 (실제 데이터는 관리자가 등록)
- board 블록 사용 시 boardSlug를 영문 slug로 지정
- 이민교회 특성을 고려한 콘텐츠 작성 (이중언어, 미국 생활 적응 등)
`;

/**
 * Generate a page structure from a natural language prompt.
 * Returns the generated page definition without saving.
 */
export async function generatePageFromPrompt(prompt: string): Promise<GeneratedPage> {
  const systemContext = `You are a church website page builder AI.
Given a user's request, generate a page with appropriate blocks.

${BLOCK_DESCRIPTIONS}

${PAGE_GUIDELINES}

ADDITIONAL RULES:
- Output ONLY valid JSON, no markdown, no explanation
- Use Korean for all content (titles, text)
- Choose blocks that best match the user's intent
- Always start with hero_banner (height: "md", layout: "full")
- For content pages, use text_image or text_only blocks with meaningful placeholder text
- For dynamic content pages (sermons, staff, etc), use the appropriate dynamic block
- Generate a slug from the page title (lowercase, hyphens, English or Korean romanization)
- Fill in realistic Korean church content for text fields

Output format:
{
  "title": "페이지 제목",
  "slug": "page-slug",
  "blocks": [
    { "blockType": "hero_banner", "props": { "title": "...", "subtitle": "...", "height": "md", "layout": "full" } },
    { "blockType": "...", "props": { ... } }
  ]
}`;

  const response = await generateText(prompt, systemContext);

  // Parse JSON from response (strip markdown code blocks if present)
  const jsonStr = response
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  let parsed: GeneratedPage;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
  }

  // Validate block types
  const validTypes = new Set(blockTypes as readonly string[]);
  parsed.blocks = parsed.blocks.filter((b) => validTypes.has(b.blockType));

  if (parsed.blocks.length === 0) {
    throw new Error('유효한 블록이 생성되지 않았습니다.');
  }

  // Ensure slug is clean
  parsed.slug = parsed.slug
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return parsed;
}

/**
 * Generate AND save a page from prompt.
 * Creates the page and all sections in the tenant schema.
 */
export async function createPageFromPrompt(
  schema: string,
  prompt: string,
): Promise<{ page: { id: string; title: string; slug: string }; sections: number }> {
  const generated = await generatePageFromPrompt(prompt);

  // Get max sort order for new page
  const pages = await pageService.listPages(schema);
  const maxOrder = pages.length > 0 ? Math.max(...pages.map((p) => p.sort_order)) + 1 : 0;

  // Create the page
  const page = await pageService.createPage(schema, {
    title: generated.title,
    slug: generated.slug,
    isHome: false,
    status: 'published',
    sortOrder: maxOrder,
  });

  // Create sections
  for (let i = 0; i < generated.blocks.length; i++) {
    const block = generated.blocks[i]!;
    await pageService.createSection(schema, page.id, {
      blockType: block.blockType as any,
      props: block.props,
      sortOrder: i,
      isVisible: true,
    });
  }

  return { page: { id: page.id, title: page.title, slug: page.slug }, sections: generated.blocks.length };
}
