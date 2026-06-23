# TRUE LIGHT — 개발 내역 & 리팩토링 가이드

> 작성: 2026-06-23. 서비스 정식 시작 전, 그동안 개발한 모든 내역을 정리하고
> 리팩토링(중복 객체화 + 긴 파일 분할) 기준을 잡기 위한 문서.
> 목적 ① 문제 발생 시 빠른 파악 ② AI 개발 시 토큰·시간 절약을 위한 구조 개선 근거.

---

## 1. 시스템 개요

**제품**: 미주 한인교회용 교회 홈페이지 서비스(SaaS). 교회가 직접 콘텐츠를 올리고
운영하며, 초기 디자인 셋업은 전문가가 구축. 별도로 워드프레스 독립형 제작도 제공.

**모노레포 (pnpm workspaces)**
```
apps/
  server/   Fastify + TypeScript + Prisma (REST API)        → api.truelight.app
  web/      Next.js 15 (App Router, standalone)             → truelight.app + 테넌트 사이트
  agents/   Python FastAPI (AI 플래너)                       → dw-church-agents
packages/
  admin-app/      Vite + React (관리자 + 슈퍼어드민 SPA)     → admin.truelight.app
  api-client/     타입드 API 클라이언트 + React Query 훅
  blocks/         프론트 블록 렌더링 컴포넌트
  ui-components/   공용 UI
  design-tokens/ , theme-sets/
```

**배포 (Railway)** — 토큰: `RAILWAY_TOKEN` 환경변수 사용.
```
api-server : 레포 루트에서  railway up --service api-server --ci
web        : dw-church-app/ 에서  cp apps/web/railway.toml railway.toml && railway up --service web --ci && rm railway.toml
admin      : dw-church-app/ 에서  cp packages/admin-app/railway.toml railway.toml && railway up --service admin --ci && rm railway.toml
```
- 서비스명: `api-server`, `web`, `admin`, `dw-church-agents`, `Postgres`.
- `.railwayignore`(레포 루트 + dw-church-app/) 가 `.venv/__pycache__/node_modules/dist/.next/.turbo` 제외 — 안 하면 업로드 타임아웃(apps/agents/.venv 320MB).
- **PROD DB 일회성 스크립트**: `railway run --service Postgres -- pnpm exec tsx scripts/<f>.ts`, 클라이언트는 `process.env.DATABASE_PUBLIC_URL || DATABASE_URL` 사용.

---

## 2. 핵심 규칙·컨벤션 (필수 — 위반 시 버그)

1. **API 필드 네이밍**: 서버/DB `snake_case`, 클라이언트 `camelCase`.
   - api-client FetchAdapter는 응답을 camelize. **전송은 camelCase 그대로** 보냄(snakeize 안 함) → 서버 zod 스키마는 camelCase 수용.
   - 서버 모듈이 snake_case 화이트리스트로 입력을 거르면 전부 드롭됨(설정 저장 버그 이력). 들어온 키를 서버에서 snake로 변환할 것.
2. **응답 envelope**: 서버는 `{ data: ... }`로 감쌈. api-client 메서드는 `unwrapData(res)`로 직접 벗겨야 함(FetchAdapter는 안 벗김). 누락 시 read-back-empty 버그.
3. **DB 마이그레이션**: Prisma migrate 안 씀(baseline 없어 P3005). 서버 부팅 시 `index.ts`에서 raw SQL `CREATE TABLE/ALTER TABLE ... IF NOT EXISTS` 실행. 테넌트별 스키마는 `for (const s of schemas)` 루프.
4. **테넌트 격리**: 테넌트마다 별도 Postgres 스키마 `tenant_{slug}`. R2는 `tenant_{slug}/` 폴더. 요청은 `X-Tenant-Slug` 헤더로 식별. 교차 접근 금지.
   - `tenantMiddleware` `SKIP_PREFIXES`: `/api/v1/auth/`, `/api/v1/admin`, `/api/v1/billing`, `/api/v1/migration`, `/api/v1/shared-images`, `/health`. → `/admin/*`는 테넌트 미해석(플랫폼 라우트용). **테넌트 스코프 라우트를 `/admin` 아래 두면 안 됨**(폼 인박스 400 버그 이력 → `/form-submissions`로 이동).
5. **raw query + uuid**: `$queryRawUnsafe`에 uuid 컬럼 비교 시 `$1::uuid` 캐스팅(안 하면 42883).
6. **예약어 alias**: `SELECT EXISTS(...) AS exists` → `exists`는 예약어, 에러. `AS present` 등으로.
7. **이미지 업로드**: 모든 이미지 필드는 `ImageUpload` 컴포넌트 사용(URL 직접입력 금지). R2 업로드 전 **클라이언트 리사이즈**(`resize-image.ts`) 필수(스토리지 비용). 단 **로고/파비콘은 리사이즈 금지**(JPEG 흰배경 변환 → 투명도 깨짐) — 원본 업로드.
8. **자동저장 금지**: 에디터는 로컬 편집 → 저장/게시 버튼 클릭 시에만 서버 쓰기.
9. **예제/placeholder 값**: 미 동부 한인교회 기준. 전화 `(201) 000-0000`, 지역 NJ/NY(Fort Lee 등). 한국식(강남구/010) 금지.
10. **마케팅 카피**: 전문용어 금지(SaaS·플랫폼·올인원·코딩·호스팅·반응형). "교회가 직접 만들고 관리"(에이전시 아님). 실재 기능만(없는 기능 광고 금지). 따뜻한 한국어.
11. **파괴적 작업**: PROD에 직접 파괴 로직 테스트 금지. 파괴+복구를 한 트랜잭션으로 감싸거나 사본에서. (dasom 설교/배너 삭제 사고 이력.)
12. **배포 전 로컬 검증**: 변경 표면의 build/typecheck/test 통과 후 배포. 배포는 마지막 단계. 배포 전 사용자에게 확인(요청 시).
13. **모든 커밋 푸시**: 로컬 커밋만으로는 히스토리 인정 안 됨.

---

## 3. 기능 인벤토리

### 3.1 콘텐츠 모듈 (Content Modules)
각 모듈 = 관리 페이지 + API(`/api/v1/{resource}`) + DB 테이블(`tenant_{slug}.{table}`) + Data Block + 상세 페이지.

| 모듈 | API | 테이블 | 관리 페이지 |
|---|---|---|---|
| 설교 Sermon | /sermons (+/sermon-categories, /preachers) | sermons, sermon_categories, sermon_category_map, preachers | SermonManagement |
| 주보 Bulletin | /bulletins | bulletins (pdf_url, images, thumbnail_url) | BulletinManagement |
| 칼럼 Column | /columns | columns_pastoral | ColumnManagement |
| 앨범 Album | /albums | albums, album_categories | AlbumManagement |
| 행사 Event | /events | events | EventManagement |
| 교역자 Staff | /staff | staff | StaffManagement |
| 연혁 History | /history | history | HistoryManagement |
| 게시판 Board | /boards | boards, board_posts | BoardManagement |
| 배너 Banner | /banners | banners | BannerManagement |
| 영상 Video | /videos | videos, video_categories | VideoManagement |
| 일정 Schedule | /schedules | schedules | ScheduleManagement |
| 목장 Cell | /cells | cells | CellManagement |
| 새가족 Newcomer | /newcomers | newcomer_registrations | NewcomerManagement |
| 폼 Form | /forms/:type(공개), /form-submissions(인박스) | form_submissions | (폼제출 인박스) |

### 3.2 페이지/블록 시스템
- 3계층: Theme(1회) → Pages(블록 구성) → Dynamic Content(주간).
- Page → Section(page_sections row: sort_order, is_visible, block_type, props) → Block(Static/Data/Layout) → Element.
- `BlockRenderer`가 섹션 렌더, Layout Block은 children[] 재귀.
- PageEditor(1860줄) + element-registry(1901줄) + ElementInspector(2661줄).
- 테마: 토큰(--brand-*) vs 레거시(--dw-*) 2시스템, 브리지 존재. 섹션 padding/gap은 tokens.spacing → --section-py-*/--gap-grid.
- **apps/web Tailwind content[]는 packages/blocks/src 스캔 필수**(아니면 블록 전용 클래스 purge됨).

### 3.3 마이그레이션 (AI-only)
- 단일 파이프라인: crawl → AI(페이지별 Haiku→Sonnet 분류) → apply. 플랫폼 분기 없음.
- migration-agent(789), llm-classifier(676), apply(672). 배너는 자동 마이그레이션 제외(운영자 큐레이션). SEO(WP/Yoast/OG) 추출 → church_info/site_settings.
- ⚠ SiteGround류 WAF가 데이터센터 egress 차단(미해결) — egress 전략 필요.

### 3.4 AI 빌더 / 플래너
- Python agents(플래너) Railway 배포됨. ai/build-pages(1006), builder-routes(723), pattern-map(796). PlannerWizard(3460).
- ⚠ planner 라우트 미인증(비용 리스크). 교회 콘텐츠는 교회론 기반으로 작성(마케팅체 금지).

### 3.5 슈퍼어드민 (admin.truelight.app/super-admin)
- `SuperAdminDashboardV2.tsx` **6,600줄** — 탭 다수가 한 파일에:
  monitoring, overview, tenants, applications, **demo**, intake, reference, pricing,
  billing, email, emailTemplates, **broadcast**, support, domains, users, storage,
  gallery, **siteSettings**. (NAV_GROUPS로 묶음.)
- TenantDetailModal(일일운영), per-tenant 콘솔 /super-admin/t/:slug, TenantOwnerPanel(오너 전용).

### 3.6 인증 / 사용자 / 플랜
- 역할: owner/admin/editor/support/super_admin. JWT.
- `password_expires_at` 기반 시간제한 계정(support-user, 데모 임시계정).
- **플랜 한도** `config/plan-limits.ts`: light 2 / basic 3 / plus 5 / pro 10 (admin 계정, 오너 포함). maxPages 8/15/20/25. `normalizePlan()`이 별칭 흡수.
- `inviteUser`가 한도 강제. `GET /auth/account-quota` → { plan, maxAdmins, used }, UserManagement에서 표시/비활성화.

### 3.7 결제 / 신청 파이프라인 (B2BSmart 모델)
- 인테이크: `/apply` 공개폼 → service_applications → 슈퍼어드민 신청서 인박스 → 결제링크 메일.
- Stripe webhook `checkout.session.completed` → 테넌트 자동 프로비저닝(오너 생성 + 환영메일, 멱등). service_applications.tenant_slug가 멱등 가드.
- 4요금제 라이트/기본/플러스/프로 ($59/99/149/199) + setup fee.

### 3.8 데모 테넌트 프로그램 (dasom)
- dasom = 데모 테넌트(slug `dasom`, schema `tenant_dasom`).
- **골든 스냅샷/복원** `modules/demo-tenant/service.ts`: 형제 스키마 `tenant_dasom_snapshot`(CREATE TABLE AS). 복원 = `TRUNCATE all CASCADE` + 컬럼 교집합 INSERT, `SET LOCAL session_replication_role='replica'`(FK off). 30테이블 검증됨.
- **야간 리셋** `scheduler.ts`: 매일 03:00 America/New_York, slug 하드코딩(dasom만), 60초 틱+날짜가드.
- **데모 체험 신청 CRM**: 공개 `POST /demo-requests` → 슈퍼어드민 데모 체험 탭(상태/메모/삭제) → **접속정보 보내기**.
- **신청자별 24h 임시 로그인** `demo-login.ts`: ID=신청자 이메일, 비번=난수, 24h 만료 후 60초 정리 작업이 실제 삭제. 실계정 이메일이면 거부.
- 테이블: demo_requests, demo_snapshots, demo_config(공개 안내 설정).

### 3.9 마케팅 사이트 / 브랜딩 / 카톡
- `marketing_config`(public 싱글톤): logo_url, logo_height, favicon_url, site_name, tagline, contact_email, kakao_url.
- 슈퍼어드민 **사이트 설정 탭**: 로고(높이 슬라이더)·파비콘·기본정보 편집(로고/파비콘 원본 업로드).
- 공개 `GET /marketing-config` → web가 읽어 `SiteLogo`(헤더 로고), `FaviconSetter`(파비콘, 마케팅 페이지 한정) 반영.
- **카카오톡 문의**: kakao_url 설정 시 마케팅/공지·데모 메일 + 홈페이지 우하단 플로팅 버튼 자동 표시. 현재 `https://open.kakao.com/o/glmkTPAi`.
- **공지·마케팅(broadcast)**: 대상 선택(교회 관리자/데모 신청자/서비스 신청자/직접 입력) + **BCC 40명씩 배치 발송**(중복 제거). 본문 프리셋(데모초대/서비스소개/요금안내/데모후속). `GET /email-broadcast/audiences`로 인원수.

### 3.10 기능 상세 페이지 (마케팅)
- `/features` → `/features/content`로 리다이렉트. 4개 페이지: content/info/community/platform.
- 각 페이지: 그라데이션 hero 배너 + 탭 네비(4개 전환) + 기능 카드 + CTA.
- `featuresData.ts`(공유 데이터, 한/영) + `FeaturePageView.tsx`(공유 뷰). 헤더 "기능" = `FeaturesNavMenu` 드롭다운.

### 3.11 기타
- 이메일: `config/email.ts`(DB email_settings → env fallback, 30s 캐시), `email-layout.ts`(wrapEmail/emailButton/kakaoButton), `email-templates`(편집 가능 템플릿). `sendEmail`은 to/bcc 지원, 발송 결과 로깅 + 실패 throw.
  - ⚠ SiteGround SMTP는 데이터센터(Railway)에서 배달 불안정 가능 — 대량 발송 시 전용 ESP 권장.
- 폼: 범용 form_submissions(contact/cell_report/custom) + 폼제출 인박스. 새 폼타입 = 새 form_type 문자열.
- 디자인셋: design_sets(저장된 AI 폰트/색 세트).
- 콘텐츠 내보내기: export 모듈.

---

## 4. 최근 세션 변경 내역 (커밋)

| 커밋 | 내용 |
|---|---|
| forms 400 | 폼 인박스 라우트 `/admin/forms/submissions` → `/form-submissions`(테넌트 미들웨어 skip 회피) |
| 0885ac0c | 데모 테넌트 프로그램(스냅샷/야간리셋/CRM) |
| 526b2b79 | 신청자별 24h 임시 데모 로그인(자동 삭제) |
| 4eb48f2c | sendEmail 발송 결과 로깅 + 실패 표면화, EXISTS alias 버그 |
| 4d7737be | 온보딩 리다이렉트 owner 한정(데모/admin은 대시보드로) |
| 1b0ec470 | 공지·마케팅 BCC 다중 대상 발송 |
| 7c5c3f05 | 마케팅 프리셋 + 데모 신청자 기본 체크 |
| 62a22a80 | 프리셋 카피 SaaS/전문용어 제거(쉬운 한국어) |
| 231b290f | 카카오톡 문의 버튼(설정형, 메일+사이트) |
| 9533d25a | 기능 카피 실제기능화 + /features 상세 페이지 |
| 3fea8d69 | 사이트 설정(로고/파비콘/기본정보) → 프론트 반영 |
| b5b1ea17 | 워드프레스 독립형 제작 섹션 |
| 8bfba133 | 맞춤 디자인에서 '로고' 제거 |
| 70e9d85f | 기능 상세 4페이지 분할(각 hero 배너) |
| 31823b59 | "기능" nav 드롭다운 |
| 95f1cba2 | 예제값 미 동부 기준(목장/교역자/AI컨텍스트) |
| 710bec63 | 플랜별 사용자 한도 표시·강제(account-quota) |

---

## 5. 리팩토링 가이드 (이번 작업의 핵심)

### 5.1 긴 파일 분할 (AI 토큰·시간 절약 1순위)
| 파일 | 줄 | 분할 방안 |
|---|---|---|
| **SuperAdminDashboardV2.tsx** | **6,600** | **최우선.** 각 탭을 `super-admin/tabs/*.tsx`로 1탭=1파일 분리(MonitoringTab, TenantsTab, ApplicationsTab, DemoTab, BroadcastTab, SiteSettingsTab …). 공용 `useAdminApi`, `StatCard`, `Spinner`, `EmptyState`, `TabIcon`는 `super-admin/shared/`로. 컨테이너는 라우팅/탭 상태만. |
| PlannerWizard.tsx | 3,460 | 스텝별 컴포넌트 + 상태 훅 분리 |
| ElementInspector.tsx | 2,661 | element 타입별 인스펙터 컴포넌트로 분리(레지스트리 기반) |
| element-registry.ts | 1,901 | 블록 카테고리별 파일로 분할 후 합성 |
| PageEditor.tsx | 1,860 | 캔버스/사이드바/툴바/블록목록 분리 |
| index.ts (server) | 1,073 | 부팅 마이그레이션을 `boot/migrations.ts`(테넌트/플랫폼)로, 라우트 등록을 `boot/register-routes.ts`로 추출 |
| ai/build-pages/routes.ts | 1,006 | 핸들러/프롬프트/매핑 분리 |

> 분할 기준: **300~400줄 초과 + 책임 2개 이상**이면 분리. 한 파일 = 한 책임.

### 5.2 중복 객체화 (자원 낭비 방지)
1. **테넌트 콘텐츠 관리 페이지 15개**(SermonManagement, StaffManagement, BannerManagement, BoardManagement …)는 거의 동일한 패턴(목록 + 폼 + ImageUpload + useX 훅 + 토스트). → 제네릭 `<ResourceManager config={...}>` 또는 설정 객체(필드 스키마) 기반 컴포넌트로 통합. 모듈별 차이는 config로.
2. **raw-SQL CRUD 서비스**(COLUMN_MAP 패턴: demo-requests, applications, 등 5+) → 공용 `createCrudService(table, columnMap)` 팩토리로 list/get/create/update/delete 생성. snake/camel 매핑 일원화.
3. **부팅 테이블 생성**(index.ts의 반복 CREATE TABLE/ALTER) → 선언적 마이그레이션 배열 + 러너.
4. **이메일 버튼/레이아웃** — emailButton/kakaoButton 패턴은 정리됨. 인라인 HTML(accessEmailHtml 등)은 email-layout 헬퍼로 통일.
5. **마케팅 페이지 헤더/푸터** — SiteLogo/FaviconSetter/KakaoInquiryButton 공유 컴포넌트화 완료. 랜딩/features 헤더 마크업 중복 → `<MarketingHeader/>`로 추출 가능.
6. **api-client 메서드의 `unwrapData` + camel 매핑** 반복 → 공통 래퍼.
7. **슈퍼어드민 싱글톤 config UI**(demo_config, marketing_config 편집 카드) — 폼 패턴 유사 → 공용 SettingsForm.

### 5.3 권장 순서
1. SuperAdminDashboardV2 탭 분리(가장 큰 토큰 절감).
2. 콘텐츠 관리 페이지 제네릭화.
3. CRUD 서비스 팩토리.
4. server index.ts 부팅 로직 추출.
5. 나머지 공용 컴포넌트/헬퍼.

> 리팩토링 원칙: **동작 변경 없는 순수 구조 변경**. 파일별로 분리 → typecheck → 테스트 → 커밋(작게, 자주). CLAUDE.md의 "새 파일로 교체, 원본은 .bak 유지" 규칙 적용.

---

## 6. 알려진 위험 / 주의

- **파괴적 PROD 작업**: 트랜잭션 보호 없이 금지(§2.11).
- **SiteGround SMTP**: Railway 발송 배달 불안정 가능 → 전용 ESP(Resend 등) 검토.
- **Next fetch 캐시**: 테넌트 사이트가 URL만으로 캐시되어 X-Tenant-Slug 무시 의심(미검증) — 새 테넌트가 더미데이터 표시 사례.
- **planner 라우트 미인증**: 비용 리스크.
- **마이그레이션 egress 차단**(SiteGround WAF).

---

## 7. 배포·검증 체크리스트
1. 변경 표면 typecheck (`tsc --noEmit`) + 영향 테스트(`vitest run`).
2. api-client 변경 시 `pnpm --filter @dw-church/api-client build` + 패키지 index.ts에 export 추가 확인(named re-export임).
3. 커밋 + push(항상).
4. (요청 시 확인 후) 배포: api-server / admin / web 중 변경된 것만.
5. 공개 엔드포인트·핵심 플로우 1건 스모크.
