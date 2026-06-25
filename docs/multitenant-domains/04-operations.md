# 04 — Operations (운영 작업)

> 시스템이 정상 작동 중일 때의 일상 운영 작업. 새 테넌트 추가, secret 갱신, 인증서 모니터링, 비용 관리 등.

---

## 1. 새 테넌트 도메인 추가 (가장 자주 하는 작업)

### 운영자 측 — 1분 작업

1. 어드민 SPA → **테넌트 선택** → **Settings → Custom Domains** → **Add Domain**
2. 도메인 입력 (예: `www.newtenant.com`)
3. 저장
4. 응답 화면에 표시된 **DNS 안내 정보를 테넌트에게 전달** (메일/Slack 등)

DNS 안내 (server 의 `instructions` + `additionalSteps` 두 파트를 어드민이 한 화면에 표시):

**Part 1 — DNS records (필수, 테넌트의 DNS 패널에 추가)**
```
1. 소유권 검증 (Cloudflare 가 SSL 발급 전 확인용)
   Type:  TXT
   Name:  _cf-custom-hostname.www.newtenant.com
   Value: <고유 토큰 — 매번 다름>

2. www → 우리 시스템으로 라우팅
   Type:  CNAME
   Name:  www
   Value: customers.truelight.app
```

**Part 2 — apex Forwarding 안내 (권장, 테넌트의 등록업체에서 설정)**
```
루트 도메인(newtenant.com)으로 접속하는 경우도 동작시키려면, 자기
도메인 등록업체에서 Domain Forwarding 설정:
  newtenant.com → https://www.newtenant.com

DNS 표준상 apex 에는 CNAME 불가하므로 redirect 패턴이 필요. 대부분의
등록업체(Squarespace / GoDaddy / Cloudflare Registrar) 가 무료 지원.
```

추가 후 1~10분 내 자동 검증 + SSL 인증서 발급 → `https://www.newtenant.com/` 접속 가능. apex Forwarding 까지 설정되면 `https://newtenant.com/` 도 동작 (redirect 경유).

### 테넌트 측 — 5~10분 작업

테넌트의 도메인 등록업체 (Squarespace / GoDaddy / Cloudflare 등) 에:
1. DNS 패널: Part 1 의 두 레코드 추가
2. Domain Forwarding 설정: Part 2 의 apex → www redirect

### 검증 — 운영자가 5~10분 후

방법 1 — 어드민 UI 의 "Verify" 버튼:
- 어드민에서 해당 도메인 → "Verify" → 즉시 Cloudflare 에 verify endpoint 호출 → status 갱신

방법 2 — curl:
```bash
curl -sI https://www.newtenant.com/
# HTTP/1.1 200 OK 나오면 완료
# 그 외 → 03-troubleshooting.md 참조
```

방법 3 — Cloudflare 대시보드:
- SSL/TLS → Custom Hostnames → 해당 hostname status 가 "Active" 인지

---

## 2. 테넌트 도메인 삭제

### 절차

1. 어드민 SPA → 테넌트 → Custom Domains → 해당 도메인 → **Delete**
2. 서버가 자동으로:
   - Cloudflare Custom Hostname 삭제 (DELETE API)
   - DB 의 `public.tenants.custom_domain` clear (해당 도메인이면)
   - tenant schema 의 `custom_domains` 테이블에서 record 삭제

### 테넌트 측

- 테넌트의 DNS 에서 CNAME / TXT 레코드 삭제 권장 (자동 정리 안 됨)
- 단, 삭제 안 해도 우리 시스템이 더 이상 그 도메인 인식 안 함

---

## 3. 도메인 검증 상태 확인 (모니터링)

### 운영자 진단 엔드포인트

```bash
# Super-admin 전용
GET /api/v1/domains/diagnostics

응답:
{
  "cloudflare": {
    "configured": true,
    "ping": "ok"
  },
  "fallback_origin": "saas-proxy.truelight.app",
  ...
}
```

### 모든 테넌트의 도메인 일괄 조회

직접 endpoint 는 없음 (super-admin 전용). 필요 시 DB 직접 쿼리:

```sql
SELECT t.slug, t.custom_domain, t.created_at
FROM public.tenants t
WHERE t.custom_domain IS NOT NULL AND t.custom_domain <> ''
ORDER BY t.created_at;
```

또는 Cloudflare 대시보드 → SSL/TLS → Custom Hostnames 에서 시각적 확인.

### Cloudflare 측 status 패턴

| Status | 의미 | 대응 |
|---|---|---|
| Active | 정상 운영 중 | 없음 |
| Pending Validation | TXT 검증 대기 | 테넌트가 TXT 추가 안 했거나 propagation 미완료 |
| Active Redeploying | 갱신 중 (자동) | 대기 |
| Deactivated | 비활성 (만료 등) | Cloudflare 측 SSL 만료 등 — 재발급 트리거 |
| Blocked | 보안 차단 | Cloudflare 지원 문의 |

---

## 4. Secret 관리

### 4.1 보관 위치

| 어디 | 무엇 | 값 |
|---|---|---|
| Cloudflare Worker Secrets | `SAAS_PROXY_SECRET` | 64자 hex |
| Railway web Variables | `SAAS_PROXY_SECRET` | **위와 정확히 같은 값** |
| 운영자 vault (1Password / Bitwarden) | "True Light — SAAS_PROXY_SECRET" 항목 | 같은 값 + 등록일/갱신일 |

세 위치 모두 같은 값 유지. 운영자 vault 가 **유일한 git 외부 원본** — 채팅/문서/git 에 절대 노출 금지.

### 4.2 Secret 갱신 (Rotation) — 6개월 ~ 1년마다 권장

```powershell
# 1. 새 secret 생성
$newSecret = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
$newSecret | Set-Clipboard
# clipboard 에 복사됨
```

```bash
# bash
NEW_SECRET=$(openssl rand -hex 32)
echo "$NEW_SECRET"
```

### Zero-downtime rotation 절차 (10분)

1. **운영자 vault 에 새 secret 저장** (rotation 일자 기록)
2. **middleware 코드 임시 수정** — 두 secret 모두 허용:
   ```ts
   const validSecrets = [
     process.env.SAAS_PROXY_SECRET,
     process.env.SAAS_PROXY_SECRET_NEW,
   ].filter(Boolean);
   const incomingSecret = request.headers.get('x-tenant-verify');
   if (forwardedHost && incomingSecret && validSecrets.includes(incomingSecret)) {
     return forwardedHost;
   }
   ```
3. **Railway web 에 `SAAS_PROXY_SECRET_NEW` env 추가** (값: 새 secret)
4. **deploy 대기 + 검증**
5. **Cloudflare Worker 에 새 secret 등록** (SAAS_PROXY_SECRET 값 교체)
6. **검증 — 새 트래픽이 새 secret 으로 처리되는지** (curl)
7. **Railway 에서 `SAAS_PROXY_SECRET` (옛 값) 을 새 값으로 교체** (또는 SAAS_PROXY_SECRET 삭제 + SAAS_PROXY_SECRET_NEW → SAAS_PROXY_SECRET 으로 rename)
8. **middleware 코드 원복** — 단일 secret 만 검증

### Quick rotation 절차 (다운타임 1~2분 허용)

1. 새 secret 생성
2. Railway web 의 `SAAS_PROXY_SECRET` 값 교체 → Railway 자동 redeploy (약 1분)
3. 그 동안 사이트 다운 (middleware 가 옛 secret 거부)
4. Cloudflare Worker 의 SAAS_PROXY_SECRET 새 값으로 교체 (즉시)
5. 정상 복구

새 SaaS 초기 또는 보안 사고 후엔 Quick rotation 으로 충분. 운영 안정화 후엔 Zero-downtime 권장.

---

## 5. SSL 인증서 모니터링

### Cloudflare for SaaS 측 (테넌트 SSL)

- Cloudflare 가 자동 갱신 — 운영자 손 안 가도 됨
- 만료 직전 갱신 실패하면 Cloudflare 대시보드 알림
- 모니터링: 주 1회 Cloudflare 대시보드 → Custom Hostnames 의 "Deactivated" 상태 있는지 확인

### Railway 측 (`customers.truelight.app` SSL)

- Railway 가 Let's Encrypt 자동 갱신
- 만료 모니터링: Railway 대시보드 → web → Settings → Networking → custom domain status

### 자동 알림 셋업 (선택적)

외부 monitor (예: Uptime Robot, BetterUptime, 또는 healthchecks.io):
- `https://www.korusorchid.com/` 같은 대표 테넌트 URL 을 5분마다 ping
- 응답 != 200 시 Slack/Email 알림

또는 GitHub Actions 의 cron 워크플로로 daily curl 검증:

```yaml
# .github/workflows/monitor-domains.yml
on:
  schedule:
    - cron: '0 9 * * *'  # 매일 09:00 UTC
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: |
          for d in customers.truelight.app www.korusorchid.com; do
            status=$(curl -sI https://$d/ -o /dev/null -w "%{http_code}")
            echo "$d → $status"
            [ "$status" = "200" ] || exit 1
          done
```

---

## 6. 비용 관리

### 월 정기 비용

| 항목 | 비용 | 비고 |
|---|---|---|
| Cloudflare Workers (Paid) | $5 | 10M req 포함 |
| Cloudflare for SaaS hostnames | $0 (100개까지) | 100 초과 시 hostname × $0.10/월 |
| Railway web | 사용량 기반 | Next.js 컨테이너, CPU/메모리 |
| Railway api-server | 사용량 기반 | Fastify 컨테이너 |
| Railway PostgreSQL | 사용량 기반 | (또는 Supabase) |
| Cloudflare R2 | 사용량 기반 | 파일 저장 |

### 스케일링 시점

| 테넌트 수 | 월 추가 비용 |
|---|---|
| 1~100 | $5 (Workers 만) |
| 100~500 | $5 + (테넌트 수 × $0.10) — 500개면 $55 |
| 500~1000 | $5 + (500 × $0.10) + Cloudflare Pro/Biz 검토 |
| 1000+ | 자체 인프라 (Caddy + VPS) 비용 분석 시점 |

### 비용 모니터링

- Cloudflare 대시보드 → Billing → 월 별 사용량
- Railway → 각 서비스의 Usage 탭 → CPU/Memory/Bandwidth
- Workers requests 추세: Cloudflare 대시보드 → Workers & Pages → truelight-saas-proxy → Analytics

---

## 7. 로그 / 모니터링

### Cloudflare Worker logs

기본 Disabled. 진단 필요 시 활성화:
- Cloudflare 대시보드 → Workers & Pages → truelight-saas-proxy → Settings → Observability → Logs → Enable
- 활성화 후 1시간 정도 로그 수집 후 디버깅 — 평소엔 끄기 (비용/저장)

### Railway logs

- web 의 Deploy Logs → Next.js stdout
- api-server 의 Deploy Logs → Fastify stdout
- 검색: 화면 우측 search 박스에 `error` / `<tenant-slug>` 등

### 자주 보는 로그 패턴

| 로그 패턴 | 의미 |
|---|---|
| `tenant not found` (api-server) | resolve-domain 호출에 매칭 없음 |
| `X-Tenant-Verify mismatch` (만약 명시적 로깅 시) | secret 불일치 |
| `Cloudflare API rate limit` | 단기 burst — 자동 retry |

---

## 8. 도메인 안내 메시지 갱신

어드민 SPA 의 DNS 안내 메시지가 변경되어야 하는 경우 (예: customers.truelight.app → 다른 호스트):

1. server 측 `apps/server/src/modules/domains/service.ts` 의 `buildDnsInstructionsFromCf()` 수정
2. 어드민 SPA 가 그 응답을 그대로 표시한다면 자동 반영
3. 만약 어드민 SPA 에 하드코딩된 메시지 있다면 그것도 수정

---

## 9. 환경변수 갱신 (Worker / Railway)

### Worker 의 FALLBACK_ORIGIN 변경

- Cloudflare 대시보드 → truelight-saas-proxy → Settings → Variables and Secrets → FALLBACK_ORIGIN edit → 새 값
- Worker 재배포 불필요 (Plaintext var hot-reload)

### Railway env 변경

- Railway 대시보드 → 해당 서비스 → Variables → 해당 env → edit → 새 값
- 자동 redeploy (1~3분)

### CF_API_TOKEN 갱신 (server 측)

1. 새 token 발급 (Cloudflare 대시보드)
2. Railway api-server → Variables → CF_API_TOKEN → 새 값
3. 옛 token 폐기

---

## 10. 정기 health check (월 1회 권장)

운영자가 직접 확인할 것:

- [ ] 모든 활성 테넌트 도메인이 HTTP 200 OK 응답 (curl 체크)
- [ ] Cloudflare Custom Hostnames 의 "Deactivated" 상태 없음
- [ ] Railway web 의 *.truelight.app SSL "Active"
- [ ] Cloudflare Worker 의 deploy history 정상 (최근 push 후 success)
- [ ] CI broken 상태 아님 (또는 broken 이라도 deploy 영향 없는지 확인)
- [ ] Cloudflare 월 사용량 (Workers requests, Custom Hostnames) 예상 범위
- [ ] 운영자 vault 의 SAAS_PROXY_SECRET 항목 (rotation 일자 6개월 이상 됐으면 rotation 고려)
- [ ] CF_API_TOKEN, CLOUDFLARE_API_TOKEN 도 1년 이상 안 갈았으면 rotation 고려

---

## 11. 작업 시 주의사항 (운영자 mistakes 방지)

### Never do

- ❌ 채팅/git/문서/로그에 secret 노출
- ❌ Worker route 패턴을 hostname-restricted 로 변경
- ❌ Worker 의 self-hostname bypass 로직 제거
- ❌ X-Forwarded-Host 같은 reserved 헤더 이름으로 회귀
- ❌ Cloudflare 대시보드의 Custom Hostname status 가 Active 인 것을 임의로 Delete (라이브 사이트 다운)
- ❌ customers.truelight.app DNS 의 proxy 상태를 grey cloud 로 변경 (SSL 깨짐)
- ❌ Railway web 의 *.truelight.app custom domain 삭제 (모든 테넌트 다운)

### Always do

- ✅ Secret 갱신 시 Worker + Railway 양쪽 동시 확인
- ✅ 배포 후 curl 로 검증
- ✅ 진단 디버그 헤더는 작업 끝나면 제거 + production 검증
- ✅ 결정 사항은 [05-decisions.md](05-decisions.md) 에 기록
