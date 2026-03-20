# DW Church SaaS 독립 서비스 개발 계획서 (v1.0)

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | DW Church — 독립형 교회 관리 SaaS |
| **목표** | WordPress 종속을 완전히 제거하고, 자체 백엔드(Node.js) + 자체 DB(PostgreSQL) 기반의 멀티테넌시 SaaS로 전환. 교회는 가입만 하면 설교/주보/앨범/연혁/교역자 등 모든 기능을 즉시 사용. 기존 WordPress 사이트에는 API 연동 플러그인으로 데이터를 제공. |
| **기반 코드** | dw-church v3.0.0 — React 컴포넌트 라이브러리(@dw-church/ui-components, @dw-church/api-client, @dw-church/admin-app) 100% 재사용 |
| **라이선스** | GPL-3.0 (오픈소스) + SaaS 호스팅 서비스 (상업) |
| **목표 일정** | Phase 1~4, 약 8~12주 |

---

## 1. 현황 분석 — v3.0.0에서 무엇을 바꾸는가

### 1.1 재사용하는 것 (변경 없음)

| 패키지 | 설명 | 비고 |
|--------|------|------|
| `@dw-church/api-client` | TypeScript 타입 정의, DWChurchClient, TanStack Query 훅 50+ | `baseUrl`만 SaaS 서버로 변경 |
| `@dw-church/ui-components` | React 공개 컴포넌트 38개 | 데이터 소스 무관하게 동작 |
| `@dw-church/admin-app` | 관리자 React SPA 12 페이지 | WP 메타박스 대신 독립 배포 |
| Storybook / 테스트 | 68 테스트 + 7 스토리 | 그대로 유지 |

### 1.2 제거하는 것

| 파일 | 이유 |
|------|------|
| `class-dw-church-rest-api.php` | Node.js API 서버로 대체 |
| `class-dw-church-react-embed.php` | WP 연동 플러그인으로 축소 재작성 |
| WordPress CPT 등록 코드 | PostgreSQL 테이블로 대체 |
| WordPress 메타박스/컬럼 코드 | Admin App이 독립 동작 |

### 1.3 새로 만드는 것

| 항목 | 기술 |
|------|------|
| API 서버 | Node.js + Fastify (또는 Express) |
| 데이터베이스 | PostgreSQL + Prisma ORM |
| 인증 | JWT + Refresh Token (교회별 관리자 계정) |
| 멀티테넌시 | tenant_id 컬럼 방식 (공유 DB) |
| 파일 저장소 | Cloudflare R2 (S3 호환) |
| SaaS 관리 콘솔 | 슈퍼어드민 대시보드 (교회 생성/과금/모니터링) |
| WordPress 연동 플러그인 | API 클라이언트 경량 플러그인 |

---

## 2. 목표 아키텍처

### 2.1 전체 시스템 구성도

```
                         사용자 (교회 관리자/방문자)
                                  │
                    ┌─────────────┼──────────────┐
                    ▼             ▼              ▼
             Admin Dashboard   교회 웹사이트    모바일 앱
             (React SPA)       (WP/Next.js)    (추후)
                    │             │              │
                    └─────────────┼──────────────┘
                                  │ HTTPS
                                  ▼
                    ┌────────────────────────────┐
                    │       API Gateway          │
                    │   api.dw-church.app        │
                    │                            │
                    │  - JWT 인증                 │
                    │  - Rate Limiting           │
                    │  - Tenant 식별 (subdomain) │
                    │  - CORS                    │
                    └──────────┬─────────────────┘
                               │
                    ┌──────────▼─────────────────┐
                    │    Node.js API Server       │
                    │    (Fastify + Prisma)       │
                    │                             │
                    │  /api/v1/sermons            │
                    │  /api/v1/bulletins           │
                    │  /api/v1/albums              │
                    │  /api/v1/staff               │
                    │  /api/v1/history             │
                    │  /api/v1/events              │
                    │  /api/v1/banners             │
                    │  /api/v1/settings            │
                    │  /api/v1/auth                │
                    │  /api/v1/files               │
                    └──────┬───────────┬──────────┘
                           │           │
                    ┌──────▼──┐  ┌─────▼──────┐
                    │PostgreSQL│  │Cloudflare R2│
                    │  (DB)   │  │  (파일)     │
                    └─────────┘  └────────────┘
```

### 2.2 멀티테넌시 모델

```
단일 PostgreSQL 데이터베이스
├── tenants (교회 목록)
│   ├── id: uuid
│   ├── slug: "sarang" → sarang.dw-church.app
│   ├── name: "사랑의교회"
│   ├── plan: "basic" | "pro"
│   ├── custom_domain: "sarang-church.org"
│   └── created_at
│
├── sermons (설교)
│   ├── id, tenant_id ← FK
│   ├── title, scripture, youtube_url, ...
│   └── 모든 쿼리에 WHERE tenant_id = ?
│
├── bulletins, albums, staff, history, events, banners
│   └── 동일 패턴: tenant_id 컬럼으로 교회 격리
│
└── users (관리자 계정)
    ├── id, tenant_id ← FK
    ├── email, password_hash
    └── role: "owner" | "admin" | "editor"
```

**Tenant 식별 흐름:**
```
요청: GET https://sarang.dw-church.app/api/v1/sermons
  1. subdomain "sarang" 추출
  2. tenants 테이블에서 slug = "sarang" 조회
  3. tenant_id를 request context에 주입
  4. 모든 DB 쿼리에 자동 WHERE tenant_id = ? 적용
```

### 2.3 기술 스택

| 영역 | 기술 | 선정 이유 |
|------|------|----------|
| **API 서버** | Node.js + Fastify | TypeScript 공유, 고성능, 경량 |
| **ORM** | Prisma | Type-safe, 마이그레이션, PostgreSQL 최적 |
| **데이터베이스** | PostgreSQL 16 | JSON 지원, Full-text Search, 확장성 |
| **인증** | JWT (access + refresh) | Stateless, SPA 친화적 |
| **파일 저장** | Cloudflare R2 | S3 호환, 이그레스 무료, 저렴 |
| **이메일** | Resend | 개발자 친화적, 저렴 |
| **결제** | 토스페이먼츠 / Stripe | 국내 + 해외 대응 |
| **배포 (API)** | DigitalOcean App Platform 또는 Fly.io | 간편, 저렴, 스케일링 |
| **배포 (FE)** | Vercel 또는 Cloudflare Pages | 무료 티어, CDN |
| **모니터링** | Sentry + Uptime Robot | 에러 추적 + 가동 감시 |

---

## 3. 데이터베이스 스키마 설계

### 3.1 핵심 테이블

```sql
-- ═══════════════════════════════════════
-- 테넌트 (교회)
-- ═══════════════════════════════════════
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(63) UNIQUE NOT NULL,  -- subdomain
    name        VARCHAR(255) NOT NULL,
    plan        VARCHAR(20) DEFAULT 'free',   -- free, basic, pro
    custom_domain VARCHAR(255),
    logo_url    TEXT,
    settings    JSONB DEFAULT '{}',           -- 교회 정보, SNS 링크 등
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 사용자 (관리자)
-- ═══════════════════════════════════════
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    role        VARCHAR(20) DEFAULT 'editor', -- owner, admin, editor
    avatar_url  TEXT,
    is_active   BOOLEAN DEFAULT true,
    last_login  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- ═══════════════════════════════════════
-- 설교
-- ═══════════════════════════════════════
CREATE TABLE sermons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    scripture   VARCHAR(500),
    youtube_url TEXT,
    sermon_date DATE,
    thumbnail_url TEXT,
    preacher_id UUID REFERENCES preachers(id),
    status      VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sermons_tenant ON sermons(tenant_id);
CREATE INDEX idx_sermons_date ON sermons(tenant_id, sermon_date DESC);
CREATE INDEX idx_sermons_status ON sermons(tenant_id, status);

-- ═══════════════════════════════════════
-- 설교자
-- ═══════════════════════════════════════
CREATE TABLE preachers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    is_default  BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 설교 카테고리 (다대다)
-- ═══════════════════════════════════════
CREATE TABLE sermon_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL,
    sort_order  INT DEFAULT 0,
    UNIQUE(tenant_id, slug)
);

CREATE TABLE sermon_category_map (
    sermon_id   UUID REFERENCES sermons(id) ON DELETE CASCADE,
    category_id UUID REFERENCES sermon_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (sermon_id, category_id)
);

-- ═══════════════════════════════════════
-- 교회주보
-- ═══════════════════════════════════════
CREATE TABLE bulletins (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    bulletin_date DATE NOT NULL,
    pdf_url     TEXT,
    images      JSONB DEFAULT '[]',           -- ["url1", "url2", ...]
    thumbnail_url TEXT,
    status      VARCHAR(20) DEFAULT 'draft',
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bulletins_tenant ON bulletins(tenant_id);
CREATE INDEX idx_bulletins_date ON bulletins(tenant_id, bulletin_date DESC);

-- ═══════════════════════════════════════
-- 목회컬럼
-- ═══════════════════════════════════════
CREATE TABLE columns (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    content     TEXT,                          -- Rich HTML
    top_image_url TEXT,
    bottom_image_url TEXT,
    youtube_url TEXT,
    thumbnail_url TEXT,
    status      VARCHAR(20) DEFAULT 'draft',
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 교회앨범
-- ═══════════════════════════════════════
CREATE TABLE albums (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    images      JSONB DEFAULT '[]',           -- ["url1", "url2", ...]
    youtube_url TEXT,
    thumbnail_url TEXT,
    category_id UUID REFERENCES album_categories(id),
    status      VARCHAR(20) DEFAULT 'draft',
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE album_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL,
    UNIQUE(tenant_id, slug)
);

-- ═══════════════════════════════════════
-- 배너
-- ═══════════════════════════════════════
CREATE TABLE banners (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    pc_image_url TEXT,
    mobile_image_url TEXT,
    sub_image_url TEXT,
    link_url    TEXT,
    link_target VARCHAR(10) DEFAULT '_self',
    start_date  DATE,
    end_date    DATE,
    text_overlay JSONB DEFAULT '{}',
    category    VARCHAR(20) DEFAULT 'main',   -- main, sub
    sort_order  INT DEFAULT 0,
    status      VARCHAR(20) DEFAULT 'draft',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 이벤트
-- ═══════════════════════════════════════
CREATE TABLE events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    background_image_url TEXT,
    image_only  BOOLEAN DEFAULT false,
    department  VARCHAR(100),
    event_date  VARCHAR(255),                 -- 자유 텍스트 ("4월 7일 주일 오전 11시")
    location    VARCHAR(500),
    link_url    TEXT,
    description TEXT,
    youtube_url TEXT,
    thumbnail_url TEXT,
    status      VARCHAR(20) DEFAULT 'draft',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 교역자/팀원
-- ═══════════════════════════════════════
CREATE TABLE staff (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    role        VARCHAR(100),                 -- 담임목사, 부목사, 전도사 등
    department  VARCHAR(100),
    email       VARCHAR(255),
    phone       VARCHAR(50),
    bio         TEXT,
    photo_url   TEXT,
    sns_links   JSONB DEFAULT '{}',           -- {facebook, instagram, youtube}
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 연혁
-- ═══════════════════════════════════════
CREATE TABLE history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year        INT NOT NULL,
    items       JSONB DEFAULT '[]',           -- [{id, month, day, content, photo_url}]
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, year)
);

-- ═══════════════════════════════════════
-- 파일 업로드 추적
-- ═══════════════════════════════════════
CREATE TABLE files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    original_name VARCHAR(500),
    storage_key TEXT NOT NULL,                -- R2 object key
    url         TEXT NOT NULL,
    mime_type   VARCHAR(100),
    size_bytes  BIGINT,
    uploaded_by UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 감사 로그 (선택)
-- ═══════════════════════════════════════
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    user_id     UUID,
    action      VARCHAR(50),                  -- create, update, delete
    entity_type VARCHAR(50),                  -- sermon, bulletin, ...
    entity_id   UUID,
    changes     JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 WordPress wp_postmeta와의 성능 비교

| 항목 | WordPress (wp_postmeta) | DW Church (PostgreSQL) |
|------|------------------------|----------------------|
| 설교 목록 조회 | JOIN 3~4개 필요 (posts + postmeta × N) | 단일 SELECT |
| 날짜 정렬 | meta_value CAST 필요, 인덱스 안탐 | 네이티브 DATE 인덱스 |
| 전문 검색 | LIKE '%keyword%' (풀스캔) | GIN 인덱스 + tsvector |
| 이미지 배열 | 직렬화된 문자열 | JSONB (인덱싱 가능) |
| 교회 격리 | 별도 WP 설치 필요 | WHERE tenant_id = ? |

---

## 4. API 서버 설계

### 4.1 디렉토리 구조

```
dw-church-app/
├── packages/
│   ├── api-client/          # (기존) TypeScript 클라이언트
│   ├── ui-components/       # (기존) React 컴포넌트
│   ├── admin-app/           # (기존) 관리자 SPA
│   └── wp-connector/        # (변경) WP 연동 경량 플러그인
│
├── apps/
│   ├── demo/                # (기존) 데모 앱
│   └── server/              # ★ 신규: Node.js API 서버
│       ├── src/
│       │   ├── index.ts             # Fastify 앱 진입점
│       │   ├── config/
│       │   │   ├── env.ts           # 환경변수 스키마 (zod)
│       │   │   └── database.ts      # Prisma 클라이언트
│       │   ├── middleware/
│       │   │   ├── auth.ts          # JWT 인증
│       │   │   ├── tenant.ts        # 테넌트 식별 (subdomain)
│       │   │   ├── rate-limit.ts    # Rate limiting
│       │   │   └── error-handler.ts # 통합 에러 핸들링
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.routes.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   └── auth.schema.ts
│       │   │   ├── sermons/
│       │   │   │   ├── sermons.routes.ts
│       │   │   │   ├── sermons.service.ts
│       │   │   │   └── sermons.schema.ts
│       │   │   ├── bulletins/
│       │   │   ├── columns/
│       │   │   ├── albums/
│       │   │   ├── banners/
│       │   │   ├── events/
│       │   │   ├── staff/
│       │   │   ├── history/
│       │   │   ├── files/
│       │   │   │   ├── files.routes.ts
│       │   │   │   └── files.service.ts   # R2 업로드
│       │   │   ├── settings/
│       │   │   └── tenants/               # 슈퍼어드민 전용
│       │   └── utils/
│       │       ├── pagination.ts
│       │       └── slug.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── package.json
│       └── tsconfig.json
│
├── package.json
└── pnpm-workspace.yaml
```

### 4.2 API 엔드포인트 전체 목록

**인증 (/api/v1/auth)**
```
POST   /auth/register          # 교회 + 오너 계정 동시 생성
POST   /auth/login             # 로그인 → JWT 발급
POST   /auth/refresh           # Refresh token으로 갱신
POST   /auth/logout            # Refresh token 무효화
POST   /auth/forgot-password   # 비밀번호 재설정 이메일
POST   /auth/reset-password    # 새 비밀번호 설정
GET    /auth/me                # 현재 사용자 정보
```

**설교 (/api/v1/sermons)** — 인증 필요: CUD, 공개: R
```
GET    /sermons                # 목록 (페이지네이션, 필터, 검색)
GET    /sermons/:id            # 단일 조회
GET    /sermons/:id/related    # 관련 설교
POST   /sermons                # 생성 (인증)
PUT    /sermons/:id            # 수정 (인증)
DELETE /sermons/:id            # 삭제 (인증)
```

**주보 (/api/v1/bulletins)** — 동일 CRUD 패턴
```
GET    /bulletins
GET    /bulletins/:id
GET    /bulletins/:id/related
POST   /bulletins
PUT    /bulletins/:id
DELETE /bulletins/:id
```

**목회컬럼 (/api/v1/columns)** — 동일 패턴

**앨범 (/api/v1/albums)** — 동일 패턴 + 카테고리 필터

**배너 (/api/v1/banners)**
```
GET    /banners                # 목록 (?category=main&active=true)
GET    /banners/:id
POST   /banners
PUT    /banners/:id
DELETE /banners/:id
```

**이벤트 (/api/v1/events)** — 동일 CRUD 패턴

**교역자 (/api/v1/staff)**
```
GET    /staff                  # 목록 (?department=worship&active=true)
GET    /staff/:id
POST   /staff
PUT    /staff/:id
DELETE /staff/:id
POST   /staff/reorder          # 순서 변경
```

**연혁 (/api/v1/history)**
```
GET    /history                # 전체 연혁 (?year=2024)
GET    /history/years          # 연도 목록
GET    /history/:id
POST   /history
PUT    /history/:id
DELETE /history/:id
```

**파일 (/api/v1/files)**
```
POST   /files/upload           # 파일 업로드 → R2 → URL 반환
DELETE /files/:id              # 파일 삭제
```

**설정 (/api/v1/settings)**
```
GET    /settings               # 교회 설정 조회 (공개)
PUT    /settings               # 교회 설정 수정 (인증)
```

**택소노미 관리**
```
GET    /sermon-categories
POST   /sermon-categories
PUT    /sermon-categories/:id
DELETE /sermon-categories/:id

GET    /preachers
POST   /preachers
PUT    /preachers/:id
DELETE /preachers/:id

GET    /album-categories
POST   /album-categories
PUT    /album-categories/:id
DELETE /album-categories/:id

GET    /staff-departments       # 부서 목록 (staff.department의 DISTINCT)
```

**슈퍼어드민 (/api/v1/admin)** — 슈퍼어드민만 접근
```
GET    /admin/tenants           # 전체 교회 목록
POST   /admin/tenants           # 교회 수동 생성
PUT    /admin/tenants/:id       # 교회 정보/플랜 변경
DELETE /admin/tenants/:id       # 교회 삭제 (주의)
GET    /admin/stats             # 전체 통계
```

### 4.3 응답 형식

모든 API는 동일한 응답 구조:

```typescript
// 성공 (단일)
{
  "data": { id: "uuid", title: "...", ... }
}

// 성공 (목록 + 페이지네이션)
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "perPage": 10,
    "totalPages": 15
  }
}

// 에러
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "제목은 필수입니다",
    "details": [{ "field": "title", "message": "Required" }]
  }
}
```

### 4.4 인증 흐름

```
1. 교회 등록
   POST /auth/register
   { churchName, slug, email, password, ownerName }
   → tenant 생성 + user(owner) 생성 + JWT 반환

2. 로그인
   POST /auth/login
   { email, password }
   → { accessToken (15분), refreshToken (7일) }

3. API 호출
   GET /api/v1/sermons
   Authorization: Bearer <accessToken>
   Host: sarang.dw-church.app  ← tenant 식별

4. 토큰 갱신
   POST /auth/refresh
   { refreshToken }
   → { accessToken (new), refreshToken (new) }
```

### 4.5 공개 API vs 인증 API

| 엔드포인트 | 공개 | 인증 필요 |
|-----------|------|----------|
| GET (목록/단일) | O | - |
| POST (생성) | - | editor 이상 |
| PUT (수정) | - | editor 이상 |
| DELETE (삭제) | - | admin 이상 |
| 설정 수정 | - | owner만 |
| 파일 업로드 | - | editor 이상 |
| 슈퍼어드민 | - | superadmin만 |

---

## 5. @dw-church/api-client 변경사항

기존 api-client는 **최소한의 변경**만 필요합니다:

### 5.1 타입 변경

```typescript
// id: number → id: string (UUID)
interface Sermon {
  id: string;        // 변경: number → string (UUID)
  title: string;
  // ... 나머지 동일
}

// 모든 CPT 타입에서 id를 string으로 변경
// status 필드에 'archived' 추가
type PostStatus = 'published' | 'draft' | 'archived';
```

### 5.2 인증 추가

```typescript
// 기존
const client = new DWChurchClient({
  baseUrl: 'https://your-wp-site.com/wp-json',
  auth: { username: '...', password: '...' },  // WP Application Password
});

// 신규 (JWT)
const client = new DWChurchClient({
  baseUrl: 'https://sarang.dw-church.app/api/v1',
  token: 'jwt-access-token',                    // JWT
});

// + 인증 훅 추가
export function useLogin() { ... }
export function useRegister() { ... }
export function useLogout() { ... }
export function useRefreshToken() { ... }
export function useCurrentUser() { ... }
```

### 5.3 파일 업로드 훅 추가

```typescript
export function useFileUpload() {
  return useMutation({
    mutationFn: (file: File) => client.uploadFile(file),
    // → { url: "https://files.dw-church.app/sarang/sermons/thumb.jpg" }
  });
}
```

---

## 6. Admin App 변경사항

### 6.1 독립 배포 구조

```
기존: WordPress 메타박스 안에서 동작
     ↓
변경: 독립 SPA로 배포
     https://admin.dw-church.app
     또는
     https://sarang.dw-church.app/admin
```

### 6.2 추가되는 페이지

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 로그인 | /login | 이메일 + 비밀번호 |
| 회원가입 | /register | 교회 등록 + 관리자 계정 생성 |
| 비밀번호 재설정 | /forgot-password | 이메일 인증 |
| 사용자 관리 | /users | 관리자 추가/삭제/권한 변경 |
| 교회 프로필 | /church-profile | 교회 정보, 로고, slug 관리 |
| 파일 관리 | /files | 업로드된 파일 목록 |

### 6.3 기존 페이지 수정사항

| 페이지 | 수정 내용 |
|--------|----------|
| Dashboard | 실제 총 개수 표시 (meta.total 사용) |
| 모든 CPT 관리 | placeholder save → 실제 CRUD mutation 연결 |
| Settings | tenant.settings JSONB로 저장 |
| 모든 이미지 필드 | URL 직접 입력 → 파일 업로드 컴포넌트 |

---

## 7. WordPress 연동 플러그인 (wp-connector)

기존 `class-dw-church-react-embed.php`를 **경량 API 클라이언트 플러그인**으로 재작성.

### 7.1 플러그인 구조

```
wp-connector/
├── dw-church-connector.php      # 메인 파일
├── includes/
│   ├── class-api-client.php     # PHP HTTP 클라이언트
│   ├── class-shortcodes.php     # 숏코드 등록
│   └── class-settings.php       # 설정 페이지 (API URL, API Key)
└── assets/
    ├── js/dw-church-embed.js    # React 컴포넌트 로더
    └── css/dw-church-embed.css
```

### 7.2 설정

```
WordPress 관리자 → 설정 → DW Church 연동
┌───────────────────────────────────────┐
│  DW Church API URL                     │
│  [https://sarang.dw-church.app/api/v1]│
│                                        │
│  API Key (공개 조회용)                  │
│  [pk_live_xxxxxxxxxxxxx]               │
│                                        │
│  [연결 테스트]  [저장]                   │
└───────────────────────────────────────┘
```

### 7.3 숏코드 사용

```
[dw_church_sermons limit="6" category="sunday"]
[dw_church_bulletins limit="3"]
[dw_church_staff department="all"]
[dw_church_banners category="main"]
[dw_church_history]
[dw_church_albums limit="8"]
[dw_church_events limit="4"]
```

WordPress는 **디자인/레이아웃만** 담당하고, 데이터는 DW Church SaaS API에서 가져옵니다.

---

## 8. SaaS 관리 콘솔 (슈퍼어드민)

### 8.1 페이지 구성

```
/super-admin
├── /dashboard          # 전체 통계 (교회 수, 총 설교 수, MAU 등)
├── /tenants            # 교회 관리 (생성, 플랜 변경, 비활성화)
├── /tenants/:id        # 교회 상세 (사용량, 사용자 목록, 데이터 요약)
├── /billing            # 결제 내역, 청구서
└── /system             # 서버 상태, 로그
```

### 8.2 교회 생성 프로세스

```
1. 교회 관리자가 https://dw-church.app 에서 [무료 시작] 클릭
2. 교회명, slug, 관리자 이메일/비밀번호 입력
3. → tenant 레코드 생성
4. → user(owner) 레코드 생성
5. → 기본 설교 카테고리 생성 (주일설교, 수요설교 등)
6. → 기본 설정 초기화
7. → https://slug.dw-church.app/admin 으로 리다이렉트
8. 관리자가 즉시 설교/주보 등록 시작
```

---

## 9. 요금 체계

| | Free | Basic | Pro |
|---|---|---|---|
| **월 요금** | $0 | $19 (약 25,000원) | $49 (약 65,000원) |
| **설교** | 50개 | 무제한 | 무제한 |
| **주보** | 20개 | 무제한 | 무제한 |
| **앨범** | 10개 | 무제한 | 무제한 |
| **교역자** | 5명 | 20명 | 무제한 |
| **파일 저장** | 500MB | 10GB | 50GB |
| **관리자 계정** | 1명 | 3명 | 10명 |
| **커스텀 도메인** | X | O | O |
| **API 액세스** | X | 읽기 전용 | 전체 |
| **화이트라벨** | X | X | O |
| **지원** | 셀프 서비스 | 이메일 | 우선 지원 |

### 9.1 데이터 제한 적용 방식

```typescript
// middleware/plan-limit.ts
async function checkPlanLimit(tenantId: string, entityType: string) {
  const tenant = await getTenant(tenantId);
  const limits = PLAN_LIMITS[tenant.plan];
  const currentCount = await countEntities(tenantId, entityType);

  if (currentCount >= limits[entityType]) {
    throw new PlanLimitError(
      `${limits[entityType]}개 제한에 도달했습니다. 플랜을 업그레이드하세요.`
    );
  }
}
```

---

## 10. 배포 인프라

### 10.1 배포 구성

```
┌─────────────────────────────────────────────┐
│  Cloudflare (DNS + CDN + R2)                │
│                                              │
│  *.dw-church.app → API Server               │
│  admin.dw-church.app → Admin SPA (Pages)    │
│  files.dw-church.app → R2 Public Bucket     │
└──────────┬──────────────────────────────────┘
           │
    ┌──────▼──────┐     ┌──────────────┐
    │  Fly.io     │     │ Supabase     │
    │  또는       │────▶│ PostgreSQL   │
    │  DO App     │     │ (Managed)    │
    │  Platform   │     │              │
    │             │     │ 자동 백업     │
    │  Node.js    │     │ 커넥션 풀링   │
    │  API Server │     │              │
    └─────────────┘     └──────────────┘
```

### 10.2 월 비용 추정

| 항목 | 서비스 | 무료 티어 | 유료 (성장 시) |
|------|--------|----------|--------------|
| API 서버 | Fly.io | $0 (256MB) | $5~20/월 |
| PostgreSQL | Supabase | $0 (500MB) | $25/월 (8GB) |
| 파일 저장 | Cloudflare R2 | $0 (10GB) | $0.015/GB |
| Admin SPA | Cloudflare Pages | $0 | $0 |
| 도메인 | dw-church.app | $12/년 | - |
| 이메일 | Resend | $0 (100/일) | $20/월 |
| **합계 (시작)** | | **$0~1/월** | |
| **합계 (교회 100곳)** | | | **약 $50~70/월** |

교회 3곳 유료 전환(Basic $19 × 3 = $57) → 서버 비용 충당
교회 10곳 유료 전환($190/월) → 순수익 $120+/월

---

## 11. 개발 Phase별 계획

### Phase 1: 독립 백엔드 구축 (2~3주)

```
1-1. apps/server 프로젝트 설정
     - Fastify + TypeScript + Prisma 초기화
     - PostgreSQL 연결, Prisma 스키마 작성
     - 마이그레이션 실행

1-2. 핵심 미들웨어
     - tenant.ts: subdomain → tenant_id 매핑
     - auth.ts: JWT 발급/검증
     - error-handler.ts: 통합 에러 처리
     - rate-limit.ts: IP당 제한

1-3. 인증 모듈
     - POST /auth/register (교회 + 오너 동시 생성)
     - POST /auth/login (JWT 발급)
     - POST /auth/refresh
     - GET /auth/me

1-4. 전체 CRUD 모듈 (8개 CPT)
     - sermons, bulletins, columns, albums
     - banners, events, staff, history
     - 각 모듈: routes + service + schema(zod)
     - 관련 포스트 API

1-5. 파일 업로드
     - Cloudflare R2 연동
     - POST /files/upload → presigned URL 또는 직접 업로드

1-6. 설정 + 택소노미
     - GET/PUT /settings
     - sermon-categories, preachers, album-categories CRUD
```

### Phase 2: api-client + Admin App 연결 (1~2주)

```
2-1. @dw-church/api-client 수정
     - id: number → string (UUID)
     - JWT 인증 지원 추가
     - 인증 훅 (useLogin, useRegister, useCurrentUser 등)
     - 파일 업로드 훅

2-2. @dw-church/admin-app 수정
     - 로그인/회원가입 페이지 추가
     - 인증 상태 관리 (zustand store)
     - 모든 CPT 페이지의 placeholder save → 실제 mutation 연결
     - 이미지 URL 필드 → 파일 업로드 컴포넌트
     - 사용자 관리 페이지
     - 교회 프로필 페이지

2-3. 독립 배포 설정
     - Admin SPA → Cloudflare Pages 배포
     - 환경변수 (.env): API_URL, R2_PUBLIC_URL
```

### Phase 3: SaaS 인프라 (1~2주)

```
3-1. 멀티테넌시 완성
     - 서브도메인 자동 생성 (Cloudflare API)
     - 커스텀 도메인 연결 (CNAME 검증)

3-2. 요금 체계 + 제한
     - plan_limits 미들웨어
     - 사용량 추적 (파일 저장 용량, 엔티티 개수)

3-3. 결제 연동
     - 토스페이먼츠 정기결제 (국내)
     - 또는 Stripe Subscription (해외)
     - 웹훅으로 플랜 자동 변경

3-4. 슈퍼어드민 콘솔
     - 교회 목록/생성/관리
     - 전체 통계 대시보드
     - 시스템 모니터링

3-5. 이메일
     - 가입 확인 이메일
     - 비밀번호 재설정
     - 결제 영수증
```

### Phase 4: WordPress 연동 + 런칭 (1~2주)

```
4-1. wp-connector 플러그인 개발
     - PHP API 클라이언트
     - 설정 페이지 (API URL + API Key)
     - 숏코드 7종 (sermons, bulletins, albums 등)
     - React embed script

4-2. 랜딩 페이지
     - dw-church.app 메인 페이지
     - 기능 소개, 요금표, 데모
     - [무료 시작] CTA

4-3. 문서
     - API 문서 (Swagger/OpenAPI)
     - 워드프레스 연동 가이드
     - 관리자 사용 매뉴얼

4-4. 베타 테스트
     - 3~5개 교회 대상 무료 베타
     - 피드백 수집 및 개선
```

---

## 12. 일정 요약

| Phase | 기간 | 주요 산출물 |
|-------|------|-----------|
| **Phase 1** | 2~3주 | Node.js API 서버, PostgreSQL 스키마, 인증, 8 CPT CRUD, 파일 업로드 |
| **Phase 2** | 1~2주 | api-client UUID 전환, Admin 인증 연결, 실제 CRUD 동작, 독립 배포 |
| **Phase 3** | 1~2주 | 멀티테넌시, 결제, 슈퍼어드민, 이메일, 요금 제한 |
| **Phase 4** | 1~2주 | WP 연동 플러그인, 랜딩 페이지, 문서, 베타 테스트 |
| **합계** | **5~9주** | **프로덕션 가능한 SaaS** |

---

## 13. 리스크와 대응

| 리스크 | 확률 | 대응 |
|--------|------|------|
| 교회가 "외부 서버에 데이터 저장" 거부 | 중 | 설치형 옵션 제공 (Pro 플랜), 데이터 내보내기 기능 필수 |
| 초기 사용자 확보 어려움 | 고 | Free 플랜으로 진입 장벽 제거, 기존 WP 사용 교회 마이그레이션 도구 |
| 대용량 파일(설교 영상) 저장 비용 | 중 | YouTube 링크 활용 권장, 직접 업로드는 Pro만 |
| 1인 운영 시 장애 대응 | 고 | 자동 모니터링(Uptime Robot), 자동 백업(DB), 장애 알림(Slack) |

---

## 14. 성공 지표 (KPI)

| 지표 | 3개월 | 6개월 | 12개월 |
|------|-------|-------|--------|
| 가입 교회 수 | 20 | 50 | 150 |
| 유료 전환 교회 | 3 | 10 | 30 |
| MRR (월 반복 수익) | $57 | $250 | $900+ |
| API 일일 요청 | 1K | 10K | 50K |

---

*이 계획서는 v3.0.0의 React 프론트엔드 자산을 100% 재사용하면서, 백엔드만 WordPress → Node.js + PostgreSQL로 교체하는 전략입니다. 프론트엔드 코드 변경은 id 타입(number→string)과 인증 추가뿐이며, 나머지는 모두 그대로 동작합니다.*
