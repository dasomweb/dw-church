# DW Church SaaS 개발 계획서 (v2.0)

## 0. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | DW Church — 교회 관리 SaaS |
| 기반 코드 | github.com/dasomweb/dw-church |
| 목표 | 교회 웹사이트 + 관리 시스템을 독립형 SaaS로 제공 |
| 도메인 | truelight.app |
| 라이선스 | GPL-3.0 |

### 핵심 원칙
- **DW Church = 완전한 독립 서비스** (WordPress 종속 탈피)
- **멀티테넌시** — 교회별 서브도메인 자동 생성 (sarang.truelight.app)
- **스키마 분리** — 교회별 PostgreSQL 스키마로 데이터 완전 격리
- **블록 기반 페이지** — 10개 디자인 템플릿 + 섹션 블록 추가/제거
- **WordPress 연동** — API 제공으로 기존 WP 사이트에서도 사용 가능

---

## 1. 인프라 구조

```
┌─────────────────────────────────────────────────────┐
│  Vercel (US East)                                    │
│                                                      │
│  ┌──────────────────┐  truelight.app               │
│  │  apps/web         │  *.truelight.app             │
│  │  Next.js 15       │  공개 사이트 + 랜딩            │
│  └──────────────────┘                                │
│                                                      │
│  ┌──────────────────┐  admin.truelight.app          │
│  │  packages/        │                                │
│  │  admin-app        │  관리자 SPA                    │
│  │  Vite + React     │                                │
│  └──────────────────┘                                │
│                                                      │
│  ┌──────────────────┐  api.truelight.app            │
│  │  apps/server      │                                │
│  │  Fastify          │  REST API (Serverless)         │
│  └──────────────────┘                                │
└─────────────────────────────────────────────────────┘
         │                    │                │
         ▼                    ▼                ▼
┌────────────────┐  ┌──────────────┐  ┌──────────────┐
│  Supabase       │  │  Cloudflare  │  │  Stripe      │
│  US East        │  │  R2          │  │  결제         │
│                 │  │              │  │              │
│  PostgreSQL     │  │  파일 저장    │  │  Basic $19   │
│  + Auth         │  │  CDN 내장    │  │  Pro   $49   │
│  + RLS          │  │  이그레스 $0 │  │              │
└────────────────┘  └──────────────┘  └──────────────┘
```

### 비용 구조
| 단계 | 월 비용 |
|------|--------|
| 시작 (교회 0~20곳) | ~$6/월 |
| 성장 (교회 50~100곳) | ~$67/월 |

---

## 2. 멀티테넌시 구조

### 스키마 분리 방식
```sql
-- 교회 등록 시 자동 생성
CREATE SCHEMA tenant_sarang;

-- tenant_template에서 테이블 복제
-- sermons, bulletins, columns_pastoral, albums,
-- banners, events, staff, history,
-- pages, page_sections, menus, themes,
-- settings, categories, preachers, files
```

### 서브도메인 자동 생성
```
교회 등록: slug = "sarang"
→ sarang.truelight.app 즉시 활성화
→ DNS 설정 불필요 (Cloudflare 와일드카드)
→ Vercel Edge Middleware가 tenant 라우팅
```

---

## 3. 기술 스택

| 영역 | 기술 |
|------|------|
| 언어 | TypeScript |
| API 서버 | Fastify (Vercel Serverless) |
| 프론트엔드 | React 18 + Vite (Admin), Next.js 15 (공개 사이트) |
| 서버 상태 | TanStack Query v5 |
| 클라이언트 상태 | Zustand |
| 폼 | React Hook Form |
| 스타일 | Tailwind CSS |
| DB | PostgreSQL (Supabase) |
| 인증 | Supabase Auth (JWT) |
| 파일 저장 | Cloudflare R2 (S3 호환) |
| 결제 | Stripe |
| 배포 | Vercel (Git push 자동 배포) |

---

## 4. Monorepo 구조

```
dw-church/
├── dw-church-app/
│   ├── packages/
│   │   ├── api-client/        # TypeScript API 클라이언트 + TanStack Query 훅
│   │   ├── ui-components/     # React 공개 컴포넌트 38개
│   │   ├── admin-app/         # 관리자 SPA
│   │   ├── wp-connector/      # WordPress 연동 플러그인
│   │   └── wp-plugin/         # 기존 WP 플러그인 (레거시)
│   ├── apps/
│   │   ├── server/            # Fastify API 서버
│   │   ├── web/               # Next.js 공개 사이트
│   │   └── demo/              # 독립 데모 앱
│   ├── docs/                  # API 문서, 관리자 매뉴얼
│   └── package.json           # pnpm workspace
├── includes/                  # 기존 PHP 플러그인
└── admin/                     # 기존 PHP 관리자
```

---

## 5. CPT (콘텐츠 타입) — 8개

| CPT | 테이블명 | 핵심 필드 |
|-----|---------|----------|
| 설교 | sermons | title, scripture, youtube_url, sermon_date, thumbnail_url, preacher_id |
| 주보 | bulletins | title, bulletin_date, pdf_url, images(JSONB) |
| 목회컬럼 | columns_pastoral | title, content(HTML), top/bottom_image_url |
| 앨범 | albums | title, images(JSONB), youtube_url, category_id |
| 배너 | banners | title, pc/mobile/sub_image_url, link_url, text_overlay, category |
| 이벤트 | events | title, background_image_url, event_date, location, department |
| 교역자 | staff | name, role, department, email, phone, bio, photo_url, sns_links |
| 연혁 | history | year, items(JSONB — month, day, content, photoUrl 배열) |

### 추가 테이블
| 테이블 | 용도 |
|--------|------|
| pages | 블록 기반 페이지 |
| page_sections | 페이지 섹션 (블록) |
| menus | 네비게이션 메뉴 |
| themes | 테마 설정 (색상, 폰트, CSS) |
| settings | 교회 기본 정보 |
| categories | 설교 카테고리, 앨범 카테고리, 부서 등 |
| preachers | 설교자 목록 |
| files | 업로드 파일 메타데이터 |

---

## 6. REST API 설계

### Base URL: `https://api.truelight.app/api/v1`

### 인증
```
POST /auth/register    — 교회 등록 (스키마 자동 생성)
POST /auth/login       — 로그인 (JWT 발급)
POST /auth/logout      — 로그아웃
GET  /auth/me          — 현재 사용자 정보
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/invite      — 관리자 초대
```

### 콘텐츠 CRUD (8개 CPT)
```
GET/POST        /sermons, /bulletins, /columns, /albums,
                /banners, /events, /staff, /history
GET/PUT/DELETE  /sermons/:id, /bulletins/:id, ...
POST            /staff/reorder
GET             /history/years
```

### 택소노미
```
GET  /taxonomies/:type   — sermon_category, sermon_preacher,
                           album_category, staff_department 등
```

### 페이지/메뉴/테마
```
GET/POST        /pages
GET/PUT/DELETE  /pages/:id
GET/POST        /pages/:id/sections
PUT/DELETE      /pages/:pageId/sections/:id
POST            /pages/:pageId/sections/reorder
GET/POST        /menus
PUT/DELETE      /menus/:id
POST            /menus/reorder
GET/PUT         /theme
```

### 설정/파일/사용자
```
GET/PUT    /settings
POST       /files/upload
GET/DELETE /files, /files/:id
GET        /users
POST       /users/invite
DELETE     /users/:id
```

### 결제 (Stripe)
```
POST /billing/checkout
POST /billing/webhook
GET  /billing/portal
GET  /billing/status
```

### 슈퍼어드민
```
GET    /admin/tenants
POST   /admin/tenants
PUT    /admin/tenants/:id
DELETE /admin/tenants/:id
GET    /admin/stats
```

---

## 7. 관리자 앱 (admin.truelight.app)

### 페이지 구성
```
/login              로그인
/register           교회 등록
/forgot-password    비밀번호 찾기

/                   대시보드
/bulletins          주보 관리
/sermons            설교 관리
/columns            목회컬럼 관리
/albums             앨범 관리
/banners            배너 관리
/events             이벤트 관리
/staff              교역자 관리
/history            연혁 관리
/pages              페이지 에디터 (블록 기반)
/menus              메뉴 에디터
/theme              테마 설정 (10개 템플릿, 색상/폰트)
/users              사용자 관리 (초대/삭제)
/settings           교회 설정 (기본정보, SNS)
/super-admin        슈퍼어드민 대시보드
```

### UI/UX 설계 원칙
- **카드 기반 섹션** — 흰색 카드 + 그림자 (bg-gray-50 배경 위)
- **모던 입력 필드** — bg-gray-50 → 포커스 시 흰색 + 블루 링
- **상단 라벨** — 대문자 작은 크기 + 넓은 자간
- **토글 스위치** — 체크박스 대신 스위치 카드
- **Toast 알림** — 저장/삭제 성공/실패 피드백
- **확인 다이얼로그** — 삭제 시 모달 확인
- **스켈레톤 로더** — 로딩 중 애니메이션
- **빈 상태** — 데이터 없을 때 아이콘 + 안내 + 추가 버튼
- **이미지 업로드** — 파일 선택 + URL 입력 + 미리보기 + 순서 변경

---

## 8. 공개 사이트 (truelight.app)

### 랜딩 페이지
- 서비스 소개, 기능 카드, 가격 플랜, 무료 시작 CTA

### 교회 사이트 (*.truelight.app)
```
/               홈 (블록 기반 페이지)
/sermons        설교 목록/상세
/bulletins      주보 목록/상세
/albums         앨범 목록/상세
/staff          교역자 소개
/history        교회 연혁
/events         행사/이벤트
/[pageSlug]     커스텀 페이지
```

### 블록 시스템 (16종)
```
콘텐츠:       히어로배너, 텍스트+이미지, 텍스트만, 이미지갤러리, 비디오, 구분선
교회기능:     최근설교, 최근주보, 앨범갤러리, 교역자, 연혁타임라인, 이벤트
교회정보:     예배안내, 오시는길, 연락처, 새가족안내
```

### 디자인 템플릿 (10종)
```
Modern, Classic, Minimal, Warm, Formal,
Dark, Visual, Simple, Traditional, Youth
```
교회 등록 시 템플릿 선택 → 페이지 + 블록 + 색상/폰트 자동 생성

---

## 9. WordPress 연동 (wp-connector)

기존 WordPress 사이트에서 DW Church SaaS 데이터를 표시하는 플러그인

### 숏코드 7개
```
[dw_church_sermons limit="6" category="sunday"]
[dw_church_bulletins limit="5"]
[dw_church_albums limit="8"]
[dw_church_staff department="all"]
[dw_church_history]
[dw_church_events limit="4"]
[dw_church_banners]
```

### 설정
- API URL + API Key 입력
- 캐시 TTL 설정
- 연결 테스트 / 캐시 삭제

---

## 10. 결제 구조

| 플랜 | 가격 | 제한 |
|------|------|------|
| Free | $0/월 | 설교 50개, 앨범 10개, 1GB 저장 |
| Basic | $19/월 (~25,000원) | 무제한, 10GB, 커스텀 도메인 |
| Pro | $49/월 (~65,000원) | 무제한, 50GB, API 액세스, 화이트라벨 |

---

## 11. 현재 완료 상태

### ✅ 완료
- [x] Monorepo 환경 (pnpm workspace, TypeScript, Vite, Tailwind)
- [x] Fastify REST API 서버 (16개 모듈, 50+ 엔드포인트)
- [x] 멀티테넌시 (스키마 분리, 교회 등록 시 자동 생성)
- [x] Supabase Auth (JWT 인증, 역할 기반 접근 제어)
- [x] @dw-church/api-client (TypeScript 타입, DWChurchClient, TanStack Query 훅 70+)
- [x] @dw-church/ui-components (React 컴포넌트 38개)
- [x] Admin SPA (15개 페이지, CRUD, 페이지/메뉴/테마 에디터)
- [x] Next.js 공개 사이트 (블록 렌더러, 템플릿 10종, 서브도메인 라우팅)
- [x] Stripe 결제 연동 (서버 측)
- [x] WordPress Connector 플러그인
- [x] Cloudflare R2 파일 저장
- [x] Vercel 배포 (3개 프로젝트, 커스텀 도메인)
- [x] 문서 (API Reference, Admin Manual KR, WP Integration Guide)
- [x] 테스트 데이터 (8개 CPT × 5개씩)

### 🔧 남은 작업
- [ ] 공개 사이트 빌드 에러 수정 (Next.js)
- [ ] 관리자 앱 CRUD 실제 동작 검증 (생성/수정/삭제)
- [ ] 파일 업로드 R2 연동 테스트
- [ ] Stripe 결제 프론트엔드 연동
- [ ] 커스텀 도메인 연결 기능 (Pro 플랜)
- [ ] 이메일 알림 (비밀번호 재설정 등)
- [ ] 테스트 확충 (Vitest + Playwright E2E)
- [ ] Storybook 문서화
- [ ] 프로덕션 보안 점검 (Rate limiting, CORS, 입력 검증)

---

## 12. 접속 정보

| 서비스 | URL |
|--------|-----|
| API | https://api.truelight.app |
| Admin | https://admin.truelight.app |
| 공개 사이트 | https://truelight.app |
| Health Check | https://api.truelight.app/health |

### 테스트 계정
```
이메일:     info@dasomweb.com
비밀번호:   Test1234!
교회 slug:  dwchurch
```

### 인프라 서비스
| 서비스 | 용도 |
|--------|------|
| Supabase | PostgreSQL + Auth (US East) |
| Cloudflare R2 | 파일 저장 (dw-church-files 버킷) |
| Vercel | 배포 (3개 프로젝트) |
| Squarespace | 도메인 DNS (truelight.app) |

---

## 13. 파일 구조 요약 (236파일)

| 패키지 | 파일 수 | 역할 |
|--------|--------|------|
| api-client | 11 | TypeScript 타입 + 클라이언트 + 훅 |
| ui-components | 58 | React 공개 컴포넌트 |
| admin-app | 29 | 관리자 SPA |
| server | 67 | Fastify REST API |
| web | 51 | Next.js 공개 사이트 |
| demo | 7 | Vite 데모 앱 |
| wp-connector | 6 | WordPress 플러그인 |
| docs | 5 | 문서 |
