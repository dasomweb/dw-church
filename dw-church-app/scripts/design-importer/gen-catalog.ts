#!/usr/bin/env tsx
/**
 * Capabilities Catalog generator (P0) — the reference Claude Design composes
 * AGAINST, so it maps its design to our REAL block names / token roles /
 * content modules instead of guessing ("reproduce structurally").
 *
 * Adapted for True Light / DW Church from the b2bsmart design-importer playbook.
 * Single source → derived: the BLOCK list is generated from
 * `packages/blocks/src/registry.json` (the one place block metadata lives), so
 * adding a block auto-updates the catalog on the next run. Token roles + content
 * modules are curated constants below WITH source-file pointers (they change
 * rarely and span several files).
 *
 * Emits two files next to this script:
 *   - CLAUDE-DESIGN-CATALOG.json  (machine-readable)
 *   - CLAUDE-DESIGN-CATALOG.md    (paste into the Claude Design prep prompt)
 *
 * Run:  pnpm dlx tsx scripts/design-importer/gen-catalog.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY = join(HERE, '../../packages/blocks/src/registry.json');

export interface RegBlock {
  label?: string;
  group?: string;
  flags?: { isHidden?: boolean; isAlias?: boolean };
  aliasOf?: string;
  defaultProps?: Record<string, unknown>;
  description?: string;
  aiHint?: string;
  variants?: string[];
}
export interface Registry {
  version: number;
  groups: Record<string, string>;
  blocks: Record<string, RegBlock>;
}

// ── Token roles — packages/design-tokens/src/schema.ts (systemColorTokensSchema)
//    emitted as `--brand-{slot}` by to-css-vars.ts (+ WCAG `-fg` pairs). Blocks
//    read the legacy `--dw-*` bridge (project_theme_two_systems). 8 core slots +
//    two on-dark roles; extra colors are open-ended CUSTOMS. ─────────────────
const SYSTEM_TOKENS: Array<[string, string, string]> = [
  ['primary', '--brand-primary', 'Brand color — primary buttons, links, active states.'],
  ['secondary', '--brand-secondary', 'Deeper brand tone — footer / accent band (NOT a black dark-band; church tone stays light).'],
  ['accent', '--brand-accent', 'Eyebrows, small emphasis, secondary highlight (may equal primary).'],
  ['text', '--brand-text', 'Body / heading ink.'],
  ['muted', '--brand-muted', 'Secondary / caption text.'],
  ['background', '--brand-background', 'Page background (white / warm off-white).'],
  ['border', '--brand-border', 'Hairlines, card borders, dividers.'],
  ['surface', '--brand-surface', 'Alt band / card surface (subtle warm tint).'],
  ['onDark', '--brand-onDark', 'Text ON a photo/overlay hero (light ink). Used sparingly — see church tone note.'],
  ['onDarkMuted', '--brand-onDarkMuted', 'Muted text on a photo/overlay hero.'],
];
const TYPO_SCALES = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'caption', 'overline', 'label', 'button'];
const FONT_ROLES = ['heading', 'body', 'korean'];

// ── Content modules — apps/server/src/modules (data blocks fetch these live).
//    Church modules (not b2b blog/catalog/product).
//
//    손으로 유지하는 목록이다(모듈 하나가 여러 파일에 걸쳐 있어 자동 파생이 어렵다).
//    대신 **두 곳이 같은 목록을 쓴다** — 시안 카탈로그(이 파일)와 콘솔 임포트
//    매핑 프롬프트(`gen-design-import-catalog.ts` → design-import/catalog.ts).
//    그래서 export 한다; 사본을 하나 더 만들지 말 것.
//    엔드포인트는 각 모듈 routes.ts 의 공개 GET 경로를 보고 적었다. ──────────
export const MODULES: Array<[string, string, string]> = [
  ['sermons', 'sermons', '설교 — data blocks: recent_sermons, sermon_feature (+ sermon study fields → sermon_magazine).'],
  ['bulletins', 'bulletins', '주보(weekly bulletin, PDF cover) — data block: recent_bulletins.'],
  ['columns', 'columns_pastoral', '목회칼럼/묵상 — data block: recent_columns.'],
  ['albums', 'albums', '앨범/갤러리 — data block: album_gallery.'],
  ['events', 'events', '행사·소식 — data block: event_grid.'],
  ['staff', 'staff', '교역자/섬기는 이 — data block: staff_grid (opt-in).'],
  ['history', 'history', '교회 연혁 — data block: history_timeline.'],
  ['boards', 'boards / board_posts', '게시판/공지 — data block: board (boardSlug: notices/free/...).'],
  ['banners', 'banners', '메인 배너 슬라이더 — data block: banner_slider (category=main/sub). NOT auto-migrated.'],
  ['cells', 'cells', '목장/소그룹 — data block: cell_grid.'],
  ['schedules', 'schedules', '예배·모임 시간표 — data block: schedule_board (or static worship_schedule block).'],
  ['newcomers', 'newcomers', '새가족 — public FORM block: newcomer_form (+ static newcomer_info).'],
  ['forms', 'form_submissions', '일반 폼 — application_form_embed / form_split / contact_form.'],
  ['videos', 'videos / video_categories', '영상(찬양·예배실황·간증) — data block: video_board (category 로 필터).'],
  ['verses', 'verses', '오늘의 말씀 — data block: verse_of_day (GET /api/v1/verses/current).'],
  ['books', 'books', '이달의 책/추천도서 — data block: recent_books. **칼럼 카테고리로 우회하지 말 것.**'],
  ['sermon-notes', 'sermon_notes', '설교노트(양쪽 편집·나눔질문) — data blocks: recent_sermon_note, sermon_note_list.'],
  ['online-bulletins', 'online_bulletins', '온라인 주보(스크롤형 예배순서) — 문서 주보(bulletins)와 별개. data blocks: online_bulletin, online_bulletin_list.'],
  ['devotions', 'devotions', '묵상/큐티 — data blocks: devotion_reader, sermon_meditation.'],
  ['cardnews', 'cardnews', '카드뉴스 — data block: cardnews (carousel/grid/rail).'],
];

function trim(s: string | undefined, n = 200): string {
  if (!s) return '';
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > n ? one.slice(0, n - 1) + '…' : one;
}

export interface CatalogBlock {
  block_type: string; label: string; group: string;
  surface: 'palette' | 'importer' | 'alias'; aliasOf?: string;
  keyProps: string[]; variants: string[]; reproduces: string;
}
export interface Catalog {
  generatedAt: string;
  project: string;
  counts: { total: number; palette: number; importer: number; alias: number };
  tokens: {
    systemSlots: { role: string; cssVar: string; use: string }[];
    customsOpenEnded: boolean;
    autoPairedForegrounds: string;
    typographyScales: string[];
    fontRoles: string[];
  };
  modules: { name: string; table: string; use: string }[];
  themeEndpoint: string;
  groups: Record<string, string>;
  blocks: CatalogBlock[];
}

/**
 * 이 카탈로그가 다룰 **제품 범위**.
 *
 * registry.json 은 플랫폼 공용이라 b2bsmart 커머스 블록(`catalog_product_page`,
 * `pricing_table`, `lookbook_slider` …)까지 들어 있다. 범위를 주지 않으면 그 전부가
 * `palette` 로 나가고, Claude Design 은 **교회 운영자가 놓을 수도 없는 블록으로
 * 화면을 그린다** — 모자란 것보다 이게 더 나쁘다(그려온 시안을 버려야 하므로).
 */
export interface CatalogScope {
  /** 운영자가 블록 추가 목록에서 실제로 고를 수 있는 것 (PageEditor BLOCK_DEFS). */
  placeable: Set<string>;
  /** 이 제품에서 저장이 통과하는 것 (서버 zod enum). 그 밖은 다른 제품의 블록. */
  known: Set<string>;
}

/** Pure: registry → catalog object (unit-testable). */
export function buildCatalog(reg: Registry, scope?: CatalogScope): Catalog {
  const entries = Object.entries(reg.blocks).filter(([type]) => !scope || scope.known.has(type));
  const blocks: CatalogBlock[] = entries.map(([type, b]) => ({
    block_type: type,
    label: b.label ?? '',
    group: b.group ?? '',
    // 범위를 받았으면, 저장은 되지만 팔레트에 없는 블록은 `importer` 로 내린다 —
    // 마이그레이션 매핑 대상으로는 유효하지만 시안이 그걸로 그리면 안 된다.
    surface: b.flags?.isHidden
      ? 'importer'
      : b.flags?.isAlias
        ? 'alias'
        : scope && !scope.placeable.has(type)
          ? 'importer'
          : 'palette',
    aliasOf: b.aliasOf,
    keyProps: Object.keys(b.defaultProps ?? {}),
    variants: b.variants ?? [],
    reproduces: trim(b.aiHint || b.description),
  }));
  const palette = blocks.filter((b) => b.surface === 'palette').length;
  const importer = blocks.filter((b) => b.surface === 'importer').length;
  const alias = blocks.filter((b) => b.surface === 'alias').length;
  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    project: 'True Light / DW Church',
    counts: { total: blocks.length, palette, importer, alias },
    tokens: {
      systemSlots: SYSTEM_TOKENS.map(([role, cssVar, use]) => ({ role, cssVar, use })),
      customsOpenEnded: true,
      autoPairedForegrounds: '`--brand-{slot}-fg` are WCAG-AA auto-paired by contrast.ts — do not assign.',
      typographyScales: TYPO_SCALES,
      fontRoles: FONT_ROLES,
    },
    modules: MODULES.map(([name, table, use]) => ({ name, table, use })),
    themeEndpoint: 'PUT /api/v1/theme/tokens (themes/routes.ts) — apply the theme FIRST (STEP 1), before composing pages.',
    groups: reg.groups,
    blocks,
  };
}

/** Pure: catalog → the Markdown prompt attachment (unit-testable). */
/**
 * **구조 제약** — 블록 목록만으로는 막을 수 없는 오판을 막는다.
 *
 * 왜 필요한가: 카탈로그가 "어떤 블록이 있나"만 알려주면, 시안은 우리 시스템이
 * **그릴 수 없는 형태**를 자유롭게 그린다. 실제 사례(예닮 v7):
 *   - 340px 고정 사이드 레일을 `home_side_rail` 신규 블록으로 제안했다 → 우리
 *     페이지는 섹션의 1차원 스택이라 **독립 블록을 다른 블록 옆에 놓을 수단이 없다.**
 *   - '이달의 책'을 칼럼 카테고리로 보냈다 → `book` 모듈이 따로 있다.
 * 둘 다 블록 이름을 다 알려줘도 생기는 오판이라, 제약을 따로 적어 보낸다.
 */
const STRUCTURAL_CONSTRAINTS = `
## 우리 시스템이 그릴 수 없는 것 (설계 전에 읽을 것)

블록 목록을 다 알아도 아래를 어기면 시안을 버려야 한다. 각 항목에 **이유**를 달았으니
비슷한 경우에 적용하라.

1. **페이지는 섹션의 1차원 수직 스택이다.** 섹션과 섹션 사이에 2칼럼·사이드바를 만들 수
   없다. 2칼럼 레이아웃은 **블록 하나의 내부**에서만 가능하다.
   - 사이드 레일이 필요하면 **신규 블록이 아니라 옆 블록의 variant** 로 그려라.
     실제 예: 통합 피드 \`latest_feed\` 의 \`rail-left\` / \`rail-right\`.
   - 레이아웃 컨테이너(\`layout_row\`·\`layout_columns\`·\`layout_section\`)에 자식 블록을
     넣는 구성은 **운영자가 편집할 수 없으므로** 시안에서 쓰지 않는다.
2. **헤더·푸터는 테마가 소유한다.** 페이지 블록으로 그리지 말고 \`dc-import\` 로 분리하라.
   선택할 수 있는 것은 variant(헤더 12종·푸터 9종)뿐이다.
3. **콘텐츠 폭은 전 블록 공통이다** — \`max-w-7xl\` + \`px-4 sm:px-6\`. 섹션마다 다른 폭을
   쓰면 홈이 들쑥날쑥해진다.
4. **개별 글을 지어내지 않는다.** 설교 한 편·칼럼 한 편·앨범 한 장은 Content Module 의
   데이터다. 데이터 블록 자리만 두면 교회가 글을 올리는 만큼 채워지고, **글이 없으면
   블록이 스스로 숨는다**(빈 섹션이 생기지 않는다).
5. **같은 모듈을 연재별로 나눌 때 새 블록을 만들지 않는다.** 소스 문법
   \`키[@카테고리][:라벨]\` 로 한 블록에 여러 줄을 담는다
   (예: \`column@교회이야기, column@시니어:시니어 라운지\`). 칼럼 카테고리는 **한글 자유
   텍스트**이므로 영문 슬러그를 새로 만들지 말 것.
6. **이미 모듈이 있는 콘텐츠를 다른 모듈로 우회하지 않는다.** 아래 "Content modules" 표를
   먼저 보라 (예: '이달의 책'은 \`book\` 모듈이 있다 — 칼럼 카테고리로 만들지 말 것).
7. **variant 는 블록이 선언한 것만 쓴다.** 표의 variants 열에 없는 variant 를 쓰면 기본
   모양이 나오고, 시안과 달라진다. 모양이 꼭 필요하면 \`NEEDS_VARIANT: <무엇>\` 으로 적어라.
8. **상세 화면은 매핑하지 않는다.** 설교 한 편·게시글·앨범 상세는 모듈의 상세 라우트가
   자동으로 그린다. 시안에 그릴 필요가 없다.
9. **한글 조판**: 본문을 13px 아래로 내리지 말고, 넓은 자간(letter-spacing .1em 이상)은
   라틴 대문자 라벨에만 쓴다 — 한글에 주면 음절이 흩어진다.
`;

export function renderCatalogMd(catalog: Catalog): string {
  const { blocks } = catalog;
  const palette = catalog.counts.palette;
  const importer = catalog.counts.importer;
  const alias = catalog.counts.alias;
  const md: string[] = [];
  md.push('# True Light / DW Church — Capabilities Catalog (for Claude Design import)');
  md.push('');
  md.push(`> Auto-generated ${catalog.generatedAt} by \`scripts/design-importer/gen-catalog.ts\` from`);
  md.push('> `packages/blocks/src/registry.json`. **Do not hand-edit.** Map every section of your');
  md.push('> design to a `block_type` + a `variant` below; assign colors to the TOKEN ROLES (not free');
  md.push('> hex); tag anything with no match as `NEEDS_BLOCK: <what>` so it goes to the dev queue.');
  md.push('');
  md.push('> **교회 톤 (필수):** 밝고 따뜻한 배경. **검정/다크 배경 밴드 금지** — onDark 역할은 사진');
  md.push('> 위 히어로 오버레이 같은 곳에만 최소로. 콘텐츠는 한국어 우선.');
  md.push('');
  md.push(`**Blocks:** ${blocks.length} total — **${palette} palette** + ${importer} importer + ${alias} alias.`);
  md.push('');
  md.push('> **화면을 그릴 때 쓸 수 있는 것은 `palette` ' + palette + '개뿐이다.**');
  md.push('> `alias` 는 레거시 이름이라 정식 이름을 써야 하고, `importer` 는 낡은 사이트를 옮겨올 때의');
  md.push('> 매핑 대상이거나 레이아웃 컨테이너여서 시안이 직접 쓰지 않는다. 아래 표의 surface 열을 보라.');
  md.push('');
  md.push(STRUCTURAL_CONSTRAINTS.trim());
  md.push('');
  md.push('## Token roles (assign your palette to these)');
  md.push('');
  md.push('System color slots — fill hex, roles are fixed (emitted as the CSS var; blocks read the legacy `--dw-*` bridge):');
  md.push('');
  md.push('| role | CSS var | use |');
  md.push('|------|---------|-----|');
  for (const [r, v, u] of SYSTEM_TOKENS) md.push(`| \`${r}\` | \`${v}\` | ${u} |`);
  md.push('');
  md.push('- **`--brand-{slot}-fg`** foregrounds are WCAG-AA **auto-paired** (contrast.ts) — you do NOT assign them.');
  md.push('- **Customs are open-ended** — any extra color (e.g. category badge tones) is a named custom token OR supplied per-block in props; it never needs a system slot and is never hardcoded in block code.');
  md.push(`- **Typography scales (${TYPO_SCALES.length}):** ${TYPO_SCALES.map((s) => '`' + s + '`').join(', ')} — each with size / weight / lineHeight / letterSpacing (+ optional transform) per breakpoint (desktop/tablet/mobile).`);
  md.push(`- **Font roles:** ${FONT_ROLES.map((f) => '`' + f + '`').join(', ')} (Pretendard supported for Korean).`);
  md.push('- **Radius:** `sm` / `md` / `lg` / `full`. **Section rhythm:** `--brand-section-py` (sm/md/lg via spacing). Express the design in these, not fixed px.');
  md.push('- **Apply the theme FIRST:** the styleguide → tenant theme via `PUT /api/v1/theme` (STEP 1) before any page, so every block is correct on first render.');
  md.push('');
  md.push('## Content modules (dynamic data → data blocks)');
  md.push('');
  md.push('> The migration/importer places a data-block SHELL; the actual rows are imported per-module (each admin page\'s 📥 URL에서 가져오기). Empty module → the block renders nothing.');
  md.push('');
  md.push('| module | table | use |');
  md.push('|--------|-------|-----|');
  for (const [n, t, u] of MODULES) md.push(`| \`${n}\` | \`${t}\` | ${u} |`);
  md.push('');
  md.push('## Blocks (map your sections to these)');
  md.push('');
  const byGroup = new Map<string, typeof blocks>();
  for (const b of blocks) {
    const g = b.group || 'other';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(b);
  }
  const emitGroup = (label: string, g: string, list: typeof blocks) => {
    md.push(`### ${label} (\`${g}\`)`);
    md.push('');
    md.push('| block_type | label | surface | variants | key props | reproduces |');
    md.push('|------------|-------|---------|----------|-----------|------------|');
    for (const b of list) {
      md.push(`| \`${b.block_type}\` | ${b.label} | ${b.surface} | ${b.variants.map((v) => '`' + v + '`').join(' ') || '—'} | ${b.keyProps.slice(0, 8).map((p) => '`' + p + '`').join(' ') || '—'} | ${b.reproduces} |`);
    }
    md.push('');
  };
  for (const [g, label] of Object.entries(catalog.groups)) {
    const list = byGroup.get(g);
    if (list && list.length) emitGroup(label, g, list);
  }
  for (const [g, list] of byGroup) {
    if (catalog.groups[g]) continue;
    emitGroup(g, g, list);
  }
  return md.join('\n');
}

const PAGE_EDITOR = join(HERE, '../../packages/admin-app/src/pages/PageEditor.tsx');
const PAGES_SCHEMA = join(HERE, '../../apps/server/src/modules/pages/schema.ts');

/**
 * 제품 범위를 **코드에서** 읽는다 — 목록을 여기에 손으로 적으면 또 낡는다.
 * (드리프트는 apps/server/src/__tests__/modules/block-registry-drift.test.ts 가 막는다.)
 */
function readScope(): CatalogScope {
  const pe = readFileSync(PAGE_EDITOR, 'utf8');
  const placeable = [...pe.matchAll(/^\s*\{ type: '([a-z_0-9]+)'/gm)].map((m) => m[1]!);

  const sch = readFileSync(PAGES_SCHEMA, 'utf8');
  const start = sch.indexOf('export const blockTypes = [');
  const known = [...sch.slice(start, sch.indexOf('];', start)).matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]!);

  if (placeable.length < 60 || known.length < 60) {
    throw new Error(`범위 파싱 실패 (placeable ${placeable.length}, known ${known.length}) — 소스 형태가 바뀐 것 같습니다.`);
  }
  return { placeable: new Set(placeable), known: new Set(known) };
}

function main(): void {
  const reg = JSON.parse(readFileSync(REGISTRY, 'utf8')) as Registry;
  const catalog = buildCatalog(reg, readScope());
  writeFileSync(join(HERE, 'CLAUDE-DESIGN-CATALOG.json'), JSON.stringify(catalog, null, 2) + '\n');
  writeFileSync(join(HERE, 'CLAUDE-DESIGN-CATALOG.md'), renderCatalogMd(catalog));
  const { total, palette, importer, alias } = catalog.counts;
  console.log(`✓ catalog generated — ${total} blocks (${palette} palette + ${importer} importer + ${alias} alias)`);
  console.log('  → scripts/design-importer/CLAUDE-DESIGN-CATALOG.json');
  console.log('  → scripts/design-importer/CLAUDE-DESIGN-CATALOG.md');
}

// Run as a script (tsx), but not when imported by a test.
import { argv } from 'node:process';
if (argv[1] && argv[1].replace(/\\/g, '/').endsWith('gen-catalog.ts')) main();
