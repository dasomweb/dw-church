#!/usr/bin/env node
/**
 * `apps/server/src/modules/design-import/catalog.ts` 생성기.
 *
 * ## 왜 이 생성기가 생겼나
 *
 * 저 파일은 머리말에 "Auto-derived … Regenerate if blocks change" 라고 적혀 있었지만
 * **생성기가 없어서 손으로 유지돼 왔다** — 블록 목록 사본 다섯 번째였고, 2026-11-08
 * 측정 당시 **배치 가능한 81개 중 39개가 빠지고, 배치할 수 없는 38개가 들어** 있었다.
 *
 * 이 파일이 밀리면 **조용히** 깨진다. `map.ts` 가 같은 목록을 두 번 쓰기 때문이다.
 *   - 프롬프트 선택지(`CATALOG_STR`) — LLM 이 고를 수 있는 블록
 *   - 출력 검증 집합(`VALID_BLOCKS`) — LLM 출력 통과 여부
 * 그래서 LLM 이 운 좋게 `latest_feed` 를 골라도 **유효하지 않은 블록으로 걸러졌다.**
 * 반대로 `catalog_product_page`(b2bsmart 커머스)처럼 교회 운영자가 놓을 수도 없는
 * 블록을 "쓸 수 있다" 고 약속했다.
 *
 * ## 범위 — 배치 가능한 것만
 *
 * 임포트 결과는 **운영자가 페이지 편집기에서 손볼 수 있어야** 쓸모가 있다. 그래서
 * 범위 = `PageEditor` BLOCK_DEFS (= 운영자가 고를 수 있는 것). 서버 enum 에만 있는
 * 블록(저장은 되지만 팔레트에 없는 것)은 **넣지 않는다** — 임포트가 그걸 심으면
 * 운영자가 그 섹션을 편집할 수 없다.
 *
 * ## 역산으로 확인한 것 (2026-11-08)
 *
 * 기존 `catalog.ts` 의 80개 항목이 전부 registry 에서 파생된 값과 **정확히 일치**했다
 * (`d = (aiHint||description) 공백정리 후 160자 컷`, `p = defaultProps 키`,
 * `g = group`). 즉 그 파일에 손으로 쓴 내용은 없었고, 생성으로 100% 대체된다.
 *
 * 실행:  node scripts/design-importer/gen-design-import-catalog.ts   (dw-church-app 에서)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { argv } from 'node:process';
import { MODULES } from './gen-catalog.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '../..'); // scripts/design-importer → dw-church-app

const REGISTRY = join(APP, 'packages/blocks/src/registry.json');
const PAGE_EDITOR = join(APP, 'packages/admin-app/src/pages/PageEditor.tsx');
const PAGES_SCHEMA = join(APP, 'apps/server/src/modules/pages/schema.ts');
const BLOCK_RENDERER = join(APP, 'packages/blocks/src/utilities/BlockRenderer.tsx');
const WEB_BLOCKS = join(APP, 'apps/web/components/blocks');
const OUT = join(APP, 'apps/server/src/modules/design-import/catalog.ts');

/** `d` 설명 길이 — 기존 파일에서 역산한 값(80/80 일치). 프롬프트 토큰 예산이다. */
const DESC_LIMIT = 160;

interface RegBlock {
  group?: string;
  flags?: { isAlias?: boolean; isHidden?: boolean };
  aliasOf?: string;
  defaultProps?: Record<string, unknown>;
  description?: string;
  aiHint?: string;
}
interface Registry { blocks: Record<string, RegBlock> }

export interface CatalogBlock { t: string; g: string; p: string[]; d: string }

function desc(b: RegBlock): string {
  const one = (b.aiHint || b.description || '').replace(/\s+/g, ' ').trim();
  return one.length > DESC_LIMIT ? one.slice(0, DESC_LIMIT) : one;
}

/** 운영자가 블록 추가 목록에서 실제로 고를 수 있는 것. */
export function readPlaceable(src: string): string[] {
  const found = [...src.matchAll(/^\s*\{ type: '([a-z_0-9]+)'/gm)].map((m) => m[1]!);
  if (found.length < 60) throw new Error(`BLOCK_DEFS 파싱 실패 (${found.length}개) — PageEditor.tsx 형태가 바뀐 듯합니다.`);
  return [...new Set(found)];
}

/** 저장(zod enum)이 통과하는 것. */
export function readKnown(src: string): string[] {
  const start = src.indexOf('export const blockTypes = [');
  const slice = src.slice(start, src.indexOf('];', start));
  const found = [...slice.matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]!);
  if (found.length < 60) throw new Error(`blockTypes 파싱 실패 (${found.length}개) — pages/schema.ts 형태가 바뀐 듯합니다.`);
  return [...new Set(found)];
}

/**
 * 같은 블록의 **놓을 수 없는 이름 → 놓을 수 있는 이름**.
 *
 * registry 의 별칭 관계(`aliasOf`)에서 파생한다. 한쪽만 BLOCK_DEFS 에 있는 쌍이
 * 문제다 — 예: 정식 이름 `cta_section` 은 운영자 팔레트에 없고 별칭
 * `call_to_action` 만 있다. LLM 이 `cta_section` 을 뱉으면 **운영자가 편집할 수 없는
 * 섹션**이 심기므로, 놓을 수 있는 이름으로 정규화한다.
 * 양쪽 다 놓을 수 있으면(`map_embed`/`location_map`) 건드리지 않는다 — 둘 다 유효하다.
 */
export function buildAliases(reg: Registry, placeable: Set<string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [type, b] of Object.entries(reg.blocks)) {
    const target = b.aliasOf;
    if (!target || !reg.blocks[target]) continue;
    if (placeable.has(type) && !placeable.has(target)) out[target] = type;
    else if (!placeable.has(type) && placeable.has(target)) out[type] = target;
  }
  return out;
}

/**
 * **테마 타이포를 따르지 않는 블록 측정.**
 *
 * 2026-09-12 감사가 이 블록들을 `BLOCK_REPLACE` 로 **다른 블록으로 강제 치환**했다.
 * 재감사(2026-11-08) 결과 그 치환은 틀린 처방이었다:
 *   - `schedule_board`(Data Block, /api/v1/schedules) → `worship_schedule`(Static,
 *     items 직접 입력)로 바꾸면 **데이터 출처가 사라져 빈 블록이 된다.** 게다가
 *     schedule_board 는 고정 px 가 0 이라 애초에 혐의가 없었다.
 *   - `steps_list`·`info_columns`·`logo_bar` 도 고정 px 가 0~1 개뿐이다.
 *   - 치환은 **시안 구조를 버린다** — 임포트의 목적 자체와 충돌한다.
 * 그래서 치환하지 않고, 측정값을 **경고로 올린다**(운영자가 보고 판단). 블록을
 * 고치면 경고는 자동으로 사라진다 — 손으로 유지하는 목록이 아니기 때문이다.
 */
export function measureHardcodedType(source: string): number {
  const pats = [
    /text-\[\d+(?:\.\d+)?(?:px|rem)\]/g,              // Tailwind 임의 크기
    /\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b/g,         // Tailwind 명명 크기
    /fontSize:\s*['"]?\d/g,                            // 인라인 숫자 리터럴 (var() 제외)
  ];
  return pats.reduce((n, p) => n + (source.match(p)?.length ?? 0), 0);
}

/** block_type → 컴포넌트 소스 경로. BlockRenderer 의 import + 매핑을 읽는다. */
export function resolveComponentFiles(renderer: string): Map<string, string> {
  const imports = new Map<string, string>();
  for (const m of renderer.matchAll(/import\s*\{\s*([A-Za-z0-9_]+)\s*\}\s*from\s*'([^']+)'/g)) {
    imports.set(m[1]!, m[2]!);
  }
  const out = new Map<string, string>();
  for (const m of renderer.matchAll(/^\s{2}([a-z_0-9]+):\s*([A-Za-z0-9_]+),/gm)) {
    const [, type, comp] = m as unknown as [string, string, string];
    const rel = imports.get(comp);
    const candidates = [
      rel ? join(dirname(BLOCK_RENDERER), rel + '.tsx') : '',
      join(WEB_BLOCKS, comp + '.tsx'),
    ].filter(Boolean);
    const hit = candidates.find((p) => existsSync(p));
    if (hit) out.set(type, hit);
  }
  return out;
}

function main(): void {
  const reg = JSON.parse(readFileSync(REGISTRY, 'utf8')) as Registry;
  const placeableList = readPlaceable(readFileSync(PAGE_EDITOR, 'utf8'));
  const known = new Set(readKnown(readFileSync(PAGES_SCHEMA, 'utf8')));
  const placeable = new Set(placeableList);

  const unregistered = placeableList.filter((t) => !reg.blocks[t]);
  if (unregistered.length) {
    throw new Error(
      `registry.json 에 없는 블록 ${unregistered.length}개: ${unregistered.join(', ')}\n`
      + '먼저 실행: node scripts/design-importer/gen-registry-entries.ts',
    );
  }
  const unsavable = placeableList.filter((t) => !known.has(t));
  if (unsavable.length) {
    throw new Error(`서버 enum 에 없어 저장이 400 나는 블록: ${unsavable.join(', ')}`);
  }

  // registry 키 순서를 유지한다 — 생성 결과가 실행마다 흔들리지 않게.
  const blocks: CatalogBlock[] = Object.entries(reg.blocks)
    .filter(([t]) => placeable.has(t))
    .map(([t, b]) => ({ t, g: b.group ?? '', p: Object.keys(b.defaultProps ?? {}), d: desc(b) }));

  const aliases = buildAliases(reg, placeable);

  const files = resolveComponentFiles(readFileSync(BLOCK_RENDERER, 'utf8'));
  const typeWarn: Record<string, number> = {};
  for (const t of [...placeable].sort()) {
    const f = files.get(t);
    if (!f) continue;
    const n = measureHardcodedType(readFileSync(f, 'utf8'));
    if (n > 0) typeWarn[t] = n;
  }

  const j = (v: unknown) => JSON.stringify(v);
  const out = `/**
 * 콘솔 임포트(LLM 매핑)가 쓰는 블록 카탈로그.
 *
 * **생성 파일 — 손으로 고치지 말 것.**
 * 재생성: node scripts/design-importer/gen-design-import-catalog.ts   (dw-church-app 에서)
 * 생성기: scripts/design-importer/gen-design-import-catalog.ts (왜 생성하는지도 거기 적혀 있다)
 * 가드:   apps/server/src/__tests__/modules/block-registry-drift.test.ts
 *
 * 범위 = 운영자가 페이지 편집기에서 **실제로 놓을 수 있는 블록**(PageEditor BLOCK_DEFS)
 * ${blocks.length}개. 서버 enum 에만 있는 블록은 임포트가 심어도 운영자가 편집할 수
 * 없으므로 넣지 않는다.
 *
 * t=block_type  g=group  p=keyProps  d=use(${DESC_LIMIT}자 컷)
 */
export interface CatalogBlock { t: string; g: string; p: string[]; d: string }

export const CATALOG_BLOCKS: CatalogBlock[] = [
${blocks.map((b) => '  ' + j(b) + ',').join('\n')}
];

/**
 * 같은 블록의 **놓을 수 없는 이름 → 놓을 수 있는 이름** (registry aliasOf 파생).
 * 예: 정식 이름 \`cta_section\` 은 운영자 팔레트에 없고 별칭 \`call_to_action\` 만 있다.
 * LLM 이 정식 이름을 뱉어도 운영자가 편집할 수 있는 이름으로 정규화한다.
 */
export const BLOCK_ALIASES: Record<string, string> = ${j(aliases)};

/**
 * 테마 타이포를 따르지 않는(고정 px / Tailwind 크기 선언) 블록 → 선언 개수.
 *
 * **치환하지 않는다.** 2026-09-12 감사는 이 블록들을 다른 블록으로 강제 치환했는데,
 * 그건 시안 구조를 버리고 \`schedule_board\`(Data Block) 의 데이터 출처까지 없앴다.
 * 지금은 임포트 미리보기에 **경고로 올려** 운영자가 판단하게 한다. 블록의 타이포를
 * 고치면 이 목록에서 자동으로 빠진다.
 */
export const TYPOGRAPHY_WARN: Record<string, number> = ${j(typeWarn)};

/** 콘텐츠 모듈 — 데이터 블록이 여기서 데이터를 읽는다. 원본: scripts/design-importer/gen-catalog.ts */
export const CONTENT_MODULES = [
${MODULES.map(([name, table, use]) => '  ' + j({ name, table, use }) + ',').join('\n')}
];
`;
  writeFileSync(OUT, out);

  const byGroup = new Map<string, number>();
  for (const b of blocks) byGroup.set(b.g, (byGroup.get(b.g) ?? 0) + 1);
  console.log(`✓ design-import 카탈로그 생성 — 블록 ${blocks.length}개 (배치 가능한 것만)`);
  console.log(`  그룹: ${[...byGroup].map(([g, n]) => `${g} ${n}`).join(', ')}`);
  console.log(`  별칭 정규화 ${Object.keys(aliases).length}건: ${Object.entries(aliases).map(([a, b]) => `${a}→${b}`).join(', ') || '없음'}`);
  console.log(`  타이포 경고 ${Object.keys(typeWarn).length}개: ${Object.entries(typeWarn).map(([t, n]) => `${t}(${n})`).join(', ') || '없음'}`);
  console.log(`  콘텐츠 모듈 ${MODULES.length}개`);
  console.log('  → apps/server/src/modules/design-import/catalog.ts');
}

if (argv[1] && argv[1].replace(/\\/g, '/').endsWith('gen-design-import-catalog.ts')) main();
