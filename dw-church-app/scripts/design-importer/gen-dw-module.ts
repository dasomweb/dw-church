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
 * ⚠ 정본 스키마 파일은 `dw-platform/schemas/module.schema.json` 이고 **그 저장소는
 *   이 세션이 열지 않는다**(자기 저장소 밖 접근 금지). 대신 규칙은 DW-MCP 에
 *   **직접 물어** 확인했다(2026-11-08, `dw_get_standards` + `dw_list_modules` +
 *   `dw_get_module`). 확인된 것:
 *
 *   - 열거형은 툴 입력 스키마가 정본이다 — `kind` = ui-package|block|
 *     business-module|shared-service|sdk|data-contract|standard|playbook,
 *     `layer` = base|vertical|project, `industries` = church|b2b|media|commerce|
 *     corporate|ai-content.
 *   - `layer`·`industries` 는 표준 문서의 "블록·UI 원칙" 이 요구하는 표시다 —
 *     블록 디자인은 업종군 안에서 재사용하므로 vertical + church.
 *   - **`docs` 는 모듈 `path` 기준 상대경로다** (확정 — 저장 시
 *     `path.posix.join(path, doc)` 으로 붙인다고 회신받았다). 저장소 루트 기준으로
 *     적으면 경로가 두 번 붙어 깨진다. 실제로 기존 등록이 그렇게 깨져 있다 —
 *     `dw.church-content-modules` 의 docs 가
 *     `dw-church-app/apps/server/src/modules/dw-church-app/apps/server/prisma/...`
 *     로 렌더되고, `dw.church-blocks` 는 5개 중 4개가 겹쳐 있다. 자매 모듈
 *     `dw.b2b-site-blocks` 는 상대경로라 깨끗하다.
 *   - `summary` 는 "<무엇> 묶음 — <대표 항목 나열>. <동작 한 줄>" 이 이 레지스트리의
 *     집필 관례다(`dw.b2b-site-blocks`·`dw.church-content-modules` 동일). 그래서
 *     개수를 앞세우지 않고 관례 문장 안에 넣는다.
 *   - `capabilities` 는 짧은 구절의 배열. `dw.b2b-site-blocks` 는 구조 설명을 싣고
 *     기존 `dw.church-blocks` 는 타입 목록을 실었다 — 둘 다 허용되므로 **구조 설명 +
 *     전체 타입 목록**을 함께 싣는다(이 파일의 존재 이유가 목록 최신화다).
 *   - **루트는 `additionalProperties: false` 이고 허용 필드는 14개다** — DW MCP
 *     세션 회신(2026-11-08)으로 확정:
 *       id · name · version · kind · layer · industries · status · extraction ·
 *       summary · capabilities · provides · depends_on · docs · owner
 *     필수는 id·name·version·kind·layer·status·summary, 그리고 layer=vertical 이면
 *     industries 도 1개 이상 필수.
 *   - **`packages`·`apis`·`contracts` 는 루트가 아니라 `provides` 안이다.**
 *     내 첫 시도가 거부된 3개 중 셋째가 바로 `packages` 였다(generatedBy·
 *     generatedAt 가 둘, packages 가 셋째). `dw_get_module` 이 셋을 각각 한 줄로
 *     렌더해서 루트 필드로 착각했다 — **렌더 모양으로 스키마를 추정하면 틀린다.**
 *   - `generatedBy`·`generatedAt` 는 스키마에 없다. 그래서 "손으로 고치지 말라"
 *     표시는 루트 필드가 아니라 `capabilities` 한 줄로 싣는다. 날짜는 넣지 않는다
 *     (재생성마다 diff 가 흔들린다 — 신선도는 version 으로).
 *   - `extraction`·`depends_on`·`owner` 는 의미를 확인하지 못해 쓰지 않는다.
 *     특히 `depends_on` 은 항목 모양(모듈 id 문자열? 객체?)을 모르므로 지어내지
 *     않았다 — dw.church-content-modules 와의 짝 관계는 capabilities 문장에 있다.
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

/**
 * `dw_put_module` 이 매니페스트와 **별도 인자로** 받는 값들(매니페스트 안에 넣는
 * 필드가 아니다 — 툴 입력 스키마가 따로 받는다).
 *
 * `path` 를 `dw-church-app` 으로 잡은 이유: 블록 컴포넌트가 두 뿌리에 나뉘어 있다 —
 * `packages/blocks/src`(88개 + registry.json 정본)와
 * `apps/web/components/blocks`(52개 + BlockRenderer 매핑). 둘을 모두 담는 가장 좁은
 * 디렉터리가 `dw-church-app` 이고, 이렇게 잡으면 `docs` 상대경로가 저장소 루트
 * 기준과 같아져 렌더가 깨지지 않는다. 기존 등록은 `packages/blocks/src/church` 였고
 * 그 디렉터리에는 블록이 4개뿐이다(검증됨).
 */
const PUT_ARGS = {
  repo: 'dasomweb/dw-church',
  path: 'dw-church-app',
  project: 'dw-church-truelight',
};

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
  // CLAUDE.md 용어 규칙대로 Static / Data / Layout 3분류로 가른다 — 레이아웃을
  // Static 에 뭉치면 "이건 컨테이너" 라는 정보가 사라진다.
  const dataBlocks = placeable.filter((t) => reg.blocks[t]?.group === 'data').sort();
  const layoutBlocks = placeable.filter((t) => reg.blocks[t]?.group === 'layout').sort();
  const staticBlocks = placeable
    .filter((t) => reg.blocks[t] && !['data', 'layout'].includes(reg.blocks[t]!.group ?? ''))
    .sort();
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
    // layer=vertical 이면 industries 는 1개 이상 필수.
    industries: ['church'],
    status: 'experimental',
    // 레지스트리 집필 관례: "<무엇> 묶음 — <대표 항목>. <동작 한 줄>".
    // 개수는 관례 문장 안에 넣는다(개수를 앞세우면 다른 모듈과 어조가 어긋난다).
    summary:
      '교회 사이트용 Static·Data 블록 묶음 — 담임목사 인사말·예배 시간·새가족 안내·헌금 안내부터 '
      + '최근 설교·주보·저널·교역자·연혁·앨범·행사·온라인 주보·설교노트·설교매거진·통합 피드·말씀까지. '
      + `운영자가 페이지 편집기에서 놓을 수 있는 block_type ${placeable.length}개(정적 ${staticBlocks.length} + 데이터 ${dataBlocks.length} + 레이아웃 ${layoutBlocks.length}), `
      + '블록 레지스트리(registry.json) 단일 메타데이터 위에서 동작.',
    capabilities: [
      'registry.json 한 곳에서 블록 타입·그룹·defaultProps·variant·aiHint 관리 (어드민 팔레트·서버 Zod enum·AI 빌더·시안 카탈로그가 이를 derive)',
      `Static Block (${staticBlocks.length}): ${staticBlocks.join(', ')}`,
      `Data Block (${dataBlocks.length}): ${dataBlocks.join(', ')}`,
      `Layout Block (${layoutBlocks.length}): ${layoutBlocks.join(', ')} — 행/열 컨테이너이지만 자식 중첩 편집 UI 가 비활성이라 운영자가 자식 블록을 넣을 수 없다`,
      `variant 기반 디자인 변형 — 변형을 가진 블록 ${withVariants.length}개: ${withVariants.join(', ')}`,
      'Data Block 은 교회 콘텐츠 모듈 API(/api/v1/{resource})에서 데이터를 읽고, 등록된 글이 없으면 스스로 숨는다 (dw.church-content-modules 와 짝)',
      '페이지는 섹션의 1차원 수직 스택 — 2칼럼·사이드레일은 블록 내부에서만 가능하고, 독립 블록을 다른 블록 옆에 놓을 수단이 없다',
      '디자인 토큰(CSS 변수) 기반 스타일 + 섹션별 배경·오버레이(props.blockStyle)',
      '컴포넌트 두 뿌리: packages/blocks/src (registry.json 정본) · apps/web/components/blocks (BlockRenderer 매핑)',
      '시안 작업용 카탈로그 scripts/design-importer/CLAUDE-DESIGN-CATALOG.md — palette/alias/importer 구분 + variants + 구조 제약 9개 (gen-catalog.ts 자동생성)',
      '이 목록은 저장소 코드(PageEditor BLOCK_DEFS + registry.json)에서 생성된다 — scripts/design-importer/gen-dw-module.ts 로 재생성할 것, 손으로 고치지 말 것',
    ],
    // ⚠ packages·apis·contracts 는 루트가 아니라 provides 안이다 — 루트에 두면
    // additionalProperties 로 거부된다(실측).
    provides: {
      packages: ['@dw-church/blocks', '@dw-church/ui-components'],
    },
    // ⚠ path(PUT_ARGS.path) 기준 **상대경로**다 — 레지스트리가 path 를 앞에 붙여
    // 렌더하므로 저장소 루트 기준으로 적으면 경로가 겹쳐 깨진다.
    docs: [
      'packages/blocks/src/registry.json',
      'scripts/design-importer/CLAUDE-DESIGN-CATALOG.md',
      'scripts/design-importer/CLAUDE-DESIGN-IMPORT-GUIDE.md',
    ],
  };

  if (argv.includes('--check')) {
    console.log(`placeable ${placeable.length} (static ${staticBlocks.length} + data ${dataBlocks.length} + layout ${layoutBlocks.length}) · variants ${withVariants.length}`);
    console.log('--check 모드 — 쓰지 않았습니다.');
    return;
  }

  writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✓ dw.module.json — 블록 ${placeable.length}개 (정적 ${staticBlocks.length} + 데이터 ${dataBlocks.length} + 레이아웃 ${layoutBlocks.length}), 변형 보유 ${withVariants.length}개`);
  console.log('  → dw-church-app/dw.module.json');
  console.log('');
  console.log('  DW-MCP 에 반영하려면 dw_put_module 로 이 내용을 넘겨야 한다(저장소를 읽지 않음):');
  console.log(`    repo    = ${PUT_ARGS.repo}`);
  console.log(`    path    = ${PUT_ARGS.path}`);
  console.log(`    project = ${PUT_ARGS.project}`);
  console.log('    manifest = dw-church-app/dw.module.json 의 내용 그대로 (write-scoped key 필요)');
}

if (argv[1] && argv[1].replace(/\\/g, '/').endsWith('gen-dw-module.ts')) main();
