# True Light / DW Church — Capabilities Catalog (for Claude Design import)

> Auto-generated 2026-11-08 by `scripts/design-importer/gen-catalog.ts` from
> `packages/blocks/src/registry.json`. **Do not hand-edit.** Map every section of your
> design to a `block_type` + a `variant` below; assign colors to the TOKEN ROLES (not free
> hex); tag anything with no match as `NEEDS_BLOCK: <what>` so it goes to the dev queue.

> **교회 톤 (필수):** 밝고 따뜻한 배경. **검정/다크 배경 밴드 금지** — onDark 역할은 사진
> 위 히어로 오버레이 같은 곳에만 최소로. 콘텐츠는 한국어 우선.

**Blocks:** 93 total — **72 palette** + 14 importer + 7 alias.

> **화면을 그릴 때 쓸 수 있는 것은 `palette` 72개뿐이다.**
> `alias` 는 레거시 이름이라 정식 이름을 써야 하고, `importer` 는 낡은 사이트를 옮겨올 때의
> 매핑 대상이거나 레이아웃 컨테이너여서 시안이 직접 쓰지 않는다. 아래 표의 surface 열을 보라.

## 우리 시스템이 그릴 수 없는 것 (설계 전에 읽을 것)

블록 목록을 다 알아도 아래를 어기면 시안을 버려야 한다. 각 항목에 **이유**를 달았으니
비슷한 경우에 적용하라.

1. **페이지는 섹션의 1차원 수직 스택이다.** 섹션과 섹션 사이에 2칼럼·사이드바를 만들 수
   없다. 2칼럼 레이아웃은 **블록 하나의 내부**에서만 가능하다.
   - 사이드 레일이 필요하면 **신규 블록이 아니라 옆 블록의 variant** 로 그려라.
     실제 예: 통합 피드 `latest_feed` 의 `rail-left` / `rail-right`.
   - 레이아웃 컨테이너(`layout_row`·`layout_columns`·`layout_section`)에 자식 블록을
     넣는 구성은 **운영자가 편집할 수 없으므로** 시안에서 쓰지 않는다.
2. **헤더·푸터는 테마가 소유한다.** 페이지 블록으로 그리지 말고 `dc-import` 로 분리하라.
   선택할 수 있는 것은 variant(헤더 12종·푸터 9종)뿐이다.
3. **콘텐츠 폭은 전 블록 공통이다** — `max-w-7xl` + `px-4 sm:px-6`. 섹션마다 다른 폭을
   쓰면 홈이 들쑥날쑥해진다.
4. **개별 글을 지어내지 않는다.** 설교 한 편·칼럼 한 편·앨범 한 장은 Content Module 의
   데이터다. 데이터 블록 자리만 두면 교회가 글을 올리는 만큼 채워지고, **글이 없으면
   블록이 스스로 숨는다**(빈 섹션이 생기지 않는다).
5. **같은 모듈을 연재별로 나눌 때 새 블록을 만들지 않는다.** 소스 문법
   `키[@카테고리][:라벨]` 로 한 블록에 여러 줄을 담는다
   (예: `column@교회이야기, column@시니어:시니어 라운지`). 칼럼 카테고리는 **한글 자유
   텍스트**이므로 영문 슬러그를 새로 만들지 말 것.
6. **이미 모듈이 있는 콘텐츠를 다른 모듈로 우회하지 않는다.** 아래 "Content modules" 표를
   먼저 보라 (예: '이달의 책'은 `book` 모듈이 있다 — 칼럼 카테고리로 만들지 말 것).
7. **variant 는 블록이 선언한 것만 쓴다.** 표의 variants 열에 없는 variant 를 쓰면 기본
   모양이 나오고, 시안과 달라진다. 모양이 꼭 필요하면 `NEEDS_VARIANT: <무엇>` 으로 적어라.
8. **상세 화면은 매핑하지 않는다.** 설교 한 편·게시글·앨범 상세는 모듈의 상세 라우트가
   자동으로 그린다. 시안에 그릴 필요가 없다.
9. **한글 조판**: 본문을 13px 아래로 내리지 말고, 넓은 자간(letter-spacing .1em 이상)은
   라틴 대문자 라벨에만 쓴다 — 한글에 주면 음절이 흩어진다.

## Token roles (assign your palette to these)

System color slots — fill hex, roles are fixed (emitted as the CSS var; blocks read the legacy `--dw-*` bridge):

| role | CSS var | use |
|------|---------|-----|
| `primary` | `--brand-primary` | Brand color — primary buttons, links, active states. |
| `secondary` | `--brand-secondary` | Deeper brand tone — footer / accent band (NOT a black dark-band; church tone stays light). |
| `accent` | `--brand-accent` | Eyebrows, small emphasis, secondary highlight (may equal primary). |
| `text` | `--brand-text` | Body / heading ink. |
| `muted` | `--brand-muted` | Secondary / caption text. |
| `background` | `--brand-background` | Page background (white / warm off-white). |
| `border` | `--brand-border` | Hairlines, card borders, dividers. |
| `surface` | `--brand-surface` | Alt band / card surface (subtle warm tint). |
| `onDark` | `--brand-onDark` | Text ON a photo/overlay hero (light ink). Used sparingly — see church tone note. |
| `onDarkMuted` | `--brand-onDarkMuted` | Muted text on a photo/overlay hero. |

- **`--brand-{slot}-fg`** foregrounds are WCAG-AA **auto-paired** (contrast.ts) — you do NOT assign them.
- **Customs are open-ended** — any extra color (e.g. category badge tones) is a named custom token OR supplied per-block in props; it never needs a system slot and is never hardcoded in block code.
- **Typography scales (11):** `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `body`, `caption`, `overline`, `label`, `button` — each with size / weight / lineHeight / letterSpacing (+ optional transform) per breakpoint (desktop/tablet/mobile).
- **Font roles:** `heading`, `body`, `korean` (Pretendard supported for Korean).
- **Radius:** `sm` / `md` / `lg` / `full`. **Section rhythm:** `--brand-section-py` (sm/md/lg via spacing). Express the design in these, not fixed px.
- **Apply the theme FIRST:** the styleguide → tenant theme via `PUT /api/v1/theme` (STEP 1) before any page, so every block is correct on first render.

## Content modules (dynamic data → data blocks)

> The migration/importer places a data-block SHELL; the actual rows are imported per-module (each admin page's 📥 URL에서 가져오기). Empty module → the block renders nothing.

| module | table | use |
|--------|-------|-----|
| `sermons` | `sermons` | 설교 — data blocks: recent_sermons, sermon_feature (+ sermon study fields → sermon_magazine). |
| `bulletins` | `bulletins` | 주보(weekly bulletin, PDF cover) — data block: recent_bulletins. |
| `columns` | `columns_pastoral` | 목회칼럼/묵상 — data block: recent_columns. |
| `albums` | `albums` | 앨범/갤러리 — data block: album_gallery. |
| `events` | `events` | 행사·소식 — data block: event_grid. |
| `staff` | `staff` | 교역자/섬기는 이 — data block: staff_grid (opt-in). |
| `history` | `history` | 교회 연혁 — data block: history_timeline. |
| `boards` | `boards / board_posts` | 게시판/공지 — data block: board (boardSlug: notices/free/...). |
| `banners` | `banners` | 메인 배너 슬라이더 — data block: banner_slider (category=main/sub). NOT auto-migrated. |
| `cells` | `cells` | 목장/소그룹 — data block: cell_grid. |
| `schedules` | `schedules` | 예배·모임 시간표 — data block: schedule_board (or static worship_schedule block). |
| `newcomers` | `newcomers` | 새가족 — public FORM block: newcomer_form (+ static newcomer_info). |
| `forms` | `form_submissions` | 일반 폼 — application_form_embed / form_split / contact_form. |

## Blocks (map your sections to these)

### 히어로 (`hero`)

| block_type | label | surface | variants | key props | reproduces |
|------------|-------|---------|----------|-----------|------------|
| `hero_banner` | 히어로 배너 | palette | `centered` `left` `masthead` | `variant` `height` `width` | Page hero — title/subtitle/CTA on image overlay or split-image. Always emit as the first block of a page. |
| `hero_full_width` | 히어로 (풀폭) | alias | — | `variant` `width` `height` | Legacy alias of hero_banner with width=full-bleed and height=lg. |
| `hero_image_slider` | 히어로 슬라이더 | alias | `full` `contained` | `category` | Legacy alias of banner_slider — pulls from /api/v1/banners?category=main. |
| `hero_overlap` | 히어로 + 겹침 안내카드 | palette | — | `eyebrow` `title` `subtitle` `backgroundImageUrl` `cards` | Hero image with an overlapping 3-column info card (service times / first-time). cards:[{title, rows:[{label,value}]}]. |
| `hero_split` | 히어로 (분할) | alias | `right` `left` | `variant` `imageSide` `height` | Legacy alias of hero_banner with variant=split-image. |
| `page_header` | 페이지 머리글 | palette | — | `eyebrow` `title` | 서브페이지 머리글 — 라벨(윗글) + 큰 제목 + 소개 문구 + 하단 더블 괘선 |

### 컨텐츠 (`content`)

| block_type | label | surface | variants | key props | reproduces |
|------------|-------|---------|----------|-----------|------------|
| `bento_grid` | 매거진 벤토 그리드 | palette | — | `columns` `tiles` | Magazine bento grid. tiles:[{colSpan,rowSpan,kind:'photo'|'card'|'list'|'pair', ...}]. |
| `button_group` | 버튼 그룹 | palette | `center` `left` | `title` `subtitle` `align` `buttons` | 제목 + 여러 개의 버튼 |
| `check_list` | 체크 리스트 | importer | — | `title` `items` `columns` `iconStyle` | Bulleted feature list with check/arrow/dot icons. |
| `church_intro` | 교회 소개 | palette | `with-image` `text-only` | `content` | 교회 소개 텍스트 |
| `custom_html` | 커스텀 HTML (시안 그대로) | importer | — | `html` | Renders raw HTML verbatim. Set by exact-design apply; do not emit from AI. |
| `dashboard_banner` | 대시보드 환영 배너 | palette | — | `eyebrow` `title` `subtitle` `buttonText` `buttonUrl` `secondaryButtonText` `secondaryButtonUrl` | Brand-colored welcome banner card. eyebrow(date)+title+subtitle + primary/secondary pill buttons. |
| `detail_rows` | 항목 리스트 (제목+설명) | palette | `cards` `ruled` | `title` `intro` `items` | Ruled heading + intro + rows. Each row: LEFT title+label / RIGHT description+meta. items:[{title,label,description,meta}]. |
| `directions_split` | 오시는 길(지도+연락처) | palette | `map-left` `map-right` | `eyebrow` `title` `churchName` `address` `phone` `email` | 좌측 지도 + 우측 연락처(교회명/주소/전화) |
| `faq_accordion` | FAQ | importer | — | `items` `columns` `defaultOpen` | FAQ accordion using <details><summary> — no JS required. |
| `features_grid` | 기능 그리드 | palette | `columns-3` `columns-2` `columns-4` | `title` `items` `columns` `cardStyle` `align` | Icon + title + description cards in a grid. columns: 2/3/4. |
| `first_time_guide` | 처음 오시는 분 | palette | `numbered` `icons` | `steps` | 단계별 안내 |
| `giving_info` | 헌금 안내 | palette | — | `title` `intro` `zelle` `bankInfo` `mailingName` `mailingAddress` `note` `qrImageUrl` | Giving INFO page (not a payment processor) — shows how to give: Zelle id, bank transfer, mailing address for checks, optional QR. Author the text/image fields; empty methods are hidden. |
| `highlight_media` | 큰 숫자 + 사진 | palette | — | `eyebrow` `bigText` `subText` `imageRatio` | 좌측에 큰 한 줄(시간·숫자·연도) + 우측 사진과 설명 — 예배 시간 안내 등 |
| `image_link_list` | 사진 + 항목 링크 목록 | palette | — | `eyebrow` `imagePosition` `items` | 대표 사진 옆에 번호 매긴 항목을 세우고 각 항목이 상세로 이어지는 목록 (비전·사역·프로그램 안내) |
| `info_bar` | 정보 바 (예배시간 등) | palette | — | `items` `background` `align` | Full-bleed colored band of N label+value cells. items:[{label,value}]. background palette key (default primary), white text. Distinct from info_columns. |
| `info_columns` | 정보 컬럼 (한눈에) | palette | `columns-3` `columns-2` `columns-4` | `title` `columns` `items` | 2-4 labeled info cells (eyebrow label + value), hairline grid. Use for service times / location / first-time-visitor at-a-glance. |
| `logo_title` | 로고+타이틀 | palette | `horizontal` `center` | `variant` `eyebrow` `title` `subtitle` `logoUrl` `logoWidth` | 로고 + 라벨 + 제목 |
| `mission_vision` | 미션 & 비전 | palette | `cards-4` `cards-3` `cards-2` `list` | — | Mission/vision statement card — emphasizes core values. |
| `newcomer_form` | 새가족 등록 폼 | importer | — | `title` `subtitle` | Newcomer self-registration FORM (not the 안내 block) — a public form that drops into the 새가족 관리 inbox. Author only title/subtitle. USE on a 새가족/처음오신분 page when the church wants visitors to register onl… |
| `news_split` | 소식 + 나눔 카드 (2단) | palette | — | `title` `items` `sideTitle` `buttons` `links` | News list + side card with CTAs. items:[{tag,title,date}], buttons:[{label,primary}], links:[]. |
| `page_subnav` | 페이지 헤더 + 서브메뉴 | palette | — | `title` `parentMenu` | Interior page header: breadcrumb + title + submenu row tied to a top-level menu, current page underlined. Pulls from /api/v1/menus. parentMenu selects the group (empty = auto from current page). |
| `pastor_message` | 담임목사 인사말 | palette | `right` `left` | `title` `pastorName` `message` `imageUrl` | Senior pastor's greeting — photo + message body. Author the message text (title=greeting headline, message=body). Use on the 교회소개/about and home pages. |
| `prose_image` | 제목+본문+이미지 (세로) | palette | — | `title` `body` `imageUrl` `imagePosition` | One-column reading layout: ruled heading + rich-text body + full-width image (below by default). NOT a side-by-side split. |
| `quick_links` | 바로가기 | palette | `card` `tiles` | `title` `items` | Side widget: title + arrow-linked shortcut list. items: [{title, content(=url), icon?}]. variant 'tiles' renders a 6-col icon+label grid. |
| `quote_block` | 인용구 | palette | `card` `simple` `highlight` `verse` | `title` `content` | Pull quote — customer testimonial single or brand slogan callout. |
| `schedule_split` | 예배 안내(이미지+표) | palette | `image-left` `image-right` | `imageUrl` `groups` | 좌측 이미지 + 우측 예배/모임 표 여러 개 |
| `section_header` | 섹션 헤더 | palette | `center` `left` | `title` `subtitle` | Standalone section title + subtitle for separating major page regions. |
| `sermon_feature` | 설교 피처드 (대표+목록) | palette | — | `eyebrow` `title` `featured` `items` | Featured sermon: big card + side list. featured:{imageUrl,title,meta}, items:[{imageUrl,title,meta}]. |
| `stats_counter` | 통계 카운터 | importer | — | `title` `columns` `items` `align` `bgMode` | N-column number+label grid for KPIs / 회사 성과 지표. |
| `steps_list` | 단계별 안내 | palette | `left` `center` | `title` `items` `layout` `bgMode` | Process / 'How we work' steps. layout: vertical (full-width rows) or grid (3-up overview). |
| `testimonials` | 고객 후기 | importer | — | `title` `items` `layout` `bgMode` | Quote + author + role/company cards. layout: grid-2/grid-3/single. |
| `text_image` | 텍스트 + 이미지 | palette | `right` `left` | `title` `content` `imageUrl` `layout` | Side-by-side text and image. Use for service intros, CEO greetings, feature spotlights. |
| `text_only` | 텍스트만 | palette | `left` `center` | `title` `content` | Plain HTML content block. Use for legal copy, hours of operation as <ul>, FAQ-style intro. |
| `values_grid` | 가치 카드 그리드 | palette | `columns-3` `columns-2` `columns-4` `chips` `split-links` | `title` `columns` `items` | Ruled section heading + N cards, each with an OVERLINE eyebrow + title + body. items:[{overline,title,description}]. columns: 2/3/4. |
| `visitor_welcome` | 새가족 환영 | palette | `split` `centered` | `message` | 새가족 환영 메시지 |
| `week_schedule` | 이번 주 일정 | palette | — | `title` `items` | This-week agenda as a row list: day badge + event/time/place. Distinct from schedule_board tables. |
| `worship_schedule` | 예배 시간 안내 (정적) | palette | — | `title` `items` | Static worship-times table — author items: [{label, time, place}] directly. For a DB-managed grouped schedule use schedule_board instead. |
| `worship_times` | 예배 시간 | palette | `table` | `services` | 예배 시간 안내 |

### 미디어 (`media`)

| block_type | label | surface | variants | key props | reproduces |
|------------|-------|---------|----------|-----------|------------|
| `image_gallery` | 이미지 갤러리 | palette | `grid` `masonry` | `title` `images` | Static image gallery — content is in props.images (URL list), not fetched from albums. |
| `video` | 비디오 | palette | — | `title` `youtubeUrl` | YouTube embed by URL. |

### 데이터 블록 (`data`)

| block_type | label | surface | variants | key props | reproduces |
|------------|-------|---------|----------|-----------|------------|
| `album_gallery` | 앨범 갤러리 | palette | `grid-4` `grid-3` `grid-2` | `title` `limit` `variant` | Album cover grid — pulls from /api/v1/albums. variant: grid-2/grid-3/grid-4/masonry. |
| `banner_slider` | 배너 슬라이더 | palette | — | `category` | Auto-rotating banner carousel — pulls from /api/v1/banners. category=main for landing, sub for inner pages. |
| `board` | 게시판 | palette | `list` `grid-2` `grid-3` | `title` `boardSlug` `limit` | Board/forum widget — pulls from /api/v1/boards/{boardSlug}/posts. Use boardSlug like notices/faq/careers/resources. |
| `cardnews` | 카드뉴스 | palette | `carousel` `grid` `rail` | `variant` `eyebrow` `title` `items` | 여러 장 카드로 넘겨 보는 소식(카드뉴스 관리에서 업로드). 표지를 누르면 뷰어가 열림 |
| `cell_grid` | 목장 안내 | palette | `grid-3` `grid-2` `grid-4` | `title` `limit` `columns` | 목장(small-group/cell) grid — pulls from /api/v1/cells. Each card shows the 목장 name, leader, meeting day/time, location. USE on a 목장/공동체/소그룹 page. Data block: write only the section title. |
| `contact_info` | 연락처 정보 | palette | — | — | Contact info auto-pulled from tenant settings (phone/email/address/social). |
| `devotion_reader` | 말씀 묵상 (QT) | palette | `default` `teaser` | `title` `eyebrow` | 주간 묵상 목록 + 오늘 묵상 (읽기 전용, 관리자 업로드) |
| `event_grid` | 행사/소식 그리드 | palette | `cards-4` `cards-3` `cards-2` | `title` `limit` | Church events/news grid — pulls from /api/v1/events (title + date + image). Use on the 행사/events page and home. variant: grid-2/grid-3/grid-4. |
| `featured_event` | 다가오는 행사(알림바) | palette | — | `label` `buttonText` | 행사 1개를 골라 상단 알림바로 노출 · 미선택/종료일 경과 시 자동 숨김 |
| `form_split` | Form + Text (2 columns) | palette | — | `formSlug` `layout` `title` `subtitle` `content` | Two-column block: application form (by formSlug) on one side, title+subtitle+content text on the other. layout form-left or form-right. |
| `history_timeline` | 교회 연혁 (자동) | palette | `left` `alternating` | `title` | Church history timeline — pulls from /api/v1/history (year-ordered milestones). Use on the 연혁/history page. For a hand-authored static timeline use the timeline block. |
| `latest_feed` | 통합 피드(최신) | palette | `cards` `rail-left` `rail-right` | `title` `sources` `limit` `perSource` `columns` `showTabs` `allLabel` | 설교노트·저널·주보·설교·책 등 여러 모듈의 최신글을 한 섹션에 합쳐 탭으로 걸러 표시 · 저널은 @카테고리로 연재별 탭 분리 · 등록된 글이 없으면 자동 숨김 |
| `news_announcements` | 주보·광고 | palette | — | `title` `newsLimit` `moreUrl` `buttons` | 주보(주보 모듈) + 광고(교회소식 게시판, 카테고리 배지) 목록 + 원하는 만큼 추가하는 버튼 |
| `online_bulletin` | 온라인 주보 | palette | — | — | Full online worship bulletin, scroll-down. Fetches the latest published online_bulletin. Distinct from recent_bulletins (uploaded PDF/image bulletins). No items in props — content comes from the 온라인 … |
| `online_bulletin_list` | 온라인 주보 목록 | palette | — | `eyebrow` `title` `limit` | 온라인 주보 전체 목록 — 연도 탭 + 최신 주보 크게 + 월별 그룹 리스트 |
| `recent_books` | 책 추천 | palette | `grid-3` `grid-2` `grid-4` `list` `feature-row` | `title` `limit` | Church book recommendations with cover, recommender and recommendation text. Featured book shown large. |
| `recent_bulletins` | 최근 주보 | palette | `list` `grid-2` `grid-3` `grid-4` `grid-5` `grid-6` | `title` `limit` `variant` | Weekly bulletins (주보) grid — pulls from /api/v1/bulletins (PDF cover + date + view/download). Use on the 주보/bulletins page. variant: grid-3/grid-4/list. |
| `recent_columns` | 최근 목회칼럼 | palette | `grid-3` `grid-2` `grid-4` `list` `feature-dark` | `title` `limit` `variant` | Pastoral columns grid — pulls from /api/v1/columns (title + author + date + excerpt). Use on the 목회칼럼/columns page. variant: grid-2/grid-3/list. |
| `recent_sermon_note` | 최근 설교노트 | palette | `default` `hero-split` | `eyebrow` `moreLabel` `moreUrl` | 설교노트 관리의 최신 1건(대표 이미지·제목·본문 발췌)을 홈에 표시 · 마스트헤드 변형(우측 링크 레일) |
| `recent_sermons` | 최근 설교 | palette | `grid-4` `grid-3` `grid-2` `list` `featured` `card` | `title` `limit` `variant` | Recent sermons grid — pulls from /api/v1/sermons (YouTube + title + preacher + date + scripture). Use on the home page and the 설교/sermons page. variant: grid-2/grid-3/grid-4/list. |
| `schedule_board` | 예배 및 모임 시간 | palette | `image-left` `image-right` `no-image` | `title` `imagePosition` `imageUrl` | Worship & meeting schedule — pulls from /api/v1/schedules (grouped tables, each with a name). imagePosition: left/right/none. Use on the 예배안내/worship page and the home page. |
| `sermon_magazine` | 설교 매거진 | palette | `default` `compact` | `title` | 이번 주 설교 — 한줄요약·써머리·질문(관찰·심화·적용) |
| `sermon_meditation` | 주일설교 묵상 | palette | — | `eyebrow` `asideTitle` `moreLabel` `bulletinLabel` `bulletinUrl` `showAside` | 대표 설교(설교 모듈 최신) + 이번 주 묵상 사이드바(말씀·책·기도제목·주보) — 에디토리얼 홈용 |
| `sermon_note_list` | 설교노트 목록 | palette | — | `eyebrow` `title` `limit` | 설교노트 전체 목록 — 대상 탭(장년/EM/Youth/Children/Kids) + 최신 노트 피처 + 카드 그리드 |
| `staff_grid` | 교역자 그리드 | palette | `grid-4` `grid-3` `grid-2` `grouped` | `title` `limit` `layout` `photoStyle` `columns` `showItems` | Clergy/staff data block — pulls from /api/v1/staff (photo + name + role + bio). Use on the 교역자/staff page. For a non-DB hand-authored team list use team_members. |
| `verse_of_day` | 오늘의 말씀 | palette | — | `eyebrow` | 말씀 관리에 등록한 현재 말씀 1개를 표시 · 없으면 자동 숨김 |
| `video_board` | 영상 (YouTube) | palette | `grid-1` `grid-2` `grid-3` `grid-4` | `title` `category` `limit` `variant` | YouTube video board — pulls from /api/v1/videos, filterable by category. Use for 찬양/예배실황/간증 video pages. variant: grid-2/grid-3/grid-4. |

### 컨버전 (`conversion`)

| block_type | label | surface | variants | key props | reproduces |
|------------|-------|---------|----------|-----------|------------|
| `address_info` | 주소 정보 | alias | `cards` `inline` | — | Legacy alias of contact_info that emphasizes the address/map line. |
| `call_to_action` | CTA (구버전) | alias | `centered` `split` `banner` | `title` `buttonText` `buttonUrl` | Legacy alias of cta_section (variant=boxed-card). |
| `cell_report` | 목장사역보고서 | palette | — | `title` `subtitle` | 목장 인도자가 주간 사역을 보고 → 폼 제출 인박스 |
| `contact_form` | 문의 폼 | palette | `stacked` `side-by-side` `ruled` | — | Lead-capture / general inquiry form. Submits to internal contact endpoint. |
| `cta_section` | CTA (행동 유도) | importer | `inline-banner` `boxed-card` `image-overlay` `split-image` `stats-strip` `contact-info` | `title` `buttonText` `buttonUrl` `variant` | Conversion CTA. Pick variant: inline-banner=full-width strip, boxed-card=highlighted box, image-overlay=hero-style full-bleed background image with eyebrow+title+subtitle+CTA centered on top (best fo… |
| `custom_form` | 커스텀 폼 | palette | — | `formSlug` | '폼 만들기'에서 설계한 폼을 slug로 불러와 표시 → 폼 제출 인박스 |
| `location_map` | 지도 | palette | `default` | `address` `zoom` | Map embed by address or lat/lng. Pair with contact_info on the contact page. |
| `map_embed` | 지도 (임베드) | alias | `full` `with-info` | `address` | Legacy alias of location_map. |
| `newcomer_info` | 새가족 안내 | palette | — | `title` `subtitle` `description` `buttonText` `buttonUrl` | New-family welcome + register CTA. Author title/subtitle/description + buttonText/buttonUrl. Use as a conversion section on home and the 새가족 page. |
| `newsletter_signup` | 뉴스레터 신청 | alias | `inline` `card` | — | Legacy alias of subscribe_form. |
| `notification_prefs` | 알림 설정 | palette | — | — | Per-category push notification preferences: on/off, send time, quiet hours. |
| `push_subscribe` | 알림 받기 | palette | — | — | Web push opt-in button. Asks permission only on user tap; iOS needs Home Screen install. |

### 레이아웃 (`layout`)

| block_type | label | surface | variants | key props | reproduces |
|------------|-------|---------|----------|-----------|------------|
| `accordion` | 아코디언 | importer | — | `items` `children` | Accordion container. Hidden from palette; for FAQ-style stacks use faq_accordion instead. |
| `divider` | 구분선 | palette | `line` `dots` `gradient` | `spacing` | Visual divider between sections. spacing: sm/md/lg. |
| `layout_columns` | 컬럼 (레이아웃) | importer | `columns-2` `columns-3` `columns-4` | `columns` `children` | Layout container — N columns of child blocks. Hidden from palette. |
| `layout_row` | 행 (레이아웃) | importer | — | `children` | Layout container — horizontal row of child blocks. Hidden from palette; only added inside another layout. |
| `layout_section` | 섹션 (레이아웃) | importer | — | `children` | Layout container — wraps children with section padding. Hidden from palette. |
| `tabs` | 탭 | importer | — | `tabs` `children` | Tabbed container. Hidden from palette. |
| `three_columns` | 3단 컬럼 | importer | — | `children` | Three-column layout. Hidden from palette; agent uses layout_columns with columns:3 instead. |
| `two_columns` | 2단 컬럼 | importer | — | `children` | Two-column layout. Hidden from palette; agent uses layout_columns with columns:2 instead. |
