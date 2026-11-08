import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { blockTypes } from '../../modules/pages/schema.js';

/**
 * 블록 목록 **드리프트 가드**.
 *
 * "어떤 블록이 있나" 의 사본이 넷인데 서로 어긋나 있었다 — 그리고 어긋나도
 * 화면은 멀쩡해서 아무도 몰랐다. 블록을 만들 때 개발자는 BLOCK_DEFS + 서버 enum
 * 에만 등록하면 운영자가 쓸 수 있으므로, registry.json 은 **고장 신호 없이**
 * 뒤처진다. 실제로 2개월 동안 24개가 밀렸다.
 *
 * 밀리면 무엇이 깨지나 (전부 조용히 깨진다):
 *   - AI 빌더(`dw_church_adapter/block_registry.py`, `copywriter/block_catalog.py`)
 *     가 그 블록을 **아예 모른다** → 페이지를 생성할 때 쓰지 않는다.
 *   - Claude Design 카탈로그(`gen-catalog.ts` 가 registry.json 에서 생성)에 빠진다
 *     → 시안이 없는 블록을 지어내고(`home_side_rail`), 매핑이 추론으로 떨어진다.
 *     실제로 운영자가 놓을 수 있는 81개 중 39개만 카탈로그에 있었다.
 *
 * 그래서 사본을 **손으로 맞추지 말고 여기서 막는다.**
 *   SoT = BLOCK_DEFS(운영자가 놓을 수 있는 것) + 서버 enum(저장이 통과하는 것).
 *   registry.json 은 그 둘을 모두 담아야 하고, Claude Design 카탈로그는
 *   **운영자가 실제로 놓을 수 있는 것만** palette 로 약속해야 한다.
 */
const ROOT = join(process.cwd(), '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf-8');

const REGISTRY_PATH = 'packages/blocks/src/registry.json';
const CATALOG_PATH = 'scripts/design-importer/CLAUDE-DESIGN-CATALOG.json';
const GEN_REGISTRY = 'node scripts/design-importer/gen-registry-entries.ts   (dw-church-app 에서)';
const GEN_CATALOG = 'node scripts/design-importer/gen-catalog.ts   (dw-church-app 에서)';
const GEN_MODULE = 'node scripts/design-importer/gen-dw-module.ts   (dw-church-app 에서)';

/** PageEditor BLOCK_DEFS = 운영자가 블록 추가 목록에서 실제로 고를 수 있는 것. */
function placeableTypes(): string[] {
  const src = read('packages/admin-app/src/pages/PageEditor.tsx');
  const found = [...src.matchAll(/^\s*\{ type: '([a-z_0-9]+)'/gm)].map((m) => m[1]!);
  // 파싱이 깨져 0개가 되면 모든 검사가 공허하게 통과한다 — 그걸 막는다.
  expect(found.length, 'BLOCK_DEFS 파싱 실패 — PageEditor.tsx 형태가 바뀐 것 같습니다').toBeGreaterThan(60);
  return [...new Set(found)];
}

interface RegistryFile {
  blocks: Record<string, { label?: string; group?: string; flags?: Record<string, boolean> }>;
}

const registry = JSON.parse(read(REGISTRY_PATH)) as RegistryFile;
const registryTypes = Object.keys(registry.blocks);
const placeable = placeableTypes();
const enumTypes = [...new Set(blockTypes as readonly string[])];

describe('블록 목록 드리프트 — 사본이 서로 어긋나지 않는다', () => {
  it('운영자가 놓을 수 있는 블록은 전부 registry.json 에 있다 (AI 빌더·시안 카탈로그가 보는 목록)', () => {
    const missing = placeable.filter((t) => !registryTypes.includes(t)).sort();
    expect(
      missing,
      `registry.json 에 없는 블록 ${missing.length}개 — AI 빌더와 Claude Design 이 이 블록들을 모릅니다.\n`
        + `채우려면: ${GEN_REGISTRY}\n`
        + missing.join(', '),
    ).toEqual([]);
  });

  it('저장이 통과하는 블록은 전부 registry.json 에 있다', () => {
    const missing = enumTypes.filter((t) => !registryTypes.includes(t)).sort();
    expect(
      missing,
      `서버 enum 에는 있고 registry.json 에는 없는 블록:\n채우려면: ${GEN_REGISTRY}\n${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('운영자가 놓을 수 있는 블록은 전부 서버 enum 에 있다 (저장 400 방지)', () => {
    const missing = placeable.filter((t) => !enumTypes.includes(t)).sort();
    expect(
      missing,
      `BLOCK_DEFS 에 있으나 서버 enum 에 없는 블록 — 운영자가 추가하면 페이지 저장이 400 입니다:\n${missing.join(', ')}`,
    ).toEqual([]);
  });
});

/**
 * Claude Design 에 넘기는 카탈로그.
 *
 * 카탈로그는 registry.json 전체(플랫폼 공용 — b2bsmart 커머스 블록까지 들어 있다)가
 * 아니라 **이 교회 제품의 집합**이어야 한다. 전체를 주면 시안이
 * `catalog_product_page` 처럼 **놓을 수 없는 블록으로 화면을 그린다** — 모자란
 * 것보다 이게 더 나쁘다(그려온 시안을 버려야 하므로).
 *
 * surface 의 뜻:
 *   palette  — 시안이 **화면을 그릴 때 써도 되는** 블록
 *   alias    — 레거시 별칭(`call_to_action` → `cta_section`). 운영자 목록엔 남아
 *              있지만 새로 그릴 때는 정식 이름을 써야 한다
 *   importer — 마이그레이션 매핑 대상이거나 레이아웃 컨테이너. 시안이 직접 쓰지 않는다
 */
describe('Claude Design 카탈로그 — 교회 제품 범위와 맞는다', () => {
  const catalog = JSON.parse(read(CATALOG_PATH)) as {
    generatedAt?: string;
    blocks: { block_type: string; surface?: string; variants?: string[] }[];
  };
  const catalogTypes = catalog.blocks.map((b) => b.block_type);
  const catalogPalette = catalog.blocks.filter((b) => b.surface === 'palette').map((b) => b.block_type);

  it('카탈로그가 놓을 수 있는 블록을 전부 담는다', () => {
    const missing = placeable.filter((t) => !catalogTypes.includes(t)).sort();
    expect(
      missing,
      `시안 카탈로그에 없는 블록 ${missing.length}개 — Claude Design 이 이 블록을 모르므로 시안에 쓰지 못합니다.\n`
        + `재생성: ${GEN_CATALOG}\n`
        + missing.join(', '),
    ).toEqual([]);
  });

  it('palette 로 약속하는 블록은 전부 운영자가 놓을 수 있다', () => {
    const extra = catalogPalette.filter((t) => !placeable.includes(t)).sort();
    expect(
      extra,
      `운영자가 놓을 수 없는데 카탈로그가 palette 라고 말하는 블록 ${extra.length}개 — 시안이 이걸로 화면을 그리면 버려야 합니다.\n`
        + `재생성: ${GEN_CATALOG}\n`
        + extra.join(', '),
    ).toEqual([]);
  });

  it('카탈로그에 variants 가 실려 있다 (시안이 있는 변형을 모르고 신규 블록을 요구하지 않게)', () => {
    // 예닮 v7 이 `banner_slider` editorial 을 "신규 스킨" 으로 적은 이유가 이것이다 —
    // 카탈로그에 변형 목록이 없었다. 변형을 가진 블록이 한 자리수로 떨어지면
    // 생성이 밀린 신호다(현재 49개).
    const withVariants = catalog.blocks.filter((b) => (b.variants ?? []).length > 0);
    expect(
      withVariants.length,
      `카탈로그에 variants 를 가진 블록이 ${withVariants.length}개뿐입니다 — gen-registry-entries.ts 가 BLOCK_DEFS 의 변형을 채우지 못한 것 같습니다.\n재생성: ${GEN_REGISTRY} 그리고 ${GEN_CATALOG}`,
    ).toBeGreaterThan(30);
  });

  it('palette 에서 내린 블록은 registry 가 이유를 밝힌다 (isAlias / isHidden)', () => {
    // 의도적으로 내린 것(레거시 별칭·레이아웃 컨테이너)만 허용한다. 플래그 없이
    // 조용히 빠진 블록은 생성이 밀린 신호이므로 통과시키지 않는다.
    const demoted = placeable.filter((t) => !catalogPalette.includes(t));
    const unexplained = demoted
      .filter((t) => {
        const f = registry.blocks[t]?.flags ?? {};
        return !f.isAlias && !f.isHidden;
      })
      .sort();
    expect(
      unexplained,
      `palette 에서 빠졌는데 registry 에 isAlias/isHidden 이 없는 블록 — 카탈로그 생성이 밀렸을 수 있습니다.\n`
        + `재생성: ${GEN_CATALOG}\n`
        + unexplained.join(', '),
    ).toEqual([]);
  });
});

/**
 * `dw.module.json` — DW-MCP 가 답하는 "교회 블록 세트에 뭐가 있나".
 *
 * 이 목록이 18개에 멈춰 있었고(2026-11-08 확인), 그 목록을 보고 일하는 쪽은 신규
 * 블록이 없다고 알았다. DW-MCP 는 저장소를 읽지 않으므로(`dw_put_module` 이 내용을
 * 받는 구조) 저장소 파일이 원본이다 — 그 원본이 코드와 어긋나면 푸시해도 거짓이 간다.
 */
describe('dw.module.json — DW-MCP 에 넘길 블록 목록이 코드와 같다', () => {
  const manifest = JSON.parse(read('dw.module.json')) as {
    summary: string;
    capabilities: string[];
    provides?: { packages?: string[] };
  };

  /**
   * DW Registry 매니페스트 스키마의 루트 허용 필드 14개 (DW MCP 세션 회신, 2026-11-08).
   * 루트는 `additionalProperties: false` 라 이 밖의 필드를 넣으면 `dw_put_module` 이
   * "(root) must NOT have additional properties" 로 **등록 자체를 거부한다**.
   *
   * 실제로 첫 등록 시도가 세 필드 때문에 거부됐다 — 내가 지어낸 generatedBy·
   * generatedAt, 그리고 `packages`. packages·apis·contracts 는 루트가 아니라
   * `provides` 안이다. `dw_get_module` 이 셋을 각각 한 줄로 렌더해서 루트 필드로
   * 착각한 것이다 — **렌더 모양으로 스키마를 추정하면 틀린다.**
   */
  const SCHEMA_ROOT_FIELDS = [
    'id', 'name', 'version', 'kind', 'layer', 'industries', 'status', 'extraction',
    'summary', 'capabilities', 'provides', 'depends_on', 'docs', 'owner',
  ];

  it('루트에 스키마에 없는 필드가 없다 (있으면 dw_put_module 이 등록을 거부한다)', () => {
    const extra = Object.keys(manifest).filter((k) => !SCHEMA_ROOT_FIELDS.includes(k)).sort();
    expect(
      extra,
      `DW Registry 스키마에 없는 루트 필드 — 이대로는 등록이 거부됩니다.
`
        + `허용: ${SCHEMA_ROOT_FIELDS.join(', ')}
`
        + `문제: ${extra.join(', ')}`,
    ).toEqual([]);
  });

  it('packages 는 루트가 아니라 provides 안에 있다', () => {
    expect(manifest).not.toHaveProperty('packages');
    expect(
      manifest.provides?.packages,
      'provides.packages 가 비었습니다 — packages·apis·contracts 는 provides 안에 둡니다.',
    ).toContain('@dw-church/blocks');
  });
  /** capabilities 문장에 적힌 block_type 을 전부 긁어낸다. */
  const listed = new Set(
    manifest.capabilities.flatMap((line) => line.split(/[^a-z_0-9]+/).filter((w) => /^[a-z][a-z_0-9]{3,}$/.test(w))),
  );

  it('운영자가 놓을 수 있는 블록이 전부 적혀 있다', () => {
    const missing = placeable.filter((t) => !listed.has(t)).sort();
    expect(
      missing,
      `dw.module.json 에 없는 블록 ${missing.length}개 — DW-MCP 를 보고 일하는 쪽이 이 블록들을 모릅니다.
`
        + `재생성: ${GEN_MODULE}
`
        + missing.join(', '),
    ).toEqual([]);
  });

  it('요약의 개수가 실제와 맞는다', () => {
    expect(
      manifest.summary,
      `요약에 적힌 개수가 실제(${placeable.length}개)와 다릅니다 — 재생성: ${GEN_MODULE}`,
    ).toContain(`block_type ${placeable.length}개`);
  });
});
