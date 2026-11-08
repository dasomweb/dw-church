/**
 * `dw.module.json` 을 **코드에서 생성한다** — DW-MCP 가 답하는 블록 목록이
 * 커밋을 따라오게.
 *
 * 왜 필요한가: `dw_list_modules` / `dw_get_module` 이 답하는 `dw.church-blocks`
 * 의 블록 목록이 18개에 멈춰 있었다(2026-11-08 확인). 신규 블록
 * `latest_feed`·`featured_event`·`verse_of_day`·`news_announcements`·
 * `recent_sermon_note`·`sermon_magazine` 이 전부 빠져 있었고, 그 목록을 보고
 * 일하는 쪽(다른 세션·시안 작업)은 그 블록들이 없다고 알았다.
 *
 * 왜 저장소에 두나: DW-MCP 는 저장소를 읽지 않는다 — `dw_put_module` 설명 그대로
 * "The repo is only read, never changed: pass the dw.module.json content".
 * 즉 **내용을 넘기는 쪽이 원본을 가져야** 한다. 저장소에 두면 커밋 diff 로
 * 검토되고, 드리프트 테스트가 코드와 어긋남을 잡는다.
 *
 * ⚠ 정본 스키마는 `dw-platform/schemas/module.schema.json` 이고 **그 저장소는 이
 *   세션이 열지 않는다**(자기 저장소 밖 접근 금지). 그래서 아래 필드는
 *   `dw_put_module` 이 required 로 명시한 것(id·name·version·kind·layer·status·
 *   summary)과 `dw_get_module` 이 실제로 렌더한 것(industries·capabilities·
 *   packages·docs)만 쓴다. 그 밖의 필드는 지어내지 않았다 — 푸시 전
 *   `dw_put_module` 검증으로 확인할 것.
 *
 * Run (dw-church-app 에서):  node scripts/design-importer/gen-dw-module.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argv } from 'node:process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const REGISTRY = join(ROOT, 'packages/blocks/src/registry.json');
const PAGE_EDITOR = join(ROOT, 'packages/admin-app/src/pages/PageEditor.tsx');
const OUT = join(ROOT, 'dw.module.json');

interface RegEntry {
  label?: string;
  group?: string;
  flags?: Record<string, boolean>;
  variants?: string[];
}

function placeableTypes(): string[] {
  const src = readFileSync(PAGE_EDITOR, 'utf8');
  const found = [...src.matchAll(/^\s*\{ type: '([a-z_0-9]+)'/gm)].map((m) => m[1]!);
  if (found.length < 60) {
    throw new Error(`BLOCK_DEFS 파싱이 ${found.length}개만 읽었습니다 — PageEditor.tsx 형태가 바뀐 것 같습니다.`);
  }
  return [...new Set(found)];
}

function main(): void {
  const reg = JSON.parse(readFileSync(REGISTRY, 'utf8')) as { blocks: Record<string, RegEntry> };
  const placeable = placeableTypes();

  // 운영자가 놓을 수 있는 것만 싣는다 — registry.json 은 플랫폼 공용이라
  // b2bsmart 커머스 블록까지 들어 있고, 그걸 교회 모듈 능력으로 적으면 거짓이 된다.
  const dataBlocks = placeable.filter((t) => reg.blocks[t]?.group === 'data').sort();
  const staticBlocks = placeable.filter((t) => reg.blocks[t] && reg.blocks[t]!.group !== 'data').sort();
  const withVariants = placeable
    .filter((t) => (reg.blocks[t]?.variants ?? []).length > 0)
    .sort()
    .map((t) => `${t}(${reg.blocks[t]!.variants!.join('|')})`);

  const manifest = {
    id: 'dw.church-blocks',
    name: '교회 블록 세트 (True Light)',
    version: '0.2.0',
    kind: 'block',
    layer: 'vertical',
    status: 'experimental',
    industries: ['church'],
    summary:
      '교회 사이트용 Static·Data 블록 세트. 운영자가 페이지 편집기에서 놓을 수 있는 '
      + `block_type ${placeable.length}개 — 정적 블록 ${staticBlocks.length}개 + 데이터 블록 ${dataBlocks.length}개. `
      + 'Data Block 은 교회 콘텐츠 모듈 API(/api/v1/{resource})에서 데이터를 읽고, 등록된 글이 없으면 스스로 숨는다.',
    capabilities: [
      `Static Block (${staticBlocks.length}): ${staticBlocks.join(', ')}`,
      `Data Block (${dataBlocks.length}): ${dataBlocks.join(', ')}`,
      `변형(variant)을 가진 블록 (${withVariants.length}): ${withVariants.join(', ')}`,
      '페이지는 섹션의 1차원 수직 스택이다 — 2칼럼·사이드레일은 블록 내부에서만 가능하고, 독립 블록을 다른 블록 옆에 놓을 수단은 없다.',
      '블록 메타데이터(label·group·aiHint·variants)로 AI 빌더가 교회 페이지를 조합한다.',
      'Claude Design 시안용 카탈로그: scripts/design-importer/CLAUDE-DESIGN-CATALOG.md (gen-catalog.ts 자동생성).',
    ],
    packages: ['@dw-church/blocks'],
    docs: [
      'dw-church-app/packages/blocks/src/registry.json',
      'dw-church-app/scripts/design-importer/CLAUDE-DESIGN-CATALOG.md',
      'dw-church-app/scripts/design-importer/CLAUDE-DESIGN-IMPORT-GUIDE.md',
    ],
    // 생성 정보 — 손으로 고치지 말라는 표시. 생성기가 매번 덮는다.
    generatedBy: 'dw-church-app/scripts/design-importer/gen-dw-module.ts',
    generatedAt: new Date().toISOString().slice(0, 10),
  };

  if (argv.includes('--check')) {
    console.log(`placeable ${placeable.length} (static ${staticBlocks.length} + data ${dataBlocks.length}) · variants ${withVariants.length}`);
    console.log('--check 모드 — 쓰지 않았습니다.');
    return;
  }

  writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✓ dw.module.json — 블록 ${placeable.length}개 (정적 ${staticBlocks.length} + 데이터 ${dataBlocks.length}), 변형 보유 ${withVariants.length}개`);
  console.log('  → dw-church-app/dw.module.json');
  console.log('  DW-MCP 에 반영하려면 dw_put_module 로 이 내용을 넘겨야 한다(저장소를 읽지 않음).');
}

if (argv[1] && argv[1].replace(/\\/g, '/').endsWith('gen-dw-module.ts')) main();
