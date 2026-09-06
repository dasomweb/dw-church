# Claude Design 활용 워크플로우

> **확정 2026-09-06.** 앞으로 Claude Design(디자인 시스템/화면 시안)을 활용하는 **모든 기능**은
> 반드시 이 순서로 진행한다. 목표는 *디자인-시스템-first* — Claude Design 산출물을 우리 **블록
> 시스템**에 반영해서 편집·재사용·유지보수·토큰 연동이 되도록 만드는 것.

---

## 표준 순서

```
1. 가져오기·분석      Claude Design → 디자인 시스템(토큰) + 내용(시안) import 후 분석
        │
2. 매칭 확인          현재 블록 시스템과 비교 — 각 섹션이 어떤 기존 블록에 대응되나?
        │
        ├─ 대응 블록 있음 ──┐
        │                   │
3.      │   디자인만 안 맞음 → 디자인 패턴(스킨/variant) "추가"   (새 블록 X)
        │
4. 대응 블록 없음 / Properties(속성·데이터 구조)가 안 맞음 → 신규 블록 "생성·추가"
```

**한 줄 규칙**

> 기존 블록 우선 → 안 맞는 게 **"디자인(모양)"** 이면 **스킨(variant) 추가** → 안 맞는 게
> **"구조(Properties)"** 이면 **신규 블록**.

---

## 단계별 상세

### 1. Claude Design 가져오기·분석
- **DesignSync** MCP 로 프로젝트를 import: `list_files` → `get_file`.
  - 디자인 시스템: `_ds/.../_tokens.css` (색·폰트·radius 토큰). 우리 토큰과 대조.
  - 내용/화면: `*.dc.html` 시안.
- ⚠ 대용량 `.dc.html`(수십 KB)은 앞부분만 보지 말고 **전체를** 읽는다. `get_file` 결과가
  JSON 이면 `content` 를 디코드(JSON→html)해 페이지네이션해서 끝까지 읽을 것.
  (참고: 시안은 앞부분만 슬쩍 보고 임의로 만들면 안 된다 — 과거 반복된 지적.)

### 2. 기존 블록 시스템과 비교·매칭
- 대상: `packages/blocks/src/utilities/BlockRenderer.tsx` 의 `BLOCK_MAP`,
  `packages/admin-app/.../PageEditor.tsx` 의 `BLOCK_DEFS`.
- 시안의 각 섹션을 훑어 "이건 hero_banner", "이건 recent_sermons", "이건 features_grid" …
  식으로 대응 블록을 찾는다.

### 3. 디자인 패턴이 안 맞을 때 → 스킨/variant 추가
- **판단 기준:** 대응 블록이 있고 **Properties(데이터/속성 shape)는 맞는데** 모양만 다르다.
- **하는 일:** 그 블록에 **새 variant(스킨)** 를 추가한다. 새 블록을 만들지 않는다.
- 예: `quote_block` 에 `verse` variant, `image_gallery` 에 `masonry` variant,
  `recent_sermons` 에 `featured` variant 추가.

### 4. Properties가 안 맞을 때 → 신규 블록 생성·추가
- **판단 기준:** 기존 어느 블록에도 **구조(Properties/데이터 shape)** 가 안 맞는다.
- **하는 일:** 신규 블록을 만들고 **아래를 전부 배선**한다(하나라도 빠지면 캔버스/스토어프론트에서 깨짐):
  - [ ] 컴포넌트: `packages/blocks/src/{static|list-based}/XBlock.tsx`
  - [ ] `packages/blocks/src/utilities/BlockRenderer.tsx` → `BLOCK_MAP` 등록
  - [ ] `packages/blocks` registry(있으면) 등록
  - [ ] `packages/admin-app/.../PageEditor.tsx` → `BLOCK_DEFS`(라벨·아이콘·variant·editableFields)
  - [ ] `apps/server/src/modules/pages/schema.ts` → blockType enum 추가
  - [ ] (데이터 블록이면) 스토어프론트 async 렌더 경로 `apps/web/components/...`
- 새 블록 남발 금지 — variant 로 흡수 가능한 건 3번으로 흡수한다.

---

## 하면 안 되는 것
- **custom_html(“시안 그대로” 통짜 CSS-baked)** 는 이 워크플로우가 **아니다.** 그건 프론트샘플
  적용(홈 디자인 픽) 전용 보조수단이며, 일반 기능 개발에서는 쓰지 않는다.
- 시안을 **앞부분만 보고** 임의로 만들지 않는다(전체 정독 후 구현).
- 토큰만 입히고 "완료"라 하지 않는다 — 실제 화면을 시안대로 구현한다.

---

## 관련
- 실제 사례(①기존 블록 ②variant ③새 블록): 프론트샘플 작업 이력.
- 디자인 시스템 로드맵 / 토큰 단일화(SoT `--brand-*`).
- 미리보기: 페이지 빌더 '실시간 미리보기' 탭에서 데이터 블록 실제 렌더 확인.
