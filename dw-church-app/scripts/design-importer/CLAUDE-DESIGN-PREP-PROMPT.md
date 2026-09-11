# Claude Design → True Light / DW Church 준비 프롬프트

> **목적:** Claude Design 시안을 우리 블록 시스템에 **결정적으로(deterministic)**
> 옮기려면, 시안 쪽에 "무엇이 어떻게 있어야 하는지"가 명확히 정리돼 있어야 한다.
> 이 문서는 시안을 만들거나 정리할 때 Claude Design 프로젝트에 그대로 붙여 넣는
> **준비 프롬프트**다. 항목이 빠지면 임포터는 추론하게 되고, 추론은 곧 어긋난
> 결과가 된다.
>
> 함께 볼 것: 실제 임포트 방식 [CLAUDE-DESIGN-IMPORT-GUIDE.md](./CLAUDE-DESIGN-IMPORT-GUIDE.md),
> 토큰 계약 [CLAUDE-DESIGN-TOKENS.md](./CLAUDE-DESIGN-TOKENS.md).

---

## 반드시 함께 첨부할 2개 파일

프롬프트만 주면 Claude Design 이 **레퍼런스 없이 추측**한다. 아래 2개를 **함께
붙여넣어야** 자기 디자인을 우리 **실제 블록명·토큰 역할**에 매핑하고, 매칭 안 되는
것만 `NEEDS_BLOCK` 으로 표시한다.

1. **[CLAUDE-DESIGN-CATALOG.md](./CLAUDE-DESIGN-CATALOG.md)** — 블록 카탈로그(89블록:
   block_type·key props·용도) + 토큰 역할 + 콘텐츠 모듈. `gen-catalog.ts` 자동생성.
2. **[CLAUDE-DESIGN-TOKENS.md](./CLAUDE-DESIGN-TOKENS.md)** — 토큰 계약 + STEP1 선적용.

이 첨부가 있으면 `match(재사용) / skin(디자인만 다름) / new(개발 필요)` 분류를
Claude Design 이 스스로 해서 돌려준다.

---

## 📋 프롬프트 (Claude Design 프로젝트에 붙여넣기 — 위 2개 파일과 함께)

```
You are preparing a KOREAN CHURCH website design that will be imported,
deterministically, into True Light (DW Church)'s existing block system — not
rebuilt from scratch. You are given two attachments: CLAUDE-DESIGN-CATALOG.md
(the real block types, token roles, and content modules) and
CLAUDE-DESIGN-TOKENS.md (the token contract). USE THEM: map every section to a
`block_type` + `variant` from the catalog, assign colors to the catalog's TOKEN
ROLES (not free hex), and tag anything with no matching block as
`NEEDS_BLOCK: <what it needs>` (that goes to our dev queue). Organize the design
as a STRUCTURED SPEC — section by section, tokens and named blocks, verbatim
content — never pixel positions.

CHURCH TONE (hard rules):
- Light, warm, reverent. NO black / dark background bands. The `onDark` role is
  only for text over a hero background PHOTO + overlay, never whole dark sections.
- Korean-first content (한국어). Provide an English overlay only if the church is
  bilingual (one page + per-section overlay, never /ko //en duplicates).
- Real church usage, warm plain Korean — not marketing jargon.

Deliver the following, clearly separated:

1. DESIGN SYSTEM (one place, reused by every page)
   - Palette assigned to the catalog's TOKEN ROLES: the 10 system slots
     (primary, secondary, accent, text, muted, background, border, surface,
     onDark, onDarkMuted). Any extra color is a named CUSTOM or a per-block prop
     — never a new system slot. Do NOT assign `-fg` (auto-paired for contrast).
   - Typography: heading font, body font, Korean font (Pretendard ok); the 11
     type scales (h1–h6, body, caption, overline, label, button) with
     size / weight / letter-spacing per role — fill only the ones you use.
   - Radius (sm/md/lg/full) and section vertical rhythm (sm/md/lg).
   - State it once. Every page references these roles, never raw hex.

2. PAGES (one block per page, top to bottom)
   For each page: page NAME, ROUTE/SLUG, and an ordered list of SECTIONS.
   For each section:
     - the PATTERN / block_type from the catalog (hero, features_grid, steps_list,
       pastor greeting text_image, worship_schedule, faq_accordion, cta_section, …),
     - the VARIANT / tone (light band vs surface tint, card vs hairline, columns),
     - the exact CONTENT verbatim (headings, body, labels, list items),
     - the STRUCTURE (columns, split, sticky sidebar, groups, chips/tabs, steps).
   RULE: every page MUST end with a CTA section.

3. NAVIGATION & CHROME
   - Top nav items + order; SUBMENUS (which parent, which children).
   - Header CTA (e.g. 새가족 / 오시는 길 / 예배 안내) label + target; utility bar
     (한/영, Giving) if any.
   - Footer: church name/line, one contact line, address, service times, copyright.

4. MOBILE (per section, not "figure it out")
   - What stacks to 1 column, what hides, how tabs/chips behave, image placement.
     If it's a plain vertical stack, say so.

5. FUNCTIONAL / INTERACTIVE
   - Filters/tabs: which exist, default state, what each shows.
   - Forms: every field + label + placeholder, submit label, success message
     (새가족 등록 newcomer_form / 문의 contact_form / 신청서 application_form_embed).
   - Cross-links: card → which detail page; breadcrumbs; contact routing.
   - Dynamic data: which sections come from a CONTENT MODULE (설교/주보/칼럼/앨범/
     행사/교역자/연혁/게시판/배너/목장) vs static content. Name the module + data block.

6. CONTENT & DATA SOURCES
   - Mark which copy is final vs placeholder.
   - Flag OPERATIONAL FACTS to confirm with the church (예배 시간, 주소, 전화,
     담임목사명, 계좌/헌금 정보) — NOT authoritative in the mockup.
   - Sermons/bulletins/albums/board POSTS are imported per-module later (the design
     just places the data block) — do not invent individual posts.

7. IMAGES / ASSETS
   - List each image, its role (hero, portrait, background), aspect ratio.
   - Images are self-hosted per tenant on R2; placeholders are fine during build,
     replaced by generated/real images later.

Output as headed sections in this exact order. Be explicit and verbatim — an
importer treats anything vague as "reproduce structurally," anything omitted as
"does not exist."
```

---

## ✅ 임포트-준비 체크리스트

시안을 임포트하기 전에 아래가 시안 문서에 **명시**돼 있는지 확인. 비면 그 부분은
임포터가 추론한다 → 채운 뒤 시작.

**디자인 시스템**
- [ ] 팔레트가 **역할명 + hex** (10 슬롯). "따뜻한 느낌" 아니라 정확한 값.
- [ ] **다크 배경 밴드 없음** (교회 톤). onDark 는 히어로 사진 위만.
- [ ] 타입 스케일 역할별 size/weight/letter-spacing + heading/body/korean 폰트.
- [ ] radius(sm/md/lg/full) · 섹션 리듬(sm/md/lg).

**페이지별**
- [ ] 페이지마다 이름 + slug + 섹션 순서.
- [ ] 섹션마다 block_type · 변형 · 내용(verbatim) · 구조.
- [ ] 모든 페이지가 CTA 로 끝남.
- [ ] 정적 콘텐츠 vs 데이터 모듈(설교/주보/칼럼/앨범/행사/교역자/연혁/게시판/목장) 구분.

**내비 & 크롬**
- [ ] 상단 nav·순서, 서브메뉴. 헤더 CTA·유틸바(한/영·Giving). 푸터(교회명·연락·주소·예배시간).

**모바일 / 기능 / 내용**
- [ ] 섹션별 모바일 동작. 폼 필드·성공 메시지. 크로스링크.
- [ ] 확정 카피 vs placeholder. **운영 정보(예배시간·주소·전화·헌금)** 는 "교회 확인 필요".
- [ ] 각 섹션이 카탈로그 `block_type`+variant 로 매핑(미매칭은 `NEEDS_BLOCK`). 한국어 우선.
- [ ] 이미지 목록·역할·비율(테넌트 R2 자체호스팅; 개발 중 placeholder 허용).
