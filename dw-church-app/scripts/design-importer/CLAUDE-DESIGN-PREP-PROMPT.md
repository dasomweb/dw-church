# Claude Design → True Light / DW Church 준비 프롬프트

> **목적:** Claude Design 에서 만드는 `.dc.html` 캔버스 시안을, 우리 블록 시스템에
> **결정적으로(deterministic)** 이식할 수 있게 하는 **기본 프롬프트**다. 매 프로젝트마다
> 이 프롬프트를 Claude Design 에 붙여넣어 시안을 만들면(또는 기존 시안을 다듬으면),
> Claude Code(개발)가 추론 없이 그대로 우리 블록에 매핑한다. 항목이 빠지면 매핑이
> 추론으로 떨어지고, 추론은 어긋난 결과가 된다.
>
> 실제 매핑 규칙(섹션→block_type)은 [CLAUDE-DESIGN-IMPORT-GUIDE.md](./CLAUDE-DESIGN-IMPORT-GUIDE.md)
> "매핑 규칙", 토큰 계약은 [CLAUDE-DESIGN-TOKENS.md](./CLAUDE-DESIGN-TOKENS.md).

---

## 반드시 함께 첨부할 2개 파일

프롬프트만 주면 Claude Design 이 레퍼런스 없이 추측한다. 아래 2개를 **함께 붙여넣어야**
자기 디자인을 우리 실제 block_type·토큰 역할에 매핑한다.

1. **[CLAUDE-DESIGN-CATALOG.md](./CLAUDE-DESIGN-CATALOG.md)** — 블록 카탈로그(block_type·
   key props·용도) + 토큰 역할 + 콘텐츠 모듈. `gen-catalog.ts` 자동생성(블록 추가 시 재실행).
2. **[CLAUDE-DESIGN-TOKENS.md](./CLAUDE-DESIGN-TOKENS.md)** — 토큰 계약 + STEP1 선적용.

---

## 📋 기본 프롬프트 (Claude Design 에 붙여넣기 — 위 2개 파일과 함께)

```
너는 [교회명] 웹사이트 리뉴얼 .dc.html 캔버스 시안을 만든다. 이 시안은 True Light
(DW Church) 블록 시스템에 결정적으로(deterministic) 이식된다 — 새로 생성하는 게
아니라 있는 그대로 우리 블록으로 재현한다. 첨부한 CLAUDE-DESIGN-CATALOG.md(실제
block_type·토큰역할·콘텐츠모듈)와 CLAUDE-DESIGN-TOKENS.md(토큰 계약)를 반드시 사용한다.

[ 디자인 시스템 / 톤 ]
- dasomweb 디자인 시스템(_ds)과 _tokens.css 토큰만 사용. 팔레트는 우리 10 토큰 역할
  (primary·secondary·accent·text·muted·background·border·surface·onDark·onDarkMuted)에
  배정(자유 hex 금지, -fg 는 자동 대비쌍). 타이포=Pretendard, radius sm/md/lg.
- 교회 톤: 밝고 따뜻·경건. 검정/다크 배경 밴드 금지(onDark 는 히어로 사진 위 텍스트만).
- 한국어 우선(이중언어면 한 페이지 + 섹션 오버레이, /ko·/en 복제 금지).

[ 구조 — 매핑이 결정적이 되도록 (중요) ]
- 화면 = 페이지. 각 화면 컨테이너에 data-screen-label="NN 이름" 과
  data-page-slug="home|about|staff|worship|sermons|news|albums|sunday-school|pasture|…"
  를 단다(slug 는 카탈로그/현 사이트 기준 canonical).
- 헤더/푸터는 <dc-import name="…Header/…Footer"> 로 분리(페이지 블록 아님).
- 각 섹션 최상위 요소에 data-block="<카탈로그의 block_type>" 을 단다. 예:
  hero_banner, features_grid, worship_schedule, text_image, quote_block, text_only,
  info_columns, location_map, contact_info, staff_grid, recent_sermons, event_grid,
  album_gallery, board, cell_grid, call_to_action. 매칭 안 되면
  data-block="NEEDS_BLOCK: 무엇이 필요한지".
- 동적 리스트(설교·소식·앨범·교역자·목장 등)는 <sc-for list="{{ 이름 }}"> 로 표현한다
  (→ 데이터 블록). 정적 콘텐츠는 인라인 verbatim.
- 모든 페이지는 CTA(call_to_action)로 끝난다.

[ 내용 ]
- 카피는 현 사이트/실제 내용 verbatim(lorem 금지). 픽셀 위치가 아니라 구조+내용.
- 운영정보(예배시간·주소·전화·담임목사명·헌금계좌)는 "교회 확인 필요"로 표시(비권위).
- 설교·주보·앨범·게시글 개별 글은 지어내지 않는다 — 데이터 블록 자리만 두면 모듈이 채운다.
- 이미지는 역할(hero/배경/인물)과 비율 표기. 테넌트 R2 자가호스팅, 개발 중 placeholder 허용.

화면 순서대로, 섹션 순서·구조(컬럼/그룹/탭/스텝)를 그대로 재현하라.
```

핵심 두 가지만 지키면 매핑이 100% 결정적이 된다: **① `data-page-slug`(화면=페이지),
② 섹션마다 `data-block`(우리 block_type).** (없어도 `sc-for` 리스트명 + 구조 패턴으로
추론은 가능하지만, 명시하면 추론이 사라진다.)

---

## 📨 완성 시안을 개발(Claude Code)에 넘기는 형식 (핸드오프)

Claude Design 작업이 끝나면 아래 형식으로 준다(지금까지 쓰던 그대로 + 2줄 추가):

```
Use the claude_design MCP (https://api.anthropic.com/v1/design/mcp, auth via /design-login)
to import this project:
https://claude.ai/design/p/<PROJECT_ID>?file=<구현할 .dc.html>

Focus on these files:
- `<구현할 .dc.html>`
Also read: `_ds/…/_tokens.css`, `_ds/…/_ds_bundle.js`, `image-slot.js`, `support.js`

Implement: `<구현할 .dc.html>`
→ tenant: <slug>          # 어느 테넌트에 적용할지
→ mode: 전면개편 | 부분추가   # 전면개편이면 백업 후 초기화
```

개발(Claude Code)이 할 것: 수신·전체 정독 → (전면개편이면) 백업+초기화(reset-tenant)
→ **매핑표(화면→페이지→블록, match/skin/new/NEEDS_BLOCK) 먼저 보고** → 확인받고 →
테마 STEP1 → 페이지별 조합·라이브 검증 → 후속(스킨/메뉴/이미지 R2) 목록.

---

## ✅ 임포트-준비 체크리스트 (시안이 이걸 담았나)

**디자인 시스템**
- [ ] 팔레트가 **역할명 + hex** (10 슬롯). 다크 배경 밴드 없음. Pretendard + radius.

**구조**
- [ ] 화면마다 `data-screen-label` + `data-page-slug`.
- [ ] 헤더/푸터 `dc-import` 분리.
- [ ] 섹션마다 `data-block="block_type"`(미매칭은 `NEEDS_BLOCK`).
- [ ] 동적 리스트는 `sc-for`, 정적은 인라인 verbatim.
- [ ] 모든 페이지가 CTA 로 끝남.

**내용**
- [ ] 확정 카피 vs placeholder / 운영정보 "교회 확인 필요" / 개별 글 미창작 / 이미지 역할·비율.
