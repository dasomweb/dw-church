/**
 * 콘솔 임포트(LLM 매핑)가 쓰는 블록 카탈로그.
 *
 * **생성 파일 — 손으로 고치지 말 것.**
 * 재생성: node scripts/design-importer/gen-design-import-catalog.ts   (dw-church-app 에서)
 * 생성기: scripts/design-importer/gen-design-import-catalog.ts (왜 생성하는지도 거기 적혀 있다)
 * 가드:   apps/server/src/__tests__/modules/block-registry-drift.test.ts
 *
 * 범위 = 운영자가 페이지 편집기에서 **실제로 놓을 수 있는 블록**(PageEditor BLOCK_DEFS)
 * 81개. 서버 enum 에만 있는 블록은 임포트가 심어도 운영자가 편집할 수
 * 없으므로 넣지 않는다.
 *
 * t=block_type  g=group  p=keyProps  d=use(160자 컷)
 */
export interface CatalogBlock { t: string; g: string; p: string[]; d: string }

export const CATALOG_BLOCKS: CatalogBlock[] = [
  {"t":"address_info","g":"conversion","p":[],"d":"Legacy alias of contact_info that emphasizes the address/map line."},
  {"t":"album_gallery","g":"data","p":["title","limit","variant"],"d":"Album cover grid — pulls from /api/v1/albums. variant: grid-2/grid-3/grid-4/masonry."},
  {"t":"banner_slider","g":"data","p":["category"],"d":"Auto-rotating banner carousel — pulls from /api/v1/banners. category=main for landing, sub for inner pages."},
  {"t":"bento_grid","g":"content","p":["columns","tiles"],"d":"Magazine bento grid. tiles:[{colSpan,rowSpan,kind:'photo'|'card'|'list'|'pair', ...}]."},
  {"t":"board","g":"data","p":["title","boardSlug","limit"],"d":"Board/forum widget — pulls from /api/v1/boards/{boardSlug}/posts. Use boardSlug like notices/faq/careers/resources."},
  {"t":"button_group","g":"content","p":["title","subtitle","align","buttons"],"d":"제목 + 여러 개의 버튼"},
  {"t":"call_to_action","g":"conversion","p":["title","buttonText","buttonUrl"],"d":"Legacy alias of cta_section (variant=boxed-card)."},
  {"t":"cardnews","g":"data","p":["variant","eyebrow","title","items"],"d":"여러 장 카드로 넘겨 보는 소식(카드뉴스 관리에서 업로드). 표지를 누르면 뷰어가 열림"},
  {"t":"cell_grid","g":"data","p":["title","limit","columns"],"d":"목장(small-group/cell) grid — pulls from /api/v1/cells. Each card shows the 목장 name, leader, meeting day/time, location. USE on a 목장/공동체/소그룹 page. Data block: wri"},
  {"t":"cell_report","g":"conversion","p":["title","subtitle"],"d":"목장 인도자가 주간 사역을 보고 → 폼 제출 인박스"},
  {"t":"church_intro","g":"content","p":["content"],"d":"교회 소개 텍스트"},
  {"t":"contact_form","g":"conversion","p":[],"d":"Lead-capture / general inquiry form. Submits to internal contact endpoint."},
  {"t":"contact_info","g":"data","p":[],"d":"Contact info auto-pulled from tenant settings (phone/email/address/social)."},
  {"t":"custom_form","g":"conversion","p":["formSlug"],"d":"'폼 만들기'에서 설계한 폼을 slug로 불러와 표시 → 폼 제출 인박스"},
  {"t":"dashboard_banner","g":"content","p":["eyebrow","title","subtitle","buttonText","buttonUrl","secondaryButtonText","secondaryButtonUrl"],"d":"Brand-colored welcome banner card. eyebrow(date)+title+subtitle + primary/secondary pill buttons."},
  {"t":"detail_rows","g":"content","p":["title","intro","items"],"d":"Ruled heading + intro + rows. Each row: LEFT title+label / RIGHT description+meta. items:[{title,label,description,meta}]."},
  {"t":"devotion_reader","g":"data","p":["title","eyebrow"],"d":"주간 묵상 목록 + 오늘 묵상 (읽기 전용, 관리자 업로드)"},
  {"t":"directions_split","g":"content","p":["eyebrow","title","churchName","address","phone","email"],"d":"좌측 지도 + 우측 연락처(교회명/주소/전화)"},
  {"t":"divider","g":"layout","p":["spacing"],"d":"Visual divider between sections. spacing: sm/md/lg."},
  {"t":"event_grid","g":"data","p":["title","limit"],"d":"Church events/news grid — pulls from /api/v1/events (title + date + image). Use on the 행사/events page and home. variant: grid-2/grid-3/grid-4."},
  {"t":"featured_event","g":"data","p":["label","buttonText"],"d":"행사 1개를 골라 상단 알림바로 노출 · 미선택/종료일 경과 시 자동 숨김"},
  {"t":"features_grid","g":"content","p":["title","items","columns","cardStyle","align"],"d":"Icon + title + description cards in a grid. columns: 2/3/4."},
  {"t":"first_time_guide","g":"content","p":["steps"],"d":"단계별 안내"},
  {"t":"form_split","g":"data","p":["formSlug","layout","title","subtitle","content"],"d":"Two-column block: application form (by formSlug) on one side, title+subtitle+content text on the other. layout form-left or form-right."},
  {"t":"giving_info","g":"content","p":["title","intro","zelle","bankInfo","mailingName","mailingAddress","note","qrImageUrl"],"d":"Giving INFO page (not a payment processor) — shows how to give: Zelle id, bank transfer, mailing address for checks, optional QR. Author the text/image fields; "},
  {"t":"hero_banner","g":"hero","p":["variant","height","width"],"d":"Page hero — title/subtitle/CTA on image overlay or split-image. Always emit as the first block of a page."},
  {"t":"hero_image_slider","g":"hero","p":["category"],"d":"Legacy alias of banner_slider — pulls from /api/v1/banners?category=main."},
  {"t":"hero_overlap","g":"hero","p":["eyebrow","title","subtitle","backgroundImageUrl","cards"],"d":"Hero image with an overlapping 3-column info card (service times / first-time). cards:[{title, rows:[{label,value}]}]."},
  {"t":"hero_split","g":"hero","p":["variant","imageSide","height"],"d":"Legacy alias of hero_banner with variant=split-image."},
  {"t":"highlight_media","g":"content","p":["eyebrow","bigText","subText","imageRatio"],"d":"좌측에 큰 한 줄(시간·숫자·연도) + 우측 사진과 설명 — 예배 시간 안내 등"},
  {"t":"history_timeline","g":"data","p":["title"],"d":"Church history timeline — pulls from /api/v1/history (year-ordered milestones). Use on the 연혁/history page. For a hand-authored static timeline use the timeline"},
  {"t":"image_gallery","g":"media","p":["title","images"],"d":"Static image gallery — content is in props.images (URL list), not fetched from albums."},
  {"t":"image_link_list","g":"content","p":["eyebrow","imagePosition","items"],"d":"대표 사진 옆에 번호 매긴 항목을 세우고 각 항목이 상세로 이어지는 목록 (비전·사역·프로그램 안내)"},
  {"t":"info_bar","g":"content","p":["items","background","align"],"d":"Full-bleed colored band of N label+value cells. items:[{label,value}]. background palette key (default primary), white text. Distinct from info_columns."},
  {"t":"info_columns","g":"content","p":["title","columns","items"],"d":"2-4 labeled info cells (eyebrow label + value), hairline grid. Use for service times / location / first-time-visitor at-a-glance."},
  {"t":"latest_feed","g":"data","p":["title","sources","limit","perSource","columns","showTabs","allLabel"],"d":"설교노트·저널·주보·설교·책 등 여러 모듈의 최신글을 한 섹션에 합쳐 탭으로 걸러 표시 · 저널은 @카테고리로 연재별 탭 분리 · 등록된 글이 없으면 자동 숨김"},
  {"t":"layout_columns","g":"layout","p":["columns","children"],"d":"Layout container — N columns of child blocks. Hidden from palette."},
  {"t":"layout_row","g":"layout","p":["children"],"d":"Layout container — horizontal row of child blocks. Hidden from palette; only added inside another layout."},
  {"t":"layout_section","g":"layout","p":["children"],"d":"Layout container — wraps children with section padding. Hidden from palette."},
  {"t":"location_map","g":"conversion","p":["address","zoom"],"d":"Map embed by address or lat/lng. Pair with contact_info on the contact page."},
  {"t":"logo_title","g":"content","p":["variant","eyebrow","title","subtitle","logoUrl","logoWidth"],"d":"로고 + 라벨 + 제목"},
  {"t":"map_embed","g":"conversion","p":["address"],"d":"Legacy alias of location_map."},
  {"t":"mission_vision","g":"content","p":[],"d":"Mission/vision statement card — emphasizes core values."},
  {"t":"newcomer_info","g":"conversion","p":["title","subtitle","description","buttonText","buttonUrl"],"d":"New-family welcome + register CTA. Author title/subtitle/description + buttonText/buttonUrl. Use as a conversion section on home and the 새가족 page."},
  {"t":"news_announcements","g":"data","p":["title","newsLimit","moreUrl","buttons"],"d":"주보(주보 모듈) + 광고(교회소식 게시판, 카테고리 배지) 목록 + 원하는 만큼 추가하는 버튼"},
  {"t":"news_split","g":"content","p":["title","items","sideTitle","buttons","links"],"d":"News list + side card with CTAs. items:[{tag,title,date}], buttons:[{label,primary}], links:[]."},
  {"t":"newsletter_signup","g":"conversion","p":[],"d":"Legacy alias of subscribe_form."},
  {"t":"notification_prefs","g":"conversion","p":[],"d":"Per-category push notification preferences: on/off, send time, quiet hours."},
  {"t":"online_bulletin","g":"data","p":[],"d":"Full online worship bulletin, scroll-down. Fetches the latest published online_bulletin. Distinct from recent_bulletins (uploaded PDF/image bulletins). No items"},
  {"t":"online_bulletin_list","g":"data","p":["eyebrow","title","limit"],"d":"온라인 주보 전체 목록 — 연도 탭 + 최신 주보 크게 + 월별 그룹 리스트"},
  {"t":"page_header","g":"hero","p":["eyebrow","title"],"d":"서브페이지 머리글 — 라벨(윗글) + 큰 제목 + 소개 문구 + 하단 더블 괘선"},
  {"t":"page_subnav","g":"content","p":["title","parentMenu"],"d":"Interior page header: breadcrumb + title + submenu row tied to a top-level menu, current page underlined. Pulls from /api/v1/menus. parentMenu selects the group"},
  {"t":"pastor_message","g":"content","p":["title","pastorName","message","imageUrl"],"d":"Senior pastor's greeting — photo + message body. Author the message text (title=greeting headline, message=body). Use on the 교회소개/about and home pages."},
  {"t":"prose_image","g":"content","p":["title","body","imageUrl","imagePosition"],"d":"One-column reading layout: ruled heading + rich-text body + full-width image (below by default). NOT a side-by-side split."},
  {"t":"push_subscribe","g":"conversion","p":[],"d":"Web push opt-in button. Asks permission only on user tap; iOS needs Home Screen install."},
  {"t":"quick_links","g":"content","p":["title","items"],"d":"Side widget: title + arrow-linked shortcut list. items: [{title, content(=url), icon?}]. variant 'tiles' renders a 6-col icon+label grid."},
  {"t":"quote_block","g":"content","p":["title","content"],"d":"Pull quote — customer testimonial single or brand slogan callout."},
  {"t":"recent_books","g":"data","p":["title","limit"],"d":"Church book recommendations with cover, recommender and recommendation text. Featured book shown large."},
  {"t":"recent_bulletins","g":"data","p":["title","limit","variant"],"d":"Weekly bulletins (주보) grid — pulls from /api/v1/bulletins (PDF cover + date + view/download). Use on the 주보/bulletins page. variant: grid-3/grid-4/list."},
  {"t":"recent_columns","g":"data","p":["title","limit","variant"],"d":"Pastoral columns grid — pulls from /api/v1/columns (title + author + date + excerpt). Use on the 목회칼럼/columns page. variant: grid-2/grid-3/list."},
  {"t":"recent_sermon_note","g":"data","p":["eyebrow","moreLabel","moreUrl"],"d":"설교노트 관리의 최신 1건(대표 이미지·제목·본문 발췌)을 홈에 표시 · 마스트헤드 변형(우측 링크 레일)"},
  {"t":"recent_sermons","g":"data","p":["title","limit","variant"],"d":"Recent sermons grid — pulls from /api/v1/sermons (YouTube + title + preacher + date + scripture). Use on the home page and the 설교/sermons page. variant: grid-2/"},
  {"t":"schedule_board","g":"data","p":["title","imagePosition","imageUrl"],"d":"Worship & meeting schedule — pulls from /api/v1/schedules (grouped tables, each with a name). imagePosition: left/right/none. Use on the 예배안내/worship page and t"},
  {"t":"schedule_split","g":"content","p":["imageUrl","groups"],"d":"좌측 이미지 + 우측 예배/모임 표 여러 개"},
  {"t":"section_header","g":"content","p":["title","subtitle"],"d":"Standalone section title + subtitle for separating major page regions."},
  {"t":"sermon_feature","g":"content","p":["eyebrow","title","featured","items"],"d":"Featured sermon: big card + side list. featured:{imageUrl,title,meta}, items:[{imageUrl,title,meta}]."},
  {"t":"sermon_magazine","g":"data","p":["title"],"d":"이번 주 설교 — 한줄요약·써머리·질문(관찰·심화·적용)"},
  {"t":"sermon_meditation","g":"data","p":["eyebrow","asideTitle","moreLabel","bulletinLabel","bulletinUrl","showAside"],"d":"대표 설교(설교 모듈 최신) + 이번 주 묵상 사이드바(말씀·책·기도제목·주보) — 에디토리얼 홈용"},
  {"t":"sermon_note_list","g":"data","p":["eyebrow","title","limit"],"d":"설교노트 전체 목록 — 대상 탭(장년/EM/Youth/Children/Kids) + 최신 노트 피처 + 카드 그리드"},
  {"t":"staff_grid","g":"data","p":["title","limit","layout","photoStyle","columns","showItems"],"d":"Clergy/staff data block — pulls from /api/v1/staff (photo + name + role + bio). Use on the 교역자/staff page. For a non-DB hand-authored team list use team_members"},
  {"t":"steps_list","g":"content","p":["title","items","layout","bgMode"],"d":"Process / 'How we work' steps. layout: vertical (full-width rows) or grid (3-up overview)."},
  {"t":"text_image","g":"content","p":["title","content","imageUrl","layout"],"d":"Side-by-side text and image. Use for service intros, CEO greetings, feature spotlights."},
  {"t":"text_only","g":"content","p":["title","content"],"d":"Plain HTML content block. Use for legal copy, hours of operation as <ul>, FAQ-style intro."},
  {"t":"values_grid","g":"content","p":["title","columns","items"],"d":"Ruled section heading + N cards, each with an OVERLINE eyebrow + title + body. items:[{overline,title,description}]. columns: 2/3/4."},
  {"t":"verse_of_day","g":"data","p":["eyebrow"],"d":"말씀 관리에 등록한 현재 말씀 1개를 표시 · 없으면 자동 숨김"},
  {"t":"video","g":"media","p":["title","youtubeUrl"],"d":"YouTube embed by URL."},
  {"t":"video_board","g":"data","p":["title","category","limit","variant"],"d":"YouTube video board — pulls from /api/v1/videos, filterable by category. Use for 찬양/예배실황/간증 video pages. variant: grid-2/grid-3/grid-4."},
  {"t":"visitor_welcome","g":"content","p":["message"],"d":"새가족 환영 메시지"},
  {"t":"week_schedule","g":"content","p":["title","items"],"d":"This-week agenda as a row list: day badge + event/time/place. Distinct from schedule_board tables."},
  {"t":"worship_schedule","g":"content","p":["title","items"],"d":"Static worship-times table — author items: [{label, time, place}] directly. For a DB-managed grouped schedule use schedule_board instead."},
  {"t":"worship_times","g":"content","p":["services"],"d":"예배 시간 안내"},
];

/**
 * 같은 블록의 **놓을 수 없는 이름 → 놓을 수 있는 이름** (registry aliasOf 파생).
 * 예: 정식 이름 `cta_section` 은 운영자 팔레트에 없고 별칭 `call_to_action` 만 있다.
 * LLM 이 정식 이름을 뱉어도 운영자가 편집할 수 있는 이름으로 정규화한다.
 */
export const BLOCK_ALIASES: Record<string, string> = {"cta_section":"call_to_action","hero_full_width":"hero_banner","subscribe_form":"newsletter_signup","process_steps":"steps_list"};

/**
 * 테마 타이포를 따르지 않는(고정 px / Tailwind 크기 선언) 블록 → 선언 개수.
 *
 * **치환하지 않는다.** 2026-09-12 감사는 이 블록들을 다른 블록으로 강제 치환했는데,
 * 그건 시안 구조를 버리고 `schedule_board`(Data Block) 의 데이터 출처까지 없앴다.
 * 지금은 임포트 미리보기에 **경고로 올려** 운영자가 판단하게 한다. 블록의 타이포를
 * 고치면 이 목록에서 자동으로 빠진다.
 */
export const TYPOGRAPHY_WARN: Record<string, number> = {"bento_grid":11,"call_to_action":4,"contact_form":12,"dashboard_banner":7,"detail_rows":6,"features_grid":1,"form_split":3,"hero_banner":1,"hero_overlap":9,"highlight_media":2,"image_link_list":3,"info_bar":1,"info_columns":4,"news_split":12,"notification_prefs":9,"page_header":2,"push_subscribe":5,"quick_links":5,"quote_block":3,"sermon_feature":15,"steps_list":2,"week_schedule":4};

/** 콘텐츠 모듈 — 데이터 블록이 여기서 데이터를 읽는다. 원본: scripts/design-importer/gen-catalog.ts */
export const CONTENT_MODULES = [
  {"name":"sermons","table":"sermons","use":"설교 — data blocks: recent_sermons, sermon_feature (+ sermon study fields → sermon_magazine)."},
  {"name":"bulletins","table":"bulletins","use":"주보(weekly bulletin, PDF cover) — data block: recent_bulletins."},
  {"name":"columns","table":"columns_pastoral","use":"목회칼럼/묵상 — data block: recent_columns."},
  {"name":"albums","table":"albums","use":"앨범/갤러리 — data block: album_gallery."},
  {"name":"events","table":"events","use":"행사·소식 — data block: event_grid."},
  {"name":"staff","table":"staff","use":"교역자/섬기는 이 — data block: staff_grid (opt-in)."},
  {"name":"history","table":"history","use":"교회 연혁 — data block: history_timeline."},
  {"name":"boards","table":"boards / board_posts","use":"게시판/공지 — data block: board (boardSlug: notices/free/...)."},
  {"name":"banners","table":"banners","use":"메인 배너 슬라이더 — data block: banner_slider (category=main/sub). NOT auto-migrated."},
  {"name":"cells","table":"cells","use":"목장/소그룹 — data block: cell_grid."},
  {"name":"schedules","table":"schedules","use":"예배·모임 시간표 — data block: schedule_board (or static worship_schedule block)."},
  {"name":"newcomers","table":"newcomers","use":"새가족 — public FORM block: newcomer_form (+ static newcomer_info)."},
  {"name":"forms","table":"form_submissions","use":"일반 폼 — application_form_embed / form_split / contact_form."},
  {"name":"videos","table":"videos / video_categories","use":"영상(찬양·예배실황·간증) — data block: video_board (category 로 필터)."},
  {"name":"verses","table":"verses","use":"오늘의 말씀 — data block: verse_of_day (GET /api/v1/verses/current)."},
  {"name":"books","table":"books","use":"이달의 책/추천도서 — data block: recent_books. **칼럼 카테고리로 우회하지 말 것.**"},
  {"name":"sermon-notes","table":"sermon_notes","use":"설교노트(양쪽 편집·나눔질문) — data blocks: recent_sermon_note, sermon_note_list."},
  {"name":"online-bulletins","table":"online_bulletins","use":"온라인 주보(스크롤형 예배순서) — 문서 주보(bulletins)와 별개. data blocks: online_bulletin, online_bulletin_list."},
  {"name":"devotions","table":"devotions","use":"묵상/큐티 — data blocks: devotion_reader, sermon_meditation."},
  {"name":"cardnews","table":"cardnews","use":"카드뉴스 — data block: cardnews (carousel/grid/rail)."},
];
