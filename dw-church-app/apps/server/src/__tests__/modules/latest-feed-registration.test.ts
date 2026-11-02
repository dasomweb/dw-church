import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSectionSchema } from '../../modules/pages/schema.js';

/**
 * 블록 등록 5곳 동기화.
 *
 * 블록은 한 곳만 빠져도 조용히 망가진다 — 서버 enum 이 빠지면 페이지 저장이
 * 400, 스토어프론트 매핑이 빠지면 화면에 Unknown, PageEditor 가 빠지면 운영자가
 * 블록을 아예 넣을 수 없다. 넣은 쪽만 보고 "됐다" 하기 쉬운 자리라 테스트로 묶는다.
 *
 *   1) apps/server/src/modules/pages/schema.ts            저장 게이트(zod enum)
 *   2) apps/web/components/BlockRenderer.tsx               스토어프론트 렌더
 *   3) packages/blocks/src/utilities/BlockRenderer.tsx     빌더 캔버스 라벨
 *   4) packages/admin-app/src/pages/PageEditor.tsx         블록 추가 목록 + 아이콘
 *   5) packages/admin-app/src/components/builder/
 *        element-registry.ts                               고급 편집기 필드
 */
const ROOT = join(process.cwd(), '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf-8');

const WEB_RENDERER = read('apps/web/components/BlockRenderer.tsx');
const SHARED_RENDERER = read('packages/blocks/src/utilities/BlockRenderer.tsx');
const PAGE_EDITOR = read('packages/admin-app/src/pages/PageEditor.tsx');
const ELEMENT_REGISTRY = read('packages/admin-app/src/components/builder/element-registry.ts');

describe('latest_feed — 통합 피드 블록 등록', () => {
  it('페이지 저장이 통과한다 (서버 zod enum)', () => {
    const r = createSectionSchema.safeParse({
      blockType: 'latest_feed',
      props: { title: '최신', sources: 'sermon_note, column:저널' },
    });
    expect(r.success).toBe(true);
  });

  it('스토어프론트가 렌더한다', () => {
    expect(WEB_RENDERER).toMatch(/latest_feed: LatestFeedBlock/);
    expect(WEB_RENDERER).toContain("from './blocks/LatestFeedBlock'");
  });

  it('빌더 캔버스에 라벨이 있다 (중첩 자식이 Unknown 으로 안 뜨게)', () => {
    expect(SHARED_RENDERER).toMatch(/^\s*latest_feed: '/m);
  });

  it('운영자가 블록을 추가할 수 있다 (PageEditor 목록 + 아이콘)', () => {
    expect(PAGE_EDITOR).toContain("type: 'latest_feed'");
    expect(PAGE_EDITOR).toMatch(/^\s*latest_feed: 'M/m); // BLOCK_ICON_PATHS
  });

  it('고급 편집기에 설정 필드가 있다', () => {
    expect(ELEMENT_REGISTRY).toContain('latest_feed: LATEST_FEED');
    expect(ELEMENT_REGISTRY).toContain("key: 'sources'");
  });

  it('라벨만 있고 로더가 없는 모듈 키는 없다 (빈 탭 방지)', () => {
    const block = read('apps/web/components/blocks/LatestFeedBlock.tsx');
    const contract = read('packages/blocks/src/utilities/feed-sources.ts');
    // 로더 테이블의 키 = SOURCES = { sermon_note: { load: ... }, ... }
    const table = block.slice(block.indexOf('const SOURCES'), block.indexOf('const KNOWN'));
    const loaders = [...table.matchAll(/^  ([a-z_]+): \{$/gm)].map((m) => m[1]);
    const labels = [...contract.matchAll(/^  ([a-z_]+): '/gm)].map((m) => m[1]);
    expect(loaders.length).toBeGreaterThan(0);
    expect([...loaders].sort()).toEqual([...labels].sort());
  });

  it('상세 라우트가 없는 모듈은 운영자가 준 주소만 쓴다 (죽은 링크 방지)', () => {
    const block = read('apps/web/components/blocks/LatestFeedBlock.tsx');
    expect(block).toContain('href: opts.bookHref');
    expect(block).toContain('href: opts.devotionHref');
  });
});

/**
 * v5 시안용으로 붙인 기존 블록의 변형(variant).
 *
 * variant 는 **구현과 선택지가 쌍**이어야 한다. 컴포넌트에만 있으면 운영자가 고를
 * 수 없고, PageEditor 에만 있으면 골라도 기본 모양이 나와 "안 바뀐다"는 말을 듣는다.
 */
describe('블록 변형 — 구현과 선택지가 짝이 맞는다', () => {
  const cases: [string, string, string][] = [
    ['recent_columns', 'feature-dark', 'apps/web/components/blocks/RecentColumnsBlock.tsx'],
    ['recent_books', 'feature-row', 'apps/web/components/blocks/RecentBooksBlock.tsx'],
    ['recent_sermon_note', 'hero-split', 'apps/web/components/blocks/RecentSermonNoteBlock.tsx'],
    ['values_grid', 'split-links', 'packages/blocks/src/list-based/ValuesGridBlock.tsx'],
    ['latest_feed', 'rail-left', 'apps/web/components/blocks/LatestFeedBlock.tsx'],
    ['latest_feed', 'rail-right', 'apps/web/components/blocks/LatestFeedBlock.tsx'],
  ];

  for (const [block, variant, file] of cases) {
    it(`${block} / ${variant}`, () => {
      expect(read(file)).toContain(`=== '${variant}'`);          // 컴포넌트가 실제로 분기한다
      expect(PAGE_EDITOR).toContain(`id: '${variant}'`);          // 운영자가 고를 수 있다
      expect(ELEMENT_REGISTRY).toContain(`value: '${variant}'`);  // 고급 편집기에서도 고를 수 있다
    });
  }

  it('다크 밴드는 바탕을 테마 잉크에 묶는다 (하드코딩 금지)', () => {
    const f = read('apps/web/components/blocks/RecentColumnsBlock.tsx');
    expect(f).toContain('defaultBg="var(--dw-text, #1a1a1a)"');
  });

  it('마스트헤드 레일의 주보 링크는 실제 상세 라우트를 가리킨다', () => {
    // /online-bulletin 은 라우트가 없다 — 목록 페이지 없이 상세만 있다.
    const f = read('apps/web/components/blocks/RecentSermonNoteBlock.tsx');
    expect(f).toContain('/online-bulletins/${bulletin.id}');
    expect(f).not.toMatch(/href: '\/online-bulletin'/);
  });
});

/**
 * 통합 피드의 **사이드 레일** — 카드 옆 좁은 안내 칼럼(v6 시안).
 *
 * 레일이 노리는 것은 "주마다 손이 안 가는 안내 칼럼"이다. 그래서 값이 자동으로
 * 채워지는 두 경로(바로가기 줄의 최신 글 날짜 · 최신 주보의 기도제목)가 살아
 * 있는지를 묶는다 — 여기가 끊기면 운영자가 주일마다 홈을 고치게 된다.
 */
describe('latest_feed — 사이드 레일', () => {
  const BLOCK = read('apps/web/components/blocks/LatestFeedBlock.tsx');
  const RAIL = read('apps/web/components/blocks/LatestFeedRail.tsx');

  it('레일 props 를 담은 페이지가 저장된다 (서버 zod enum/passthrough)', () => {
    const r = createSectionSchema.safeParse({
      blockType: 'latest_feed',
      props: {
        variant: 'rail-left',
        sources: 'column@교회이야기',
        railTitle: 'THIS WEEK',
        railLines: '11월 첫째 주 | 주일예배 오전 11시',
        railPrayerSource: 'online_bulletin',
        railLinks: 'online_bulletin:온라인 주보, /worship:예배 안내',
      },
    });
    expect(r.success).toBe(true);
  });

  it('바로가기 줄 값은 피드와 **같은 로더**로 채운다 (상세 주소 규칙이 한 곳)', () => {
    expect(BLOCK).toContain('SOURCES[link.key]!.load(slug, 1, opts)');
    expect(BLOCK).toContain('value: shortDate(latest?.date)');
  });

  it('기도제목을 최신 주보에서 가져온다', () => {
    expect(BLOCK).toContain("String(props.railPrayerSource ?? 'online_bulletin') === 'online_bulletin'");
    expect(BLOCK).toContain('content.prayerRequests');
  });

  it('등록된 글이 없는 모듈 줄은 링크를 걸지 않는다 (죽은 링크 방지)', () => {
    expect(BLOCK).toContain('href: latest?.href || undefined');
    expect(RAIL).toContain('row.href');
  });

  it('레일 글자는 토큰 역할 스케일을 쓴다 (시안의 라틴 px 하드코딩 금지)', () => {
    expect(RAIL).toContain("koText('eyebrow'");
    expect(RAIL).toContain("koText('meta')");
    expect(RAIL).not.toMatch(/fontSize:\s*['"]?1[0-3]px/);
  });

  it('넓은 자간은 라틴 라벨에만 준다 (한글 음절이 흩어지지 않게)', () => {
    expect(RAIL).toContain("letterSpacing: '0.18em'");
    expect(RAIL).toContain('latin ?');
  });

  it('운영자가 레일을 켜고 내용을 넣을 수 있다 (두 편집기 모두)', () => {
    for (const key of ['railTitle', 'railLines', 'railPrayerSource', 'railPrayerItems', 'railLinks']) {
      expect(PAGE_EDITOR).toContain(`key: '${key}'`);
      expect(ELEMENT_REGISTRY).toContain(`key: '${key}'`);
    }
  });

  it('레일을 안 켠 기존 섹션은 전폭 그대로다 (기본 variant 가 카드 전폭)', () => {
    // variants[0] 이 새 섹션의 기본값이 된다(PageEditor addSection) — 레일이
    // 첫 자리에 오면 블록을 넣는 순간 레일이 켜진다.
    const lines = PAGE_EDITOR.split(/\r?\n/);
    const line = lines.find((l) => l.includes("type: 'latest_feed'"))!;
    expect(line).toMatch(/variants: \[\{ id: 'cards'/);
  });
});
