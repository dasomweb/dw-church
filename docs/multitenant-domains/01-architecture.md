# 01 — Architecture (작동 원리 + 데이터 흐름)

> 시스템의 모든 컴포넌트, 그들 사이를 흐르는 데이터, 각 단계에서 일어나는 변환을 상세히 기록. 이 문서만 보고 시스템 동작을 완전히 추론할 수 있어야 함.

---

## 1. 컴포넌트 전체 그림

```
┌──────────────────────────────────────────────────────────────────────────┐
│  외부 사용자 (테넌트의 고객)                                                  │
│    https://www.korusorchid.com/                                          │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ DNS lookup
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  테넌트 외부 DNS (Squarespace / GoDaddy / Cloudflare 등)                    │
│    www  CNAME  customers.truelight.app                                    │
│    apex 는 운영자 권한 밖 — 레지스트라의 Domain Forwarding 으로 www 리다이렉트    │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ TCP/TLS handshake
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Cloudflare Edge — Cloudflare for SaaS Custom Hostname                   │
│    - 테넌트 hostname (www.korusorchid.com) 의 SSL 인증서 발급/제공              │
│    - 매칭된 Custom Hostname 이 fallback origin 으로 라우팅 결정                │
│    - Fallback Origin = saas-proxy.truelight.app                           │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP request (Host header: www.korusorchid.com)
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Cloudflare zone-level Worker (saas-proxy)                               │
│    - wrangler.toml: route = "*/*", zone = truelight.app                   │
│    - 자체 hostname (*.truelight.app) 는 bypass — 마케팅/API 보호                │
│    - 테넌트 트래픽: incoming.host 보존 후 fetch 재발행                          │
│    - 부착하는 헤더:                                                          │
│        X-Tenant-Host:   www.korusorchid.com (incoming.host)              │
│        X-Tenant-Verify: <SAAS_PROXY_SECRET>                              │
│    - fetch destination: https://customers.truelight.app/<path>            │
│    - 효과: outbound TLS 의 SNI = customers.truelight.app (Railway 인식)      │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTPS fetch (SNI: customers.truelight.app)
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Cloudflare 두 번째 통과 — customers.truelight.app (orange cloud proxy)      │
│    - Worker bypass 로직이 *.truelight.app 매칭 → fetch(request) 통과         │
│    - Cloudflare 가 X-Forwarded-Host 는 자체 reserved 로 덮어쓰지만             │
│      custom 이름인 X-Tenant-Host / X-Tenant-Verify 는 보존                  │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Railway web — Next.js apps/web                                 │
│    - custom domain: *.truelight.app (wildcard) — customers.truelight.app   │
│      매칭 → Railway 가 origin SSL 제공 + 컨테이너로 전달                       │
│    - 컨테이너 안의 요청 헤더:                                                 │
│        host: customers.truelight.app                                      │
│        X-Tenant-Host: www.korusorchid.com (Worker 가 보낸 것)              │
│        X-Tenant-Verify: <secret>                                         │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Next.js middleware (apps/web/middleware.ts)                             │
│    resolveIncomingHostname(request):                                     │
│      forwardedHost  = req.headers['x-tenant-host']                       │
│      incomingSecret = req.headers['x-tenant-verify']                     │
│      expectedSecret = process.env.SAAS_PROXY_SECRET                      │
│      if forwardedHost && incomingSecret === expectedSecret:              │
│          return forwardedHost      ← www.korusorchid.com 으로 trust       │
│      else:                                                               │
│          return request.host       ← customers.truelight.app 으로 fallback│
│                                                                          │
│    분기:                                                                  │
│      isPlatformHost(hostname):  www.truelight.app / truelight.app 등 →     │
│                                  NextResponse.next() (마케팅 페이지)        │
│      not platform host:  Custom Domain → API resolve-domain →            │
│                          slug 받음 → rewrite /tenant/{slug}/...           │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ rewrite to /tenant/korus/...
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Next.js app router — /tenant/[slug]/page.tsx                            │
│    - slug=korus 로 페이지 렌더링                                            │
│    - API 호출 시 X-Tenant-Slug 헤더로 api-server 요청                      │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP 200 OK + HTML
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  외부 사용자                                                               │
│    페이지 정상 표시                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 각 컴포넌트의 정확한 역할

### 2.1 Cloudflare for SaaS (Custom Hostnames)

**책임**:
- 테넌트가 자기 도메인을 우리에게 위임할 수 있게 함
- 각 테넌트 hostname (예: `www.korusorchid.com`) 에 대한 SSL 인증서 발급 및 갱신 (Let's Encrypt / Google Trust Services)
- 매칭된 Custom Hostname 트래픽을 fallback origin (= `saas-proxy.truelight.app`) 으로 라우팅
- 첫 100 hostnames 무료, 100 이상 hostname 당 $0.10/월

**책임이 아닌 것**:
- 테넌트 식별 — Cloudflare 는 hostname → SSL 인증서 매핑만 알고, 그 hostname 이 어느 테넌트인지는 우리 시스템이 결정
- 라우팅 로직 — fallback origin 으로 단순 forward 만 함
- Host header 변경 — origin 에 갈 때 원래 Host (테넌트 hostname) 그대로 보냄

**등록 메커니즘**:
- API: `POST https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames`
- 우리 server 의 `apps/server/src/config/cloudflare.ts` 의 `createCustomHostname()` 가 이걸 호출
- 어드민 UI 에서 운영자가 "도메인 추가" → server API → Cloudflare API → DB record + DNS 안내 표시
- 테넌트가 외부 DNS 에 안내된 CNAME 추가 → Cloudflare 가 1~10분 안에 자동 검증 + SSL 발급 → 즉시 작동

### 2.2 Cloudflare Worker (saas-proxy)

**책임**:
- Cloudflare for SaaS 가 fallback origin 으로 보낸 트래픽을 우리 Railway origin 에 전달 가능한 형태로 변환
- Railway 가 인식할 수 있는 hostname (`customers.truelight.app`) 으로 outbound fetch 재발행 → 그 fetch 의 SNI 가 Railway custom domain 과 일치
- 원래 테넌트 hostname 을 X-Tenant-Host 헤더로 보존
- 자기 자신을 X-Tenant-Verify (공유 secret) 로 인증

**왜 필요한가**:
- Cloudflare Custom Hostname → fallback origin 으로 트래픽이 갈 때 SNI 는 fallback origin 의 hostname 이 아니라 **클라이언트가 원래 요청한 테넌트 hostname**
- Railway 의 custom domain SSL 발급은 `customers.truelight.app` 의 인증서뿐 — `www.korusorchid.com` SNI 는 인식 못 함 → "train not arrived" 404
- Enterprise 의 `custom_origin_sni` 파라미터로 SNI 를 origin 측에서 고정 가능하지만 Free 플랜에서는 거부됨
- 해결: Worker 가 incoming request 를 받아서 새로운 outbound fetch 를 `customers.truelight.app` 으로 발행 → 그 outbound 의 SNI 는 fetch URL 의 host

**핵심 route 패턴**:
```toml
# wrangler.toml
routes = [
  { pattern = "*/*", zone_name = "truelight.app" },
]
```

- `*/*` 가 zone-level wildcard — Custom Hostname 트래픽 포함 zone 의 모든 트래픽 캡처
- hostname-restricted 패턴 (예: `saas-proxy.truelight.app/*`) 은 Custom Hostname 트래픽을 못 잡음 (이게 우리의 첫 실패 원인)

**자기 자신 bypass**:
- `*/*` 가 zone 의 모든 트래픽 캡처 → truelight.app / www.truelight.app / api.truelight.app / customers.truelight.app 등 자체 호스트도 Worker 거침
- 자체 호스트는 `fetch(request)` 그대로 통과 — 변환 없음
- 이 bypass 가 없으면 customers.truelight.app 으로 가는 outbound 가 다시 Worker 트리거 → 무한 루프

### 2.3 customers.truelight.app (Cloudflare DNS proxy + Railway custom domain)

**책임**:
- Worker 의 outbound fetch destination
- Cloudflare orange cloud (proxy) 로 등록 → SSL 인증서 Cloudflare 가 발급/제공
- Railway web 의 `*.truelight.app` wildcard custom domain 으로 origin pull

**왜 customers.truelight.app 인가** (다른 *.truelight.app 가 아니라):
- 의미적 명확성 — "tenant customers 들의 진입점"
- 우리 마케팅 사이트 (`www.truelight.app`) 또는 API (`api.truelight.app`) 와 분리되어 혼동 없음
- Worker 의 bypass 로직이 정확히 이 호스트를 통과시키도록 코드에 명시

**Cloudflare proxy 의 영향** (Worker 의 outbound 가 다시 Cloudflare 거침):
- X-Tenant-Host / X-Tenant-Verify 같은 custom 헤더는 보존 ✅
- X-Forwarded-Host 는 Cloudflare 가 자체 reserved 로 덮어씀 ❌ → 이게 우리가 custom 이름을 쓰는 이유

### 2.4 Railway web (Next.js apps/web)

**책임**:
- `*.truelight.app` wildcard custom domain 으로 customers.truelight.app 트래픽 수신
- Next.js 컨테이너 실행
- Vercel 안 씀 (브랜드 추상화 + vendor lock-in 회피)

**환경변수**:
- `SAAS_PROXY_SECRET` — Worker 와 같은 값. middleware 가 X-Tenant-Verify 검증용

**왜 Railway 인가** (Vercel 이 아니라):
- 자세한 결정 배경은 [05-decisions.md](05-decisions.md) 참조
- 한 줄 요약: Vercel 의 멀티테넌트 도메인은 테넌트가 `cname.vercel-dns.com` 직접 가리켜야 함 → brand 추상화 깨짐

### 2.5 Next.js middleware (apps/web/middleware.ts)

**책임**:
- 들어온 요청의 hostname 을 결정 — direct Host 또는 X-Tenant-Host (인증된 경우)
- 결정된 hostname 에 따라 분기:
  - `api.truelight.app` → Railway API 로 proxy
  - `truelight.app` / `www.truelight.app` → 마케티 페이지 그대로
  - `*.truelight.app` (서브도메인) → 서브도메인을 slug 로 매핑 (예: `korus.truelight.app` → tenant korus)
  - 그 외 (외부 도메인) → API `/resolve-domain` 호출 → slug 매칭 → `/tenant/{slug}/` rewrite

**핵심 함수 `resolveIncomingHostname()`**:
```ts
function resolveIncomingHostname(request: NextRequest): string {
  const directHost = (request.headers.get('host') || '').toLowerCase();
  const forwardedHost = request.headers.get('x-tenant-host')?.toLowerCase();
  const incomingSecret = request.headers.get('x-tenant-verify');
  const expectedSecret = process.env.SAAS_PROXY_SECRET;
  if (forwardedHost && expectedSecret && incomingSecret === expectedSecret) {
    return forwardedHost;
  }
  return directHost;
}
```

세 가지 trust 조건이 모두 일치할 때만 `X-Tenant-Host` 신뢰:
1. `X-Tenant-Host` 헤더 존재
2. `SAAS_PROXY_SECRET` env 존재 (서버 측)
3. `X-Tenant-Verify` 헤더 값 = env 값

하나라도 빠지면 `directHost` (= `customers.truelight.app`) 로 fallback → custom domain 분기 안 타고 platform host 처리 → 잘못된 slug 매칭 → `/not-found`. 이 fallback 동작은 spoofing 방어 (외부에서 customers.truelight.app 으로 직접 호출 + 가짜 X-Tenant-Host 보내는 공격) 에 안전.

### 2.6 apps/server (Fastify) — 도메인 자동화 API

**책임**:
- 어드민 UI 의 "테넌트 도메인 추가" → Cloudflare Custom Hostname API 호출
- `apps/server/src/modules/domains/` 에 service / routes / schema
- DB 의 `public.tenants.custom_domain` + tenant-schema 의 `custom_domains` 테이블 갱신
- DNS 안내 (`buildDnsInstructionsFromCf()`) 생성 — 테넌트에게 보여줄 CNAME 정보

**노출 API**:
```
GET    /api/v1/domains                 — 테넌트의 도메인 목록
POST   /api/v1/domains                 — 새 도메인 추가
GET    /api/v1/domains/:id/instructions — DNS 안내 재조회
POST   /api/v1/domains/:id/verify       — 검증 트리거
DELETE /api/v1/domains/:id              — 도메인 삭제

GET    /api/v1/admin/tenants/resolve-domain?domain=... 
                                       — middleware 가 hostname → slug 조회
GET    /api/v1/domains/diagnostics      — super-admin 진단
```

---

## 3. 데이터 흐름 — 중요 변환 지점 4개

### 변환 1 — 테넌트 외부 DNS

```
www.korusorchid.com → (DNS lookup) → customers.truelight.app
                                   → (DNS lookup) → Cloudflare edge IP
                                   → (TLS handshake, SNI=www.korusorchid.com)
```

이 시점에 SNI 는 여전히 테넌트 hostname. Cloudflare 가 그 SNI 로 Custom Hostname 매칭 → 해당 테넌트의 SSL 인증서 제공.

### 변환 2 — Cloudflare for SaaS → Worker

```
incoming request:
  Host: www.korusorchid.com
  ... (사용자 요청 그대로)

Worker 가 받음:
  request.url     = https://www.korusorchid.com/...
  new URL(request.url).host = www.korusorchid.com  ← 원래 hostname 보존 ✅
  request.headers.get('host') = www.korusorchid.com
```

Cloudflare 가 fallback origin 으로 라우팅하기 *전에* zone-level Worker route 가 매칭됨 → Worker 가 원래 hostname 그대로 받음. 이게 우리 구조의 핵심.

### 변환 3 — Worker → customers.truelight.app (outbound fetch)

```
Worker 가 만드는 outbound:
  fetch("https://customers.truelight.app/<path>", {
    headers: {
      ...incoming.headers,
      'X-Tenant-Host': 'www.korusorchid.com',
      'X-Tenant-Verify': '<secret>',
    },
    // host 헤더는 fetch 가 자동으로 destination URL 의 host 로 세팅
  })

이 outbound 의 TLS SNI = customers.truelight.app  ← Railway 가 인식 ✅
```

### 변환 4 — Cloudflare 두 번째 통과 → Railway

```
Cloudflare orange cloud 가 outbound 받음 (customers.truelight.app 이라는 우리 zone 의 hostname):
  - Worker route 다시 매칭 (zone-level */*)
  - bypass 로직 → fetch(request) 그대로 통과
  - Cloudflare 가 origin (Railway) 으로 forward

Railway 에 도착하는 요청:
  Host: customers.truelight.app    ← Cloudflare 가 origin SNI/Host 로 변환
  X-Tenant-Host: www.korusorchid.com   ← Worker 가 보낸 것, custom 이름이라 보존 ✅
  X-Tenant-Verify: <secret>            ← 마찬가지 ✅
  X-Forwarded-Host: customers.truelight.app  ← Cloudflare 가 자체 reserved 로 덮어씀 ❌
```

**여기가 가장 중요한 지점** — Cloudflare 가 Worker 가 set 한 X-Forwarded-Host 는 자체 표준 처리로 덮어쓰지만, custom 이름인 X-Tenant-Host 는 안 건드림. 우리 헤더 이름 결정의 정확한 이유.

---

## 4. SSL/TLS 흐름 — 각 단계의 인증서

```
[클라이언트 ↔ Cloudflare edge]
  SNI: www.korusorchid.com
  Cert: Cloudflare for SaaS 가 발급한 www.korusorchid.com 의 Let's Encrypt 인증서
  
[Cloudflare ↔ Railway (customers.truelight.app 으로 origin pull)]
  SNI: customers.truelight.app
  Cert: Railway 가 customers.truelight.app 에 대해 발급한 Let's Encrypt 인증서
       (Railway custom domain 의 자동 SSL)

[Worker outbound ↔ Cloudflare edge (customers.truelight.app)]
  SNI: customers.truelight.app
  Cert: Cloudflare 가 customers.truelight.app proxy 에 대해 자동 제공 (Cloudflare Universal SSL)
```

3개의 별개 TLS handshake. 각자 자기 SNI 에 맞는 인증서. 어느 하나 깨지면 전체 흐름 깨짐.

---

## 5. 보안 모델

### 5.1 X-Tenant-Host spoofing 방어

**공격 시나리오**: 외부 공격자가 `https://customers.truelight.app/path` 로 직접 호출 + `X-Tenant-Host: victim-tenant.com` 헤더 위조 → middleware 가 trust 하면 victim-tenant 의 페이지를 받음 (info leak)

**방어**:
- middleware 는 X-Tenant-Verify 가 env.SAAS_PROXY_SECRET 와 일치할 때만 X-Tenant-Host 신뢰
- 외부 공격자는 secret 모름 → X-Tenant-Verify 못 만듦 → trust 안 됨 → customers.truelight.app 으로 fallback 처리 → not-found

**Secret 의 비밀성**:
- Worker secret 은 Cloudflare 대시보드의 Secret 타입 — 코드/로그 노출 없음
- Railway env 도 마찬가지 마스킹
- GitHub Actions 가 Secret 등록 안 함 (wrangler-action 의 secrets 입력 안 씀) — wipe 위험 없음 확인

### 5.2 Secret rotation

- 새 secret 생성 (PowerShell `-join ((1..32) | %{'{0:x2}' -f (Get-Random -Maximum 256)})` 또는 `openssl rand -hex 32`)
- 양쪽 (Worker + Railway) 동시 업데이트가 이상적
- 다만 짧은 다운타임 허용:
  1. Railway 에 새 secret 등록 + redeploy (Railway 자동) — 이 시점에 middleware 가 옛 X-Tenant-Verify 거부 → fallback 동작 → 404 분기
  2. Cloudflare Worker 에 새 secret 등록 (즉시 적용)
  3. 다시 정상
- 또는 middleware 코드를 잠시 두 secret 모두 허용하도록 수정 후 (1) → (2) → 코드 정리

### 5.3 Cloudflare API token 권한 최소화

`CF_API_TOKEN` 의 필요 권한 (server 측 도메인 자동화용):
- Zone:DNS:Edit (truelight.app)
- Account:SSL and Certificates:Edit
- SaaS Custom Hostnames:Edit

`CLOUDFLARE_API_TOKEN` (GitHub Actions wrangler deploy 용):
- Account:Workers Scripts:Edit
- Account:Account Settings:Read
- Zone:Workers Routes:Edit (truelight.app)
- Zone:Zone:Read (truelight.app)
- (User Details:Read 는 wrangler.toml 에 account_id 명시로 우회)

두 토큰은 분리 — server 측 토큰은 Custom Hostname 관리, deploy 토큰은 Worker 코드 push 만. 권한 leak 시 영향 범위 좁힘.

---

## 6. 실패 모드 (failure modes)

| 실패 지점 | 증상 | 진단 첫 줄 | 자세히 |
|---|---|---|---|
| 테넌트 외부 DNS 미반영 | DNS lookup 실패 / customers 가 아닌 다른 곳 가리킴 | `nslookup <tenant>` | [03-troubleshooting.md §1](03-troubleshooting.md) |
| Cloudflare for SaaS 미등록 | SSL 인증서 없음, TLS handshake 실패 | `curl -v https://<tenant>` | [03 §2](03-troubleshooting.md) |
| Worker route 패턴 잘못 | Worker 미트리거, Railway 404 (`x-railway-fallback: true`) | `curl -sI <tenant>` | [03 §3](03-troubleshooting.md) |
| Worker bypass 로직 누락 | 무한 루프 또는 customers.truelight.app 자체 깨짐 | curl 응답 시간 timeout | [03 §4](03-troubleshooting.md) |
| Worker secret 누락 | middleware 가 fallback → customers slug 로 처리 → /not-found rewrite | `x-middleware-rewrite: /not-found` | [03 §5](03-troubleshooting.md) |
| Worker/Railway secret 불일치 | 위와 동일 응답 — 진단 어려움 | 디버그 헤더 추가 필요 | [03 §5](03-troubleshooting.md) |
| middleware 가 옛 코드 | X-Tenant-Host 안 읽음, 같은 fallback 동작 | 디버그 헤더로 확인 | [03 §6](03-troubleshooting.md) |
| 어드민 등록 후 SSL 미발급 | Custom Hostname 상태 pending 으로 stuck | Cloudflare API verify | [03 §7](03-troubleshooting.md) |

모든 실패 모드의 진단 방법 + 정확한 fix 는 [03-troubleshooting.md](03-troubleshooting.md) 에 정리.

---

## 7. 확장 / 변경 시 영향도

| 변경 | 영향 |
|---|---|
| 새 테넌트 추가 | 어드민 UI 만 — 자동 |
| Railway web → 다른 호스팅 | customers.truelight.app 의 origin 변경 + 그 호스팅에 SAAS_PROXY_SECRET 등록만. 테넌트 DNS 변경 0 |
| Cloudflare for SaaS → 다른 SaaS hostname 솔루션 | 테넌트 DNS 변경 필요 (vendor lock-in 가장 큼) — 이건 큰 작업 |
| Next.js apps/web 변경 | middleware 의 `resolveIncomingHostname()` 보존 필수. 그 외 자유 |
| 새 platform subdomain 추가 (예: status.truelight.app) | Worker bypass 자동 동작 (`*.truelight.app` 패턴), middleware 의 isPlatformHost 도 자동 (subdomain 매칭). 별도 작업 없음 |
| secret rotation | [§5.2](#52-secret-rotation) 참조 |
| 도메인 (truelight.app) 변경 | Worker 의 bypass 로직 + middleware 의 PLATFORM_HOSTS / isPlatformHost + Cloudflare zone 다 변경. 큰 작업 |

---

## 8. 핵심 invariant (어떤 변경에서도 유지되어야 함)

1. **Worker route 는 zone-level `*/*`**. hostname-restricted 패턴으로 회귀 금지
2. **Worker 의 self-hostname bypass 로직 보존**. 없으면 자체 도메인 깨짐 + 무한 루프
3. **secret 은 양쪽 정확히 같은 값**. wrangler deploy 가 wipe 안 함 확인됨 (검증), 하지만 secret 변경 시 양쪽 동기화 확인 필요
4. **X-Forwarded-Host 가 아닌 X-Tenant-Host**. Cloudflare 가 X-Forwarded-Host 덮어씀
5. **테넌트는 `customers.truelight.app` (또는 우리 도메인 산하) 만 가리킴**. vendor 호스트 직접 노출 금지
6. **fallback origin = `saas-proxy.truelight.app`** (Cloudflare 대시보드 Custom Hostnames 설정). 변경하려면 Worker route + DNS 모두 함께
