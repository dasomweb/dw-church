# 테넌트별 데이터 격리 구조

현재 DW Church SaaS에 적용되어 있는 테넌트 데이터·파일 격리 패턴 정리.
Shopify / Cloudinary 같은 멀티테넌트 SaaS의 표준 구조("단일 인프라 + 테넌트별
prefix")를 따른다.

## 1. PostgreSQL — 테넌트별 스키마

단일 데이터베이스 안에 **테넌트마다 독립된 스키마**(`tenant_{slug}`)를 둔다.

```
postgres database "railway"
├── public                       ← 플랫폼 공용 데이터
│   ├── tenants                  교회 메타 (slug, name, plan, isActive, customDomain, ...)
│   ├── tenant_domains           커스텀 도메인 매핑
│   ├── users                    모든 사용자 (tenantId 컬럼으로 소속 표시)
│   ├── billing                  Stripe 결제 기록
│   └── shared_images            슈퍼어드민 큐레이션 공용 갤러리
│
├── tenant_template              ← 신규 테넌트 클론 원본 (구조만)
│   ├── pages, page_sections, menus, themes, settings
│   ├── sermons, bulletins, columns_pastoral, albums, album_images
│   ├── events, staff, history, banners
│   ├── boards, board_posts
│   ├── categories, preachers
│   └── files (업로드 파일 메타)
│
├── tenant_grace                 ← grace 교회 데이터 전용
│   └── (tenant_template와 동일 테이블, grace 데이터만)
│
├── tenant_bethelfaith           ← 다른 교회 — 완전 격리
│   └── ...
└── ...
```

### 프로비저닝

`apps/server/src/utils/schema-manager.ts`의 `createTenantSchema(slug)`:

1. `SELECT clone_schema('tenant_template', 'tenant_<slug>')` PG 함수 호출
   (`prisma/migrations/0004_clone_schema_function/migration.sql`). 테이블 구조
   + FK + 인덱스 + 시퀀스를 통째 복제.
2. `seedDefaultData(slug)` — 기본 페이지, 메뉴, 테마, 카테고리, 담임목사
   placeholder를 삽입.

### 삭제

`deleteTenantSchema(slug)` → `DROP SCHEMA "tenant_<slug>" CASCADE`.
한 줄로 해당 테넌트 데이터 전체 소거. 다른 테넌트 / 공용 데이터 무영향.

### 스키마 결정 (요청 단위 런타임)

`tenantMiddleware` (`apps/server/src/middleware/tenant.ts`)가 다음 순서로 해석:

1. `X-Tenant-Slug` 헤더가 있으면 → `tenant_<header>` (Next.js SSR 등이 사용)
2. 헤더 없으면 hostname에서 subdomain 추출 → `tenant_<subdomain>`
3. 그것도 없으면 `public.tenants.custom_domain` 매칭
4. 결정된 스키마는 `request.tenantSchema`에 저장됨
5. 모든 콘텐츠 쿼리가 `FROM "${schema}".table_name` 형태로 접두어 사용

### SQL Injection 방어

`validateSchemaName()` 정규식으로 `^tenant_[a-z0-9][a-z0-9_-]{0,62}$`만 허용.
slug도 같은 정규식(`validateSlug`)으로 생성 시점에 검증.

---

## 2. R2 (Cloudflare) — 단일 버킷 + 테넌트 prefix

```
Bucket: env.R2_BUCKET_NAME  (단 하나)

키 구조:
├── tenant_grace/
│   ├── sermon/<uuid>.jpg              설교 썸네일
│   ├── bulletin/<uuid>.pdf            주보
│   ├── album/<uuid>.jpg               앨범 이미지
│   ├── staff/<uuid>.jpg               교역자 사진
│   ├── banner/<uuid>.jpg              배너
│   └── file/<uuid>.<ext>              일반 첨부
│
├── tenant_bethelfaith/                다른 테넌트 — 완전 격리
│   └── ...
│
└── shared/
    └── gallery/<uuid>.<ext>           슈퍼어드민 큐레이션 공용 갤러리
```

### 키 생성

테넌트 업로드 (`apps/server/src/modules/files/service.ts:38`):
```ts
const storageKey = `tenant_${tenantSlug}/${entityType}/${uuid}${ext}`;
```

공용 갤러리 (`apps/server/src/modules/shared-images/routes.ts`):
```ts
const r2Key = `shared/gallery/${crypto.randomUUID()}.${ext}`;
```

### 삭제

- **개별 파일**: 테넌트 스키마의 `files` 테이블에서 `storage_key` 조회 →
  `deleteFile(key)`로 R2 객체 삭제 + DB 행 삭제.
- **테넌트 일괄**: `deleteFilesByPrefix("tenant_<slug>/")` — 해당 prefix의 모든
  객체 삭제 (`apps/server/src/modules/tenants/service.ts:147`).

### entityType 고정 vs 동적

`{entityType}` (sermon / album / staff / banner / file …)를 중간 segment로 둬서
R2 콘솔에서 "교회 > 콘텐츠 종류 > 파일" 계층이 한눈에 보이도록 함. `images`
하나로 몰지 않는다.

---

## 3. 요청 단위 테넌트 결정 + 보안 게이트

```
incoming HTTP
    ↓
[tenantMiddleware]   ← 헤더/도메인에서 tenant 해석 → request.tenant 설정
    ↓
[requireAuth]        ← JWT 검증 → request.user 설정
    ↓ JWT vs header tenant 비교
    ├── role='support' & 불일치   →  403 (지원 계정은 다른 테넌트 못 봄)
    ├── 기타 role & 불일치        →  헤더 해석값 폐기, JWT의 tenantSlug로 재바인딩
    └── 일치                       →  통과
    ↓
[route handler]      ← request.tenantSchema, request.tenant.id 사용
    ↓
SQL: FROM "tenant_grace".sermons     ← 스키마 격리
R2 :  GET tenant_grace/...            ← prefix 격리
```

검증 로직은 `apps/server/src/middleware/auth.ts`의 `resolveUser()`에 있다.
**JWT가 진실의 원천**, 헤더는 힌트 역할. 헤더를 악의적으로 조작해도 JWT의
tenantSlug와 다르면 서버가 거부하거나 덮어쓴다.

---

## 4. 격리 강도 요약표

| 자원         | 격리 방법                         | 크로스-테넌트 접근                       |
|--------------|----------------------------------|----------------------------------------|
| 콘텐츠 데이터 | 별도 PG 스키마 `tenant_{slug}`   | 불가능 (SQL 수준에서 스키마가 다름)       |
| 업로드 파일   | R2 키 prefix `tenant_{slug}/`    | 불가능 (DB 조회 후 키를 알아야 함)        |
| 사용자 계정   | `users.tenantId` FK               | super_admin 외 자기 tenant만             |
| 인증 토큰     | JWT의 `tenantSlug`                | 미들웨어가 헤더와 대조, 불일치 시 거부    |
| 결제/도메인   | `public` 스키마, tenantId 필터링  | 슈퍼어드민만 전체 조회                   |

---

## 5. 공용/공유 데이터

`public` 스키마에 존재하며 **모든 테넌트가 읽지만 쓰기는 슈퍼어드민만**:

- `shared_images` — 큐레이션된 갤러리 (R2 `shared/gallery/` prefix).
  슈퍼어드민이 업로드/AI생성/자동분류, 테넌트는 page editor의 이미지 라이브러리
  모달에서 선택해서 쓴다.
- 향후 추가 가능: 공용 테마 템플릿, 공용 성경 본문 DB, 공용 행사 카테고리 등.

---

## 6. 신규 테넌트 생성 흐름 (대략 1초)

```
POST /admin/tenants
  ↓
1. INSERT INTO public.tenants
2. INSERT INTO public.users (owner)
3. SELECT clone_schema('tenant_template', 'tenant_<slug>')     스키마 통째 복제
4. seedDefaultData(slug)                                         기본 페이지/메뉴/카테고리/preacher
5. ensureSupportUser(tenantId, slug)                             support-{slug}@truelight.app 자동 생성
  ↓
완료 — R2 prefix는 첫 업로드 시 자동 생성됨 (사전 작업 불필요)
```

---

## 7. 삭제 흐름 (역순)

```
DELETE /admin/tenants/:id
  ↓
1. deleteFilesByPrefix("tenant_<slug>/")   R2 객체 prefix 단위 일괄 삭제
2. DROP SCHEMA "tenant_<slug>" CASCADE     PG 스키마 전체 drop
3. DELETE FROM public.users WHERE tenantId                      관련 사용자 제거
4. DELETE FROM public.tenants WHERE id                           테넌트 메타 제거
  ↓
R2 / DB 어디에도 해당 테넌트 흔적 없음
```

---

## 8. 왜 이 구조인가 — 트레이드오프 메모

- **스키마 per 테넌트 (vs row-level multi-tenant)**: 쿼리 실수로 인한 데이터
  유출 가능성을 SQL 수준에서 구조적으로 차단. 다만 스키마가 늘면 PG 카탈로그
  부담이 생기므로 1만 단위 이상 스케일에서는 재검토 필요.
- **R2 단일 버킷 + prefix (vs 버킷 per 테넌트)**: 버킷 당 생성 한도·관리 비용을
  피하고 한 곳에서 일괄 백업/정책 적용 가능. 테넌트 격리는 prefix + IAM 정책으로
  충분.
- **JWT 우선, 헤더는 힌트**: 헤더 기반 테넌트 해석은 Next.js SSR 등 토큰 없는
  흐름을 위해 유지하되, 인증 요청에서는 JWT를 기준으로 덮어쓴다. 헤더 스푸핑
  방지.
- **공용 데이터는 slug에 얽매이지 않음**: `shared_images`처럼 플랫폼 전역에서
  재사용되는 자원은 `public` 스키마 + `shared/` prefix에 두어 AI 생성 비용을
  한 번 쓰고 여러 교회가 공유하도록 한다.
