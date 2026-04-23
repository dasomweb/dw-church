# 커스텀 도메인 연결 — 종단간 자동화

테넌트가 자신이 구매한 도메인(예: `mychurch.com`)을 기본 주소(`{slug}.truelight.app`)
대신 사용할 수 있게 해주는 기능. **Shopify의 `admin.shopify.com/store/:name` 도메인
연결 흐름**을 그대로 가져왔다.

## 1. 사용자 흐름 (교회 어드민 시점)

```
┌─────────────────────┐   ┌─────────────────────┐   ┌──────────────────┐
│ 1. 도메인 입력      │ → │ 2. DNS 안내 보고     │ → │ 3. 연결 확인 클릭 │
│    mychurch.com     │   │    레지스트라에서    │   │    (TXT 검증 +    │
│                     │   │    TXT + CNAME 추가  │   │    Railway 등록)  │
└─────────────────────┘   └─────────────────────┘   └──────────────────┘
                                                             │
                                                             ▼
                                                     ┌──────────────────┐
                                                     │ 4. SSL 발급 대기  │
                                                     │   (Let's Encrypt) │
                                                     │   1~5분 자동      │
                                                     └──────────────────┘
                                                             │
                                                             ▼
                                                     ┌──────────────────┐
                                                     │ 5. ACTIVE — HTTPS │
                                                     │    완전 연결       │
                                                     └──────────────────┘
```

전 과정에서 **슈퍼어드민 개입 0회**. Railway 대시보드 수동 작업 없음.

## 2. 상태 전이

```
pending      ─ DNS 레코드 추가 후 검증 대기
   │
   │ TXT 매치 ✓
   ▼
verified     ─ 소유권 확인됨, Railway 등록 시도
   │
   │ Railway customDomainCreate 성공
   ▼
pending_ssl  ─ Railway에 등록됨, Let's Encrypt 발급 진행 중
   │
   │ DNS records all PROPAGATED
   ▼
active       ─ HTTPS 접속 가능, 끝
```

`failed`는 명시적 오류 시. 현재는 사용 안함 (오류는 errorMessage로 노출).

## 3. UI 위치

- 경로: `/t/:slug/domains`
- 컴포넌트: `packages/admin-app/src/pages/DomainSettings.tsx`
- 상단: 기본 주소 (`{slug}.truelight.app`) 표시
- 폼: `+ 커스텀 도메인 추가`
- 각 도메인 row:
  - 상태 배지 (pending / verified / pending_ssl / active / failed)
  - **DNS 안내 보기** — 펼치면 TXT + CNAME 레코드 표시 + 복사 버튼
  - **연결 확인** — TXT 검증 + Railway 등록 트리거
  - **삭제** — Railway에서도 함께 제거

## 4. 사용자가 레지스트라에 추가할 DNS 레코드

| # | Type | Name / Host | Value / Target | TTL |
|---|------|-------------|----------------|-----|
| 1 | `TXT`   | `_truelight-verify.{domain}` | `truelight-verify={token}` | 300 |
| 2 | `CNAME` | `{domain}` | `web-production-1f18f.up.railway.app` | 300 |

`{token}`은 도메인 추가 시 서버가 발급한 48-hex 랜덤 값. UI에서 자동 표시.

**Apex 도메인 (mychurch.com처럼 서브도메인 없는 경우)**: CNAME을 apex에 못 꽂는 레지스트라가 많음. 그땐 `www.mychurch.com`을 CNAME으로 연결하고, apex는 레지스트라가 제공하는 ANAME / ALIAS / Forwarding 기능 사용. UI에 같은 안내 표시됨.

## 5. 백엔드 아키텍처

### DB 스키마

테넌트별 `custom_domains` 테이블 (런타임 마이그레이션으로 생성):

```sql
CREATE TABLE tenant_<slug>.custom_domains (
  id                 UUID PRIMARY KEY,
  domain             VARCHAR(255) UNIQUE NOT NULL,
  status             VARCHAR(20) DEFAULT 'pending',
  verification_token VARCHAR(64),     -- TXT 검증용 랜덤 값
  railway_domain_id  VARCHAR(64),     -- Railway customDomainCreate가 반환한 id
  verified_at        TIMESTAMPTZ,
  created_at, updated_at
);
```

성공한 verified 도메인은 `public.tenants.custom_domain` 컬럼에도 기록 → `tenantMiddleware`가 incoming hostname → tenant slug 해석에 사용.

### 모듈 구조

```
apps/server/src/
├── config/
│   ├── env.ts                 RAILWAY_API_TOKEN, RAILWAY_WEB_SERVICE_ID,
│   │                          RAILWAY_ENVIRONMENT_ID, WEB_CNAME_TARGET
│   └── railway.ts             GraphQL 클라이언트 (addCustomDomain,
│                              removeCustomDomain, getCustomDomainStatus)
├── modules/domains/
│   ├── routes.ts              GET/POST /domains, /:id/instructions, /:id/verify
│   └── service.ts             addDomain, verifyDomain, removeDomain,
│                              buildDnsInstructions
└── middleware/
    └── tenant.ts              public.tenants.custom_domain 으로 라우팅
```

### API 엔드포인트

| Method | Path | 권한 | 역할 |
|---|---|---|---|
| GET    | `/api/v1/domains`                  | tenant auth | 등록된 도메인 목록 |
| POST   | `/api/v1/domains`                  | tenant owner | 도메인 추가 + DNS 안내 반환 |
| GET    | `/api/v1/domains/:id/instructions` | tenant auth | DNS 안내 재조회 |
| POST   | `/api/v1/domains/:id/verify`       | tenant owner | TXT 검증 + Railway 등록 |
| DELETE | `/api/v1/domains/:id`              | tenant owner | 도메인 + Railway 등록 제거 |

### Railway GraphQL 통합

`config/railway.ts`가 `https://backboard.railway.app/graphql/v2`에 mutation 호출:

```graphql
mutation CustomDomainCreate($input: CustomDomainCreateInput!) {
  customDomainCreate(input: $input) {
    id
    domain
    status { dnsRecords { hostlabel requiredValue currentValue status } }
  }
}
```

- 검증 후 자동 호출 → Railway edge가 hostname routing + Let's Encrypt SSL 처리
- 같은 도메인 중복 등록 시 "already exists" 에러를 OK 처리 (멱등)
- env 변수 미설정 시 no-op으로 동작 — 검증까지만 되고 status `verified`에서 멈춤
- 삭제 시 `customDomainDelete($id)`로 Railway에서도 제거

## 6. 보안 고려사항

### 도메인 하이재킹 방지
- TXT 토큰은 `crypto.randomBytes(24)` (48-hex)로 발급. 추측 불가
- 검증 전엔 `public.tenants.custom_domain`에 기록되지 않음 → 다른 사람의 도메인을 등록만 해놓고 라우팅 가로채는 일 불가
- `domain` UNIQUE 제약 + 다른 테넌트가 이미 verified한 도메인은 추가 자체가 거부 (`DOMAIN_IN_USE` 409)

### 예약어 방지
- `truelight.app`, `*.truelight.app`은 등록 차단 (`RESERVED_DOMAIN`) → 플랫폼 자체 도메인을 테넌트가 가로챌 가능성 차단

### 권한
- `POST/DELETE/verify`는 `requireOwner` (테넌트 owner만) — 슈퍼어드민도 통과
- `GET`은 `requireAuth` (테넌트 멤버 누구나 조회)

## 7. 환경변수 (api-server)

| 변수 | 필수 | 설명 |
|---|---|---|
| `RAILWAY_API_TOKEN` | 권장 | Railway API 토큰. 미설정 시 검증까지만 되고 SSL/라우팅은 수동 |
| `RAILWAY_WEB_SERVICE_ID` | 권장 | 도메인을 등록할 web 서비스 UUID |
| `RAILWAY_ENVIRONMENT_ID` | 권장 | production 환경 UUID |
| `WEB_CNAME_TARGET` | 선택 | 사용자에게 안내할 CNAME 타겟. 기본값: `web-production-1f18f.up.railway.app` |

토큰 발급: https://railway.com/account/tokens

## 8. 운영 노트

### 새 web 서비스로 마이그레이션 시
1. `WEB_CNAME_TARGET` env를 새 호스트네임으로 업데이트
2. `RAILWAY_WEB_SERVICE_ID`도 새 서비스 UUID로 변경
3. 기존 도메인들은 새 CNAME으로 사용자가 직접 갱신해야 함 (안내 메일 발송 필요)

### Railway API 한도
- 서비스당 custom domain 수: 플랜별 다름 (Hobby 50개, Pro 더 많음)
- 1만개 단위 스케일 시 멀티 web 서비스 또는 Cloudflare SaaS 검토

### 디버깅
- 검증 실패 시 `errorCode` (`ENOTFOUND` / `TXT_MISMATCH` 등) + `errorMessage` 반환
- Railway API 호출 실패 시 status는 `verified`에 머무르고 `errorMessage`에 사유 노출 → 슈퍼어드민이 수동 등록으로 복구 가능

## 9. 향후 확장 가능

- **SSL 상태 polling 자동화**: 현재는 사용자가 verify 다시 눌러야 `pending_ssl` → `active` 전환. cron으로 주기적으로 `getCustomDomainStatus` 호출하는 워커 추가 가능
- **Cloudflare for SaaS 통합**: Railway 대신 Cloudflare를 edge로 두면 도메인 수 무제한 + 더 빠른 SSL
- **WHOIS 기반 자동 감지**: 사용자가 도메인 입력하면 WHOIS에서 등록자 정보 표시해 본인 도메인인지 confirm 도와주기
- **Bulk DNS 안내**: 여러 도메인 한 번에 추가하고 안내 일괄 표시
