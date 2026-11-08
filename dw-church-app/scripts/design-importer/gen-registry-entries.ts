/**
 * registry.json 을 **코드에서 채운다** — 손으로 맞추지 않는다.
 *
 * 왜 필요한가: `registry.ts` 주석은 registry.json 을 블록 메타데이터의 SoT 로
 * 선언하지만, 블록을 새로 만들 때 개발자가 실제로 손대는 곳은
 * `PageEditor.tsx` 의 `BLOCK_DEFS`(운영자 블록 추가 목록) + 서버 zod enum 이다.
 * 그 둘만 등록하면 운영자는 블록을 쓸 수 있으므로 registry.json 은 **고장 신호
 * 없이** 뒤처진다. 실제로 2개월 동안 24개가 밀렸고, 그 사이
 *   - AI 빌더(`dw_church_adapter/block_registry.py`,`copywriter/block_catalog.py`)가
 *     그 블록들을 아예 몰랐고,
 *   - Claude Design 카탈로그(gen-catalog.ts 가 registry.json 에서 생성)에서도 빠져
 *     시안이 없는 블록을 지어냈다(`home_side_rail`).
 *
 * 그래서 BLOCK_DEFS 를 소스로 삼아 **빠진 엔트리만 추가**한다. 이미 있는 엔트리는
 * 손대지 않는다 — `tags`/`useCases`/`aiHint` 는 사람이 다듬은 값이고, 기계가
 * 덮어쓰면 그 품질이 사라진다.
 *
 * Run (dw-church-app 에서):  node scripts/design-importer/gen-registry-entries.ts
 *       (--check 를 붙이면 쓰지 않고 빠진 목록만 보고한다)
 *       Node 24 가 .ts 를 그대로 실행한다 — tsx 를 깔 필요 없다.
 *
 * 드리프트는 `apps/server/src/__tests__/modules/block-registry-drift.test.ts` 가 막는다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv } from 'node:process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const REGISTRY = join(ROOT, 'packages/blocks/src/registry.json');
const PAGE_EDITOR = join(ROOT, 'packages/admin-app/src/pages/PageEditor.tsx');

/** BLOCK_DEFS 한 줄의 모양 (필요한 필드만). */
interface BlockDef {
  type: string;
  label: string;
  category: string;
  nature?: string;
  description?: string;
  variants?: { id: string; label: string }[];
  defaultProps?: Record<string, unknown>;
}

interface RegistryEntry {
  label: string;
  group: string;
  flags: Record<string, boolean>;
  defaultProps: Record<string, unknown>;
  description?: string;
  tags?: string[];
  aiHint?: string;
  variants?: string[];
}

interface Registry {
  version: number;
  groups: Record<string, string>;
  blocks: Record<string, RegistryEntry>;
}

/**
 * BLOCK_DEFS 를 읽는다.
 *
 * PageEditor.tsx 를 import 하지 않고 **한 줄씩 평가**한다 — 그 파일은 React
 * 컴포넌트라 import 하면 DOM·CSS·하위 컴포넌트까지 끌려온다. BLOCK_DEFS 는
 * 한 줄에 객체 하나씩이고 값이 전부 리터럴이라(식별자 참조 0건, 검증됨) 이
 * 방식이 안전하고 의존성이 없다. 형태가 바뀌어 파싱이 깨지면 개수가 떨어지므로
 * 아래 sanity 검사에서 잡힌다.
 */
function readBlockDefs(): BlockDef[] {
  const src = readFileSync(PAGE_EDITOR, 'utf8');
  const defs: BlockDef[] = [];
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (!/^\{ type: '[a-z_0-9]+'/.test(line)) continue;
    defs.push(new Function('return ' + line.replace(/,\s*$/, ''))() as BlockDef);
  }
  if (defs.length < 60) {
    throw new Error(`BLOCK_DEFS 파싱이 ${defs.length}개만 읽었습니다 — 파일 형태가 바뀐 것 같습니다. 파서를 고치세요.`);
  }
  return defs;
}

/**
 * 관리자 카테고리(한글) → registry group.
 *
 * group 은 AI 빌더와 카탈로그가 블록을 분류하는 축이다. 카테고리로 먼저 가르고,
 * 남는 것은 `nature` 로 가른다 — 모듈 데이터를 fetch 하는 블록은 'data' 여야
 * 시안·AI 가 "여기에 콘텐츠가 자동으로 들어온다"는 것을 안다.
 */
function groupFor(def: BlockDef): string {
  switch (def.category) {
    case '히어로': return 'hero';
    case '레이아웃': return 'layout';
    case 'CTA': return 'conversion';
    case '폼/신청서': return 'conversion';
    default: return def.nature === 'dynamic' ? 'data' : 'content';
  }
}

/** 검색용 태그 — 타입 토큰 + 카테고리 + variant 이름. 지어내지 않고 가진 것만 쓴다. */
function tagsFor(def: BlockDef): string[] {
  const fromType = def.type.split('_').filter((t) => t.length > 1);
  const fromVariants = (def.variants ?? []).map((v) => v.id);
  return [...new Set([...fromType, def.category, ...fromVariants])];
}

function entryFor(def: BlockDef): RegistryEntry {
  const group = groupFor(def);
  const entry: RegistryEntry = {
    label: def.label,
    group,
    // BLOCK_DEFS 에 있는 블록은 운영자가 실제로 놓을 수 있는 것이므로
    // isHidden/isAlias 를 달지 않는다 — 달면 팔레트·카탈로그에서 사라진다.
    flags: {
      ...(group === 'data' ? { isDataBlock: true } : {}),
      ...(group === 'layout' ? { isLayoutBlock: true } : {}),
    },
    defaultProps: def.defaultProps ?? {},
  };
  if (def.description) {
    entry.description = def.description;
    // aiHint 는 LLM 프롬프트에 들어가는 한 줄 설명이다. 영문으로 새로 지어내면
    // 블록의 실제 동작과 어긋날 수 있으니 관리자 설명을 그대로 쓴다(한국어 프롬프트).
    entry.aiHint = def.description;
  }
  entry.tags = tagsFor(def);
  if (def.variants?.length) entry.variants = def.variants.map((v) => v.id);
  // useCases 는 일부러 비워 둔다 — 사람이 다듬는 자리다(기계가 채우면 그럴듯한
  // 거짓이 된다). 비어 있어도 registry 테스트는 통과한다.
  return entry;
}

function main(): void {
  const check = argv.includes('--check');
  const reg = JSON.parse(readFileSync(REGISTRY, 'utf8')) as Registry;
  const defs = readBlockDefs();

  const missing = defs.filter((d) => !reg.blocks[d.type]);

  /**
   * 이미 있는 엔트리의 `variants` 도 맞춘다.
   *
   * variants 는 Claude Design 카탈로그의 variants 열이 되고, 그 열이 비어 있으면
   * 시안이 **있는 변형을 모르고 새 블록을 요구한다**(예닮 v7 이 `banner_slider`
   * editorial 변형을 "신규 스킨" 으로 적은 것). 운영자가 고를 수 있는 변형의
   * 진짜 목록은 BLOCK_DEFS 이므로 거기서 덮는다 — 산문(description/useCases)은
   * 사람이 다듬은 것이라 건드리지 않는다.
   */
  const variantUpdates = defs.filter((d) => {
    const cur = reg.blocks[d.type];
    if (!cur) return false;
    const want = (d.variants ?? []).map((v) => v.id);
    return JSON.stringify(cur.variants ?? []) !== JSON.stringify(want);
  });

  console.log(`BLOCK_DEFS ${defs.length}개 · registry.json ${Object.keys(reg.blocks).length}개`);
  console.log(`  빠진 엔트리 ${missing.length}개 · variants 어긋남 ${variantUpdates.length}개`);
  if (missing.length === 0 && variantUpdates.length === 0) {
    console.log('✓ 어긋남 없음');
    return;
  }
  for (const d of missing) {
    console.log(`  + ${d.type.padEnd(24)} ${groupFor(d).padEnd(11)} ${d.label}`);
  }
  for (const d of variantUpdates) {
    const before = reg.blocks[d.type]!.variants ?? [];
    const after = (d.variants ?? []).map((v) => v.id);
    console.log(`  ~ ${d.type.padEnd(24)} variants [${before.join(',')}] → [${after.join(',')}]`);
  }
  if (check) {
    console.log('\n--check 모드 — 쓰지 않았습니다.');
    process.exitCode = 1;
    return;
  }

  // 키 순서를 타입 이름으로 정렬해 두면 다음 생성 때 diff 가 읽힌다.
  const merged: Record<string, RegistryEntry> = { ...reg.blocks };
  for (const d of missing) merged[d.type] = entryFor(d);
  for (const d of variantUpdates) {
    const want = (d.variants ?? []).map((v) => v.id);
    const entry = { ...merged[d.type]! };
    if (want.length) entry.variants = want;
    else delete entry.variants;
    merged[d.type] = entry;
  }
  const sorted: Record<string, RegistryEntry> = {};
  for (const k of Object.keys(merged).sort()) sorted[k] = merged[k]!;

  writeFileSync(REGISTRY, JSON.stringify({ ...reg, blocks: sorted }, null, 2) + '\n');
  console.log(`\n✓ registry.json — 추가 ${missing.length}개 · variants 갱신 ${variantUpdates.length}개 · 총 ${Object.keys(sorted).length}개`);
  console.log('  다음: gen-catalog.ts 로 Claude Design 카탈로그 재생성');
}

if (argv[1] && argv[1].replace(/\\/g, '/').endsWith('gen-registry-entries.ts')) main();
