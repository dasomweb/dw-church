# 개발 내역 — True Light (DW Church SaaS)

## 1. 개요
교회 웹사이트의 주보·설교·칼럼·앨범 관리를 돕는 WordPress 플러그인 "DW Church"(2025-10~)로 시작했고, 교회마다 WordPress 를 따로 운영하는 부담을 없애려고 2026-03 독립 백엔드 + 멀티테넌트 SaaS(현재 True Light, truelight.app)로 전환했다. 페이지는 블록으로 한 번 구성하고, 교회는 매주 콘텐츠만 등록하면 사이트에 반영되는 3계층(테마 / 페이지 / 동적 콘텐츠) 구조가 핵심이다. 이후 b2bsmart 의 블록·디자인 토큰·AI 빌더·커스텀 도메인 패턴을 들여와 교회 업종에 맞게 조정하고, 교적·스몰그룹·온라인 주보 같은 교회 업무 모듈을 더했다.

## 2. 타임라인
| 날짜 | 버전·태그 | 내용 |
| --- | --- | --- |
| 2026-11 | - | 최신 소식 매거진 그리드(피처 행 + 레일 폭 카드) |
| 2026-10 | - | 책 추천 모듈 확장, 지난 온라인 주보 복제, 설교노트 목록 페이지(Claude Design 시안), 테넌트 도메인 라우팅 감사 후속 4건 |
| 2026-09 | - | 온라인 주보 콘텐츠 모듈(스크롤형, 한/영, 개역개정·ESV, 가사 OCR), 설교 리디자인(멀티 섹션 본문), Claude Design 결정적 임포트(design-importer P0), 서비스 신청 7단계 파이프라인, 카드뉴스, 보안 이벤트 감사 로그 |
| 2026-08 | - | 프론트 샘플(전체 홈 6스타일, 사이드바·대시보드 레이아웃) + 디자인 선택기 실제 미리보기 |
| 2026-07 | - | 요금제 카드(플랜별 기능·가격), 배너 슬라이더 크로스페이드, 마이그레이션 히어로 가독성, DNS 안내 개선 |
| 2026-06-23 | v6.3.0 | 플랜 기반 관리자 계정 수 제한 |
| 2026-06 | - | b2bsmart 디자인 토큰·블록 패키지 이식(Phase 0), AI 빌더 이식(Phase 11), Cloudflare for SaaS 커스텀 도메인 + saas-proxy Worker, Stripe 웹훅 정상화, R2 자체 호스팅 정리, 마케팅 이메일 브로드캐스트, 반응형 다듬기. 06-24 GitHub Actions 자동 배포 중단(수동 배포로 전환) |
| 2026-04-23 | v6.2.0 | 검증된 도메인을 Railway GraphQL API 로 자동 등록, 테넌트·세션 격리(sessionStorage + JWT 우선) |
| 2026-04 | v5.2.0~v6.1.0 | Layout Block 자식 편집기·Element 그룹화, 기존 교회 사이트 마이그레이션(스크랩 → AI 블록 분류 → 적용, job 기반 재설계) |
| 2026-03-19 | v4.0.0 | DW Church SaaS: 독립 백엔드(Fastify + Prisma + PostgreSQL) + 멀티테넌시 + 블록 에디터 + WP connector, React 모노레포 전환 |
| 2026-03 | v2.71.x | WordPress 플러그인 마지막 계열: ACF·일반 Post → 주보·설교·칼럼·앨범 마이그레이션 도구 |
| 2025-11~12 | - | 배너 표시 순서, 최근 주보 위젯 페이지네이션 |
| 2025-10-02 | - | WordPress 교회 관리 플러그인 첫 커밋(주보·설교·칼럼·앨범 CPT, Elementor 위젯) |

확인 필요: v6.3.0 이후 태그가 없어 2026-07 이후 버전 번호는 정해지지 않음.

## 3. 주요 결정
- **WordPress 플러그인 → 독립 SaaS**: 2026-03 독립 백엔드로 전환 (WP 플러그인 시절 업데이트 후 비활성화 같은 운영 문제는 `Plugin-Auto-Activate-After-Update.md` 참고. 확인 필요: 전환 결정의 공식 사유 — `DW-Church-SaaS-Development-Plan-v2.0.md`). 기존 WP 사이트는 `packages/wp-connector`(DW Church Connector)와 임베드 위젯 `embed.js` 로 SaaS 콘텐츠를 가져다 씀.
- **스키마 단위 테넌트 격리**: 교회마다 PostgreSQL 스키마 `tenant_{slug}`, R2 폴더 `tenant_{slug}/`. 새 테넌트는 `tenant_template` 스키마를 복제(`clone_schema` 함수)하고 구조(페이지·메뉴·테마)만 시드, 동적 콘텐츠는 절대 시드하지 않음.
- **스택**: API = Fastify + Prisma(공용 테이블) + raw SQL(테넌트 스키마), 웹 = Next.js(교회 사이트·마케팅), 관리자 = React + Vite SPA, AI = FastAPI 에이전트(`apps/agents`, Claude·Gemini), 파일 = Cloudflare R2, 결제 = Stripe, 메일 = Resend/SMTP, 오류 = Sentry.
- **블록 용어 고정**: Page → Section(슬롯) → Block(Static / Data / Layout) → Element. 블록 메타데이터는 `packages/blocks/src/registry.json` 한 곳이 정본이고 AI 빌더·에디터·에이전트가 모두 읽음.
- **API snake_case, 클라이언트 camelCase**: api-client 의 camelizeKeys/snakeizeKeys 로 자동 변환.
- **b2bsmart 와 블록 시스템 공유**: 2026-06 b2bsmart 의 design-tokens·blocks·AI 빌더·Cloudflare for SaaS 패턴을 복사해 들여옴(현재 코드 복제 상태, 패키지 공유 아님).
- **배포**: Railway 4개 서비스(api-server, web, admin, agents). GitHub Actions 배포 워크플로는 2026-06-24 운영 결정으로 수동(workflow_dispatch) 전용이 됨 — 확인 필요: 현재 표준 배포 경로(DASOMWEB 공통 규칙은 GitHub auto-deploy, 이 repo 의 워크플로 주석은 Railway CLI 수동 배포).
- **요금제 게이트**: `config/plan-limits.ts` 가 플랜(basic·plus·pro)별 관리자 수·기능의 단일 정본, 애드온은 `requireFeature('membership' | 'smallgroup' | 'newcomer_registration' | 'forms' | 'translation')`.

## 4. 함정·장애
- **Stripe 웹훅 서명 항상 실패** → Fastify 전역 JSON 파서가 본문을 객체로 바꿔 원본 바이트가 사라짐 → 웹훅만 별도 스코프에 buffer 파서로 등록 (`apps/server/src/index.ts`, 2026-06-16).
- **Railway 헬스체크 실패(web)** → 테넌트 미들웨어가 Railway 내부 Host 를 커스텀 도메인으로 보고 `/` 를 404 → 미들웨어 제외 경로 `/api/health` 로 헬스체크 (`apps/web/railway.toml`).
- **Railway GitHub auto-deploy 간헐 미동작** → push 해도 빌드가 안 뜨는 일이 반복(2026-06-01·02) → Actions 워크플로로 서비스별 배포를 만들었다가 이후 수동 배포로 전환.
- **Chromium 설치 후 부팅 크래시** → apt 의 Chromium 이 OpenSSL 3 을 올려 Prisma 엔진 불일치 → Prisma `binaryTargets` 에 openssl-3.0.x 추가 (2026-09-11).
- **커스텀 도메인 SSL·라우팅** → Cloudflare for SaaS 트래픽의 SNI 를 Railway 가 거부 → `workers/saas-proxy` 가 SNI 재작성, 도메인 검증 후 Railway GraphQL 로 자동 등록. 커스텀 도메인이 마케팅 사이트로 떨어지지 않게 별도 처리 (`CUSTOM-DOMAINS.md`, `docs/multitenant-domains`).
- **테넌트 섞임** → 슈퍼어드민·다중 탭에서 X-Tenant-Slug 가 남아 다른 교회 데이터를 건드릴 위험 → JWT 의 테넌트가 헤더보다 우선, support 역할은 교차 테넌트 시 403, 위반은 `security_events` 에 기록 (`middleware/auth.ts`, `TENANT-ISOLATION.md`).
- **camelCase/snake_case 불일치로 저장 안 됨** → 클라이언트는 camelCase 로 보내는데 스키마가 snake_case 만 받음(설정·스몰그룹·게시판 등 여러 번) → Zod 스키마를 camelCase 로 맞추고 변환 규칙을 CLAUDE.md 에 고정.
- **외부 이미지 핫링크** → 마이그레이션·빌더가 원본 URL 을 그대로 저장해 깨짐 → 모두 R2 로 사이드로드 (주보 PDF 포함).
- **Cloudflare 524 / Failed to fetch** → 관리자에서 부르는 오래 걸리는 마이그레이션 호출이 Cloudflare 경유 시 시간 초과 → 해당 호출만 Railway 직접 주소로 우회 (2026-06-05, 마이그레이션 자체는 2026-04 부터 job 기반).

## 5. 재사용 가능한 패턴
- `dw-church-app/apps/server/src/middleware/tenant.ts` — 헤더 → 서브도메인 → 커스텀 도메인 순 테넌트 해석 (DW-MCP 등록됨)
- `dw-church-app/apps/server/src/middleware/auth.ts` — JWT 테넌트 우선 바인딩 + 역할 게이트 + 스태프 범위 RBAC (DW-MCP 등록됨)
- `dw-church-app/apps/server/prisma/tenant-template.sql` + `utils/schema-manager.ts` — 템플릿 스키마 복제형 테넌트 생성 (DW-MCP 등록됨)
- `dw-church-app/apps/server/src/index.ts` (Stripe webhook scope) — 웹훅만 raw body 로 받는 Fastify 캡슐화 스코프
- `dw-church-app/apps/server/src/config/plan-limits.ts` — 플랜 별칭 정규화 + 기능 게이트 단일 정본
- `dw-church-app/workers/saas-proxy` — Cloudflare for SaaS → Railway SNI 재작성 Worker
- `dw-church-app/packages/blocks/src/registry.json` — AI·에디터 공용 블록 카탈로그 (b2bsmart 와 같은 계열)
- `dw-church-app/scripts/design-importer` — Claude Design 시안을 블록으로 결정적 임포트 (방법론은 b2bsmart 플레이북으로 DW-MCP 등록됨)
- `dw-church-app/apps/web/public/embed.js` — 외부 사이트용 의존성 없는 콘텐츠 임베드 위젯
- `dw-church-app/apps/server/src/modules/migration` — 기존 사이트 스크랩 → AI 분류 → 테넌트 적용 job 파이프라인
- `dw-church-app/apps/server/src/modules/backups-full` — 테넌트 DB + 미디어 전체 백업을 R2 로

## 6. 다른 프로젝트와의 연동
- 호출하는 서비스: Railway GraphQL API(도메인 등록), Cloudflare API(for SaaS 호스트네임), Cloudflare R2, Stripe(결제), Resend·SMTP(메일), YouTube Data API(설교 가져오기), Anthropic Claude·Google Gemini(AI 빌더·분류), Claude Design(OAuth + 캔버스 가져오기), Sentry, Web Push(VAPID) — 모두 API
- 호출받는 서비스: 교회 WordPress 사이트(`wp-connector` 플러그인, REST API), 외부 사이트(`embed.js` → 공개 API), Stripe 웹훅(`POST /api/v1/billing/webhook`), 내부 `apps/agents`(`INTERNAL_SERVICE_TOKEN` 으로 `/api/v1/internal/*` 호출 — 확인 필요: 구현 범위)
- 코드 계보: b2bsmart(블록·디자인 토큰·AI 빌더·커스텀 도메인 패턴 원본), DW-AI 에이전트 파이프라인(`apps/agents`), DW-Church-WP·license-server-dw-church(WP 플러그인 계열 — 확인 필요: 현재 관계)
- 이벤트 발행·구독: 없음

## 7. 남은 과제
- OpenAPI 명세 작성, `dw-church-app/docs/API-Reference.md` 의 Base URL(`dw-church.app`) 등 오래된 내용 갱신
- b2bsmart 와 복제된 blocks·design-tokens 를 공유 패키지로 합칠지 결정 (현재 양쪽에서 따로 수정 중)
- `packages/agents-adapter` 구현 완료 (README 기준 골격 단계)
- 배포 경로 단일화 (Actions 수동 / Railway CLI / GitHub auto-deploy 중 무엇이 표준인지)
- 루트의 WordPress 플러그인(v2.71.31) 유지 여부와 DW-Church-WP repo 와의 정리
- 교회 블록·콘텐츠 모듈·교적 모듈을 다른 교회 프로젝트가 쓸 수 있게 패키지로 분리 (현재 in-repo)
