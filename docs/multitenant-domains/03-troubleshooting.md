# 03 — Troubleshooting (진단 방법론 + 실제 실패 사례)

> 사이트 다운 / 404 / SSL 실패 등 모든 장애 시 첫 참조 문서. 단계별 진단 방법 + 우리가 실제로 겪은 모든 실패 패턴의 원인 + 정확한 fix.

---

## 0. 진단 방법론 — 어디서 막혔는지 단계별로 좁히기

`www.korusorchid.com` 가 정상 응답 안 할 때, **응답 헤더 한 줄로 어느 단계에서 막혔는지 90% 식별 가능**:

```bash
curl -sI https://<tenant-domain>/ | head -25
```

응답 헤더의 vendor signature 가 핵심 단서:

| 응답 헤더 패턴 | 의미 | 어느 단계? |
|---|---|---|
| (연결 실패 / timeout) | DNS / TLS handshake / Cloudflare 도달 안 됨 | [§1](#1-dns--tls-handshake-단계-실패) |
| `HTTP 525 / 526` | Cloudflare origin SSL 검증 실패 | [§2](#2-cloudflare-edge-도달--ssl-단계-실패) |
| `HTTP 522` + `Server: cloudflare` | Cloudflare → origin 연결 안 됨 | [§2](#2-cloudflare-edge-도달--ssl-단계-실패) |
| `HTTP 404` + `x-railway-edge` + `x-railway-fallback: true` | Worker 미트리거, Railway 직접 받아서 거부 | [§3](#3-worker-route-매칭-실패) |
| `HTTP 404` + `x-railway-edge` + `x-middleware-rewrite: /not-found` | Worker 트리거 됐지만 middleware 가 trust 못 함 | [§5](#5-worker--middleware-사이-secret--header-실패) |
| `HTTP 200` + `x-middleware-rewrite: /tenant/<wrong-slug>/` | hostname trust 됐지만 잘못된 tenant 매칭 | [§7](#7-tenant-resolve-실패) |
| `HTTP 200` + `x-middleware-rewrite: /tenant/<correct>/` | **정상 작동** | — |

이 표 + 다음 진단 패턴 (디버그 헤더 추가) 으로 모든 케이스 좁혀짐.

---

## 1. DNS / TLS Handshake 단계 실패

### 증상
- `curl -I https://<tenant>` 가 응답 자체 안 옴 (timeout 또는 connect refused)
- 브라우저에서 "이 사이트에 연결할 수 없음"

### 진단

```bash
# DNS 해석되는지
nslookup <tenant-domain> 8.8.8.8

# 결과 패턴:
# (가) customers.truelight.app + Cloudflare IP (104.21.x.x, 172.67.x.x) → DNS 정상
# (나) 다른 hostname / IP → 테넌트 DNS 잘못 가리킴
# (다) Non-existent / SERVFAIL → 테넌트가 DNS 레코드 안 추가
```

### 원인 + 해결

**(가) DNS 정상인데 연결 실패**:
- Cloudflare 측 일시 장애 (드물지만)
- 테넌트의 ISP 또는 방화벽 차단
- 해결: Cloudflare status 페이지 확인 (https://www.cloudflarestatus.com/), 다른 네트워크에서 재시도

**(나) 다른 hostname 가리킴**:
- 테넌트가 옛 DNS 안내 (예: 이전 Railway custom domain) 가리키고 있음
- 또는 Vercel cutover 시도 시기의 `cname.vercel-dns.com` 가리킴
- 해결: 테넌트에게 새 안내 (`www CNAME customers.truelight.app`) 다시 전달

**(다) DNS 레코드 없음**:
- 테넌트가 아직 DNS 추가 안 함
- 해결: 어드민에서 도메인 추가 후 안내된 DNS 정보 전달 + 추가 확인

---

## 2. Cloudflare Edge 도달 + SSL 단계 실패

### 증상
- `HTTP 525 / 526 / 522`
- 브라우저에서 "Cloudflare ... origin server" 에러

### 진단

```bash
curl -vI https://<tenant>/ 2>&1 | grep -E "HTTP|Server|cf-ray"
```

### 원인 + 해결

**HTTP 525 (SSL handshake failed)**:
- Cloudflare for SaaS Custom Hostname 의 SSL 인증서 발급 미완료
- 해결: 어드민에서 "Verify" 버튼 클릭 또는 Cloudflare 대시보드에서 Custom Hostname status 확인. pending 상태면 TXT 검증 안 됐을 가능성 → 테넌트가 `_cf-custom-hostname.<domain>` TXT 레코드 추가했는지 확인.

**HTTP 526 (Invalid SSL certificate)**:
- Origin (Railway) 의 SSL 인증서가 hostname 과 매칭 안 됨
- 우리 경우: customers.truelight.app 에 Railway SSL 발급 안 됨
- 해결: Railway web → Settings → Networking → custom domain 의 SSL 상태 확인. Issuing 또는 Failed 면 Railway 측 재발급 (10분 대기 또는 Railway 지원 문의)

**HTTP 522 (Connection timed out)**:
- Cloudflare 가 origin 으로 연결 안 됨
- 우리 경우: customers.truelight.app 의 DNS 가 잘못된 곳 가리키거나, Railway 서비스 다운
- 해결: 
  1. `curl https://customers.truelight.app/` 가 응답하는지 (Worker bypass 후 도달)
  2. Railway web 의 status (대시보드 우측 상단) 확인
  3. Cloudflare 의 customers.truelight.app DNS 레코드가 Railway 의 default URL 가리키는지

---

## 3. Worker Route 매칭 실패

### 증상
- `HTTP 404 Not Found`
- 응답 헤더에 `x-railway-edge: railway/...` 와 `x-railway-fallback: true` 있음
- 응답 본문에 "train not arrived at the station" 비슷한 Railway 의 default 404 페이지

### 의미
- Cloudflare for SaaS 가 fallback origin (saas-proxy.truelight.app) 으로 라우팅했는데, Worker route 가 그 트래픽을 못 잡음
- 결과: saas-proxy.truelight.app 의 DNS 레코드대로 직접 라우팅 → 트래픽이 Railway 까지 도달 → Railway 가 `www.korusorchid.com` 호스트 인식 못 함 → 404

### 진단

```bash
# Cloudflare 대시보드 → Workers & Pages → truelight-saas-proxy → Settings → Triggers (또는 Routes)
# 등록된 route 패턴 확인:
#   ✅ "*/*" (truelight.app) — 정상
#   ❌ "saas-proxy.truelight.app/*" — 잘못 (zone-restricted)
#   ❌ "truelight.app/*" — 잘못 (zone-restricted)
```

또는 CLI:
```bash
# wrangler 로 확인
cd workers/saas-proxy
npx wrangler deployments list
# 가장 최근 deployment 의 route 패턴
```

### 우리 실제 실패 사례 (2026-05-21)

**Symptom**: korusorchid.com 404. `x-railway-fallback: true`.

**Root cause**: `wrangler.toml` 에 routes 가 `saas-proxy.truelight.app/*` 로 등록되어 있어 Custom Hostname 트래픽 매칭 안 됨.

**Fix**:
```toml
# Before
routes = [
  { pattern = "saas-proxy.truelight.app/*", zone_name = "truelight.app" },
]

# After
routes = [
  { pattern = "*/*", zone_name = "truelight.app" },
]
```

+ `worker.js` 에 self-hostname bypass 로직 추가 (없으면 customers.truelight.app 으로 가는 outbound 무한 루프):
```js
if (incoming.hostname === 'truelight.app' || incoming.hostname.endsWith('.truelight.app')) {
  return fetch(request);
}
```

Commit: `fe91124 fix(workers/saas-proxy): zone-level wildcard route + self-hostname bypass`

---

## 4. Worker Bypass 로직 누락 (자체 hostname 충돌)

### 증상
- 마케팅 사이트 (`www.truelight.app`) 가 갑자기 깨짐
- 또는 customers.truelight.app 응답 시간 무한 (timeout)
- 또는 truelight.app 자체 요청이 잘못 라우팅

### 원인
- Worker route 가 `*/*` 인데 self-hostname (`*.truelight.app`) bypass 없음
- 모든 트래픽이 Worker 거치고 → Worker 가 customers.truelight.app 으로 fetch 재발행 → 그 fetch 도 Worker 거침 → 무한 루프

### 진단

```bash
# 자체 호스트 응답 시간 확인
time curl -sI https://www.truelight.app/  # 정상이면 1초 이내
time curl -sI https://customers.truelight.app/  # 정상이면 1초 이내
# 둘 다 timeout 이면 bypass 로직 누락
```

### Fix
`worker.js` 의 첫 줄 (incoming parsing 직후) 에 bypass:
```js
if (incoming.hostname === 'truelight.app' || incoming.hostname.endsWith('.truelight.app')) {
  return fetch(request);
}
```

---

## 5. Worker → Middleware 사이 Secret / Header 실패

### 증상
- `HTTP 404 Not Found`
- 응답 헤더에 `x-railway-edge` + `x-middleware-rewrite: /not-found` + `x-powered-by: Next.js`
- 즉 Next.js 까지 도달했는데 middleware 가 "어느 테넌트인지 모름" 으로 처리

### 가장 흔한 원인 4가지

1. **Worker 가 X-Tenant-Verify 헤더 자체를 set 안 함** — `env.SAAS_PROXY_SECRET` 가 undefined (Cloudflare Worker 의 secret 미등록)
2. **Worker 가 set 했는데 Railway 에 도달 안 함** — Cloudflare 두 번째 통과에서 strip (X-Forwarded-Host 같은 reserved 이름인 경우)
3. **Railway 의 `SAAS_PROXY_SECRET` env 누락** — middleware 가 비교 불가
4. **두 값이 다름** — Worker 쪽 vs Railway 쪽 secret 다른 hex

### 진단 방법 — 임시 디버그 헤더 추가

**Phase A** — middleware 에 디버그 헤더 추가:

```ts
// apps/web/middleware.ts 에 임시 추가
const directHost = request.headers.get('host') || '';
const forwardedHost = request.headers.get('x-tenant-host');
const incomingSecret = request.headers.get('x-tenant-verify');
const expectedSecret = process.env.SAAS_PROXY_SECRET;
const secretMatch = !!(expectedSecret && incomingSecret === expectedSecret);

const attachDebug = (response: NextResponse) => {
  response.headers.set('x-debug-direct-host', directHost);
  response.headers.set('x-debug-forwarded-host', forwardedHost || 'none');
  response.headers.set('x-debug-has-secret-env', expectedSecret ? 'yes' : 'no');
  response.headers.set('x-debug-incoming-secret-present', incomingSecret ? 'yes' : 'no');
  response.headers.set('x-debug-secret-match', secretMatch ? 'yes' : 'no');
  return response;
};
// 모든 return 을 attachDebug() 로 wrap
```

Push → Railway deploy → curl 검증:

```bash
curl -sI https://<tenant>/ | grep "^x-debug"
```

응답으로 어느 단계에서 fail 했는지 즉시 확인:

| 디버그 헤더 결과 | 의미 |
|---|---|
| `incoming-secret-present: no` | Worker 가 X-Tenant-Verify 안 보냄 → **Worker secret 누락** (Phase B 로 이동) |
| `incoming-secret-present: yes` + `has-secret-env: no` | Railway 측 env 누락 → **Railway env 등록** |
| `incoming-secret-present: yes` + `has-secret-env: yes` + `secret-match: no` | **값 불일치** — 양쪽 secret 다른 값 |
| `forwarded-host: customers.truelight.app` | Worker 가 보낸 hostname 이 customers 로 바뀜 → **Cloudflare 가 X-Forwarded-Host 덮어씀** (custom 이름으로 변경 필요) |

**Phase B** — Worker 에도 디버그 dump 추가 (위에서 `incoming-secret-present: no` 인 경우):

```js
// worker.js 에 임시 추가
debugHeaders.set('x-debug-worker-env-secret-present', env.SAAS_PROXY_SECRET ? 'yes' : 'no');
debugHeaders.set('x-debug-worker-env-secret-len', String(env.SAAS_PROXY_SECRET?.length || 0));

const outboundXHeaders = {};
for (const [k, v] of upstreamRequest.headers) {
  if (k.toLowerCase().startsWith('x-tenant')) {
    outboundXHeaders[k] = v.length > 12 ? v.slice(0, 6) + '...' + v.slice(-3) : v;
  }
}
debugHeaders.set('x-debug-worker-outbound-x-tenant', JSON.stringify(outboundXHeaders));
```

```bash
curl -sI https://<tenant>/ | grep "^x-debug-worker"
```

| 결과 | 의미 |
|---|---|
| `env-secret-present: no` + `env-secret-len: 0` | Worker secret 등록 안 됨 → Cloudflare 대시보드에서 등록 |
| `env-secret-present: yes` + outbound 에 x-tenant-verify 있음 | Worker 는 set 했음 → Cloudflare 두 번째 통과에서 strip 가능성 → header rename |

### 우리 실제 실패 사례 (2026-05-21)

**Phase 1 실패**: middleware 디버그 결과 `incoming-secret-present: no` + `forwarded-host: customers.truelight.app`. 두 가지 동시.

- forwarded-host 가 customers 인 이유: 헤더 이름이 `X-Forwarded-Host` 라 Cloudflare 가 자체 덮어씀
- secret 이 안 옴: 헤더 이름이 `X-Saas-Proxy-Secret` 라 sanitize 됐다고 가설 → custom 이름 변경

**Phase 2 시도**: 헤더를 `X-Tenant-Host` + `X-Tenant-Proxy-Secret` 으로 rename. Host 는 보존됐지만 Secret 은 여전히 strip.

**Phase 3 시도**: Secret 헤더를 `X-Tenant-Verify` 로 rename (Secret/Auth/Key/Token 단어 회피 가설). 여전히 strip.

**Phase 4 진단**: Worker 에 outbound dump 추가 → `env-secret-present: no`, `env-secret-len: 0`. 즉 **Cloudflare Worker 의 SAAS_PROXY_SECRET 자체가 미등록**이었음. 헤더 rename 시도들은 다 효과 있었지만 진짜 문제는 secret 등록 자체.

**Fix**: Cloudflare 대시보드 → Workers & Pages → truelight-saas-proxy → Settings → Variables and Secrets → + Add → Type: Secret, Name: SAAS_PROXY_SECRET, Value: <Railway env 와 같은 값>.

**검증**: 다음 curl 즉시 HTTP 200 OK + `secret-match: yes` + `resolved-host: www.korusorchid.com`.

**학습**: 디버그 헤더로 단계별 진단 안 했으면 헤더 rename 만 계속 시도하면서 시간 낭비했을 것. 항상 **첫 진단은 양쪽 (Worker outbound + middleware incoming) 동시에**.

---

## 6. Middleware 가 옛 코드

### 증상
- 디버그 헤더 추가했는데 응답에 안 보임
- 또는 코드 수정했는데 동작 변화 없음

### 원인
- Railway 가 새 deploy 안 받음
- 또는 Next.js 가 middleware 캐시
- 또는 Vercel 측 deploy 가 트래픽 받는데 우리는 Railway 만 변경

### 진단

```bash
# Railway 대시보드 → web → Deployments
# 가장 최근 deploy 의 commit hash 확인
# 우리 commit 과 일치하는지

# 또는 응답 헤더로 어디서 도는지
curl -sI https://<tenant>/ | grep -E "x-railway-edge|x-vercel-id"
# x-railway-edge → Railway, x-vercel-id → Vercel
```

### Fix

**Railway deploy 안 옴**:
- Railway → Settings → Source → "Auto deploys when pushed to GitHub" 확인 (Enable)
- "Wait for CI" 가 켜져 있으면 CI 통과 후 deploy — CI 가 broken 이면 stuck. CI fix 또는 Wait for CI off.
- 또는 Railway 대시보드에서 수동 redeploy

**Vercel 이 트래픽 받음**:
- DNS 가 Vercel 가리키는지 확인 (`nslookup <tenant>`)
- DNS 가 customers.truelight.app 가리키도록 변경

---

## 7. Tenant Resolve 실패

### 증상
- `HTTP 404` + `x-middleware-rewrite: /not-found`
- 디버그 헤더로 확인 시 `resolved-host: www.korusorchid.com` (정상 hostname trust 됨)

### 의미
- middleware 가 hostname 은 정확히 받았지만, API `/resolve-domain` 호출 결과 매칭되는 tenant 없음

### 진단

```bash
# server API 직접 호출
curl "https://api.truelight.app/api/v1/admin/tenants/resolve-domain?domain=www.korusorchid.com" \
  -H "x-internal: 1"
# 정상: { "slug": "korus" }
# 비정상: 404 또는 { "slug": null }
```

또는 DB 직접 확인:

```sql
SELECT slug, custom_domain FROM public.tenants WHERE custom_domain = 'www.korusorchid.com';
```

### 원인 + 해결

**(가) 도메인이 DB 에 없음**:
- 어드민에서 도메인 추가 안 함
- 또는 추가는 했는데 verify 안 함 → `public.tenants.custom_domain` 미설정 (tenant-schema 의 `custom_domains` 만 있고)
- 해결: 어드민에서 verify 버튼 클릭 또는 다시 추가

**(나) 도메인이 다른 테넌트에 매핑됨**:
- 데이터 mistake — 같은 도메인이 두 테넌트에 등록 시도
- 해결: 잘못된 매핑 삭제

**(다) resolve-domain API 자체 에러**:
- Server log 확인 (Railway api-server 의 logs)

---

## 8. Cloudflare for SaaS Custom Hostname Stuck

### 증상
- 어드민에서 도메인 추가 후 verify 가 계속 pending
- Cloudflare 대시보드 → SSL/TLS → Custom Hostnames 에서 status 가 "Pending Validation"

### 원인 + 해결

**(가) TXT 레코드 누락 또는 잘못**:
- 테넌트가 `_cf-custom-hostname.<domain>` TXT 레코드 추가 안 함
- 또는 token 잘못 복사
- 해결: 어드민에서 instructions 다시 확인 + 테넌트에게 정확한 TXT 값 전달

**(나) DNS propagation 미완료**:
- 테넌트가 추가했는데 아직 글로벌 DNS 에 propagation 안 됨
- 해결: 30분~1시간 대기 후 재시도

**(다) 외부 DNS 의 TTL 너무 길음**:
- 옛 레코드의 TTL 이 길어서 새 값 인식 못 함
- 해결: DNS TTL 짧게 (300초) 설정 후 추가

**(라) Cloudflare 측 검증 큐 지연**:
- 드물지만 발생. 어드민에서 "Verify" 버튼 (Cloudflare API verify endpoint 호출) 으로 즉시 트리거

---

## 9. wrangler deploy 실패

### 증상
- GitHub Actions 워크플로 fail
- `gh run view <id> --log-failed` 로 로그 확인

### 흔한 원인

**(가) `Authentication error [code: 10000]`**:
- API token 권한 부족
- 우리 경험: `Workers Routes:Edit` 권한 누락
- 해결: Cloudflare API Token 페이지 → 토큰 Edit → 권한 추가 → Update Token (토큰 값 유지)

**(나) `In a non-interactive environment, ... CLOUDFLARE_API_TOKEN`**:
- GitHub Secret 에 `CLOUDFLARE_API_TOKEN` 등록 안 됨
- 또는 workflow 가 그 이름으로 참조 안 함
- 해결: GitHub repo Settings → Secrets → CLOUDFLARE_API_TOKEN 등록 + workflow 의 `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}` 확인

**(다) `User Details:Read permission`**:
- wrangler 가 `/memberships` 조회 시도하는데 권한 없음
- 해결: 두 가지 선택
  - 토큰에 `User → User Details:Read` 권한 추가
  - 또는 `wrangler.toml` 에 `account_id = "..."` 명시 (더 안전)

**(라) `Build failed with 1 error: Unexpected "*"`** (우리 경험):
- worker.js 코멘트 안의 `*/*` 같은 문자열이 multiline 코멘트 종료자와 충돌
- 해결: 그 줄을 풀어쓰기 (예: `*/*` → `zone-level wildcard`)

**(마) Wipe pattern**:
- wrangler-action 의 일부 버전에서 deploy 시 secret 을 wipe 한다는 reports 있음 — 우리 환경에서는 검증 결과 wipe 안 함 (cloudflare/wrangler-action@v3)
- 발생 시 대응: workflow 에 `secrets:` 입력 추가
  ```yaml
  - uses: cloudflare/wrangler-action@v3
    with:
      apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      workingDirectory: workers/saas-proxy
      secrets: |
        SAAS_PROXY_SECRET
    env:
      SAAS_PROXY_SECRET: ${{ secrets.SAAS_PROXY_SECRET_VALUE }}
  ```
  GitHub Secrets 에 `SAAS_PROXY_SECRET_VALUE` 도 등록 필요

---

## 10. 일반 디버그 워크플로 (체크리스트)

장애 발생 시 순서:

1. **응답 헤더 첫 진단**:
   ```bash
   curl -sI https://<tenant>/ | head -25
   ```
   위 [§0 표](#0-진단-방법론--어디서-막혔는지-단계별로-좁히기) 와 매칭

2. **vendor 헤더로 origin 식별**:
   - `x-railway-edge` → Railway 까지 도달
   - `x-vercel-id` → Vercel (잘못 — Vercel 사용 안 함)
   - 없음 → Cloudflare 만 거치고 origin 도달 못 함

3. **middleware 디버그 헤더 추가** (필요 시):
   - [§5 Phase A](#진단-방법--임시-디버그-헤더-추가) 참조

4. **Worker debug dump 추가** (위에서 secret-present: no 인 경우):
   - [§5 Phase B](#진단-방법--임시-디버그-헤더-추가) 참조

5. **정확한 원인 식별 후 fix**

6. **디버그 코드 제거 + production 검증**:
   - 응답에서 `x-debug-*` 헤더 사라졌는지 확인

---

## 11. 자주 묻는 질문

### Q1. 사이트가 200 OK 인데 다른 테넌트 페이지가 나옴
A. middleware 의 hostname trust 가 잘못된 데이터로 됐을 가능성. 또는 `public.tenants.custom_domain` 의 매핑 잘못. DB 확인.

### Q2. 새 테넌트 추가했는데 SSL 발급이 10분 넘게 stuck
A. [§8](#8-cloudflare-for-saas-custom-hostname-stuck) 의 (가)(나)(다)(라) 순서로 진단.

### Q3. 자체 마케팅 사이트 (`www.truelight.app`) 가 안 됨
A. Worker bypass 로직 깨졌을 가능성. [§4](#4-worker-bypass-로직-누락-자체-hostname-충돌) 참조.

### Q4. Railway 가 새 코드 안 받음
A. [§6](#6-middleware-가-옛-코드) 의 Railway deploy 트러블슈팅 + Auto Deploys 설정 확인.

### Q5. 디버그 헤더 추가했는데 응답에 안 보임
A. Railway/Cloudflare deploy 가 진행 중. `gh run watch` 또는 Railway Deployments 탭에서 진행 확인 후 다시 curl.

### Q6. Secret 값 어디 보관?
A. 운영자 password manager (1Password / Bitwarden 등) 에 보관. Worker 와 Railway 양쪽 등록 시 같은 값. Git / 채팅 / 로그에 절대 노출 금지.

### Q7. wrangler deploy 가 secret wipe 시켰을 때 대응?
A. 즉시 Worker secret 다시 등록 (Cloudflare 대시보드 + Add → Secret). 그 후 [§9 (마)](#마-wipe-pattern) 의 workflow 수정으로 미래 wipe 방지.

### Q8. `www.<domain>` 은 되는데 apex (`<domain>`) 는 안 됨
A. **의도된 동작**. DNS 표준상 apex 도메인에는 CNAME 레코드를 둘 수 없어 우리 시스템은 **www 서브도메인만 직접 라우팅**. apex 접속도 동작시키려면 테넌트가 자기 도메인 등록업체에서 Domain Forwarding 설정 필요:

```
korusorchid.com  →  https://www.korusorchid.com  (HTTP 301/302 redirect)
```

대부분의 등록업체 (Squarespace / GoDaddy / Cloudflare Registrar / Namecheap 등) 가 Domain Forwarding (또는 URL Redirect) 을 무료로 제공.

**확인 방법**:
```bash
# apex 접속이 https://www 로 redirect 되는지 확인
curl -sI http://korusorchid.com/
# 응답: HTTP/1.1 301 Moved Permanently
#       Location: https://www.korusorchid.com/

# redirect 안 되면 → 테넌트가 Forwarding 설정 안 함
# 응답: connection refused / timeout / 다른 사이트 표시
```

**왜 이렇게 설계됐는가**: 자세한 결정 배경은 [05-decisions.md](05-decisions.md) 의 D-010 (www-only 정책) 참조. 짧게: Cloudflare for SaaS 의 Apex Proxying 은 Enterprise 전용 ($1000+/월) 이고, 우리는 Free + 표준 애드온이라 서브도메인만 지원. 단독 운영자 환경에서 합리적 trade-off.

**자동 안내**: 어드민 SPA 가 도메인 추가 시 server 의 `additionalSteps` 응답을 그대로 표시하므로 운영자가 매번 같은 안내 안 해도 됨. server 코드: [apps/server/src/modules/domains/service.ts](../../apps/server/src/modules/domains/service.ts) 의 `buildAdditionalSteps()`.
