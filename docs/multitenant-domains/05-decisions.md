# 05 — Decision Log (결정 기록)

> 왜 이 시스템이 이렇게 만들어졌는지의 결정 기록. "왜 X 안 쓰고 Y 썼나?" 같은 질문에 답하는 단일 원본. 새로운 결정도 같은 형식으로 여기에 추가.
>
> 각 결정은 다음 5개 필드:
> - **Context**: 어떤 상황에서 결정해야 했나
> - **Considered**: 검토한 옵션들
> - **Decision**: 무엇을 선택했나
> - **Why this won**: 다른 옵션보다 나은 이유
> - **What we'd reconsider**: 어떤 새 사실/조건이면 결정 뒤집을지

---

## D-001: 외부 도메인 자동화 인프라 — Cloudflare for SaaS + Worker

**Date**: 2026-05-21 (확정), 2026-05-20 (첫 시도)
**Status**: Active

### Context

True Light 가 멀티테넌트 SaaS. 각 테넌트가 자기 도메인 (예: `www.korusorchid.com`) 으로 사이트를 운영해야 함. 수십~수백 테넌트 가능. 운영자 단독.

절대 요구사항:
1. brand 추상화 — 테넌트는 우리 도메인 (`customers.truelight.app`) 만 가리킴, vendor 호스트 직접 노출 금지
2. SSL 자동 발급 — 운영자 손 안 가야
3. 자동화 — 수십~수백 테넌트 매번 손 안 댐
4. 단독 운영자 부담

### Considered

| 옵션 | brand 추상화 | SSL 자동 | 운영 부담 | Vendor lock | 비용 (100 테넌트) | 결과 |
|---|---|---|---|---|---|---|
| **A. Railway customDomain 직접** | OK | OK | 매 테넌트 손 | 중 | 무료 | ❌ — 멀티테넌트 1급 지원 안 함 |
| **B. Cloudflare for SaaS + fallback origin** | OK | OK | 낮음 | 중 | ~$10/월 | ✅ **선택** |
| **C. Vercel for Platforms** | ❌ (cname.vercel-dns.com 노출) | OK | 낮음 | 강함 | $20/월 | ❌ — brand 깨짐 |
| **D. Caddy on-demand TLS (자체 edge)** | OK | OK | 중~높음 (운영 부담) | 가장 약함 | VPS ~$5/월 | ❌ — 단독 운영자에게 부담 |
| **E. AWS Lambda@Edge / GCP edge** | OK | OK | 매우 높음 | 강함 | 변동 | ❌ — 단독 운영자 비현실 |

### Decision

**Cloudflare for SaaS** (Custom Hostnames API) **+ Cloudflare Worker (saas-proxy)**.

상세 architecture: [01-architecture.md](01-architecture.md)

### Why this won

- 모든 절대 요구사항 충족 (brand 추상화 + SSL 자동 + 단독 운영자 부담 낮음)
- Cloudflare 가 SSL 발급/갱신 책임짐 (관리형)
- 100 테넌트 까지 거의 무료, 그 이후 hostname 당 $0.10/월 (비용 예측 가능)
- 우리가 이미 truelight.app 을 Cloudflare zone 으로 운영 중 → 새 vendor 도입 0, 같은 zone 의 애드온
- Vendor 갈아탈 가능성도 그나마 낮음 (Cloudflare 자체 안정성 + 우리 zone 통제권)

### What we'd reconsider

- 1000 테넌트 초과 — 비용이 월 $100 넘기 시작 → 자체 Caddy edge 옵션 검토 가치
- Cloudflare for SaaS API 가 deprecate / 가격 인상
- 더 좋은 관리형 솔루션 (예: Cloudflare for Platforms 같은 Vercel for Platforms 의 Cloudflare 버전) 등장

---

## D-002: Vercel 거부 — 왜 가장 흔한 옵션을 안 쓰는가

**Date**: 2026-05-21 (시도 → 같은 날 폐기)
**Status**: Active (negative decision — 채택하지 않은 결정도 기록)

### Context

D-001 의 옵션 C. Vercel for Platforms 가 멀티테넌트 SaaS 호스팅의 표준 옵션으로 알려져 있어 진지하게 검토. 실제로 Phase 0~3 cutover 까지 진행했음.

### Considered

Vercel 의 두 가지 패턴:

**(가) Vercel Domains API 로 테넌트 도메인 직접 attach** (시도한 것):
- 테넌트가 `cname.vercel-dns.com` (또는 프로젝트별 `<hash>.vercel-dns-XXX.com`) 직접 가리킴
- Vercel 이 SSL 자동 발급
- Next.js 미들웨어로 hostname 라우팅

**(나) Vercel 의 wildcard / branded CNAME 지원 검토**:
- 우리 도메인 산하 호스트 (`cname.truelight.app`) 를 Vercel 이 인식하는 패턴
- 결론: 조사 결과 Pro 플랜에서 1급 지원 안 함 (Enterprise 일부 기능)

### Decision

**Vercel 채택 안 함**. 2026-05-21 cutover 까지 진행했지만 같은 날 폐기 + revert.

### Why this lost

**Brand 추상화 깨짐**:
- 테넌트의 외부 DNS 에 `cname.vercel-dns.com` 가 그대로 노출됨
- 모든 테넌트가 "이 SaaS 는 Vercel 위에 도는구나" 알게 됨
- B2B 환경에서 마케팅적 부정적

**Vendor lock-in 매우 강함**:
- 나중에 Vercel 을 떠나려면 **모든 테넌트가 DNS 를 다시 변경** 해야
- 수백 테넌트라면 사실상 불가능 — vendor 갈아타기가 사업적 위기 수준

**Cloudflare for SaaS 와 비교 trade-off**:
- 운영 부담 / 자동화는 비슷
- 그러나 brand 추상화에서 Cloudflare for SaaS 압승

### Lessons learned (이게 핵심)

1. **"잘 알려진 패턴" 도 우리 절대 요구사항 (brand 추상화) 와 부합하는지 먼저 검증**. 검토 안 하고 cutover 진행하면 폐기 손해.
2. **결정 매트릭스에 절대 요구사항을 첫 컬럼으로**. 다른 trade-off (운영 부담 등) 보다 우선.
3. **Vercel cutover 가 brand 추상화 깨짐을 운영자가 지적하기 전까지 명시되지 않았던 게 첫 실패 원인**. 즉 옵션 비교 시 "Vercel 의 DNS 패턴이 vendor 노출이다" 라는 사실을 운영자가 모르고 진행했을 수 있음.

### What we'd reconsider

- Vercel 이 branded CNAME (`cname.truelight.app` 같은 우리 도메인 산하 진입점) 을 Pro 플랜에서 1급 지원하기 시작
- 또는 우리가 brand 추상화 요구사항을 완화 (B2C 서비스 등 vendor 노출이 마케팅으로 작용하는 경우)

---

## D-003: Caddy 자체 edge 거부 — 자체 인프라가 가장 자유로운데 왜 안 쓰나

**Date**: 2026-05-21 (옵션 검토만)
**Status**: Active (negative — 검토만 하고 폐기)

### Context

D-001 의 옵션 D. Caddy on-demand TLS 가 멀티테넌트 SaaS 의 self-hosted 표준. 가장 자유롭고 vendor lock-in 가장 약함.

### Considered

자체 reverse proxy 패턴:
- VPS (Hetzner / Fly.io / DigitalOcean) 위에 Caddy 또는 Traefik
- on-demand TLS 로 Let's Encrypt 자동 발급
- 테넌트가 우리 IP (또는 우리 edge 도메인) 직접 가리킴
- 모든 라우팅 / SSL 우리가 통제

### Decision

**Caddy 자체 edge 채택 안 함** (현재). D-001 의 Cloudflare for SaaS 선택.

### Why this lost

**운영 부담**:
- `caddy_data` 볼륨 백업 필수 — 유실 시 모든 테넌트 SSL 재발급 → Let's Encrypt rate limit 폭발 (50 cert/domain/week)
- 모니터링 / 알림 / 헬스 체크 자체 구축
- HA (High Availability) 구성 시 복잡도 큼
- DDoS / WAF 등 보안 보호도 자체 구축 또는 Cloudflare 앞에 두는 등 추가 작업

**단독 운영자 환경에서 부담 큼**:
- Cloudflare for SaaS 가 관리형이라 90% 의 운영 부담 제거
- Caddy 는 그 90% 를 운영자가 다시 짊어짐

### What we'd reconsider

- 1000+ 테넌트로 스케일 — Cloudflare for SaaS 비용 ($100+/월) 이 자체 인프라보다 커지는 시점
- 운영팀 확장 (운영자 2인 이상) — devops 시간 가능
- Cloudflare 자체 정책 변경으로 우리 use case 가 거부됨
- AI 기반 자동화 도구가 발전해서 자체 인프라 운영 부담이 크게 낮아지는 경우

---

## D-004: Worker route 패턴 `*/*` (zone-level wildcard)

**Date**: 2026-05-21
**Status**: Active

### Context

Cloudflare Worker 의 routes 패턴 선택. 우리 Worker 가 saas-proxy.truelight.app 으로 들어오는 Cloudflare for SaaS fallback origin 트래픽을 가로채야 함.

### Considered

| 패턴 | 의미 |
|---|---|
| `saas-proxy.truelight.app/*` | Host header 가 saas-proxy.truelight.app 인 트래픽만 |
| `truelight.app/*` | truelight.app zone 의 모든 트래픽 (하위 호스트 포함) |
| `*/*` | zone-level wildcard — Custom Hostname 트래픽 포함 모든 트래픽 |

### Decision

**`*/*` (zone-level wildcard)** + worker.js 의 self-hostname bypass 로직.

### Why this won

**유일하게 Custom Hostname 트래픽을 잡음**:
- Cloudflare for SaaS 의 fallback origin 경로에서 들어오는 트래픽은 Host header 가 **테넌트 hostname (예: www.korusorchid.com)** 그대로
- hostname-restricted 패턴 (`saas-proxy.truelight.app/*` 또는 `truelight.app/*`) 은 그 트래픽과 매칭 안 됨
- `*/*` 만 매칭

**Cloudflare 공식 문서 확인**:
- "Workers as your fallback origin" 가이드가 `*/*` wildcard 명시
- 커뮤니티 사례 / GitHub issue 도 일관됨

### Trade-off — 왜 위험한가

`*/*` 가 zone 의 *모든* 트래픽 캡처:
- 마케팅 사이트 (`www.truelight.app`), API (`api.truelight.app`), customers.truelight.app 등 자체 호스트도 Worker 거침
- Worker 가 일괄적으로 fallback origin 으로 fetch 재발행하면 무한 루프 + 자체 사이트 깨짐

**해결**: worker.js 의 첫 줄에 self-hostname bypass:
```js
if (incoming.hostname === 'truelight.app' || incoming.hostname.endsWith('.truelight.app')) {
  return fetch(request);
}
```

### What we'd reconsider

- Cloudflare 가 Custom Hostname 트래픽에 특화된 다른 route 패턴 도입 (예: `customhostname:*`)
- bypass 패턴이 너무 broad 해서 보안 우려 — 모든 *.truelight.app 가 통과
  - 대안: 명시 allowlist (`truelight.app`, `www.truelight.app`, `api.truelight.app`, `customers.truelight.app`, `saas-proxy.truelight.app`) 만 bypass
  - 현재는 wildcard 가 단순/안전 (자체 도메인은 다 우리 통제)

---

## D-005: 헤더 이름 X-Tenant-Host / X-Tenant-Verify (X-Forwarded-Host 아닌 이유)

**Date**: 2026-05-21
**Status**: Active

### Context

Worker 가 outbound fetch 발행 시 원래 tenant hostname + secret 을 어떤 헤더 이름으로 전달할지.

### Considered

| 패턴 | 표준성 |
|---|---|
| **X-Forwarded-Host + X-Saas-Proxy-Secret** (첫 시도) | X-Forwarded-Host 는 RFC 7239 비공식 표준, 잘 알려짐 |
| **X-Tenant-Host + X-Tenant-Proxy-Secret** (둘째 시도) | Custom 이름 |
| **X-Tenant-Host + X-Tenant-Verify** (셋째 시도, 최종) | Custom 이름 + Secret 단어 회피 |

### Decision

**X-Tenant-Host + X-Tenant-Verify**.

### Why this won

**X-Forwarded-Host 가 안 된 이유**:
- Worker 의 outbound fetch 가 customers.truelight.app (Cloudflare orange cloud) 로 가면서 Cloudflare 엣지를 두 번째로 거침
- 그 두 번째 통과에서 **Cloudflare 가 X-Forwarded-Host 를 자체 reserved 헤더로 인식해 자기 라우팅 destination (customers.truelight.app) 으로 덮어씀**
- 결과: middleware 가 받는 X-Forwarded-Host 는 항상 customers.truelight.app — 원래 hostname 잃어버림

**X-Tenant-Host 로 바꿔서 효과 확인**:
- 디버그 헤더로 검증: `x-debug-forwarded-host: www.korusorchid.com` — 보존됨
- Cloudflare 가 custom 이름은 안 건드림

**X-Tenant-Proxy-Secret → X-Tenant-Verify 도 같은 이유**:
- 처음엔 secret 헤더가 strip 되어서 "Cloudflare 가 secret/auth/key/token 단어 포함 헤더를 sanitize" 가설로 rename
- 실제로는 Worker 측에 secret 자체 미등록이었던 게 진짜 원인 (D-006 참조)
- 그러나 이름 rename 자체가 무해 + 미래 보호적이라 그대로 유지

### What we'd reconsider

- Cloudflare 가 X-Forwarded-Host 의 자동 덮어쓰기를 옵션화 (예: Header Transform Rules 로 비활성)
- HTTP 표준이 새 hostname-preservation 헤더 (예: Forwarded RFC 7239) 를 정의

---

## D-006: SAAS_PROXY_SECRET 등록 방식 — Cloudflare 대시보드 Secret 타입

**Date**: 2026-05-21
**Status**: Active

### Context

Worker 와 Railway middleware 가 공유할 secret 의 등록/관리 방식.

### Considered

| 방식 | Worker 등록 위치 | 자동화 | 운영 부담 |
|---|---|---|---|
| **(A) Cloudflare 대시보드 → Secret 타입** | 대시보드에서 수동 | 안 됨 | 한 번 등록 |
| **(B) `wrangler secret put` CLI** | 로컬에서 CLI 명령 | 안 됨 | 한 번 등록 |
| **(C) GitHub Actions 의 `secrets:` 입력으로 자동 register** | GitHub Secrets → wrangler-action | 됨 | 매 deploy 자동 |

### Decision

**(A) Cloudflare 대시보드의 Secret 타입**.

### Why this won

**Wipe 패턴 검증**:
- 우려: wrangler deploy 가 secret 을 wipe 한다는 community reports
- 우리 환경에서 검증: cloudflare/wrangler-action@v3 + Cloudflare 대시보드 Secret 조합에서 **wipe 발생 안 함**
- 검증 방법: secret 등록 → 여러 번 wrangler deploy → 사이트 200 OK 유지 + secret 살아있음 확인

**보안 최소 권한**:
- (C) 방식이면 secret 값을 GitHub Secrets 에 저장해야 함 → 권한 범위 확장 (GitHub Actions 실행자 모두 access)
- (A) 는 Cloudflare 대시보드 운영자만 access — 권한 범위 좁음

**운영 단순성**:
- 한 번 등록 후 변경 안 함 (rotation 외)
- 매 deploy 자동 register 의 이점이 크지 않음

### What we'd reconsider

- 우리 환경에서 wipe 가 한 번이라도 발생하면 즉시 (C) 방식으로 전환 — workflow 에 `secrets:` 입력 추가
- 운영팀 확장 — 여러 사람이 secret 관리하면 자동화가 안전

---

## D-007: wrangler.toml 에 account_id 명시

**Date**: 2026-05-21
**Status**: Active

### Context

wrangler deploy 시 Cloudflare API token 의 권한 범위.

### Considered

| 옵션 | 토큰 권한 |
|---|---|
| **(A) 토큰에 User Details:Read 권한 추가** | User → User Details:Read |
| **(B) wrangler.toml 에 account_id 명시** | User Details:Read 권한 불필요 |

### Decision

**(B) account_id 명시**.

### Why this won

- wrangler 가 deploy 시 어떤 account 에 배포할지 결정하기 위해 `/memberships` 조회
- 토큰에 User Details:Read 없으면 401 에러
- account_id 가 미리 명시되어 있으면 그 조회 자체를 skip

**보안 최소 권한**:
- User Details:Read 는 user 정보 전체 접근 가능
- account_id 는 비밀 정보가 아님 (Cloudflare URL 에 노출되는 식별자)
- (B) 가 권한 범위 좁힘 → security 좋음

### Trade-off

- account_id 가 git 에 노출 — 다만 비밀 정보 아니라 무해
- 다중 account 환경에서 fork 시 account_id 충돌 가능 — 우리는 단일 account 라 무관

### What we'd reconsider

- Cloudflare 가 새 권한 모델 도입 (account_id 명시도 권한 필요 등)
- 다중 account 운영 시작

---

## D-008: 어드민 SPA / 운영자가 Vercel 잔존 정리

**Date**: 2026-05-21
**Status**: Active (운영자 손 작업)

### Context

Vercel cutover 폐기 후 git 측 코드는 모두 revert. 그러나 외부 인프라 (Vercel 프로젝트, API token, Railway 의 VERCEL_* env) 는 남아있음.

### Decision

**3가지 모두 정리** (운영자 손 작업, [README §3](README.md) 의 Phase 4-2 참조).

### Why this won

- 사용 안 하는 인프라 잔존은 보안 위험 (옛 token 노출, 옛 프로젝트 misconfig 가능성)
- 비용 (Vercel Pro $20/월) 절감
- 운영자 mental model 단순화 (한 가지 인프라만 추적)

### What we'd reconsider

- Vercel 측 잔존 자체가 운영 위험 0 이고 보존 가치 있는 경우 (학습 / 백업 등) — 그러나 우리는 아님

---

## D-009: 문서 세트 분리 (단일 문서 아닌)

**Date**: 2026-05-21
**Status**: Active

### Context

운영자가 "동일 시스템 재구축의 메인 문서로 사용할 만큼 중요" 요구. 단일 거대 문서 vs 여러 작은 문서.

### Considered

| 옵션 | 장점 | 단점 |
|---|---|---|
| **(A) 단일 거대 문서 (multitenant-domains.md)** | 한 곳에서 다 봄, search 한 번 | 길어서 navigation 어려움, 부분 변경 시 diff 큼 |
| **(B) 5개 문서 (README + 01~05)** | 목적별 분리, navigation 쉬움 | 여러 곳 참조 필요 |

### Decision

**(B) 5개 문서 세트** — README.md (진입) + 01-architecture + 02-setup + 03-troubleshooting + 04-operations + 05-decisions.

### Why this won

- 각 문서가 명확한 독자 (신규 엔지니어 / 구축자 / 운영자 / 미래 자신) 가짐
- 부분 갱신 시 영향 범위 좁음 (예: setup 절차만 바뀌면 02 만 수정)
- 진단 작업 시 03-troubleshooting 만 열면 됨 — 다른 챕터 noise 없음
- README 가 entry point 로 적절한 navigation 제공

### Trade-off

- 한 줄 fact 가 여러 문서에 산재 가능 (예: secret 등록 방법이 02, 03, 04 에 모두 언급)
- → 해결: 각 문서가 다른 시각으로 같은 사실 다룸 (02=구축, 03=장애 진단, 04=일상 운영). 의도된 중복.

### What we'd reconsider

- 문서가 너무 분산되어 search 어려워지면 — 자동 ToC 생성 또는 단일 인덱스 페이지 보강

---

## D-010: www-only 정책 — apex 도메인은 Forwarding 으로 처리

**Date**: 2026-05-20 (정책 결정), 2026-05-21 (코드 안내 자동화)
**Status**: Active

### Context

테넌트가 자기 도메인 (예: `korusorchid.com`) 을 우리 시스템에 연결할 때, **apex (루트, `korusorchid.com`)** 와 **www 서브도메인 (`www.korusorchid.com`)** 둘 다 작동시키고 싶음. 그런데 DNS 표준 (RFC 1034) 상 apex 에는 **CNAME 레코드를 둘 수 없음** — apex 의 SOA/NS 레코드와 공존 불가. 우리 시스템은 테넌트가 `customers.truelight.app` 으로 **CNAME 가리키는 패턴** 이므로 apex 에는 적용 불가.

### Considered

| 옵션 | 메커니즘 | 테넌트 부담 | 운영 부담 | 비용 |
|---|---|---|---|---|
| **(A) 레지스트라 Domain Forwarding** | 테넌트가 등록업체에서 apex → https://www redirect 설정 | 5분, 익숙 | 안내만 (자동화 가능) | 무료 |
| **(B) Cloudflare CNAME Flattening** | 테넌트가 자기 도메인 DNS 자체를 Cloudflare 로 위임 | 큼 (MX 포함 모든 레코드 이동) | 가이드 제공 + case 별 도움 | 무료 |
| **(C) ALIAS/ANAME 지원 DNS provider 사용** | 테넌트의 DNS provider 가 ALIAS 지원하는 경우 사용 | 변동 (provider 의존) | 매 테넌트 provider 확인 | 무료 (provider 의존) |
| **(D) Cloudflare Enterprise Apex Proxying** | Cloudflare Enterprise 의 자동 처리 | 0 (없음) | 0 (자동) | $1,000+/월 |

### Decision

**(A) 레지스트라 Domain Forwarding** + 어드민에서 도메인 등록 시 자동 안내 (server 의 `buildAdditionalSteps()` 가 `additionalSteps` 응답으로 안내 텍스트 자동 생성, 어드민 SPA 가 화면 표시).

### Why this won

**운영 우선순위 메모리 ("매 테넌트 등록 패턴 금지") 와 부합도**:
- (A): 안내 자동화 가능 — 어드민 UI 가 server 응답을 그대로 표시 → 운영자가 매 테넌트 손 안 댐 ✅
- (B): DNS 위임은 case-by-case 도움 필수 ❌
- (C): provider 마다 안내 다름 ❌
- (D): 비용 prohibitive ❌

**테넌트 친화도**:
- (A) 의 Domain Forwarding 은 대부분의 등록업체 (Squarespace / GoDaddy / Cloudflare Registrar / Namecheap / 가비아) 가 무료 지원 + UI 친숙
- (B) 의 DNS 위임은 테넌트가 자기 도메인의 모든 서비스 (이메일 MX 등) 까지 영향받음 → 큰 변경

**확장성**: (A) 는 테넌트 수와 무관하게 동일 안내 자동 적용. (B)/(C) 는 테넌트별 도움 시간 큼.

### Trade-off

**(A) 의 단점**:
- apex 접속 시 1회 redirect 발생 (~100-300ms 추가 latency)
- 테넌트가 Forwarding 설정 안 하면 apex 접속이 깨진 채로 운영 → 외부에서 검증 어려움
- 보완: 어드민 UI 에 자동 health check 추가 가능 (도메인 등록 1시간 후 apex redirect 동작 확인 + 실패 시 경고). 현재 미구현 — 미래 작업.

### 구현 (현재)

- **server**: [apps/server/src/modules/domains/service.ts](../../apps/server/src/modules/domains/service.ts) 의 `buildAdditionalSteps(domain)` — apex Forwarding 안내 자유 텍스트 3줄 반환
- **routes**: `addDomain` 과 `getInstructions` 응답에 `additionalSteps: string[]` 추가
- **어드민 SPA**: [packages/admin-app/src/pages/admin/DomainSettings.tsx](../../packages/admin-app/src/pages/admin/DomainSettings.tsx) 가 DNS records (instructions) 아래에 amber 박스로 additionalSteps 표시
- **테스트**: [apps/server/src/__tests__/modules/domains-schema.test.ts](../../apps/server/src/__tests__/modules/domains-schema.test.ts) 의 `buildAdditionalSteps` describe 블록 — 6개 케이스 (안내 존재, apex 도메인 명시, Domain Forwarding 단어, 등록업체 예시, 깊은 서브도메인 처리, DNS 표준 설명)

### What we'd reconsider

- 자동 health check 가 운영 부담 줄이는 가치 — 도메인 등록 1시간 후 cron 으로 apex redirect 검증 + 실패 시 어드민에 경고. 우선순위 낮음 (현재 안내가 명확하므로 테넌트 측 mistake 적음)
- Cloudflare 가 Apex Proxying 을 Free/Pro 에 풀어주는 정책 변경 → (D) 가 무료가 되면 (A) → (D) 자동화
- 우리 사용자가 매우 비기술적 테넌트 위주가 되어 Domain Forwarding 도 부담스러운 경우 → (A) + (B) 둘 다 안내 + 테넌트 선택 옵션 제공

---

## D-XXX: 새 결정 추가 시 사용할 템플릿

```markdown
## D-XXX: <한 줄 요약>

**Date**: YYYY-MM-DD
**Status**: Active / Superseded / Deprecated

### Context
어떤 상황 + 어떤 결정이 필요했나

### Considered
검토한 옵션들 (표 형식 권장)

### Decision
선택한 것

### Why this won
다른 옵션보다 나은 이유

### Trade-off (선택적)
선택의 부작용 / 보완 필요한 부분

### What we'd reconsider
어떤 새 사실/조건이면 결정 뒤집을지
```

---

## 변경 정책

- 결정 뒤집기: 기존 항목의 **Status: Superseded by D-YYY** 로 변경 + 새 D-YYY 작성
- 결정 사소한 보강: 기존 항목에 inline 추가, Date 갱신
- 결정 삭제: 거의 안 함. Deprecated 표시 후 보존 (학습 가치)
