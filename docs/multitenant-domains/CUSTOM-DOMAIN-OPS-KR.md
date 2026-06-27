# 커스텀 도메인 연결 — 운영·트러블슈팅 (truelight 실전)

> 테넌트가 자기 도메인(예: `www.atlantawakechurch.org`)을 자기 사이트에 연결하는
> 기능의 **실전 운영 가이드 + 이번까지 고친 이슈 모음**.
> 인프라 동작 원리는 [01-architecture.md](./01-architecture.md), 1회 셋업은
> [SETUP.md](./SETUP.md) 참고.
>
> 마지막 검증: 2026-06-26 — `www.atlantawakechurch.org` (wakechurch) 추가 →
> Cloudflare custom hostname 생성 + DNS 안내 정상 반환, `/domains/diagnostics`
> `ping.ok:true`.

---

## 0. 원리 — 쉽게 이해하기 (비유)

**한 줄:** 교회가 산 자기 주소(`www.교회.org`)로 손님이 와도, 그 손님을 우리 빌딩 안의 그 교회 방으로 안내해 주는 구조다.

### 비유: 여러 교회가 입주한 빌딩
- **우리 시스템(truelight)** = 여러 교회가 입주한 **빌딩 한 채**.
- **각 교회** = 빌딩 안의 **방 하나**(테넌트). 기본 호수는 `wakechurch.truelight.app`.
- **교회의 커스텀 도메인**(`www.atlantawakechurch.org`) = 교회가 따로 단 **자기 간판/정문 주소**.

손님이 교회 간판(`www.atlantawakechurch.org`) 보고 찾아왔을 때, 그 손님이 빌딩 안 올바른 방으로 안내되게 하는 게 전부다. 이를 위해 4가지가 맞물린다:

1. **DNS의 CNAME = "이정표"**
   교회 도메인 관리자(Cloudflare 등)에 `www → customers.truelight.app` 이정표를 단다.
   → "이 주소로 오는 손님은 truelight 빌딩 안내데스크로 보내라"는 뜻.

2. **Cloudflare for SaaS = "자물쇠(https) 자동 발급"**
   교회 간판마다 정품 보안 자물쇠(SSL/https)를 빌딩이 **자동으로 달아준다.** 교회가 인증서를 따로 사거나 갱신할 필요 없음.

3. **Worker = "이름표 붙이기"**
   손님을 안내데스크로 데려갈 때, **어느 간판 보고 왔는지 이름표(`X-Tenant-Host: www.atlantawakechurch.org`)를 붙인다.**
   → 중간에 주소가 빌딩 공용 주소로 바뀌어도 원래 교회 이름을 잃지 않게 하는 핵심 장치. (기술적으로는 SSL 연결 이름(SNI) 불일치 문제를 우회.)

4. **미들웨어 = "안내데스크"**
   이름표를 보고 **"아, atlantawakechurch네 → wakechurch 방으로 안내"** 한다(`/tenant/wakechurch`).

### 루트 주소(www 없는 `atlantawakechurch.org`)는?
DNS 규칙상 **루트 주소에는 CNAME 이정표를 직접 못 단다.** 그래서:
- **Cloudflare·Route53 등**이면: 루트에도 CNAME을 달 수 있게 해주는 기능(flattening)이 있어 **한 줄로 해결** → 우리 안내데스크가 자동으로 www로 안내(308).
- **그 외 등록업체**면: "이 주소로 오면 www로 보내라"는 **자동 전달(Forwarding)** 설정.

### 커스텀 도메인을 켜면, 기본 호수 주소는?
교회가 자기 간판(`www.atlantawakechurch.org`)을 달면, 빌딩 기본 호수(`wakechurch.truelight.app`)로 와도 **자동으로 교회 간판 주소로 안내(308)** 한다. 즉 정식 주소가 커스텀 도메인으로 바뀐다.

> **운영자가 할 일:** 어드민에서 "도메인 추가"만 누르면 위 1·2번(이정표 받을 준비 + 자물쇠)은 자동. 교회(또는 대신 운영자)는 받은 DNS 값을 자기 도메인에 1회 붙여넣기만 하면 끝. 3·4번은 영구 자동.

---

## 1. 한눈에 보는 연결 흐름

```
[테넌트 어드민] 도메인 설정 → "www.교회도메인.org" 입력 → 도메인 추가
      │  POST /api/v1/domains  (X-Tenant-Slug 필수)
      ▼
[api-server] addDomain()
      ├─ 루트(apex) 도메인이면 거부 → "www. 형식으로" 안내
      ├─ 다른 테넌트가 이미 활성으로 쓰면 409 거부
      ├─ Cloudflare createCustomHostname() — 소유권 TXT + SSL 자동 발급 준비
      │     └─ 이미 등록돼 있으면(1406) 기존 hostname 재사용
      └─ tenant_{slug}.custom_domains 에 row 기록 + DNS 안내 반환
      ▼
[화면] TXT(소유권) + www CNAME(필수) + apex CNAME(선택) 레코드(복사 버튼) + 단계별 안내 표시
      ▼
[테넌트] 도메인 등록업체 DNS에 추가 → 1~10분 → "연결 확인"
      ▼
[api-server] verifyDomain() → Cloudflare 검증 통과 시
      └─ public.tenants.custom_domain 기록 → web 미들웨어가 그 도메인을 테넌트로 라우팅
      ▼
https://www.교회도메인.org  정상 접속 (SSL 자동)
      │
      └─ 이 시점부터 기존 <slug>.truelight.app 은 커스텀 도메인으로 308 자동 전환 (§3-1)
```

---

## 3-1. 커스텀 도메인 활성 후 — 서브도메인 자동 전환 (canonical 전환)

커스텀 도메인이 **활성**되면 `<slug>.truelight.app` 은 더 이상 정식 주소가 아니다. 미들웨어가 **서브도메인 → 커스텀 도메인으로 308 영구 리다이렉트**(경로·쿼리 보존)한다.

```
https://wakechurch.truelight.app/<path>
      │  middleware → GET /admin/tenants/custom-domain?slug=wakechurch → { domain }
      ▼  domain 있으면 308
https://www.atlantawakechurch.org/<path>
      │  custom-domain 분기로 들어옴 → /tenant/wakechurch 로 rewrite (루프 없음)
      ▼
wakechurch 사이트
```

- 엔드포인트: `GET /api/v1/admin/tenants/custom-domain?slug=` → `{ domain: 활성 custom_domain | null }`.
- 커스텀 도메인 없는 테넌트는 서브도메인 그대로 정상 서빙.
- 루프 방지: 커스텀 도메인은 **custom-domain 분기**로 들어와 rewrite되고, 서브도메인 분기에서만 308을 쏜다.
- 검증(2026-06-26): `curl -I https://wakechurch.truelight.app/` → `308 → https://www.atlantawakechurch.org/`.

---

## 2. 테넌트가 DNS에 추가하는 것 (운영자가 안내)

도메인 추가 후 화면에 **그대로 복사**할 값이 뜬다. 예시(atlantawakechurch.org):

| Type | Name / Host | Value / Target | 비고 |
|---|---|---|---|
| **TXT** | `_cf-custom-hostname.www.atlantawakechurch.org` | (Cloudflare가 준 토큰) | 필수 — 소유권 |
| **CNAME** | `www` (= www.atlantawakechurch.org) | `customers.truelight.app` | 필수 — 라우팅 |
| **CNAME** | `@` (= atlantawakechurch.org, 루트) | `customers.truelight.app` | **선택 — 루트 연결** |

- 일부 등록업체는 Name 칸에 도메인 뒷부분을 자동으로 붙인다 → 그럴 땐 `www`/`@`처럼 **앞부분만** 입력.

### 루트(apex) 연결 — 표준 = CNAME flattening + 중앙 308
- 도메인 추가 시 **www뿐 아니라 apex도 Cloudflare custom hostname으로 자동 등록**된다(`addDomain`). 그래서 테넌트는 **apex에 CNAME `@ → customers.truelight.app` (Proxied) 한 줄**만 추가하면 된다.
- apex가 우리 엣지로 들어오면 **미들웨어가 자동으로 www로 308 리다이렉트**(모든 테넌트 공통, 중앙화). 별도 Redirect Rule·placeholder A 불필요.
- DNS 표준상 루트엔 CNAME을 직접 못 두지만, **Cloudflare·Route53(ALIAS/ANAME) 등 flattening 지원 DNS**면 위 한 줄로 처리된다.
- **flattening 미지원 등록업체**면 대안: Domain Forwarding(URL Redirect)으로 `atlantawakechurch.org → https://www.atlantawakechurch.org`.

직접 설정이 어려운 교회는 **도메인 구입처 로그인 정보를 받아 운영자가 대신 설정** (done-for-you).

---

## 3. 연결 상태 확인 (Shopify식 체크리스트)

각 도메인 행에서 **연결 확인** 을 누르면 단계별로 ✓ 가 켜진다:

1. **도메인 소유권 확인 (TXT)** — Cloudflare가 TXT를 인식
2. **트래픽 라우팅 (CNAME → customers.truelight.app)** — CNAME 전파 확인
3. **SSL 인증서 · HTTPS 연결** — Cloudflare가 인증서 발급 완료

셋 다 초록 ✓ 면 `https://<도메인>` 으로 접속된다.

---

## 4. 슈퍼어드민 진단 패널

도메인 설정 상단(슈퍼어드민에게만 표시) — Cloudflare 연동이 실제로 살아있는지 한눈에:

- ✓/✗ `CF_API_TOKEN`, ✓/✗ `CF_ZONE_ID`, Fallback Origin
- **실시간 Cloudflare API 응답** — 성공 시 `zone: truelight.app`, 실패 시 에러(예: 9109)
- **다시 확인** 버튼

CLI로도 가능:
```bash
# (슈퍼어드민 토큰 — 자격증명은 MIGRATION-STATUS.md 참고)
curl -s https://api.truelight.app/api/v1/domains/diagnostics \
  -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: dasom"
# 정상: {"data":{"ok":true,"ping":{"ok":true,"zoneName":"truelight.app"}, ...}}
```

---

## 5. 트러블슈팅 — 증상 → 원인 → 해결 (이번 세션에 모두 수정됨)

| 증상 | 원인 | 해결 |
|---|---|---|
| 추가 시 **"Tenant 'api-server' not found or inactive"** | DomainSettings가 raw fetch로 **X-Tenant-Slug 미전송** → admin 프록시가 `api-server.railway.internal`로 보내 서버가 'api-server'를 슬러그로 오인 | DomainSettings에 X-Tenant-Slug 추가 + tenant 미들웨어가 `*.railway.internal` 호스트를 무시 |
| 진단 **`9109: Invalid access token`** | Railway api-server의 `CF_API_TOKEN` 만료/권한오류 (값은 존재) | 토큰 재발급(Zone:SSL and Certificates:Edit + Custom Hostnames:Edit + Zone:Read, truelight.app) 후 교체 → **api-server 재배포**(재시작해야 새 토큰 로드) |
| 추가 시 **502 Bad Gateway** | Cloudflare **1406 "Duplicate custom hostname"** — 이미 zone에 등록된 도메인(이전 시도 orphan)을 raw 502로 던짐 | `getCustomHostnameByName()`로 **기존 hostname 재사용** 후 진행 |
| 추가 시 **"A database error occurred" (42P10)** | 옛 테넌트 스키마의 `custom_domains.domain`에 **UNIQUE 제약 없음** → `ON CONFLICT (domain)` 매칭 실패 | upsert를 **삭제 후 삽입(CTE)** 으로 교체 — 제약 유무와 무관, 멱등 |
| 콘솔 **"Invalid regular expression … Invalid character class"** | Chrome 149가 `pattern`을 `v` 플래그로 컴파일 → `[a-z0-9-]` 거부 | 하이픈을 클래스 밖으로: `^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)+$` |
| 루트 도메인 입력 시 **"직접 연결을 지원하지 않습니다"** | apex(루트)는 DNS 표준상 CNAME 불가 — **정상 동작(의도된 거부)** | `www.` 형식으로 입력 + 루트는 등록업체에서 www로 redirect |
| **커스텀 도메인이 TRUE LIGHT 마케팅 페이지로 뜸** (멀티테넌트 위반!) | ① verify 때 SSL이 아직 pending이라 `public.tenants.custom_domain` 매핑이 안 써짐 → resolve-domain "not found". ② 미들웨어가 매핑 못 찾은 커스텀 도메인을 `NextResponse.next()`(=마케팅)로 fallback | ① SSL 발급 완료 후 **연결 확인** 재실행 → 매핑 기록. ② 미들웨어 수정: 커스텀 도메인은 절대 마케팅으로 안 가고 — 매핑→테넌트 / apex→www 308 / 미지→404 |

### 도메인이 이미 Cloudflare에 등록돼 있을 때 (정리)
- **같은 테넌트 재추가** → 기존 것 재사용(멱등).
- **orphan(CF엔 있고 DB엔 없음)** → 1406 → 기존 hostname 재사용해 정상 등록.
- **다른 테넌트가 활성으로 사용 중** → 409 거부(가로채기 방지).
- **다른 테넌트가 대기(pending)로만 등록** → 현재는 막지 않음(이론적 빈틈). 실제 SSL/라우팅은
  DNS를 우리 쪽으로 돌린 진짜 소유자만 통과 → 한쪽만 연결됨.

---

## 6. 핵심 코드 위치

| 파일 | 역할 |
|---|---|
| `packages/admin-app/src/pages/DomainSettings.tsx` | 도메인 설정 UI — 추가/안내/체크리스트/진단 패널 |
| `apps/server/src/modules/domains/service.ts` | addDomain / verifyDomain / removeDomain |
| `apps/server/src/modules/domains/routes.ts` | `/api/v1/domains*` (diagnostics는 requireSuperAdmin) |
| `apps/server/src/config/cloudflare.ts` | Cloudflare Custom Hostnames API + `getCustomHostnameByName` |
| `apps/server/src/index.ts` | `/api/v1/admin/tenants/resolve-domain` (web 미들웨어가 호출) |
| `apps/web/middleware.ts` | 들어온 커스텀 도메인 → 테넌트 slug → `/tenant/{slug}` rewrite |
| `workers/saas-proxy/worker.js` | SNI 우회 + X-Tenant-Host/Verify 부착 |

---

## 7. 빠른 검증 (배포 후)

```bash
# 1) 토큰/연동 건강
GET /api/v1/domains/diagnostics  → ping.ok:true

# 2) 실제 추가 (멱등 — 재호출해도 안전)
POST /api/v1/domains  { "domain": "www.<교회>.org" }   (X-Tenant-Slug 필수)
  → 201 + instructions(TXT, CNAME) + additionalSteps(apex redirect)

# 3) DNS 추가 후
POST /api/v1/domains/:id/verify  → checks.txtFound / cnameOk, status 진행
```
