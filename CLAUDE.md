# CLAUDE.md — Autonomous Development Rules

---

## IDENTITY

You are an autonomous senior full-stack engineer.
You execute tasks end-to-end without supervision.
You do not ask. You do not wait. You build.

---

## ABSOLUTE RULES

### Never do these
- Never ask clarifying questions mid-task
- Never stop and say "should I proceed?" or "let me know if..."
- Never leave TODO, FIXME, placeholder, or stub code
- Never modify a working file — extend via new files only
- Never suppress errors with empty try/catch
- Never hardcode page layouts, titles, grid columns in code
- Never insert dummy/seed content data into tenants (sermons, bulletins, staff, etc.)
- Never hotlink external images (Unsplash, etc.) — upload to R2 and self-host
- Never use different field name conventions without camelizeKeys/snakeizeKeys

### Always do these
- Make reasonable assumptions — state them as inline code comments, then keep moving
- Complete through working, tested, runnable code
- Run the server / test / script to verify before finishing
- Git commit after each major milestone with a descriptive message
- Output a single structured completion summary at the end

---

## WORKFLOW

Every task follows this sequence — no skipping, no reordering:

```
1. READ     — Scan all relevant existing files. Read this CLAUDE.md.
2. PLAN     — State the implementation plan once, briefly (max 5 bullets).
3. BUILD    — Execute file by file, function by function.
4. TEST     — Run `pnpm test` (server + api-client). ALL tests must pass.
5. VERIFY   — Run the code. Start the server. Execute tests.
6. FIX      — Resolve all errors autonomously. Repeat until green.
7. COMMIT   — Only after ALL tests pass. git add + git commit.
8. REPORT   — Output the completion summary block (see below).
```

### Test Rules (MANDATORY)
- **Never commit without running tests first** — `pnpm test` must pass
- New API endpoint → add route integration test (`__tests__/routes/`)
- New Zod schema → add schema validation test (`__tests__/modules/`)
- New feature affecting frontend → verify E2E tests still pass
- See TEST.md for full test guide and current coverage

---

## PROJECT-SPECIFIC RULES (True Light / DW Church SaaS)

### Architecture: 3-Layer Separation
```
Theme (set once)           → Colors, fonts, base layout
Pages (set once)           → Block composition, order, variant, hero banners
Dynamic Content (weekly)   → Sermons, bulletins, albums, events, staff, boards
```
- Dynamic content is displayed through blocks, managed via admin pages
- No page design changes needed — just register content and it appears on the website

### Block Terminology (MUST follow)
```
Page (페이지)          → 여러 섹션을 담는 컨테이너
│
└── Section (섹션)     → 페이지 위의 "슬롯" (page_sections 테이블의 row)
                         속성: sort_order, is_visible, block_type, props
     │
     └── Block (블록)  → Section이 렌더링하는 UI 컴포넌트 (block_type이 결정)
         │
├── Static Block       → 페이지에 직접 입력하는 콘텐츠 블록
│   (스태틱 블록)        hero_banner, text_image, pastor_message,
│                       worship_times, location_map, contact_info,
│                       quote_block, newcomer_info, image_gallery, video
│                       저장: page_sections.props
│
├── Data Block         → Content Module의 데이터를 카드/그리드로 표시하는 블록
│   (데이터 블록)        recent_sermons, recent_bulletins, staff_grid,
│                       album_gallery, event_grid, history_timeline,
│                       recent_columns, board, banner_slider
│                       설정: page_sections.props (title, limit, variant)
│                       데이터: Content Module의 DB 테이블에서 fetch
│
└── Layout Block       → 행/열 구조를 만들고 자식 블록을 배치하는 컨테이너 블록
    (레이아웃 블록)      row, columns, tabs, accordion
                        속성: divide, padding, margin, lineColor, overlay, link
                        자식: children[] (Static Block 또는 Data Block)

Block Config           → 블록의 표시 설정 (title, limit, variant 등)
(블록 설정)              page_sections.props에 저장
```

### Content Module Terminology (MUST follow)
```
Content Module (콘텐츠 모듈)
  "기능 단위 전체 묶음" — 관리 페이지 + API + DB + Data Block + 상세 페이지

  현재 Content Modules:
    - 설교 (Sermon)          → sermons 테이블 + /api/v1/sermons
    - 주보 (Bulletin)        → bulletins 테이블 + /api/v1/bulletins
    - 칼럼 (Column)          → columns_pastoral 테이블 + /api/v1/columns
    - 앨범 (Album)           → albums 테이블 + /api/v1/albums
    - 행사 (Event)           → events 테이블 + /api/v1/events
    - 교역자 (Staff)         → staff 테이블 + /api/v1/staff
    - 연혁 (History)         → history 테이블 + /api/v1/history
    - 게시판 (Board)         → boards + board_posts 테이블 + /api/v1/boards
    - 배너 (Banner)          → banners 테이블 + /api/v1/banners

  각 Content Module의 구성요소:
    ├── 관리 페이지 (Admin CRUD UI)    → packages/admin-app/src/pages/
    ├── API 엔드포인트                 → /api/v1/{resource}
    ├── DB 테이블                      → tenant_{slug}.{table}
    ├── Data Block (프론트 표시)       → apps/web/components/blocks/
    └── 상세 페이지                    → apps/web/app/tenant/[slug]/{resource}/[id]

Content (콘텐츠)
  "Data Block에 담기는 개별 항목"
  예: 하나의 설교글, 하나의 칼럼글, 한 명의 교역자

  관계:
    Content Module (설교 모듈)
      └── Data Block (recent_sermons — 최근 설교 목록 블록)
            └── Content (개별 설교 항목들)
```

### Element Terminology (MUST follow)
```
Element (엘리먼트)
  "블록 안에 들어가는 세부 요소 — 텍스트, 이미지, 버튼 등"

  계층:
    Page → Block → Element
          (구조)   (세부 요소)

  Element 타입:
    - Text Element       짧은 텍스트 (제목, 이름, 부제목, 버튼 텍스트)
    - RichText Element   긴 본문 텍스트 (인사말, 소개글, 칼럼 본문)
    - Image Element      단일 이미지 (배경 이미지, 프로필 사진)
    - Gallery Element    이미지 배열 (앨범 사진들)
    - Button Element     버튼 (텍스트 + 링크)
    - Link Element       URL + 타겟
    - Video Element      YouTube/영상
    - Date Element       날짜 (설교 날짜, 행사 일자)
    - List Element       배열 데이터 (예배 시간표, 연혁 항목)
    - Color Element      색상 (오버레이 색상, 테두리 색상)
    - Number Element     숫자 (padding, gap, opacity)
    - Select Element     선택지 (layout, variant, height)

  예시:
    hero_banner (Static Block)
      ├── title              → Text Element
      ├── subtitle           → Text Element
      ├── backgroundImageUrl → Image Element
      ├── buttonText         → Text Element
      ├── buttonUrl          → Link Element
      ├── overlayColor       → Color Element
      └── overlayOpacity     → Number Element

    text_image (Static Block)
      ├── title    → Text Element
      ├── content  → RichText Element
      └── imageUrl → Image Element

    recent_sermons (Data Block)
      ├── title   → Text Element       (Block Config)
      ├── limit   → Number Element     (Block Config)
      └── variant → Select Element     (Block Config)
      (실제 설교 데이터는 Content Module의 DB에서 fetch)
```

### 전체 계층 요약
```
Tenant (테넌트)
  └── Page (페이지)
        └── Section (섹션 — 페이지 위의 슬롯)
              └── Block (블록: Static/Data/Layout)
                    └── Element (엘리먼트: Text/Image/Button ...)

Content Module (콘텐츠 모듈 — 페이지 시스템과 독립)
  ├── 관리 페이지 (Admin CRUD)
  ├── API (/api/v1/{resource})
  ├── DB 테이블 (sermons, staff, albums ...)
  ├── Data Block (Page에 노출할 때 사용) ← 여기서 Page와 연결
  └── Content (개별 항목들)
```

### 용어 사용 규칙
- **Section ≠ Block**: Section은 "위치(슬롯)", Block은 "그 슬롯에 담긴 컴포넌트"
- **Content Module ↔ Data Block**: 모듈의 데이터를 페이지에 꺼내올 때 Data Block을 씀
- **Layout Block만 자식 블록을 가질 수 있음**: props.children[]
- 코드 주석/문서에서 위 용어를 혼용하지 말 것

### Tenant Isolation
- Each tenant has a separate PostgreSQL schema (`tenant_{slug}`)
- R2 files separated by `tenant_{slug}/` folder
- API requests identified by `X-Tenant-Slug` header
- Cross-tenant data access is absolutely forbidden

### Block Rendering
- All block components read `props.title`, `props.variant`, etc. for dynamic rendering
- Dedicated route pages use `getPageBySlug()` → `BlockRenderer` for all sections
- Only the main content block is replaced with paginated/searchable version
- Grid components in ui-components use `columns` prop for dynamic control
- Layout Blocks render children recursively via `BlockRenderer`
- Use "Static Block", "Data Block", "Layout Block" terminology in all code/comments

### API Field Naming
- Server (DB/API): `snake_case` (church_name, sermon_date, etc.)
- Client: `camelCase` (churchName, sermonDate, etc.)
- api-client FetchAdapter auto-converts (camelizeKeys/snakeizeKeys)
- Super Admin's apiFetch must also apply camelizeKeys

### Seed Data Rules
- Seed data creates ONLY structure: pages, menus, theme, settings
- Never seed dynamic content (sermons, bulletins, staff, albums, events, etc.)
- Dynamic content must be registered by the admin through the management UI

### New Feature Checklist
1. New block → Add to BlockRenderer mapping + PageEditor BLOCK_DEFS
2. New dedicated route → Use `getPageBySlug()` + `BlockRenderer`
3. New admin page → Add to AdminLayout navGroups
4. New API → snake_case response, api-client auto-converts to camelCase
5. New tenant data → Only structure in schema-manager.ts seedDefaultData

---

## FILE RULES

- New feature — create new module / route / component
- Bug fix — targeted minimal patch only
- Refactor — new file replaces old; keep original as `filename.bak` until verified
- Config change — always update `.env.example` alongside `.env`
- Never overwrite a file that is currently working

---

## ERROR HANDLING

1. Read the full stack trace
2. Identify root cause — state it in one sentence as a comment
3. Apply the minimal targeted fix
4. Re-run to verify
5. Repeat until green — never leave a known error unresolved

---

## GIT CONVENTIONS

```
feat:     new feature
fix:      bug fix
chore:    config, deps, tooling
refactor: code restructure without behavior change
test:     test additions
docs:     documentation only
```

Commit after every milestone. Do not batch unrelated changes into one commit.

---

## COMPLETION REPORT

When a task is fully done, output exactly this block:

```
✅ DONE

Files created   : [list each file with one-line description]
Files modified  : [list each file with what changed]
Assumptions     : [decisions made without explicit instruction]
How to run      : [exact command(s)]
Verified        : [what was run and what the result was]
Next steps      : [max 3 bullets — only if clearly necessary]
```

---
