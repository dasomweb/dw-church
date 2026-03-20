# DW Church SaaS 독립 서비스 개발 계획서 (v2.0)

> v1.0 대비 변경사항: 스키마 분리 멀티테넌시, Supabase Auth, Vercel 프론트엔드, US East 리전 통일

---

## 0. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | DW Church — 독립형 교회 관리 SaaS |
| **목표** | WordPress 종속을 완전히 제거. 자체 백엔드(Node.js + Fastify) + 자체 DB(PostgreSQL, 스키마 분리) + Supabase Auth 기반의 멀티테넌시 SaaS. 교회는 가입만 하면 설교/주보/앨범/연혁/교역자 등 모든 기능을 즉시 사용. 기존 WordPress 사이트에는 API 연동 경량 플러그인 제공. |
| **기반 코드** | dw-church v3.0.0 — React 프론트엔드 100% 재사용 |
| **라이선스** | GPL-3.0 (코드) + SaaS 상업 서비스 |
| **리전** | US East (Virginia) — 서비스 제공 회사 소재지: 애틀랜타, GA |
| **목표 일정** | Phase 1~4, 약 8~12주 |

---

## 1. 인프라 아키텍처

### 1.1 서비스 구성

```
┌──────────────────────────────────────────────────────────┐
│                    US East Region                         │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Vercel (프론트엔드)                                  │ │
│  │  ├── dw-church.app           — 랜딩 페이지           │ │
│  │  ├── admin.dw-church.app     — Admin SPA             │ │
│  │  ├── *.dw-church.app         — 교회별 공개 페이지     │ │
│  │  ├── Edge Middleware          — 테넌트 라우팅          │ │
│  │  └── ISR/Edge Cache           — 읽기 성능 최적화      │ │
│  └─────────────────────────────────────────────────────┘ │
│                          │ API 호출                       │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Railway (백엔드 API)               us-east          │ │
│  │  ├── Node.js + Fastify + Prisma                      │ │
│  │  ├── api.dw-church.app                               │ │
│  │  ├── 스키마 분리 미들웨어 (SET search_path)           │ │
│  │  └── 파일 업로드 → R2 프록시                          │ │
│  └──────────────┬──────────────────────────────────────┘ │
│                 │                                         │
│  ┌──────────────▼──────────┐  ┌────────────────────────┐ │
│  │  Supabase               │  │  Cloudflare R2         │ │
│  │  (us-east-1)            │  │  (글로벌, 이그레스 무료) │ │
│  │  ├── PostgreSQL         │  │  ├── S3 호환 API       │ │
│  │  │   └── 스키마 분리     │  │  ├── CDN 내장          │ │
│  │  ├── Auth (인증)        │  │  └── 이미지/PDF 저장    │ │
│  │  │   ├── 이메일/비번    │  └────────────────────────┘ │
│  │  │   ├── Google OAuth   │                              │
│  │  │   └── 50,000 MAU 무료│                              │
│  │  ├── RLS (Row Security) │                              │
│  │  └── 자동 백업          │                              │
│  └─────────────────────────┘                              │
└──────────────────────────────────────────────────────────┘
```

### 1.2 레이턴시 예상 (애틀랜타 기준)

```
사용자 → Vercel Edge (Atlanta PoP)      ~5ms
       → Railway API (us-east)          ~10ms
       → Supabase DB (us-east-1)        ~2ms
       ────────────────────────────
       총 응답: ~20ms (캐시 미스 시)
       캐시 히트 시: ~5ms
```

### 1.3 비용 구조

**시작 단계 (교회 0~20곳)**

| 역할 | 서비스 | 플랜 | 월 비용 |
|------|--------|------|--------|
| 프론트엔드 | Vercel | Hobby | $0 |
| 백엔드 API | Railway | Hobby ($5 크레딧) | $5 |
| DB + 인증 | Supabase | Free (500MB, 50K MAU) | $0 |
| 파일 저장 | Cloudflare R2 | Free (10GB) | $0 |
| 도메인 | dw-church.app | | $1 |
| **합계** | | | **$6/월** |

**성장 단계 (교회 50~100곳)**

| 역할 | 서비스 | 플랜 | 월 비용 |
|------|--------|------|--------|
| 프론트엔드 | Vercel | Pro | $20 |
| 백엔드 API | Railway | Pro | $20 |
| DB + 인증 | Supabase | Pro (8GB) | $25 |
| 파일 저장 | R2 (100GB) | | $1.50 |
| **합계** | | | **$66.50/월** |

손익분기: Basic($25,000원/월) 교회 **3곳**

---

## 2. 멀티테넌시: 스키마 분리 방식

### 2.1 왜 tenant_id가 아닌 스키마 분리인가

| | tenant_id 컬럼 | **스키마 분리 (채택)** |
|---|---|---|
| 데이터 격리 | 코드 실수로 누출 가능 | **DB 구조적으로 불가능** |
| 쿼리 복잡도 | 모든 쿼리에 WHERE 필수 | 일반 쿼리 그대로 |
| 교회 삭제 | DELETE WHERE 대량 | `DROP SCHEMA CASCADE` 1줄 |
| 개별 백업 | 불가능 | `pg_dump -n tenant_slug` |
| 개별 복원 | 불가능 | 스키마 단위로 복원 가능 |
| 인덱스 효율 | 대형 테이블 + 복합 인덱스 | 작은 테이블, 단순 인덱스 |
| 성능 | 교회 많아지면 느려짐 | 각 스키마가 독립적으로 빠름 |
| 데이터 이전 | 복잡 | 스키마 덤프/임포트 |

### 2.2 스키마 구조

```
PostgreSQL Database: dw_church_prod
│
├── public (공유 스키마)
│   ├── tenants          — 교회 목록
│   ├── tenant_domains   — 커스텀 도메인 매핑
│   └── super_admins     — 슈퍼어드민 계정
│
├── tenant_sarang (사랑의교회 스키마)
│   ├── sermons
│   ├── sermon_categories
│   ├── preachers
│   ├── bulletins
│   ├── columns_pastoral
│   ├── albums
│   ├── album_categories
│   ├── banners
│   ├── events
│   ├── staff
│   ├── history
│   ├── files
│   └── settings
│
├── tenant_yeomkwang (염광교회 스키마)
│   ├── sermons
│   ├── ... (동일 테이블 구조)
│   └── settings
│
└── tenant_XXX (교회 추가 시 자동 생성)
    └── ...
```

### 2.3 테넌트 생성 프로세스

```sql
-- 1. public.tenants에 교회 등록
INSERT INTO public.tenants (id, slug, name, plan)
VALUES ('uuid', 'sarang', '사랑의교회', 'free');

-- 2. 교회 전용 스키마 생성
CREATE SCHEMA tenant_sarang;

-- 3. 테이블 생성 (템플릿 스키마 복제)
-- 미리 만들어둔 tenant_template 스키마를 복사
SELECT clone_schema('tenant_template', 'tenant_sarang');

-- 4. 기본 데이터 삽입
INSERT INTO tenant_sarang.sermon_categories (name, slug) VALUES
  ('주일설교', 'sunday'), ('수요설교', 'wednesday');
INSERT INTO tenant_sarang.preachers (name, is_default) VALUES
  ('담임목사', true);
INSERT INTO tenant_sarang.settings (key, value) VALUES
  ('church_name', '사랑의교회');
```

### 2.4 API 미들웨어: 스키마 전환

```typescript
// middleware/tenant.ts
async function tenantMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // 1. subdomain에서 slug 추출
  const host = request.hostname; // sarang.dw-church.app
  const slug = host.split('.')[0]; // sarang

  // 2. public.tenants에서 교회 조회
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || !tenant.is_active) {
    return reply.code(404).send({ error: 'Church not found' });
  }

  // 3. 이 요청의 DB 연결에 스키마 설정
  const schema = `tenant_${slug}`;
  await prisma.$executeRawUnsafe(`SET search_path TO "${schema}", public`);

  // 4. request에 tenant 정보 주입
  request.tenant = tenant;
  request.tenantSchema = schema;
}
```

이후 모든 Prisma 쿼리는 자동으로 해당 스키마의 테이블을 참조합니다.

### 2.5 교회 삭제 (완전 격리의 장점)

```sql
-- 교회 데이터 전체 삭제: 1줄
DROP SCHEMA tenant_sarang CASCADE;

-- 교회 데이터 백업: 1명령
pg_dump -n tenant_sarang dw_church_prod > sarang_backup.sql

-- 교회 데이터 복원: 1명령
psql dw_church_prod < sarang_backup.sql
```

---

## 3. 인증: Supabase Auth

### 3.1 왜 Supabase Auth인가

교회당 관리자 최대 10명, 총 교회 100곳 = **1,000 MAU**
Supabase 무료 한도: **50,000 MAU** → 교회 **5,000곳까지 무료**

직접 구현 시 필요한 것 vs Supabase Auth 제공:

| 기능 | 직접 구현 | Supabase Auth |
|------|----------|--------------|
| 비밀번호 해싱/검증 | bcrypt 구현 | ✅ 내장 |
| JWT 발급/갱신 | 직접 구현 | ✅ 내장 |
| 이메일 인증 | Resend 연동 | ✅ 내장 (SMTP 설정만) |
| 비밀번호 재설정 | 토큰 + 이메일 | ✅ 내장 |
| 소셜 로그인 | OAuth 각각 연동 | ✅ Google/Kakao 체크박스 |
| 세션 관리 | refresh token | ✅ 내장 |
| Rate limiting | 직접 구현 | ✅ 내장 |
| 보안 패치 | 직접 대응 | ✅ Supabase팀 |
| 추가 비용 | $20+/월 (이메일) | **$0** |

### 3.2 인증 흐름

```
1. 교회 등록 (회원가입)
   ┌─────────────────────────────────────────┐
   │  POST /auth/register                     │
   │  { churchName, slug, email, password }   │
   └─────────────┬───────────────────────────┘
                 │
   ┌─────────────▼───────────────────────────┐
   │  API Server                              │
   │  1. Supabase Auth에 사용자 생성          │
   │     supabase.auth.admin.createUser()     │
   │  2. public.tenants에 교회 생성           │
   │  3. CREATE SCHEMA tenant_{slug}          │
   │  4. 템플릿 테이블 복제                    │
   │  5. user_metadata에 tenant_id 저장       │
   └─────────────┬───────────────────────────┘
                 │
   ┌─────────────▼───────────────────────────┐
   │  응답: { session, user, tenant }         │
   │  → Admin SPA 자동 로그인                  │
   └─────────────────────────────────────────┘

2. 로그인
   Client → supabase.auth.signInWithPassword({ email, password })
         → JWT 반환 (access_token에 tenant_id 포함)
         → API 호출 시 Authorization: Bearer <token>

3. API 서버에서 인증 검증
   const { data: { user } } = await supabase.auth.getUser(token);
   const tenantId = user.user_metadata.tenant_id;
   → SET search_path TO tenant_{slug}
```

### 3.3 사용자 역할

```typescript
type UserRole = 'owner' | 'admin' | 'editor';

// Supabase user_metadata에 저장
{
  tenant_id: "uuid",
  tenant_slug: "sarang",
  role: "owner",        // owner: 모든 권한 + 설정 + 사용자 관리
                        // admin: CRUD + 사용자 초대
                        // editor: CRUD만
}
```

### 3.4 Row Level Security (RLS) 추가 보안

Supabase의 RLS를 활용하면 **API 코드에 버그가 있어도** 다른 교회 데이터 접근이 불가능합니다:

```sql
-- 직접 Supabase 클라이언트로 접근 시 (Edge Function 등)
ALTER TABLE tenant_sarang.sermons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access" ON tenant_sarang.sermons
  USING (true);  -- 스키마 자체가 격리이므로 스키마 내에서는 전체 허용
```

스키마 분리 + RLS = **이중 격리**.

---

## 4. 데이터베이스 스키마

### 4.1 공유 스키마 (public)

```sql
-- ═══════════════════════════════════════
-- public.tenants — 교회 목록
-- ═══════════════════════════════════════
CREATE TABLE public.tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(63) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    plan            VARCHAR(20) DEFAULT 'free'
                    CHECK (plan IN ('free', 'basic', 'pro')),
    custom_domain   VARCHAR(255),
    logo_url        TEXT,
    is_active       BOOLEAN DEFAULT true,
    trial_ends_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- public.tenant_domains — 커스텀 도메인 매핑
-- ═══════════════════════════════════════
CREATE TABLE public.tenant_domains (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    domain      VARCHAR(255) UNIQUE NOT NULL,
    verified    BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- public.billing — 결제 내역
-- ═══════════════════════════════════════
CREATE TABLE public.billing (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
    plan            VARCHAR(20) NOT NULL,
    amount_cents    INT NOT NULL,
    currency        VARCHAR(3) DEFAULT 'USD',
    payment_provider VARCHAR(20),   -- stripe, toss
    provider_id     VARCHAR(255),   -- 외부 결제 ID
    status          VARCHAR(20) DEFAULT 'pending',
    period_start    TIMESTAMPTZ,
    period_end      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 테넌트 템플릿 스키마 (tenant_template)

교회 생성 시 이 스키마를 복제합니다:

```sql
CREATE SCHEMA tenant_template;

-- ═══════════════════════════════════════
-- 설교
-- ═══════════════════════════════════════
CREATE TABLE tenant_template.sermons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL,
    scripture       VARCHAR(500),
    youtube_url     TEXT,
    sermon_date     DATE,
    thumbnail_url   TEXT,
    preacher_id     UUID,
    status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
    created_by      UUID,           -- Supabase Auth user id
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sermons_date ON tenant_template.sermons(sermon_date DESC);
CREATE INDEX idx_sermons_status ON tenant_template.sermons(status);

-- ═══════════════════════════════════════
-- 설교자
-- ═══════════════════════════════════════
CREATE TABLE tenant_template.preachers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    is_default  BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 설교 카테고리
-- ═══════════════════════════════════════
CREATE TABLE tenant_template.sermon_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenant_template.sermon_category_map (
    sermon_id   UUID REFERENCES tenant_template.sermons(id) ON DELETE CASCADE,
    category_id UUID REFERENCES tenant_template.sermon_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (sermon_id, category_id)
);

-- ═══════════════════════════════════════
-- 교회주보
-- ═══════════════════════════════════════
CREATE TABLE tenant_template.bulletins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL,
    bulletin_date   DATE NOT NULL,
    pdf_url         TEXT,
    images          JSONB DEFAULT '[]',
    thumbnail_url   TEXT,
    status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bulletins_date ON tenant_template.bulletins(bulletin_date DESC);

-- ═══════════════════════════════════════
-- 목회컬럼
-- ═══════════════════════════════════════
CREATE TABLE tenant_template.columns_pastoral (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(500) NOT NULL,
    content             TEXT,
    top_image_url       TEXT,
    bottom_image_url    TEXT,
    youtube_url         TEXT,
    thumbnail_url       TEXT,
    status              VARCHAR(20) DEFAULT 'draft'
                        CHECK (status IN ('draft', 'published', 'archived')),
    created_by          UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 교회앨범
-- ═══════════════════════════════════════
CREATE TABLE tenant_template.albums (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL,
    images          JSONB DEFAULT '[]',
    youtube_url     TEXT,
    thumbnail_url   TEXT,
    category_id     UUID,
    status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenant_template.album_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenant_template.albums
    ADD CONSTRAINT fk_album_category
    FOREIGN KEY (category_id) REFERENCES tenant_template.album_categories(id);

-- ═══════════════════════════════════════
-- 배너
-- ═══════════════════════════════════════
CREATE TABLE tenant_template.banners (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(500) NOT NULL,
    pc_image_url        TEXT,
    mobile_image_url    TEXT,
    sub_image_url       TEXT,
    link_url            TEXT,
    link_target         VARCHAR(10) DEFAULT '_self',
    start_date          DATE,
    end_date            DATE,
    text_overlay        JSONB DEFAULT '{}',
    category            VARCHAR(20) DEFAULT 'main'
                        CHECK (category IN ('main', 'sub')),
    sort_order          INT DEFAULT 0,
    status              VARCHAR(20) DEFAULT 'draft'
                        CHECK (status IN ('draft', 'published', 'archived')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 이벤트
-- ═══════════════════════════════════════
CREATE TABLE tenant_template.events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   VARCHAR(500) NOT NULL,
    background_image_url    TEXT,
    image_only              BOOLEAN DEFAULT false,
    department              VARCHAR(100),
    event_date              VARCHAR(255),
    location                VARCHAR(500),
    link_url                TEXT,
    description             TEXT,
    youtube_url             TEXT,
    thumbnail_url           TEXT,
    status                  VARCHAR(20) DEFAULT 'draft'
                            CHECK (status IN ('draft', 'published', 'archived')),
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 교역자/팀원
-- ═══════════════════════════════════════
CREATE TABLE tenant_template.staff (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    role        VARCHAR(100),
    department  VARCHAR(100),
    email       VARCHAR(255),
    phone       VARCHAR(50),
    bio         TEXT,
    photo_url   TEXT,
    sns_links   JSONB DEFAULT '{}',
    sort_order  INT DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 연혁
-- ═══════════════════════════════════════
CREATE TABLE tenant_template.history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year        INT NOT NULL UNIQUE,
    items       JSONB DEFAULT '[]',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 파일
-- ═══════════════════════════════════════
CREATE TABLE tenant_template.files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name   VARCHAR(500),
    storage_key     TEXT NOT NULL,
    url             TEXT NOT NULL,
    mime_type       VARCHAR(100),
    size_bytes      BIGINT,
    uploaded_by     UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 교회 설정 (Key-Value)
-- ═══════════════════════════════════════
CREATE TABLE tenant_template.settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- 스키마 복제 함수
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION public.clone_schema(
    source_schema TEXT,
    dest_schema TEXT
) RETURNS void AS $$
DECLARE
    rec RECORD;
    sql_text TEXT;
BEGIN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', dest_schema);

    -- 테이블 복제 (구조만, 데이터 제외)
    FOR rec IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = source_schema AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format(
            'CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL)',
            dest_schema, rec.table_name, source_schema, rec.table_name
        );
    END LOOP;

    -- FK 재생성 (스키마 내부 참조만)
    FOR rec IN
        SELECT
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS ref_table,
            ccu.column_name AS ref_column,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
            AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = source_schema
            AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I(%I) ON DELETE CASCADE',
            dest_schema, rec.table_name, rec.constraint_name || '_' || dest_schema,
            rec.column_name, dest_schema, rec.ref_table, rec.ref_column
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. API 서버 설계

### 5.1 디렉토리 구조

```
dw-church-app/
├── packages/
│   ├── api-client/          # (기존, 수정) TypeScript 클라이언트
│   ├── ui-components/       # (기존, 유지) React 컴포넌트 38개
│   ├── admin-app/           # (기존, 수정) 관리자 SPA
│   └── wp-connector/        # (신규) WP 경량 연동 플러그인
│
├── apps/
│   ├── demo/                # (기존) 데모 앱
│   ├── web/                 # ★ 신규: 랜딩 + 교회 공개 페이지 (Next.js on Vercel)
│   └── server/              # ★ 신규: Node.js API 서버
│       ├── src/
│       │   ├── index.ts
│       │   ├── config/
│       │   │   ├── env.ts               # Zod 환경변수 검증
│       │   │   ├── supabase.ts          # Supabase 클라이언트
│       │   │   └── r2.ts               # R2(S3) 클라이언트
│       │   ├── middleware/
│       │   │   ├── auth.ts              # Supabase JWT 검증
│       │   │   ├── tenant.ts            # 스키마 전환
│       │   │   ├── rate-limit.ts
│       │   │   └── error-handler.ts
│       │   ├── modules/
│       │   │   ├── auth/                # 회원가입, 로그인 (Supabase Auth 위임)
│       │   │   ├── tenants/             # 교회 생성/관리 + 스키마 생성
│       │   │   ├── sermons/             # CRUD + related
│       │   │   ├── bulletins/
│       │   │   ├── columns/
│       │   │   ├── albums/
│       │   │   ├── banners/
│       │   │   ├── events/
│       │   │   ├── staff/
│       │   │   ├── history/
│       │   │   ├── files/               # R2 업로드
│       │   │   ├── settings/
│       │   │   └── categories/          # 설교/앨범 카테고리, 설교자
│       │   └── utils/
│       │       ├── pagination.ts
│       │       ├── schema-manager.ts    # 스키마 생성/삭제/복제
│       │       └── plan-limits.ts       # 플랜별 제한
│       ├── prisma/
│       │   ├── schema.prisma            # public 스키마
│       │   └── tenant.prisma            # tenant_template 스키마
│       ├── package.json
│       └── tsconfig.json
│
├── package.json
└── pnpm-workspace.yaml
```

### 5.2 API 엔드포인트

**인증 (/api/v1/auth)** — Supabase Auth 위임
```
POST   /auth/register          # 교회 + 관리자 동시 생성
POST   /auth/login             # Supabase Auth → JWT
POST   /auth/logout
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /auth/me
POST   /auth/invite            # 관리자 초대 (owner/admin만)
```

**8개 CPT CRUD** — 동일 패턴
```
GET    /sermons                 POST   /sermons
GET    /sermons/:id             PUT    /sermons/:id
GET    /sermons/:id/related     DELETE /sermons/:id

(bulletins, columns, albums, banners, events, staff, history 동일)
```

**파일 (/api/v1/files)**
```
POST   /files/upload            # → R2 업로드 → URL 반환
DELETE /files/:id
GET    /files                   # 업로드된 파일 목록
```

**택소노미 (/api/v1/categories)**
```
CRUD   /sermon-categories
CRUD   /preachers
CRUD   /album-categories
```

**설정 (/api/v1/settings)**
```
GET    /settings                # 공개
PUT    /settings                # owner만
```

**슈퍼어드민 (/api/v1/admin)** — 슈퍼어드민만
```
GET    /admin/tenants
POST   /admin/tenants
PUT    /admin/tenants/:id
DELETE /admin/tenants/:id
GET    /admin/stats
```

### 5.3 파일 업로드: R2 (S3 호환)

```typescript
// config/r2.ts
import { S3Client } from '@aws-sdk/client-s3';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// 나중에 S3로 전환 시 endpoint만 변경:
// endpoint: 'https://s3.us-east-1.amazonaws.com'
```

업로드 경로 구조:
```
r2-bucket/
├── tenant_sarang/
│   ├── sermons/thumb-uuid.jpg
│   ├── bulletins/page1-uuid.jpg
│   ├── albums/photo-uuid.jpg
│   └── staff/photo-uuid.jpg
├── tenant_yeomkwang/
│   └── ...
└── public/
    └── logos/sarang-logo.png
```

교회별 폴더 분리 → 교회 삭제 시 `DELETE tenant_slug/*` 일괄 삭제.

---

## 6. 프론트엔드: Vercel

### 6.1 배포 구조

```
Vercel Project
├── apps/web (Next.js)
│   ├── dw-church.app              — 랜딩 페이지
│   ├── admin.dw-church.app        — Admin SPA
│   └── *.dw-church.app            — 교회 공개 페이지 (ISR)
│
├── Edge Middleware (middleware.ts)
│   └── hostname 기반 라우팅
│       ├── dw-church.app → /landing
│       ├── admin.* → /admin (React SPA)
│       └── sarang.* → /church/[slug] (SSR/ISR)
│
└── Vercel Edge Config
    └── 커스텀 도메인 매핑 캐시
```

### 6.2 Edge Middleware — 테넌트 라우팅

```typescript
// apps/web/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // 랜딩 페이지
  if (hostname === 'dw-church.app' || hostname === 'www.dw-church.app') {
    return NextResponse.next();
  }

  // Admin SPA
  if (hostname.startsWith('admin.')) {
    return NextResponse.rewrite(new URL('/admin', request.url));
  }

  // 교회 공개 페이지 (서브도메인)
  const slug = hostname.split('.')[0];
  if (slug && slug !== 'www') {
    return NextResponse.rewrite(
      new URL(`/church/${slug}${request.nextUrl.pathname}`, request.url)
    );
  }
}
```

### 6.3 @dw-church/admin-app 변경

기존 Admin SPA에 추가:

| 기존 | 추가 |
|------|------|
| Dashboard | 로그인 페이지 |
| 8개 CPT 관리 | 회원가입 (교회 등록) |
| Settings | 사용자 관리 (초대/삭제) |
| | 교회 프로필 (로고, slug) |
| | 파일 관리 (업로드 목록) |
| | 플랜 관리 (업그레이드) |

placeholder save → **실제 API CRUD 연결** (가장 큰 변경)

---

## 7. WordPress 연동 플러그인 (wp-connector)

### 7.1 구조

```
wp-connector/
├── dw-church-connector.php
├── includes/
│   ├── class-api-client.php       # wp_remote_get/post 래퍼
│   ├── class-shortcodes.php       # 숏코드 7종
│   ├── class-settings.php         # 설정 페이지
│   └── class-cache.php            # Transient 캐싱
└── assets/
    └── js/dw-church-embed.min.js  # React 컴포넌트 번들
```

### 7.2 WordPress에서 사용 예시

```
1. 플러그인 설치 + API URL 입력
   https://sarang.dw-church.app/api/v1

2. 페이지에 숏코드 삽입
   [dw_church_sermons limit="6" category="sunday"]
   [dw_church_bulletins limit="3"]
   [dw_church_staff]
   [dw_church_history]
   [dw_church_banners category="main"]

3. WordPress는 디자인/레이아웃만 담당
   데이터는 DW Church SaaS에서 API로 가져옴
```

---

## 8. 요금 체계

| | Free | Basic | Pro |
|---|---|---|---|
| **월 요금** | $0 | $19 | $49 |
| **설교** | 50개 | 무제한 | 무제한 |
| **주보** | 20개 | 무제한 | 무제한 |
| **앨범** | 10개 | 무제한 | 무제한 |
| **교역자** | 5명 | 20명 | 무제한 |
| **파일 저장** | 500MB | 10GB | 50GB |
| **관리자 계정** | 1명 | 3명 | 10명 |
| **커스텀 도메인** | X | O | O |
| **API 액세스** | 읽기만 | 읽기만 | 전체 |
| **WP 플러그인** | O | O | O |
| **화이트라벨** | X | X | O |
| **데이터 내보내기** | CSV | CSV + JSON | CSV + JSON + SQL 덤프 |

---

## 9. 개발 Phase

### Phase 1: 백엔드 API + DB (2~3주)

```
Week 1:
  ├── apps/server 프로젝트 초기화 (Fastify + TypeScript + Prisma)
  ├── Supabase 프로젝트 생성 (us-east-1)
  ├── public 스키마 테이블 생성 (tenants, billing)
  ├── tenant_template 스키마 전체 테이블 생성
  ├── clone_schema() 함수 작성
  ├── Supabase Auth 설정 (이메일/비밀번호)
  └── tenant 미들웨어 (subdomain → SET search_path)

Week 2:
  ├── auth 모듈 (register → 교회+스키마 자동 생성, login, me)
  ├── sermons CRUD + related posts
  ├── bulletins CRUD
  ├── columns CRUD
  ├── albums CRUD + categories
  └── Cloudflare R2 파일 업로드

Week 3:
  ├── banners CRUD + active 필터
  ├── events CRUD
  ├── staff CRUD + reorder
  ├── history CRUD
  ├── settings GET/PUT
  ├── categories/preachers CRUD
  ├── plan limits 미들웨어
  └── Railway 배포 + api.dw-church.app 연결
```

### Phase 2: 프론트엔드 연결 (1~2주)

```
Week 4:
  ├── @dw-church/api-client 수정
  │   ├── id: number → string (UUID)
  │   ├── Supabase Auth 연동 (useLogin, useRegister 등)
  │   └── 파일 업로드 훅
  ├── @dw-church/admin-app 수정
  │   ├── 로그인/회원가입 페이지
  │   ├── 인증 상태 관리 (Supabase onAuthStateChange)
  │   ├── 모든 CPT의 placeholder → 실제 mutation 연결
  │   ├── 이미지 필드 → 파일 업로드 컴포넌트
  │   └── 사용자 관리, 교회 프로필 페이지
  └── Vercel 배포 (admin.dw-church.app)

Week 5:
  ├── apps/web (Next.js) — 랜딩 페이지
  ├── Edge Middleware — 서브도메인 라우팅
  ├── 교회 공개 페이지 (ISR)
  │   └── sarang.dw-church.app → 설교/주보/앨범 자동 표시
  └── Vercel 배포 (dw-church.app + *.dw-church.app)
```

### Phase 3: SaaS 인프라 (1~2주)

```
Week 6:
  ├── 결제 연동 (Stripe Subscription)
  │   ├── 체크아웃 페이지
  │   ├── 웹훅 → 플랜 자동 변경
  │   └── 인보이스 자동 발행
  ├── 슈퍼어드민 콘솔
  │   ├── 교회 목록/생성/관리
  │   └── 전체 통계 대시보드
  ├── 이메일 알림 (Supabase Auth SMTP 설정)
  └── 모니터링 (Sentry + Uptime Robot)
```

### Phase 4: WP 플러그인 + 런칭 (1~2주)

```
Week 7~8:
  ├── wp-connector 플러그인 개발
  ├── API 문서 (Swagger/OpenAPI)
  ├── 사용자 매뉴얼
  ├── 베타 테스트 (3~5개 교회)
  └── 공식 런칭
```

### 일정 요약

| Phase | 기간 | 핵심 산출물 |
|-------|------|-----------|
| **1** | 2~3주 | Node.js API, PostgreSQL 스키마 분리, Supabase Auth, R2 파일 업로드, Railway 배포 |
| **2** | 1~2주 | Admin SPA 실제 CRUD, 로그인/회원가입, 공개 페이지, Vercel 배포 |
| **3** | 1~2주 | Stripe 결제, 슈퍼어드민, 모니터링 |
| **4** | 1~2주 | WP 플러그인, 문서, 베타, 런칭 |
| **합계** | **5~9주** | **프로덕션 SaaS** |

---

## 10. v3.0.0 코드 재사용 매핑

| v3.0.0 자산 | SaaS에서의 역할 | 변경사항 |
|------------|----------------|---------|
| `@dw-church/api-client` | 그대로 사용 | id: string, Supabase Auth 훅 추가 |
| `@dw-church/ui-components` (38개) | 그대로 사용 | 변경 없음 |
| `@dw-church/admin-app` (12페이지) | 그대로 사용 | 인증 페이지 추가, CRUD mutation 연결 |
| Storybook (7 스토리) | 그대로 사용 | 변경 없음 |
| 테스트 (68개) | 그대로 사용 | id 타입 수정 |
| GitHub Actions CI/CD | 확장 | Railway + Vercel 배포 추가 |
| PHP REST API | 삭제 | Node.js로 대체 |
| PHP React Embed | 삭제 | wp-connector로 대체 |
| WordPress CPT 등록 | 삭제 | PostgreSQL 테이블로 대체 |

**프론트엔드 코드 ~95% 재사용. 새로 작성하는 것은 백엔드 API 서버뿐.**
