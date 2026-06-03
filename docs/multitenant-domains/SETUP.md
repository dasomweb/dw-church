# True Light — Cloudflare for SaaS 인프라 셋업 (1회)

> 2026-06-03 기준. b2bsmart 의 검증된 아키텍처를 그대로 포팅. 자세한
> 동작 원리는 [b2bsmart 의 docs/multitenant-domains/01-architecture.md](../../../b2bsmart/docs/multitenant-domains/01-architecture.md) 참조.

## 0. 전제

- 도메인: `truelight.app` — Vercel 에 등록되어 있음 (DNS 호스팅도 Vercel)
- Railway 서비스 3개: `api-server`, `admin`, `web` — 모두 정상 동작 중
- 이번 작업: Cloudflare 로 DNS 이전 + Cloudflare for SaaS + Worker 활성화

## 1. Cloudflare 계정 + Zone 셋업

### 1.1 Cloudflare 가입 + truelight.app 추가

1. https://dash.cloudflare.com/sign-up 무료 가입
2. 대시보드 → **+ Add a Site** → `truelight.app` 입력 → **Continue**
3. 플랜 선택: **Free** (무료) → **Continue**
4. Cloudflare 가 기존 DNS 레코드 자동 임포트 (Vercel 에 있던 레코드 전부)
   - 단, **Vercel 에 등록된 모든 레코드가 보일 때까지 잠시 대기** (최대 30초)
5. 임포트 결과 검토:
   - `admin` CNAME → Railway target ← 유지
   - `api` CNAME → Railway target ← 유지 (있다면)
   - 그 외 옛 Vercel A 레코드 → 곧 삭제할 예정 (지금은 두기)
6. **Continue** 클릭 → Cloudflare nameserver 2개 표시 (예: `kira.ns.cloudflare.com`, `tom.ns.cloudflare.com`)

### 1.2 Vercel 에서 nameserver 교체

1. https://vercel.com/dashboard/domains → **truelight.app** 클릭
2. **Nameservers** 섹션 → **Edit**
3. Vercel nameserver 2개 (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`) **삭제**
4. Cloudflare 가 준 nameserver 2개 **추가** → Save
5. **전파 대기** (10분~24시간 — 보통 1시간 이내)

### 1.3 Zone Active 확인

- Cloudflare 대시보드 → truelight.app → 상태가 **Active** (초록 점) 으로 바뀌면 진행
- 확인 CLI: `nslookup -type=NS truelight.app 8.8.8.8` → Cloudflare nameserver 나오면 OK

## 2. SSL/TLS 모드 설정

Cloudflare → truelight.app → **SSL/TLS** → **Overview**:
- 모드를 **Full** 로 설정 (NOT "Full strict")
- 이유: Worker 의 outbound fetch 가 origin 측 SNI 와 cert 가 다른 상황에서도 HTTPS 통신 유지

## 3. 핵심 DNS 레코드 추가

Cloudflare → truelight.app → **DNS** → **Records**:

| Type | Name | Content | Proxy | 용도 |
|---|---|---|---|---|
| CNAME | `customers` | `web-production-1f18f.up.railway.app` | 🟠 Proxied | Worker 의 fallback target |
| CNAME | `saas-proxy` | `web-production-1f18f.up.railway.app` (placeholder — Worker route 가 가로챔) | 🟠 Proxied | Cloudflare for SaaS 의 fallback origin (Worker 라우트) |
| CNAME | `*` (wildcard) | `web-production-1f18f.up.railway.app` | 🟠 Proxied | 테넌트 서브도메인 (lagrangechurch.truelight.app 등) |

기존 옛 Vercel A 레코드들 (`216.150.x.x` 가리키던 것)은 **전부 삭제**.

## 4. Railway web 서비스에 custom domain 등록

Railway 대시보드 → True Light → **web** 서비스 → **Settings** → **Networking** → **Custom Domain**:
- 추가 1: `customers.truelight.app`
- 추가 2: `*.truelight.app` (wildcard — 모든 테넌트 서브도메인 포함)

Railway 가 자동으로 Let's Encrypt SSL 발급 (1~5분).

## 5. Cloudflare for SaaS 활성화

Cloudflare → truelight.app → **SSL/TLS** → **Custom Hostnames** 클릭

처음 들어가면 **Enable Cloudflare for SaaS** 버튼 — 클릭 → Free 플랜 위에 활성화 (별도 비용 없음, 첫 100 hostnames 무료)

활성화 후 **Fallback Origin** 설정:
- 값: `saas-proxy.truelight.app`
- Save → 상태가 **Active** 가 될 때까지 1~5분 대기

## 6. Cloudflare Worker (saas-proxy) 배포

로컬 PC 에서:

```bash
cd h:/GitHub/dw-church/dw-church-app/workers/saas-proxy
pnpm install
npx wrangler login    # 브라우저 열림 — Cloudflare 로그인
```

`wrangler.toml` 편집:
```toml
account_id = "REPLACE_WITH_CLOUDFLARE_ACCOUNT_ID"
```
→ 실제 Account ID 로 교체 (Cloudflare 대시보드 우하단 또는 URL `https://dash.cloudflare.com/<여기>` 에서 확인)

Shared secret 생성 + 등록:
```bash
# 32바이트 hex secret 생성
openssl rand -hex 32
# 예: a3f8e2c9b4d6f1a5e7c8d9b0a1f2e3c4b5a6d7e8f9a0b1c2d3e4f5a6b7c8d9e0
```

이 값을 **세 곳에 동일하게** 등록:

**(a) Worker 측:**
```bash
npx wrangler secret put SAAS_PROXY_SECRET
# 프롬프트에서 위 값 붙여넣기
```

**(b) Railway api-server 환경변수:**
- Railway → api-server → Variables → `+ Add Variable`
- Name: `SAAS_PROXY_SECRET` / Value: (같은 값) → Save

**(c) Railway web 환경변수:**
- Railway → web → Variables → `+ Add Variable`
- Name: `SAAS_PROXY_SECRET` / Value: (같은 값) → Save

Worker 배포:
```bash
npx wrangler deploy
```

Worker route `*/*` 가 truelight.app zone 의 모든 트래픽을 캡처하기 시작.

## 7. Cloudflare API Token 발급 (테넌트 자동 도메인 등록용)

Cloudflare → 우상단 프로필 → **My Profile** → **API Tokens** → **+ Create Token**:
- Template: **Create Custom Token**
- 권한:
  - Zone → SSL and Certificates → Edit
  - Zone → Custom Hostnames → Edit
  - Zone → Zone → Read
- Zone Resources: Include → Specific zone → `truelight.app`
- TTL: (선택) 영구 또는 1년

생성된 토큰 복사. Railway api-server 에 등록:

| Name | Value |
|---|---|
| `CF_API_TOKEN` | (위 토큰) |
| `CF_ZONE_ID` | Cloudflare 대시보드 → truelight.app 우하단의 Zone ID 복사 |
| `CF_FALLBACK_ORIGIN` | `customers.truelight.app` (기본값과 같지만 명시) |

## 8. 검증

### 8.1 admin / api / 테넌트 서브도메인

```bash
curl -sI https://admin.truelight.app/        # → 200, Server: railway-hikari
curl -sI https://api.truelight.app/api/v1/health  # → 200
curl -sI https://lagrangechurch.truelight.app/  # → 200 (or 404 from middleware if not configured)
```

### 8.2 운영자가 테넌트 도메인 연결 시도

라그란지 어드민 → 도메인 관리 → `www.lagrangechurch.org` 입력 → 받은 TXT/CNAME 안내를 라그란지가 자기 DNS 에 추가 → 검증 클릭 → Cloudflare 자동 SSL 발급 → 1~5분 후 https://www.lagrangechurch.org 정상 접속.

### 8.3 진단 endpoint

```bash
curl -sH "Authorization: Bearer <token>" https://api.truelight.app/api/v1/domains/diagnostics
```
→ `{ ok: true, summary: "정상 ..." }` 면 모든 환경변수 + Cloudflare API 호출 OK.

## 9. 영원히 안 해도 되는 것

- 신규 테넌트마다 DNS 추가 (wildcard 가 처리)
- 테넌트 SSL 인증서 수동 관리 (Cloudflare 자동)
- Vercel 로그인
- DNS hosting 비용 (Cloudflare 무료)
- 옛 Railway customDomainCreate 사용 (코드 경로 비활성)

## 10. 비용

| 항목 | 비용 |
|---|---|
| Cloudflare Free 플랜 | $0 |
| Cloudflare for SaaS — 첫 100 hostnames | **$0** |
| 100개 초과 hostname | $0.10/월 (active 만) |
| Workers Free (월 10만 req) | $0 |
| Workers Paid Base (월 10M req 포함) | $5/월 |

500 테넌트 × 일평균 200 req = 월 약 3M req → $5 워커 + $40 hostname = $45/월 (1000 활성 테넌트 시).

---

## 트러블슈팅

| 증상 | 원인 후보 | 해결 |
|---|---|---|
| 테넌트 서브도메인 → 404 from Railway | wildcard `*` CNAME 미설정 또는 `*.truelight.app` Railway custom domain 미등록 | §3 + §4 재확인 |
| 테넌트 커스텀 도메인 → SSL 에러 | SSL 모드 "Full strict" 인 경우 | §2 — "Full" 로 변경 |
| 도메인 추가 시 "CF_NOT_CONFIGURED" | api-server 환경변수 누락 | §7 확인 |
| Worker 가 안 트리거됨 | route 가 hostname-restricted (`saas-proxy.truelight.app/*`) | wrangler.toml `pattern = "*/*"` 확인 |
| 무한 루프 / customers.truelight.app 깨짐 | Worker self-hostname bypass 누락 | worker.js 의 self-bypass 로직 확인 |

자세히는 [b2bsmart docs/multitenant-domains/03-troubleshooting.md](../../../b2bsmart/docs/multitenant-domains/03-troubleshooting.md).
