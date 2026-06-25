# Multi-Tenant Custom Domain Infrastructure — True Light

> 테넌트가 자기 도메인(예: `www.gracechurchnj.org`)으로 접속하면 시스템이 그
> 트래픽을 올바른 테넌트 페이지로 라우팅하는 인프라. **b2bsmart 의 검증된
> 아키텍처를 truelight.app 으로 포팅** — 동작 원리/진단/운영/결정 문서는 그
> 레퍼런스를 이 폴더에 self-contained 로 옮겨온 것이고, `SETUP.md` 만
> truelight 환경 전용으로 새로 작성됨.

---

## 한 문장

```
[테넌트 도메인] www.gracechurchnj.org
      ↓ DNS: www CNAME customers.truelight.app
[Cloudflare for SaaS]  — Custom Hostname 매칭 + 테넌트 SSL 발급/제공
      ↓ Fallback Origin = saas-proxy.truelight.app
[Cloudflare Worker: truelight-saas-proxy]  — */* zone route, SNI 우회
      ↓ X-Tenant-Host + X-Tenant-Verify 부착 → fetch(customers.truelight.app)
[Railway web]  — *.truelight.app wildcard custom domain
      ↓ Next.js middleware: X-Tenant-Verify 검증 → X-Tenant-Host trust
      ↓ /resolve-domain → slug → rewrite /tenant/{slug}/
[HTTP 200 OK]
```

운영자는 어드민에서 **도메인 추가**만 하면 SSL 발급/라우팅은 전부 자동.

---

## 문서 인덱스

| 문서 | 내용 |
|---|---|
| **[SETUP.md](./SETUP.md)** | truelight.app 인프라 1회 셋업 (Cloudflare zone / DNS / Worker / Railway / 환경변수). **현재 알려진 블로커 노트 포함.** |
| [01-architecture.md](./01-architecture.md) | 컴포넌트 전체 그림 + 데이터 흐름 + SSL 흐름 + 보안 모델 |
| [03-troubleshooting.md](./03-troubleshooting.md) | 실패 사례별 진단 + 정확한 fix (404 / SSL / Worker / secret) |
| [04-operations.md](./04-operations.md) | 일상 운영 (새 테넌트 추가, secret 갱신, 인증서 모니터링) |
| [05-decisions.md](./05-decisions.md) | 왜 Cloudflare for SaaS + Worker 인가 (Vercel 등 폐기 배경) |
| [MIGRATION-STATUS.md](./MIGRATION-STATUS.md) | 마이그레이션 시스템 상태 (Worker `/__migration_proxy` 포함) |

> 01/03/04/05 는 b2bsmart 레퍼런스에서 브랜드만 truelight 로 치환한 포팅본
> (예시 테넌트 `korus` 는 설명용 그대로). truelight 고유 절차는 `SETUP.md`.

---

## 핵심 코드 파일 (모두 dw-church-app/ 하위)

| 파일 | 역할 |
|---|---|
| `workers/saas-proxy/worker.js` | Cloudflare Worker — SNI 우회 + hostname 보존 (+ 마이그레이션 egress 프록시) |
| `workers/saas-proxy/wrangler.toml` | Worker 배포 설정 — zone-level `*/*` route 핵심 |
| `apps/web/middleware.ts` | Next.js middleware — `resolveIncomingHostname()` |
| `apps/server/src/config/cloudflare.ts` | Cloudflare Custom Hostnames API 클라이언트 |
| `apps/server/src/modules/domains/` | 도메인 등록/검증/삭제 서비스 + `/api/v1/domains` 라우트 |
| `apps/server/src/index.ts` | `/api/v1/admin/tenants/resolve-domain` (middleware 가 호출) |
| `.github/workflows/deploy-saas-proxy.yml` | Worker 자동 배포 (push → wrangler deploy) — **repo 루트** |

---

## 실패 진단 첫 한 줄

```bash
# 환경변수 + Cloudflare API 토큰이 실제로 살아있는지 (가장 먼저)
curl -s https://api.truelight.app/api/v1/domains/diagnostics \
  -H "Authorization: Bearer <token>" -H "X-Tenant-Slug: dasom" | jq

# 테넌트 도메인이 어느 단계에서 막혔는지
curl -sI https://<tenant-domain>/ | head -20
```

---

## 핵심 invariant (어떤 변경에서도 유지)

1. **Worker route 는 zone-level `*/*`** — hostname-restricted 패턴 금지
2. **Worker self-hostname bypass 보존** — 없으면 customers.truelight.app 무한 루프
3. **secret 은 Worker = Railway api-server = Railway web 정확히 같은 값**
4. **X-Forwarded-Host 가 아닌 X-Tenant-Host** — Cloudflare 가 전자를 덮어씀
5. **테넌트 DNS 는 `customers.truelight.app` (우리 도메인 산하) 만 가리킴** — vendor 호스트 노출 금지
