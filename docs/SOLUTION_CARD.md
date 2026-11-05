---
solution_id: dw-church-truelight
name: True Light (DW Church SaaS)
repo: dasomweb/dw-church
status: 운영 중
owner: 확인 필요
domains: [개발·운영, 콘텐츠제작, 고객지원, 영업·B2B]
tasks: [교회 웹사이트 제작·운영, 설교·주보·칼럼 등 교회 콘텐츠 관리, 교적·스몰그룹 관리, 기존 교회 사이트 마이그레이션, 커스텀 도메인 연결, 구독 결제]
multi_client: true
personal_data: true
api: 있음
priority: 상
updated: 2026-11-04
card_version: 2
industries: [church]
stack: [typescript, node, fastify, prisma, postgres, nextjs, react, vite, python, fastapi, cloudflare-workers, php, wordpress]
hosting: railway
openapi: none
uses_modules: []
owns_data:
  - entity: organization
    local_name: Tenant
    id_field: id
    note: 교회(테넌트). public.tenants (Prisma model Tenant), slug 로 tenant_{slug} 스키마를 가리킴
  - entity: person
    local_name: members
    id_field: id
    note: 교적(교인). tenant_{slug}.members + households + member_relations, 교적관리 애드온
  - entity: church.sermon
    local_name: sermons
    id_field: id
    note: tenant_{slug}.sermons (+ preachers, sermon_categories)
  - entity: church.bulletin
    local_name: bulletins
    id_field: id
    note: PDF·이미지 주보. 스크롤형 온라인 주보는 online_bulletins
  - entity: church.small_group
    local_name: groups
    id_field: id
    note: tenant_{slug}.groups + group_members (스몰그룹 애드온), 목장은 cells
  - entity: church.newcomer
    local_name: newcomer_registrations
    id_field: id
  - entity: user
    local_name: User
    id_field: id
    note: 관리자 계정 (public.users, 역할 owner·admin·staff·support·super_admin)
publishes_events: []
subscribes_events: []
---

# True Light (DW Church SaaS)

## 1. 한 줄 설명
교회마다 독립 데이터 스키마를 갖는 멀티테넌트 교회 웹사이트·관리 SaaS. 블록 기반 페이지 편집기와 설교·주보·칼럼·앨범·교역자 같은 교회 콘텐츠 모듈, 교적·스몰그룹 애드온을 제공한다 (서비스명 True Light, 도메인 truelight.app). 이 repo 루트에는 이전 세대 WordPress 플러그인 "DW Church"(v2.71.31)도 함께 있다.

## 2. 업무에서 하는 일
- 업무 영역·하는 일: 개발·운영 / 교회 사이트 제작·운영(테넌트 생성, 도메인 연결, 백업) · 콘텐츠제작 / 매주 설교·주보·칼럼·행사 등록, AI 페이지 빌더 · 고객지원 / 지원 티켓, 데모 신청 · 영업·B2B / 서비스 신청(applications)·견적·요금제·프로모션
- 넣는 것 → 나오는 것: 교회 정보·콘텐츠(설교 YouTube URL, 주보 PDF, 사진, 교인 명부 CSV) → 교회 웹사이트(`{slug}.truelight.app` 또는 커스텀 도메인), 관리자 화면, 공개 콘텐츠 API·임베드 위젯

## 3. 접속 정보
- 기본 주소: API `https://api.truelight.app/api/v1` / 웹 `https://truelight.app`, 교회 사이트 `https://{slug}.truelight.app` / 관리자 `https://admin.truelight.app`. 에이전트용 환경변수 이름: 확인 필요 (코드에 지정된 이름 없음)
- 테넌트 지정: `X-Tenant-Slug: <slug>` 헤더 → 서브도메인 → 커스텀 도메인 순서로 해석 (`apps/server/src/middleware/tenant.ts`)
- 인증: `POST /api/v1/auth/login` → JWT (`accessToken`, `refreshToken`) → `Authorization: Bearer <token>`. 공개 조회(GET 설교·주보 등)는 인증 없이 가능. 내부 서비스 간 호출은 `INTERNAL_SERVICE_TOKEN`
- 상태 확인: API `GET /health` → 200 `{status:"ok", version, timestamp, uptime}` / 웹 `GET /api/health` / 에이전트 `GET /health`
- 호스팅: Railway 4개 서비스(api-server, web, admin, agents) + PostgreSQL / Cloudflare R2(파일, `cdn.truelight.app`) / Cloudflare for SaaS + Worker(`workers/saas-proxy`, 커스텀 도메인 SNI) / 문서: `dw-church-app/docs/API-Reference.md`(Base URL 표기가 옛 `dw-church.app` — 확인 필요), `TENANT-ISOLATION.md`, `CUSTOM-DOMAINS.md`, `TENANT-URL-ROUTING.md`, `MIGRATION.md`
- 서버 환경변수(이름만): `DATABASE_URL`, `JWT_SECRET`, `INTERNAL_SERVICE_TOKEN`, `R2_ENDPOINT`/`R2_BUCKET_NAME`/`R2_BACKUP_BUCKET_NAME`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_PUBLIC_URL`, `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_PRICE_BASIC`/`STRIPE_PRICE_PRO`, `CF_API_TOKEN`/`CF_ZONE_ID`/`CF_FALLBACK_ORIGIN`, `SAAS_PROXY_SECRET`, `RAILWAY_API_TOKEN`/`RAILWAY_ENVIRONMENT_ID`/`RAILWAY_WEB_SERVICE_ID`, `WEB_BASE_URL`, `WEB_CNAME_TARGET`, `REVALIDATE_SECRET`, `RESEND_API_KEY`, `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`, `EMAIL_FROM`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `YOUTUBE_API_KEY`, `AGENTS_BASE_URL`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`, `SENTRY_DSN`, `PORT`

## 4. 기능 목록
모든 경로 앞에 `/api/v1` 이 붙는다. 테넌트 범위 기능은 `X-Tenant-Slug` 필요. 응답 필드는 snake_case.

| 기능 | 등급 | 호출 | 주요 입력 | 주요 출력 | 제한·비용 |
| --- | --- | --- | --- | --- | --- |
| 서비스 상태 | 조회 | `GET /health` | - | status, version, uptime | - |
| 로그인·내 정보 | 조회 | `POST /auth/login`, `GET /auth/me` | email, password | accessToken, refreshToken, user | 전역 rate limit 1분 창 |
| 설교·주보·칼럼·앨범 조회 | 조회 | `GET /sermons`, `/sermons/:id`, `/sermons/:id/related`, `GET /bulletins`, `GET /columns`, `GET /albums` | page, 카테고리, 검색어 | 목록·상세 (title, sermon_date, youtube_url, scripture …) | 공개 |
| 온라인 주보·설교노트 조회 | 조회 | `GET /online-bulletins`, `/online-bulletins/latest`, `GET /sermon-notes` | - | 예배 순서·교회소식 섹션 | 공개 |
| 교역자·연혁·행사·일정·영상·말씀 조회 | 조회 | `GET /staff`, `/history`, `/events`, `/schedules`, `/videos`, `/verses`, `/devotions`, `/books` | - | 목록 | 공개 |
| 페이지·메뉴·테마 조회 | 조회 | `GET /pages`, `/pages/:slug`, `GET /menus`, `GET /theme` | slug | page + sections(block_type, props) | 공개 |
| 교회 콘텐츠 등록·수정 | 생성 | `POST/PUT /sermons`, `/bulletins`, `/online-bulletins`, `/sermon-notes`, `/columns`, `/albums`, `/events`, `/staff`, `/history` … | 각 모듈 필드 | 생성된 항목 | 설교는 `status` draft·published·archived (비로그인 조회는 published 만). `published` 로 저장하면 외부반영. 확인 필요: 다른 모듈의 draft 지원 범위 |
| 콘텐츠 삭제 | 외부반영 | `DELETE /sermons/:id` 등 | id | - | 되돌릴 수 없음 |
| 페이지·섹션·메뉴·테마 편집 | 외부반영 | `/pages`, `/menus`, `/theme` 쓰기 | 블록 props | 공개 사이트 즉시 변경 | 관리자 |
| AI 페이지 빌더 | 외부반영 | `/ai/planner/*`, `POST /ai/build-pages`, `/ai/builder/*`, `/ai/jobs/*` | 교회 정보·참고 URL | 페이지·섹션 생성 | Claude·Gemini 비용, super_admin 전용 |
| 기존 사이트 마이그레이션 | 외부반영 | `/migration/*` (job 기반), `/youtube-import` | 원본 URL, 채널 | 테넌트에 콘텐츠·페이지 적용 | AI 분류 비용 |
| 교적관리(교인·가정·출석·심방·성례·이명) | 생성 | `GET/POST /members`, `/households`, `/member-relations`, `/attendance`, `/member-visits`, `/member-sacraments`, `/member-transfers`, `POST /members/import` | 교인 정보, CSV | 교인·통계 | 개인정보, `membership` 애드온 |
| 스몰그룹·목장 | 생성 | `/groups`, `/group-members`, `/group-queue`, `/cells`, 모임 보고·과정 | 그룹·배치 | 조직도·보고서 | `smallgroup` 애드온, 목장은 Plus 이상 |
| 새가족 등록·관리 | 생성 | `/newcomers` | 이름·연락처·방문경로 | 등록 목록·이력 | 개인정보, `newcomer_registration`(Pro) |
| 폼 빌더·제출함 | 생성 | `/form-defs/*`, `/forms/:slug/submit`, `/admin/forms/submissions` | 폼 정의·응답 | 제출 목록 | `forms` 기능 |
| 파일·이미지 업로드 | 생성 | `/files`, `/shared-images` | multipart | R2 URL | 25MB/파일 |
| 웹 푸시 발송 | 외부반영 | `/push/*` | 메시지 | 구독자 발송 | VAPID |
| 커스텀 도메인 연결 | 외부반영 | `/domains` | 도메인 | Cloudflare·Railway 등록, DNS 안내 | 외부 API |
| 구독 결제 | 외부반영 | `/billing/*`, `POST /billing/webhook`(Stripe) | 요금제 | Checkout 세션 | 돈 |
| 이메일 브로드캐스트 | 외부반영 | `/admin/email-broadcast`, `/admin/marketing-contacts` | 대상·본문 | BCC 발송 | super_admin |
| 테넌트 생성·삭제·백업 | 외부반영 | `/admin/tenants*`, `/admin/tenants/:slug/backups`, `/full-backups` | slug | 스키마 생성·복원 | super_admin |
| 서비스 신청·데모·지원 | 생성 | `/applications`, `/demo-requests`, `/support-tickets`, `/intake` | 신청서 | 접수 | 공개 접수 |
| 방문 통계 | 조회 | `GET /analytics/summary` | 기간 | 방문 집계 | 관리자 |
| 임베드 위젯 | 조회 | `<script src="https://truelight.app/embed.js">` + `data-tenant`, `data-type` | sermons·bulletins·albums·events·staff | 외부 사이트에 카드 목록 | 공개 |

## 5. 호출 예시
```
GET /api/v1/sermons?page=1
X-Tenant-Slug: example-church
→ 200
{"data": [{"id": "uuid", "title": "예시 설교", "sermon_date": "2026-11-01",
           "youtube_url": "https://youtube.com/...", "scripture": "요 3:16", "status": "published"}],
 "meta": {"total": 1, "page": 1, "perPage": 10, "totalPages": 1}}
```
(값은 가짜 예시. 비로그인 요청은 status=published 만 보임)

## 6. 에이전트에게 맡기는 범위
- 맡겨도 되는 일: 공개 콘텐츠·페이지·메뉴 조회, 방문 통계 조회, 테넌트 목록 확인
- 승인 받고 할 일: 콘텐츠 공개(published) 저장·수정·삭제 (draft 저장은 기록만 남기고 가능), 페이지·테마 편집, AI 빌더·마이그레이션 실행, 푸시·이메일 발송, 도메인 연결, 결제·요금제 변경
- 절대 맡기면 안 되는 일: 테넌트 삭제·백업 복원, 교적·새가족 개인정보 대량 조회·내보내기(`/export`), 사용자 권한·비밀번호 변경, 다른 테넌트 데이터 접근

## 7. 데이터와 개인정보
- 다루는 데이터: 교회 콘텐츠(설교·주보·사진·칼럼), 페이지 구성, 교회 설정, 결제 상태(Stripe), 방문 통계
- 개인정보: 있음 — 교인(이름·연락처·주소·생일·가족관계·출석·심방·성례), 새가족 등록(기도제목 포함), 관리자 계정, 폼 제출, 푸시 구독, 마케팅 연락처
- 고객사 구분 방법: 교회마다 PostgreSQL 스키마 `tenant_{slug}`, R2 폴더 `tenant_{slug}/`. 요청은 `X-Tenant-Slug` 또는 도메인으로 해석, JWT 의 테넌트가 우선 (교차 테넌트 접근 금지)

## 8. 오류·장애
- 자주 나는 오류와 의미: 401 토큰 없음·만료 / 403 권한 부족 또는 다른 테넌트 접근 / 404 TENANT 테넌트 해석 실패(헤더·도메인 확인) / 429 호출 초과 / 400 MISSING_SIGNATURE Stripe 웹훅 서명 없음
- 오류 추적: Sentry (`SENTRY_DSN`), 접근 위반 감사 로그 `/security-events`
- 장애 시 연락: 확인 필요

## 9. 계획 (아직 없는 것)
- OpenAPI 명세 파일 (현재 `API-Reference.md` 만, 일부 오래됨)
- agents-adapter(`packages/agents-adapter`) 구현 완료 — README 기준 Phase 3 골격 상태, 확인 필요: 현재 진행도
- 이벤트 발행·구독(웹훅) 연동 — 현재 없음
- 교회 블록·콘텐츠 모듈의 패키지 분리 (dw.module.json 참고, 현재 in-repo)
