# Claude Design 임포트 작업 가이드 — 작업단위로 끊어서

> **왜 이 문서가 있나:** 시안 문서가 길면, 에이전트가 **전체를 읽지 않고 추론으로**
> 작업하려 든다 → 없는 내용을 지어내거나 구조를 근사해 시안과 어긋난다. 이 가이드는
> **한 번에 한 작업단위**만 열어 읽고 반영·검증하고 다음으로 넘어가게 강제한다.
>
> 준비: [CLAUDE-DESIGN-PREP-PROMPT.md](./CLAUDE-DESIGN-PREP-PROMPT.md) ·
> 토큰: [CLAUDE-DESIGN-TOKENS.md](./CLAUDE-DESIGN-TOKENS.md) ·
> 블록: [CLAUDE-DESIGN-CATALOG.md](./CLAUDE-DESIGN-CATALOG.md).

---

## 핵심 규칙 3가지

1. **작업단위(work unit) = 페이지 하나** (신규 블록을 만들 땐 **블록 하나**).
   절대 "사이트 전체" 를 한 번에 잡지 않는다.
2. **읽고 나서 작업한다 — 추론 금지.** 지금 작업하는 단위의 시안 마크업을
   **DesignSync / DW-MCP 로 현재본 재수신**해서 끝까지 읽는다. 낡은 로컬본 신뢰 금지.
3. **단위마다 반영 → 라이브 검증 → 원장 체크 → 다음.** 한 단위가 초록불이 되기 전에
   다음 단위로 넘어가지 않는다.

---

## STEP 0 — 토큰 선적용 (페이지 조합 전 1회)

스타일가이드 → 테넌트 테마: `PUT /api/v1/theme` 로 먼저 반영한다(자세히는
[CLAUDE-DESIGN-TOKENS.md](./CLAUDE-DESIGN-TOKENS.md)). 그래야 모든 블록이 첫 렌더부터
올바르다. 라이브에서 `--brand-*` 변수 emit + 블록의 `--dw-*` 브리지 픽업을 확인.

## 작업단위 루프 (매 페이지 반복)

```
① 재수신   지금 페이지의 시안을 DesignSync/DW-MCP 로 현재본 수신
           (파일이 커도 그 페이지 구간만 정독. 로컬 캐시 신뢰 금지).
② 정독     그 페이지의 섹션 순서·내용·구조를 있는 그대로 읽는다.
           내용(카피/예배시간/FAQ)은 verbatim 으로 옮길 준비.
③ 매칭     각 섹션을 match → skin → new 로 결정
           (props 맞고 디자인만 다르면 skin, 구조가 안 맞으면 isHidden 신규 블록).
④ 조합     조합 스크립트에 그 페이지의 섹션 배열 작성. 페이지 끝은 CTA.
⑤ 적용     apply 실행(그 페이지만이라도) → 서버가 새 block_type enum 을 받는지 확인.
⑥ 검증     라이브 스토어프론트에서 그 페이지 확인
           (내용·구조·모바일·가독성). 공유 코드 바꿨으면 verify-live-unchanged 로
           기존 라이브 테넌트(예: wakechurch/dasom) PASS.
⑦ 원장     아래 원장에 done 처리(사용한 skin/block·특이사항 메모).
⑧ 다음     다음 페이지로. ①로.
```

한 단위 = 이 8스텝. 다 통과하기 전엔 다음 페이지를 컨텍스트에 끌어오지 않는다.

## 매핑 규칙 (섹션 → block_type) ★

각 시안 섹션을 우리 block_type 으로 옮기는 순서: **① 신호 읽기 → ② 룩업(표1·2) →
③ match/skin/new 판정 → ④ 리뷰표로 확인 → ⑤ 적용.** (엠마오 임포트로 검증됨.)

### ① 섹션에서 읽는 신호
| 시안 신호 | 의미 | 처리 |
|---|---|---|
| `<dc-import name="…Header/Footer">` | 크롬 | 페이지 블록 아님 → 테마 헤더/푸터 |
| `<sc-for list="{{ 이름 }}">` | **동적 리스트** | 리스트 **이름**으로 데이터 블록 직결(표1) — 가장 확실 |
| 인라인 텍스트·카드·이미지 | **정적** | 구조 패턴으로 정적 블록(표2) |
| `data-block="…"` (PREP-PROMPT로 요청) | **명시** | 그대로 사용 → 추론 0, 결정적 |
| `data-page-slug="…"` | 페이지 슬러그 | 그 화면의 page slug |

### ② 룩업
**표1 — sc-for 리스트명 → 데이터 블록 (결정적)**
```
sermons/sermonGrid/sermonList → recent_sermons  (큰 1개는 sermon_feature)
news/newsList                 → board(notices) 또는 event_grid
words(하루를 여는 말씀)        → recent_columns
worship                       → worship_schedule
staff                         → staff_grid
gallery/galleryTop/…          → album_gallery
school                        → features_grid (주일학교 부서)
cell(목장)                    → cell_grid
depts(장로·집사·부서)         → info_columns  (미매칭이면 NEEDS_BLOCK)
```
**표2 — 정적 패턴 → 정적 블록 (data-block 주석 없을 때만 추론)**
```
배경이미지+헤드라인+구절+버튼(첫 섹션) → hero_banner
카드 N개(eyebrow+제목+설명)            → features_grid
{라벨,시간} 열 띠 / 예배·시간·장소 표    → worship_schedule
이미지+제목+문단                        → text_image
큰 인용문+성경구절                       → quote_block
제목 아래 긴 문단                        → text_only
지도자리+주소                            → location_map (+contact_info)
라벨-값 셀 N개                           → info_columns
제목+버튼 1개 띠                         → call_to_action
로고 줄                                  → logo_bar
```

### ③ match / skin / new
| 상황 | 처리 |
|------|------|
| 후보 블록 있고 props에 시안 내용이 다 담김 | **match** (즉시 사용, 내용 verbatim) |
| 기능·props 맞고 **모양만 다름** | **skin** — 일단 match로 심고 "variant 필요" 플래그, 코드 스킨은 후속 |
| 어떤 블록 구조에도 안 맞음 | **new / NEEDS_BLOCK** — 가장 가까운 블록으로 두고 플래그, 신규는 사람 결정 |
| 상세 화면(설교/게시글/갤러리 상세) | **매핑 안 함** — 모듈 상세 라우트가 자동 렌더 |

**신규 블록 배선 = 5곳** (하나라도 빠지면 깨짐): 렌더 컴포넌트(`packages/blocks`) →
공유 BlockRenderer 매핑 → 서버 block_type enum(`pages/schema.ts`) → `registry.json`
(metadata, `flags.isHidden`) → 관리자 인스펙터. ⚠ 서버 enum(71) ⊂ registry(89) — pages
API 조합은 71 한정. **동적 콘텐츠**는 모듈 데이터를 fetch 하는 **데이터 블록**으로.

### ④ 리뷰표 (적용 전 확인)
```
NN 화면 → <slug>
  <섹션 요약>  → <block_type>  [match|skin|new]
  …
```
대표님이 "OK / 이건 skin 하지 말고 그대로 / 이건 새 블록" 정한 뒤 ⑤ 적용.

## 진행 원장 (Progress Ledger)

세션 동안 이 표를 유지·참조한다. 매 단위 끝나면 갱신. `done` 은 **⑥ 라이브 검증까지**
통과한 것만.

| # | 페이지/스크린 | slug | 상태 | 사용 skin/block | 메모 |
|---|--------------|------|------|-----------------|------|
| 1 | 홈 | `/` | ☐ todo | | |
| 2 | 교회 소개 | `about` | ☐ todo | | |
| … | … | … | | | |

- 상태: `todo → wip → done`. 신규 블록은 **블록 자체를 별도 단위**로 원장에 추가
  (렌더+인스펙터+enum 까지 done 이어야 그 블록을 쓰는 페이지가 done 가능).

## 하지 말아야 할 것

- ✗ 전체를 안 읽고 추론. ✗ 내용 지어내기 / 라이브·마이그레이션에서 끌어오기(카피는 시안 verbatim).
- ✗ 구조 근사. ✗ 여러 페이지 한꺼번에 조합 후 한 번에 검증. ✗ 낡은 로컬본 신뢰.
- ✗ **다크 배경 밴드**(교회 톤 위반). ✗ 코드에 hex 하드코딩(토큰만).

## 마이그레이션과의 관계

방금 만든 **마이그레이션**은 기존 사이트의 **구조**(정적/기능형 페이지 판단 + 데이터
블록 배치)를 가져온다. **Claude Design 임포트**는 그 위에 **디자인 시스템(테마 토큰 +
스킨/신규 블록)** 을 입히는 별도 레이어다. 순서: (선택) 마이그레이션으로 뼈대 →
STEP0 토큰 → 페이지별 시안 재현. 동적 데이터는 각 모듈의 `📥 URL에서 가져오기`.

## 한 줄 요약

> 시안은 길다. **한 페이지씩 — 현재본 재수신 → 재현 → 라이브 확인 → 원장 체크 →
> 다음.** 추론하지 말고, 지금 이 단위만 본다. 토큰은 STEP0 에서 먼저.
