#!/usr/bin/env tsx
/**
 * apply-emmaus — implement the "엠마오교회 리뉴얼" Claude Design (project
 * 824af8e8) onto tenant `mdemmauschurch` (staging, wiped + backed up).
 *
 * Follows docs/CLAUDE-DESIGN-WORKFLOW.md: styleguide → theme (STEP 1), then each
 * screen composed from existing (match) blocks. Content is verbatim from the
 * .dc.html. Dynamic lists (sermons/news/albums/staff) are data-block shells;
 * their rows come per-module later. Structure follows the Claude Design.
 *
 * Run (creds via ENV):
 *   TL_SUPER_EMAIL=.. TL_SUPER_PASSWORD=.. \
 *   pnpm dlx tsx scripts/design-importer/apply-emmaus.ts [--pages home,vision,...]
 */
import { makeHttpClient } from './api.js';
import { buildChurchTheme, composePage, type PageSpec, type Styleguide } from './lib.js';

const TENANT = 'mdemmauschurch';

// ── Styleguide (from _tokens.css + the .dc.html palette) — light/warm, no dark bands.
const STYLEGUIDE: Styleguide = {
  name: 'Emmaus renewal',
  colors: {
    primary: '#1466d6',     // --brand: buttons, links, active, accents
    secondary: '#0f4fa8',   // deeper brand (hover/footer accents)
    accent: '#2b7fff',      // --primary: secondary highlight
    text: '#16181d',        // --fg
    muted: '#61697a',       // --fg-muted
    background: '#ffffff',  // --bg
    surface: '#f7f8fa',     // --surface (alt band / cards)
    border: '#e5e7eb',      // --border
    onDark: '#ffffff',
    onDarkMuted: 'rgba(255,255,255,0.85)',
  },
  fonts: { heading: 'Pretendard Variable', body: 'Pretendard Variable', korean: 'Pretendard Variable' },
};

const BANNER = 'https://mdemmauschurch.org/data/file/main_banner/3717822918_oP59tZOE_9afc987587018050f399ebf074fb97a728fbc0d0.jpg';

// ── Pages (screen → match blocks). Keyed so --pages can select a subset. ──
const PAGES: Record<string, PageSpec> = {
  // 01 메인
  home: {
    name: '홈', slug: 'home', sortOrder: 0,
    sections: [
      { blockType: 'hero_banner', props: {
        variant: 'image-overlay', height: 'lg', backgroundImageUrl: BANNER,
        eyebrow: 'MARYLAND EMMAUS CHURCH',
        title: '예수님이 동행하시는 교회\n예수님 안에서 소망을 찾는 교회\n예수님의 사랑을 전하는 교회',
        subtitle: '길에서 그분이 우리에게 말씀하시고, 성경을 풀이하여 주실 때에, 우리의 마음이 뜨거워지지 않았습니까? — 누가복음 24:32',
        buttonText: '예배 안내 보기', buttonUrl: '/worship',
      } },
      { blockType: 'worship_schedule', props: {
        title: '예배 시간', items: [
          { label: '주일예배 1부', time: '주일 08:30 AM', place: '' },
          { label: '주일예배 2부', time: '주일 11:00 AM', place: '' },
          { label: '금요기도회', time: '금요일 07:30 PM', place: '' },
          { label: '새벽예배', time: '월~토 05:30 AM', place: '' },
        ],
      } },
      { blockType: 'features_grid', props: {
        title: '', columns: 4, items: [
          { title: '하루를 여는 말씀', description: '하루의 시작은 하나님의 말씀으로!' },
          { title: '가정예배 순서지', description: '가정의 예배가 회복될 때 기적은 일어납니다!' },
          { title: '목장예배 순서지', description: '목장예배를 통해서 하나님의 공동체가 세워집니다' },
          { title: '교회주보', description: '매주 새로운 소식을 확인하고 행사에 동참해 주세요!' },
        ],
      } },
      { blockType: 'recent_sermons', props: { title: '이번 주 설교', limit: 6 } },
      { blockType: 'event_grid', props: { title: '교회소식', limit: 5 } },
      { blockType: 'album_gallery', props: { title: '엠마오 일상', variant: 'grid-4' } },
      { blockType: 'call_to_action', props: {
        title: '실시간 예배 방송', variant: 'inline-banner',
        buttonText: '방송 보러 가기', buttonUrl: '/worship',
      } },
    ],
  },

  // 02 교회소개 · 교회비전
  about: {
    name: '교회소개', slug: 'about', sortOrder: 1,
    sections: [
      { blockType: 'hero_banner', props: { variant: 'image-overlay', height: 'sm-plus', title: '교회소개', subtitle: '홈 · 교회소개 · 교회비전' } },
      { blockType: 'text_image', props: {
        subtitle: 'OUR VISION', layout: 'left', imageUrl: '',
        title: '예수님이 동행하시는 교회 · 예수님 안에서 소망을 찾는 교회 · 예수님의 사랑을 전하는 교회',
        content: 'Walking with Jesus, Finding Hope in Jesus, Sharing the Love of Jesus',
      } },
      { blockType: 'quote_block', props: {
        title: '“길에서 그분이 우리에게 말씀하시고, 성경을 풀이하여 주실 때에, 우리의 마음이 뜨거워지지 않았습니까?”',
        content: '누가복음 24:32',
      } },
      { blockType: 'text_only', props: {
        title: '엠마오 교회 설립 목적',
        content: '<p>엠마오 교회는 예수님과 함께 동행하며, 이 땅에서의 신앙 여정을 함께하는 공동체입니다. 낙심하고 길을 잃은 이들이 주님 안에서 새로운 소망을 발견하고, 서로 합력하여 하나님의 사랑을 전하는 것을 사명으로 삼습니다.</p><p>우리는 단순한 모임을 넘어, 예수님과의 동행을 삶의 중심에 두고, 일상 속에서 신앙을 실천하며 살아가는 교회입니다. 엠마오로 가는 두 제자가 절망 가운데 있을 때 예수님께서 함께하시며 말씀을 풀어 주셨듯이, 우리도 주의 말씀을 통해 삶의 의미를 발견하고, 영적인 눈을 뜨며, 하나님 나라의 소망을 품는 공동체가 되고자 합니다.</p>',
      } },
      { blockType: 'features_grid', props: {
        title: '엠마오 교회 핵심 가치', columns: 3, items: [
          { title: '예수님이 동행하시는 교회', description: '엠마오 교회는 예수님과 함께 일상의 길을 걸으며, 현실 속에서 신앙을 실천하는 공동체입니다. 이 땅에서의 신앙 여정은 혼자가 아닌, 예수님과 함께하는 동행의 과정입니다.' },
          { title: '예수님 안에서 소망을 찾는 교회', description: '절망과 어둠 속에 있는 이들에게 예수님을 통해 소망을 전하는 교회입니다. 예수님을 만난 자들은 절망을 소망으로 바꾸는 변화를 경험하게 됩니다.' },
          { title: '예수님의 사랑을 전하는 교회', description: '예수님을 만난 기쁨과 사랑을 세상에 전하는 사명을 가진 교회입니다. 예배와 말씀, 교제를 통해 주님의 사랑을 깊이 경험하고 복음을 전합니다.' },
        ],
      } },
      { blockType: 'call_to_action', props: { title: '엠마오교회로 여러분을 초대합니다', variant: 'inline-banner', buttonText: '예배 안내 보기', buttonUrl: '/worship' } },
    ],
  },

  // 03 섬기는 사람들
  staff: {
    name: '섬기는 사람들', slug: 'staff', sortOrder: 2,
    sections: [
      { blockType: 'hero_banner', props: { variant: 'image-overlay', height: 'sm-plus', title: '섬기는 사람들', subtitle: '홈 · 교회소개 · 섬기는 사람들' } },
      { blockType: 'staff_grid', props: { title: '교역자', columns: 4, limit: 12 } },
      { blockType: 'call_to_action', props: { title: '함께 섬길 여러분을 기다립니다', variant: 'inline-banner', buttonText: '새가족 안내', buttonUrl: '/newcomer' } },
    ],
  },

  // 04 예배안내 · 오시는길
  worship: {
    name: '예배안내', slug: 'worship', sortOrder: 3,
    sections: [
      { blockType: 'hero_banner', props: { variant: 'image-overlay', height: 'sm-plus', title: '예배안내', subtitle: '홈 · 교회소개 · 예배안내' } },
      { blockType: 'worship_schedule', props: {
        title: '예배 시간', items: [
          { label: '주일예배 1부', time: '주일 08:30 AM', place: '본당' },
          { label: '주일예배 2부', time: '주일 11:00 AM', place: '본당' },
          { label: '수요예배', time: '수요일 07:30 PM', place: '본당' },
          { label: '금요기도회', time: '금요일 07:30 PM', place: '본당' },
          { label: '새벽예배', time: '월~토 05:30 AM', place: '본당' },
        ],
      } },
      { blockType: 'location_map', props: { title: '중앙캠퍼스 Central Campus', address: '882 Cecil Ave. S. Millersville, MD 21108' } },
      { blockType: 'location_map', props: { title: '영광캠퍼스 Gloria Campus', address: '320 Oak Manor Dr, Glen Burnie, MD 21061' } },
      { blockType: 'contact_info', props: {} },
      { blockType: 'call_to_action', props: { title: '온라인으로도 함께 예배드립니다', variant: 'inline-banner', buttonText: '라이브 예배', buttonUrl: '/sermons' } },
    ],
  },

  // 05 설교찬양 목록
  sermons: {
    name: '설교찬양', slug: 'sermons', sortOrder: 4,
    sections: [
      { blockType: 'hero_banner', props: { variant: 'image-overlay', height: 'sm-plus', title: '설교찬양', subtitle: '홈 · 설교찬양' } },
      { blockType: 'recent_sermons', props: { title: '설교·찬양', limit: 12, variant: 'grid-3' } },
      { blockType: 'call_to_action', props: { title: '지난 설교도 다시 들어보세요', variant: 'inline-banner', buttonText: '유튜브 채널', buttonUrl: '#' } },
    ],
  },

  // 07 교회소식
  news: {
    name: '교회소식', slug: 'news', sortOrder: 5,
    sections: [
      { blockType: 'hero_banner', props: { variant: 'image-overlay', height: 'sm-plus', title: '교회소식', subtitle: '홈 · 나눔터 · 교회소식' } },
      { blockType: 'board', props: { title: '교회소식', boardSlug: 'notices', limit: 15 } },
      { blockType: 'call_to_action', props: { title: '엠마오교회의 소식을 함께 나눠요', variant: 'inline-banner', buttonText: '교회 주보', buttonUrl: '/bulletins' } },
    ],
  },

  // 09 포토갤러리
  albums: {
    name: '포토갤러리', slug: 'albums', sortOrder: 6,
    sections: [
      { blockType: 'hero_banner', props: { variant: 'image-overlay', height: 'sm-plus', title: '엠마오 포토갤러리', subtitle: '홈 · 나눔터 · 포토갤러리' } },
      { blockType: 'album_gallery', props: { title: '엠마오 일상', variant: 'grid-4' } },
      { blockType: 'call_to_action', props: { title: '엠마오의 순간들을 함께 나눠요', variant: 'inline-banner', buttonText: '교회소식 보기', buttonUrl: '/news' } },
    ],
  },

  // 11 주일학교
  'sunday-school': {
    name: '주일학교', slug: 'sunday-school', sortOrder: 7,
    sections: [
      { blockType: 'hero_banner', props: { variant: 'image-overlay', height: 'sm-plus', title: '주일학교', subtitle: '홈 · 주일학교' } },
      { blockType: 'features_grid', props: {
        title: '다음 세대를 세웁니다', columns: 4, items: [
          { title: 'Youth', description: '중고등부' },
          { title: 'Children', description: '유초등부' },
          { title: 'Kindergarten', description: '유치부' },
          { title: 'Preschool', description: '영유아부' },
        ],
      } },
      { blockType: 'call_to_action', props: { title: '자녀와 함께 예배하러 오세요', variant: 'inline-banner', buttonText: '예배 안내', buttonUrl: '/worship' } },
    ],
  },

  // 목장 (header top-level)
  pasture: {
    name: '목장', slug: 'pasture', sortOrder: 8,
    sections: [
      { blockType: 'hero_banner', props: { variant: 'image-overlay', height: 'sm-plus', title: '목장', subtitle: '홈 · 목장' } },
      { blockType: 'text_only', props: { title: '목장교회 소개', content: '<p>목장예배를 통해서 하나님의 공동체가 세워집니다. 엠마오교회의 목장은 삶을 나누고 함께 기도하며 서로를 세워가는 작은 공동체입니다.</p>' } },
      { blockType: 'cell_grid', props: { title: '우리 교회 목장', limit: 12 } },
      { blockType: 'call_to_action', props: { title: '목장 공동체에 함께해요', variant: 'inline-banner', buttonText: '새가족 안내', buttonUrl: '/newcomer' } },
    ],
  },
};

async function main(): Promise<void> {
  const pagesArg = process.argv.find((a) => a.startsWith('--pages='))?.slice('--pages='.length);
  const wanted = pagesArg ? pagesArg.split(',').map((s) => s.trim()).filter(Boolean) : Object.keys(PAGES);
  const pages = wanted.map((k) => PAGES[k]).filter((p): p is PageSpec => !!p);
  console.log(`▶ apply-emmaus → ${TENANT} — theme + pages: ${pages.map((p) => p.slug).join(', ')}`);

  const client = await makeHttpClient(TENANT);

  // STEP 1 — theme.
  await client.putThemeTokens(buildChurchTheme(STYLEGUIDE));
  console.log('  ✓ STEP 1 테마 적용');

  for (const p of pages) {
    const existing = await client.getPage(p.slug);
    if (existing) { console.log(`  ⚠ "${p.slug}" 이미 존재 (id ${existing.id}) — 건너뜀`); continue; }
    const composed = composePage(p);
    const { id } = await client.createPage(composed.page);
    for (const sec of composed.sections) await client.addSection(id, sec);
    const back = await client.getPage(p.slug);
    console.log(`  ✓ "${p.slug}" — ${composed.sections.length}개 섹션 → 저장 ${back?.sections.length ?? 0}개 [${(back?.sections ?? []).map((s) => s.block_type).join(', ')}]`);
  }
  console.log(`\n확인: https://${TENANT}.truelight.app/`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
