# True Light / DW Church — Capabilities Catalog (for Claude Design import)

> Auto-generated 2026-09-11 by `scripts/design-importer/gen-catalog.ts` from
> `packages/blocks/src/registry.json`. **Do not hand-edit.** Map every section of your
> design to a `block_type` + a `variant` below; assign colors to the TOKEN ROLES (not free
> hex); tag anything with no match as `NEEDS_BLOCK: <what>` so it goes to the dev queue.

> **교회 톤 (필수):** 밝고 따뜻한 배경. **검정/다크 배경 밴드 금지** — onDark 역할은 사진
> 위 히어로 오버레이 같은 곳에만 최소로. 콘텐츠는 한국어 우선.

**Blocks:** 89 total — 72 palette + 8 importer + 9 alias (all usable by the importer).

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

| block_type | label | surface | key props | reproduces |
|------------|-------|---------|-----------|------------|
| `hero_banner` | 히어로 배너 | palette | `variant` `height` `width` | Page hero — title/subtitle/CTA on image overlay or split-image. Always emit as the first block of a page. |
| `hero_full_width` | 히어로 (풀폭) | alias | `variant` `width` `height` | Legacy alias of hero_banner with width=full-bleed and height=lg. |
| `hero_split` | 히어로 (분할) | alias | `variant` `imageSide` `height` | Legacy alias of hero_banner with variant=split-image. |
| `hero_image_slider` | 히어로 슬라이더 | alias | `category` | Legacy alias of banner_slider — pulls from /api/v1/banners?category=main. |
| `hero_overlap` | 히어로 + 겹침 안내카드 | palette | `eyebrow` `title` `subtitle` `backgroundImageUrl` `cards` | Hero image with an overlapping 3-column info card (service times / first-time). cards:[{title, rows:[{label,value}]}]. |

### 컨텐츠 (`content`)

| block_type | label | surface | key props | reproduces |
|------------|-------|---------|-----------|------------|
| `business_intro` | 회사 소개 | palette | `imageUrl` | Company introduction block — title + HTML content + side image. Use for the about/company page. |
| `mission_vision` | 미션 & 비전 | palette | — | Mission/vision statement card — emphasizes core values. |
| `text_image` | 텍스트 + 이미지 | palette | `title` `content` `imageUrl` `layout` | Side-by-side text and image. Use for service intros, CEO greetings, feature spotlights. |
| `text_only` | 텍스트만 | palette | `title` `content` | Plain HTML content block. Use for legal copy, hours of operation as <ul>, FAQ-style intro. |
| `quote_block` | 인용구 | palette | `title` `content` | Pull quote — customer testimonial single or brand slogan callout. |
| `section_header` | 섹션 헤더 | palette | `title` `subtitle` | Standalone section title + subtitle for separating major page regions. |
| `pastor_message` | 담임목사 인사말 | palette | `title` `pastorName` `message` `imageUrl` | Senior pastor's greeting — photo + message body. Author the message text (title=greeting headline, message=body). Use on the 교회소개/about and home pages. |
| `worship_schedule` | 예배 시간 안내 (정적) | palette | `title` `items` | Static worship-times table — author items: [{label, time, place}] directly. For a DB-managed grouped schedule use schedule_board instead. |
| `giving_info` | 헌금 안내 | palette | `title` `intro` `zelle` `bankInfo` `mailingName` `mailingAddress` `note` `qrImageUrl` | Giving INFO page (not a payment processor) — shows how to give: Zelle id, bank transfer, mailing address for checks, optional QR. Author the text/image fields; empty methods are hidden. |
| `newcomer_form` | 새가족 등록 폼 | palette | `title` `subtitle` | Newcomer self-registration FORM (not the 안내 block) — a public form that drops into the 새가족 관리 inbox. Author only title/subtitle. USE on a 새가족/처음오신분 page when the church wants visitors to register onl… |
| `stats_counter` | 통계 카운터 | palette | `title` `columns` `items` `align` `bgMode` | N-column number+label grid for KPIs / 회사 성과 지표. |
| `pricing_table` | 가격표 | palette | `title` `items` `currency` `showToggle` | 2/3/4 plan tier cards side-by-side. Set featured=true on the recommended plan. |
| `team_members` | 팀 멤버 | palette | `title` `columns` `items` `photoStyle` | Team avatar grid (manual items) — for AI-generated content not pulled from /staff. |
| `logo_bar` | 로고 바 | palette | `items` `grayscale` `align` | Partner / customer logo strip. grayscale=true with hover restore. |
| `faq_accordion` | FAQ | palette | `items` `columns` `defaultOpen` | FAQ accordion using <details><summary> — no JS required. |
| `testimonials` | 고객 후기 | palette | `title` `items` `layout` `bgMode` | Quote + author + role/company cards. layout: grid-2/grid-3/single. |
| `features_grid` | 기능 그리드 | palette | `title` `items` `columns` `cardStyle` `align` | Icon + title + description cards in a grid. columns: 2/3/4. |
| `info_columns` | 정보 컬럼 (한눈에) | palette | `title` `columns` `items` | 2-4 labeled info cells (eyebrow label + value), hairline grid. Use for service times / location / first-time-visitor at-a-glance. |
| `week_schedule` | 이번 주 일정 | palette | `title` `items` | This-week agenda as a row list: day badge + event/time/place. Distinct from schedule_board tables. |
| `sermon_feature` | 설교 피처드 (대표+목록) | palette | `eyebrow` `title` `featured` `items` | Featured sermon: big card + side list. featured:{imageUrl,title,meta}, items:[{imageUrl,title,meta}]. |
| `news_split` | 소식 + 나눔 카드 (2단) | palette | `title` `items` `sideTitle` `buttons` `links` | News list + side card with CTAs. items:[{tag,title,date}], buttons:[{label,primary}], links:[]. |
| `bento_grid` | 매거진 벤토 그리드 | palette | `columns` `tiles` | Magazine bento grid. tiles:[{colSpan,rowSpan,kind:'photo'|'card'|'list'|'pair', ...}]. |
| `dashboard_banner` | 대시보드 환영 배너 | palette | `eyebrow` `title` `subtitle` `buttonText` `buttonUrl` `secondaryButtonText` `secondaryButtonUrl` | Brand-colored welcome banner card. eyebrow(date)+title+subtitle + primary/secondary pill buttons. |
| `custom_html` | 커스텀 HTML (시안 그대로) | importer | `html` | Renders raw HTML verbatim. Set by exact-design apply; do not emit from AI. |
| `quick_links` | 바로가기 | palette | `title` `items` | Side widget: title + arrow-linked shortcut list. items: [{title, content(=url), icon?}]. variant 'tiles' renders a 6-col icon+label grid. |
| `check_list` | 체크 리스트 | palette | `title` `items` `columns` `iconStyle` | Bulleted feature list with check/arrow/dot icons. |
| `steps_list` | 단계별 안내 | palette | `title` `items` `layout` `bgMode` | Process / 'How we work' steps. layout: vertical (full-width rows) or grid (3-up overview). |
| `process_steps` | 프로세스 단계 | alias | `items` `layout` | Legacy alias of steps_list. |
| `category_tabs` | 카테고리 탭 | palette | `title` `tabs` `cards` `bgMode` | Tabbed category filter + card grid (Stanislav-style 'Unsere Kategorien'). cards belong to a tab via tab field. |
| `tabs_filter` | 카테고리 탭 (alias) | alias | `tabs` `cards` | Legacy alias of category_tabs. |
| `timeline` | 타임라인 | palette | `title` `subtitle` `variant` `items` | Dated milestone timeline. Use for 회사 연혁 (company history) when items are static (not pulled from /history). |
| `comparison_table` | 비교표 | palette | `title` `columns` `rows` | Feature parity grid with one highlighted column. Use for plan comparisons or 'us vs them' charts. |

### 미디어 (`media`)

| block_type | label | surface | key props | reproduces |
|------------|-------|---------|-----------|------------|
| `image_gallery` | 이미지 갤러리 | palette | `title` `images` | Static image gallery — content is in props.images (URL list), not fetched from albums. |
| `video` | 비디오 | palette | `title` `youtubeUrl` | YouTube embed by URL. |
| `before_after` | 비포 / 애프터 | palette | `beforeImageUrl` `afterImageUrl` `labelBefore` `labelAfter` | Image-comparison slider with draggable handle. |
| `hotspot_image` | 핫스팟 이미지 | palette | `imageUrl` `hotspots` | Annotated image with numbered popovers — for product features / floor plans. |
| `shoppable_image` | 쇼퍼블 이미지 | palette | `title` `subtitle` `imageUrl` `items` | Editorial photo with hotspots that link to product detail pages. hotspots: [{x,y,productId}]. |
| `lookbook_slider` | 룩북 슬라이더 | palette | `title` `subtitle` `items` `bgMode` | Horizontal scroll-snap rail of editorial images, optional per-item link. |

### 데이터 블록 (`data`)

| block_type | label | surface | key props | reproduces |
|------------|-------|---------|-----------|------------|
| `banner_slider` | 배너 슬라이더 | palette | `category` | Auto-rotating banner carousel — pulls from /api/v1/banners. category=main for landing, sub for inner pages. |
| `album_gallery` | 앨범 갤러리 | palette | `title` `limit` `variant` | Album cover grid — pulls from /api/v1/albums. variant: grid-2/grid-3/grid-4/masonry. |
| `recent_sermons` | 최근 설교 | palette | `title` `limit` `variant` | Recent sermons grid — pulls from /api/v1/sermons (YouTube + title + preacher + date + scripture). Use on the home page and the 설교/sermons page. variant: grid-2/grid-3/grid-4/list. |
| `recent_bulletins` | 최근 주보 | palette | `title` `limit` `variant` | Weekly bulletins (주보) grid — pulls from /api/v1/bulletins (PDF cover + date + view/download). Use on the 주보/bulletins page. variant: grid-3/grid-4/list. |
| `recent_columns` | 최근 목회칼럼 | palette | `title` `limit` `variant` | Pastoral columns grid — pulls from /api/v1/columns (title + author + date + excerpt). Use on the 목회칼럼/columns page. variant: grid-2/grid-3/list. |
| `video_board` | 영상 (YouTube) | palette | `title` `category` `limit` `variant` | YouTube video board — pulls from /api/v1/videos, filterable by category. Use for 찬양/예배실황/간증 video pages. variant: grid-2/grid-3/grid-4. |
| `schedule_board` | 예배 및 모임 시간 | palette | `title` `imagePosition` `imageUrl` | Worship & meeting schedule — pulls from /api/v1/schedules (grouped tables, each with a name). imagePosition: left/right/none. Use on the 예배안내/worship page and the home page. |
| `board` | 게시판 | palette | `title` `boardSlug` `limit` | Board/forum widget — pulls from /api/v1/boards/{boardSlug}/posts. Use boardSlug like notices/faq/careers/resources. |
| `cell_grid` | 목장 안내 | palette | `title` `limit` `columns` | 목장(small-group/cell) grid — pulls from /api/v1/cells. Each card shows the 목장 name, leader, meeting day/time, location. USE on a 목장/공동체/소그룹 page. Data block: write only the section title. |
| `application_form_embed` | 신청서 양식 | palette | `formSlug` `displayMode` `eyebrow` `title` `subtitle` `ctaLabel` `successMessage` `ctaAfterUrl` | Embed an application form by slug. displayMode: inline (full form on page) or cta-modal (CTA → modal). |
| `form_split` | Form + Text (2 columns) | palette | `formSlug` `layout` `title` `subtitle` `content` | Two-column block: application form (by formSlug) on one side, title+subtitle+content text on the other. layout form-left or form-right. |
| `staff_grid` | 교역자 그리드 | palette | `title` `limit` `layout` `photoStyle` `columns` `showItems` | Clergy/staff data block — pulls from /api/v1/staff (photo + name + role + bio). Use on the 교역자/staff page. For a non-DB hand-authored team list use team_members. |
| `history_timeline` | 교회 연혁 (자동) | palette | `title` | Church history timeline — pulls from /api/v1/history (year-ordered milestones). Use on the 연혁/history page. For a hand-authored static timeline use the timeline block. |
| `event_grid` | 행사/소식 그리드 | palette | `title` `limit` | Church events/news grid — pulls from /api/v1/events (title + date + image). Use on the 행사/events page and home. variant: grid-2/grid-3/grid-4. |
| `contact_info` | 연락처 정보 | palette | — | Contact info auto-pulled from tenant settings (phone/email/address/social). |

### 컨버전 (`conversion`)

| block_type | label | surface | key props | reproduces |
|------------|-------|---------|-----------|------------|
| `newcomer_info` | 새가족 안내 | palette | `title` `subtitle` `description` `buttonText` `buttonUrl` | New-family welcome + register CTA. Author title/subtitle/description + buttonText/buttonUrl. Use as a conversion section on home and the 새가족 page. |
| `location_map` | 지도 | palette | `address` `zoom` | Map embed by address or lat/lng. Pair with contact_info on the contact page. |
| `map_embed` | 지도 (임베드) | alias | `address` | Legacy alias of location_map. |
| `address_info` | 주소 정보 | alias | — | Legacy alias of contact_info that emphasizes the address/map line. |
| `contact_form` | 문의 폼 | palette | — | Lead-capture / general inquiry form. Submits to internal contact endpoint. |
| `newsletter_signup` | 뉴스레터 신청 | alias | — | Legacy alias of subscribe_form. |
| `subscribe_form` | 뉴스레터 구독 | palette | `bgMode` | Inline email newsletter form. POST { email } to submitEndpoint. |
| `call_to_action` | CTA (구버전) | alias | `title` `buttonText` `buttonUrl` | Legacy alias of cta_section (variant=boxed-card). |
| `cta_section` | CTA (행동 유도) | palette | `title` `buttonText` `buttonUrl` `variant` | Conversion CTA. Pick variant: inline-banner=full-width strip, boxed-card=highlighted box, image-overlay=hero-style full-bleed background image with eyebrow+title+subtitle+CTA centered on top (best fo… |
| `countdown_sale` | 카운트다운 세일 | palette | `title` `subtitle` `endAt` `buttonText` `buttonUrl` `expiredText` `bgMode` | Live countdown to endAt (ISO datetime); switches to expiredText when passed. |

### 레이아웃 (`layout`)

| block_type | label | surface | key props | reproduces |
|------------|-------|---------|-----------|------------|
| `divider` | 구분선 | palette | `spacing` | Visual divider between sections. spacing: sm/md/lg. |
| `spacer` | 여백 | palette | `size` | Empty vertical spacer with optional divider line. Use for fine-grained section spacing. |
| `layout_row` | 행 (레이아웃) | importer | `children` | Layout container — horizontal row of child blocks. Hidden from palette; only added inside another layout. |
| `layout_columns` | 컬럼 (레이아웃) | importer | `columns` `children` | Layout container — N columns of child blocks. Hidden from palette. |
| `layout_section` | 섹션 (레이아웃) | importer | `children` | Layout container — wraps children with section padding. Hidden from palette. |
| `two_columns` | 2단 컬럼 | importer | `children` | Two-column layout. Hidden from palette; agent uses layout_columns with columns:2 instead. |
| `three_columns` | 3단 컬럼 | importer | `children` | Three-column layout. Hidden from palette; agent uses layout_columns with columns:3 instead. |
| `tabs` | 탭 | importer | `tabs` `children` | Tabbed container. Hidden from palette. |
| `accordion` | 아코디언 | importer | `items` `children` | Accordion container. Hidden from palette; for FAQ-style stacks use faq_accordion instead. |

### 카탈로그 (`catalog`)

| block_type | label | surface | key props | reproduces |
|------------|-------|---------|-----------|------------|
| `catalog_archive` | 카탈로그 아카이브 | palette | `title` `limit` `variant` | Published/archived catalog issues grid — pulls from /api/v1/catalogs. variant: grid-2/grid-3/grid-4. |
| `catalog_showcase` | 카탈로그 쇼케이스 | palette | `catalogSlug` `displayStyle` `title` `subtitle` `ctaLabel` `imagePosition` | Single catalog cover card + CTA → modal with full reader. Set catalogSlug to the target catalog. |
| `catalog_cover` | 카탈로그 표지 | palette | `title` `tagline` `year` `imageUrl` `brandName` | A5 landscape catalog cover page. Title + tagline + year + cover image + brand. |
| `catalog_toc` | 카탈로그 목차 | palette | — | Auto-generated table of contents for a catalog issue. |
| `catalog_product_page` | 카탈로그 제품 페이지 | palette | `productId` `show` | Single-product A5 landscape spread: hero image + secondary images + title + description + SKU/variant. props.productId selects which product. |
| `catalog_product_gallery` | 카탈로그 제품 화보 | palette | `productId` `rangeStart` `galleryLayout` `style` | Magazine-style photo spread of product.images[rangeStart..]. galleryLayout: auto / mosaic variant. style follows the catalog starter. |
| `catalog_back_cover` | 카탈로그 뒷표지 | palette | `title` `message` `contactLine` `imageUrl` | A5 landscape catalog back cover. Thank-you message + contact line + optional image. |

### 제품 (`product`)

| block_type | label | surface | key props | reproduces |
|------------|-------|---------|-----------|------------|
| `products_showcase` | 제품 카탈로그 (그리드/포트폴리오/매거진) | palette | `variant` `source` `limit` | Products catalog block — variant: grid/portfolio/magazine. source: recent/featured. |
| `product_detail_view` | 제품 상세 뷰 | palette | `productSlug` `variant` `showSku` `showSpecs` `showGallery` `showPrice` `specsTitle` `priceFieldKey` | Single product detail view. variant: commerce (2-col gallery + info/spec/price/cta) / editorial / minimal / spec-sheet. |
| `recent_products` | 최근 제품 | palette | `limit` | Shortcut for products_showcase with source=recent. Use when the AI wants the simplest 'newest N products' list. |

### 블로그 (`blog`)

| block_type | label | surface | key props | reproduces |
|------------|-------|---------|-----------|------------|
| `recent_blog_posts` | 최근 블로그 글 | palette | `limit` `variant` | Latest blog posts grid — pulls from /api/v1/blog. variant: grid-2/grid-3/grid-4/list. |
| `blog_post_view` | 블로그 글 뷰 | palette | `showBackLink` `showMeta` `showCover` `showContent` `showBottom` `showYoutube` `listHref` `listLabel` | Single blog post detail view. title + meta + cover + HTML content + bottom image + youtube embed. |
