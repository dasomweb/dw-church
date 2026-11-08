# Claude Artifact → 테넌트 적용 계획

작성 2026-11-08. **계획 문서다 — 아직 구현하지 않았다.** 승인 뒤 단계별로 진행한다.

목표: Claude Artifact에서 디자인한 화면을 **연결된 테넌트에 반영**하고, 그 과정에서
필요한 블록을 **기존 것으로 쓸지 / 변형을 더할지 / 새로 만들지**를 매번 같은 기준으로
판정한다.

---

## 1. 지금 있는 것 (코드로 확인함)

### 결정적 임포터 — `dw-church-app/scripts/design-importer/`

| 파일 | 역할 |
|---|---|
| `lib.ts` | 순수 코어. `Styleguide`·`SectionSpec`·`PageSpec`·`ImportSpec` 타입, `buildChurchTheme()`, `composePage()`, `validateImportSpec()`, `applyImport()`, `darkBandWarnings()`, `isNearBlack()` |
| `api.ts` | `makeHttpClient(tenantSlug)` — `ImportClient` 의 HTTP 구현 |
| `apply-dasom.ts` · `apply-emmaus.ts` | 테넌트별 적용 스크립트 (실증 완료) |
| `verify-live-unchanged.ts` | 라이브 테넌트 무변경 검증 하네스 |
| `reset-tenant.ts` | 되돌리기 |
| `gen-catalog.ts` | `CLAUDE-DESIGN-CATALOG.{md,json}` 생성 — palette/alias/importer 구분 + variants + **구조 제약 9개** |
| `gen-registry-entries.ts` | `packages/blocks/src/registry.json` 채움 |
| `gen-dw-module.ts` | `dw.module.json` 생성 (DW Registry 등록용) |
| `__tests__/` | 23 PASS |

### 콘솔 임포트 — `apps/server/src/modules/design-import/`

| 파일 | 역할 |
|---|---|
| `routes.ts` | `POST /design/import/analyze` · `/apply` · `/structure`, `GET /design/import/jobs/:id` (전부 `requireSuperAdmin`) |
| `canvas-parse.ts` | Claude **Design** 캔버스 파싱 (`data-screen-label`, `sc-for`) |
| `map.ts` | LLM 매핑 — 프롬프트에 카탈로그를 실어 보내고 `emit_page` 툴로 받음 |
| `catalog.ts` | `CATALOG_BLOCKS` · `CONTENT_MODULES` — **손으로 유지되는 블록 목록** |
| `packages/admin-app/src/components/super-admin/ClaudeDesignDialog.tsx` | zip 업로드 → 브라우저 unzip(fflate) → analyze → apply |

---

## 2. 지금 막고 있는 것 (측정값)

이 세 개를 먼저 치우지 않으면 아래 단계 전부가 헛돈다.

### 막는 것 ① `design-import/catalog.ts` 가 낡았다 — **블록 목록 5번째 사본**

2026-11-08 커밋 `71889080`에서 사본 4개를 코드 생성으로 고정했는데, **이 파일을 몰랐다.**
머리말에 "Auto-derived from CLAUDE-DESIGN-CATALOG.json … Regenerate if blocks change"
라고 적혀 있지만 생성기가 없어서 손으로 유지돼 왔다.

```
catalog.ts 블록 수            80
운영자가 실제로 놓을 수 있는 것 81
빠진 것                       39   ← 매핑이 이 블록들을 아예 모른다
놓을 수 없는데 들어있는 것      38   ← b2bsmart 커머스·카탈로그·블로그 블록
```

빠진 39개에 **신규 블록 전부**가 들어 있다: `latest_feed`, `featured_event`,
`verse_of_day`, `news_announcements`, `recent_sermon_note`, `sermon_magazine`,
`sermon_note_list`, `online_bulletin`, `online_bulletin_list`, `devotion_reader`,
`cardnews`, `recent_books`, `info_bar`, `page_header`, `visitor_welcome`,
`first_time_guide`, `directions_split`, `worship_times` …

**왜 치명적인가**: `map.ts` 는 이 목록을 두 번 쓴다.
- `:113` 프롬프트 문자열 `CATALOG_STR` — LLM이 고를 수 있는 선택지
- `:160` `VALID_BLOCKS` — LLM 출력 **검증 집합**

즉 LLM이 운 좋게 `latest_feed` 를 골라도 **유효하지 않은 블록으로 걸러진다.**
반대로 `catalog_product_page`·`pricing_table` 같은 **놓을 수 없는 38개는 "쓸 수 있다"고
약속한다.** 예닮 v7 시안이 `home_side_rail` 을 지어낸 것과 같은 구조의 사고가
콘솔 임포트에서도 그대로 일어난다.

### 막는 것 ② `BLOCK_REPLACE` 가 매핑 결과를 구형 블록으로 격하한다

`map.ts:166`. 11건을 강제 치환한다.

```
sermon_feature → text_image      hero_overlap   → hero_banner
bento_grid     → features_grid   news_split     → features_grid
dashboard_banner → hero_banner   info_columns   → features_grid
quick_links    → features_grid   week_schedule  → worship_schedule
schedule_board → worship_schedule  logo_bar     → features_grid
steps_list     → features_grid
```

주석의 사유는 "하드코딩된 Group-B 블록이 테마 타이포를 무시하므로 토큰 구동
등가물로 강제한다 (2026-09-12 감사)". **그 뒤에 한글 타입 스케일 3계층
(토큰 래더 / 렌더 클램프 / 블록 koText 역할 스케일)이 들어갔다.** 그러니 이 11개 중
상당수는 이미 토큰을 따를 가능성이 높고, 그렇다면 이 표는 **이유 없이 디자인 충실도를
깎고 있다.** 재감사 대상.

### 막는 것 ③ LLM 매핑에 쓰는 Anthropic API 크레딧

마지막 확인(2026-09-12) 당시 **0** 이었다. 지금 상태는 재확인해야 한다. 0이면
Lane B(콘솔 자가 임포트)와 마이그레이션 AI가 같이 멈춘다. 단계 2의 "결정적 1차 매칭"은
이 의존을 줄이기 위한 것이다.

---

## 3. 연동 구조 — 레인 2개

Artifact를 **서버가 직접 읽을 수 없다.** claude.ai 아티팩트 읽기는 사용자 세션
인증이 필요하고, api-server에는 그 자격이 없다. 그래서 레인을 나눈다.

### Lane A — 세션 주도 (운영자 보조, 권장 기본값)

```
Claude Artifact (URL)
  └─ [Claude Code 세션] Artifact 툴 action:"read" → 페이지 HTML 확보
       └─ artifact-parse.ts        HTML → ImportSpec (토큰 + 섹션 후보)
            └─ match.ts            결정적 1차 매칭 (§4 게이트 1·2)
                 └─ map.ts         남은 애매한 것만 LLM
                      └─ applyImport()  백업 → 테마 → 페이지·섹션 → 이미지 R2
                           └─ verify-live  라이브 확인 → 진행 원장 기록
```

**장점**: Claude Design 때처럼 로그인된 Chrome 탭 Connect-RPC나 zip 업로드가 필요
없다. `Artifact action:"read"` 가 아티팩트 HTML을 그대로 돌려준다 — 이 경로가 이번
연동의 핵심 이득이다. 크레딧 0이어도 결정적 1차 매칭까지는 돈다.

### Lane B — 콘솔 자가 (슈퍼어드민)

```
운영자가 HTML 붙여넣기 또는 .html 파일 업로드
  └─ POST /design/import/analyze → map.ts → 매핑 미리보기
       └─ 운영자 승인
            └─ POST /design/import/apply → 백업 → 적용
```

**제약을 분명히 둔다**: 이 다이얼로그에 **아티팩트 URL 입력란을 만들지 않는다.**
서버가 그 URL을 못 읽으므로 "주소만 넣으면 된다"는 UI는 반드시 실패한다.
기존 zip 업로드(Claude Design Export)는 그대로 둔다.

---

## 4. 신규 vs 기존 블록 — 4게이트 판정

시안 한 섹션을 볼 때마다 **위에서부터** 통과 여부를 본다. 아래 게이트로 내려갈수록
비용이 커지므로, **올라갈 수 있으면 올라간다.**

### 게이트 1 — MATCH (기존 블록 그대로)

판정 기준: **구조가 같고 데이터 출처가 같다.**
- 섹션의 요소 구성(제목/부제/이미지/카드 수/링크)이 기존 블록의 props로 표현되는가
- 반복 항목이 콘텐츠 모듈에서 오는가 (`/api/v1/{resource}`) → Data Block
- 색·폰트·여백 차이는 **여기서 판정하지 않는다** — 그건 테마 토큰이 흡수한다

→ 결과: `block_type` + props 만 쓴다. 코드 변경 0.

### 게이트 2 — SKIN / VARIANT (기존 블록 + 변형)

판정 기준: **구조는 맞는데 배치·비율·강조가 다르다.**
- 예: 카드 그리드인데 첫 칸만 전폭 피처 → `recent_columns` 의 `feature-dark` 류 변형
- 예: 본문 옆에 붙는 사이드 레일 → `latest_feed` 의 `rail-left`/`rail-right`
  (**독립 블록으로 만들 수 없다** — 페이지는 섹션의 1차원 수직 스택이고,
  `nature:'layout'` 을 쓰는 블록 정의가 0개여서 자식 중첩 편집 UI가 죽어 있다)

→ 결과: 해당 블록 `BLOCK_DEFS` 에 `variants` 항목 1줄 추가 + 컴포넌트에 분기.
**생성기 3개가 나머지 사본을 자동으로 따라오게 한다** (registry.json → 시안 카탈로그
→ dw.module.json). 드리프트 테스트가 빠뜨림을 잡는다.

> 변형 추가가 가장 값싸고, 가장 자주 쓰여야 하는 선택지다. 현재 변형 보유 블록 49개.

### 게이트 3 — NEW BLOCK (신규 범용 블록)

판정 기준: **구조 자체가 없다.** 아래를 모두 만족해야 한다.
1. 기존 블록의 props·variant 조합으로 표현이 안 된다 (색·폰트 문제가 아니다)
2. **다른 교회에도 쓸 수 있다** — 특정 테넌트 전용 화면은 신규 블록 사유가 아니다
3. 운영자가 값을 바꿀 수 있다 (props 구동, 하드코딩 금지)
4. 반복 데이터가 있으면 콘텐츠 모듈에서 읽는다 (가짜 데이터 금지)

→ 결과: 블록 등록. 손으로 해야 하는 곳과 생성기가 따라오는 곳을 구분한다.

| 손으로 | 생성기가 따라옴 |
|---|---|
| 블록 컴포넌트 (`packages/blocks/src/…` 또는 `apps/web/components/blocks/…`) | `packages/blocks/src/registry.json` ← `gen-registry-entries.ts` |
| `BlockRenderer.tsx` 매핑 | `CLAUDE-DESIGN-CATALOG.{md,json}` ← `gen-catalog.ts` |
| `PageEditor.tsx` `BLOCK_DEFS` (운영자 팔레트 — **여기 없으면 못 쓴다**) | `dw.module.json` ← `gen-dw-module.ts` |
| 서버 `pages/schema.ts` `blockTypes` enum (**여기 없으면 저장 400**) | `design-import/catalog.ts` ← 단계 0에서 만들 생성기 |
| 블록 인스펙터(props 편집 UI) | |

### 게이트 4 — 거절

- 일회성 장식·한 테넌트 전용 문구 → 기존 블록의 props로 흡수하거나 버린다
- **`custom_html` 금지.** 운영자가 고칠 수 없고 토큰을 따르지 않으며 재사용도 안 된다
- 항목별 상세 화면(설교 1건, 칼럼 1건)은 블록이 아니라 전용 라우트 — 이미 있다

### 판정 기록

페이지 단위로 큐 파일을 남긴다 — `docs/design-queue/<tenant>-<page>.md`.
각 섹션마다 `MATCH` / `SKIN:<block>@<variant>` / `NEW:<block_type>` / `DROP` 과
한 줄 사유. 개발이 필요한 것만 모아 작업 순서를 만든다.

---

## 5. 단계

| 단계 | 내용 | 산출물 | 검증 |
|---|---|---|---|
| **0** | 막는 것 ①②③ 치우기 | `gen-design-import-catalog.ts` (기존 영문 설명 보존하며 배치가능 81개로 범위 조정) · 드리프트 가드 추가 · `BLOCK_REPLACE` 11건 재감사 · 크레딧 확인 | 드리프트 테스트에 catalog.ts 검사 추가 → 빠짐 0 / 배치불가 0 |
| **1** | 아티팩트 수용 | `artifact-parse.ts` — HTML → `ImportSpec`. `:root` 커스텀 속성 → 토큰, 섹션 경계 → `SectionSpec` 후보, 이미지 수집 | 단위 테스트 (고정 HTML → 기대 스펙) |
| **2** | 결정적 1차 매칭 | `match.ts` — 구조 지문(제목·그리드·항목 수·데이터 신호)으로 게이트 1·2 자동 판정. 남은 것만 LLM | 테스트: 알려진 섹션 → 기대 block_type. 크레딧 0에서도 통과 |
| **3** | 적용 | 기존 `applyImport()` 재사용. 백업 먼저 · 이미지 R2 업로드(클라이언트 리사이즈 후) · 핫링크 금지 | `verify-live-unchanged.ts` 로 다른 테넌트 무변경 확인 |
| **4** | 큐·원장 | `docs/design-queue/` 판정 기록, 페이지 단위로 끊어 진행 | 페이지마다 라이브 확인 후 원장 기록 |
| **5** | 피드백 루프 (선택) | 아티팩트 코멘트로 수정 요청 수신 | — |

**순서 규칙**: 단계 0 없이 1~3을 만들면 매핑이 신규 블록 39개를 계속 못 쓰고,
쓸 수 없는 38개를 계속 제안한다. 0을 먼저 한다.

---

## 6. 지킬 것

- 테넌트에 **더미 콘텐츠를 넣지 않는다.** 데이터 블록은 글이 없으면 스스로 숨는다
- 이미지는 **R2 자체 호스팅** — 핫링크 금지, 올리기 전 리사이즈
- 콘텐츠 폭은 `max-w-7xl` + `px-4 sm:px-6`
- 한글 타입은 시안의 라틴 px를 그대로 베끼지 않고 한글 스케일로 환산
- 적용 전 **백업 먼저**, 라이브 테넌트는 적용 후 즉시 확인
- 예시·플레이스홀더 값은 미 동부 한인교회 (NJ/NY, `(201) …`)
- 새 화면은 라우트가 아니라 **블록**으로 만든다 (항목 상세만 예외)
