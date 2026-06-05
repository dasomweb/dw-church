# True Light — Migration System Status (2026-06-05)

> 다른 세션에서 이어 작업할 때 이 문서부터 읽고 시작.

## 한 줄 요약

Agent 아키텍처 + Cloudflare Worker 프록시까지 모두 구현 완료. **유일한 남은 블로커: 한국 교회 사이트(SiteGround 호스팅)의 WAF가 데이터센터 IP를 전부 차단** — Railway + Cloudflare Worker 출고 IP 모두 403. 운영자가 우회 경로 선택 필요.

## 현재 동작 상태

| 컴포넌트 | 상태 | 비고 |
|---|---|---|
| Cloudflare for SaaS (테넌트 서브도메인 SSL) | ✅ LIVE | docs/multitenant-domains/SETUP.md |
| Worker `truelight-saas-proxy` | ✅ LIVE | `/__migration_proxy` 엔드포인트 추가됨 |
| Migration Agent (Gemini function calling) | ✅ 코드 완성 | 20 iteration / 5 tools / commit_result |
| api-server `/api/v1/migration/migrate-url` | ✅ LIVE | 6e1d995c |
| GitHub Actions 자동 배포 | ✅ 정상 | RAILWAY_TOKEN 갱신 완료 |
| 정적 콘텐츠 추출 (페이지·인사말·비전) | ⚠️ 검증 불가 | 사이트 fetch 자체가 안 됨 |

## 핵심 파일

```
dw-church-app/apps/server/src/modules/migration/
├── migration-agent.ts        ← AI agent + tools (Gemini function calling)
├── routes.ts                 ← /migrate-url endpoint, agent 호출
├── classifier.ts             ← thin (SEO + YouTube dedup만)
├── llm-classifier.ts         ← legacy (useLlm=false 경로용)
├── extractors/html-scraper.ts ← legacy crawler
├── appliers/
│   ├── index.ts              ← applyAll, include 선택 처리
│   ├── pages.ts              ← 페이지 자동 생성 + 정적 블록 적용
│   └── posts.ts              ← 칼럼 date 보존 적용
└── types.ts                  ← ClassifiedData, ClassifiedColumn.date

dw-church-app/workers/saas-proxy/
├── worker.js                 ← /__migration_proxy + 테넌트 라우팅
└── wrangler.toml
```

## 마이그레이션 흐름 (현재)

```
1. operator → POST /migrate-url { sourceUrl, tenantSlug, include, useLlm:true }
2. runMigrationAgent(sourceUrl)
3. Gemini receives system prompt + ClassifiedData 스키마
4. Loop:
   - Gemini emits functionCall
   - api-server executes tool:
     · fetch_url       → proxiedFetch() → Worker → 외부 사이트
     · fetch_sitemap   → proxiedFetch() → Worker → 외부 사이트
     · try_wp_rest     → proxiedFetch() → Worker → 외부 사이트
     · try_youtube_channel → 동일
     · commit_result   → mergeAgentResult(data, payload)
5. Loop end → applyAll(slug, data, { include })
6. Apply: settings, pages, worshipTimes, history, menus + 선택된 동적 항목
```

## 진단 증거 (다른 세션에서 의심 시 재현)

```bash
SECRET="a728ae83063c340449bcdf743bc4282037a0c0f3958d3981c38f5361c99a3c0e"

# 차단 안 됨 (Worker 정상 동작 증명)
curl -s "https://api.truelight.app/__migration_proxy?url=https%3A%2F%2Fexample.com" \
  -H "X-Tenant-Verify: $SECRET" -o /dev/null -w "%{http_code} %{size_download}b\n"
# → 200 528b

curl -s "https://api.truelight.app/__migration_proxy?url=https%3A%2F%2Fwordpress.org%2Fnews%2Fwp-json%2Fwp%2Fv2%2Fposts%3Fper_page%3D1" \
  -H "X-Tenant-Verify: $SECRET" -o /dev/null -w "%{http_code} %{size_download}b\n"
# → 200 9139b

# 차단됨 (75193b 정확히 동일 = SiteGround 기본 403 페이지)
curl -s "https://api.truelight.app/__migration_proxy?url=https%3A%2F%2Flagrangechurch.org%2Fwp-json%2Fwp%2Fv2%2Fposts" \
  -H "X-Tenant-Verify: $SECRET" -o /dev/null -w "%{http_code} %{size_download}b\n"
# → 403 75193b

curl -s "https://api.truelight.app/__migration_proxy?url=https%3A%2F%2Fbethelfaith.com%2Fwp-json%2Fwp%2Fv2%2Fposts" \
  -H "X-Tenant-Verify: $SECRET" -o /dev/null -w "%{http_code} %{size_download}b\n"
# → 403 75193b (정확히 같은 byte 수 = 같은 호스팅 / 같은 WAF 룰)
```

## 운영자가 선택해야 할 옵션

| 옵션 | 월 비용 | 구현 시간 | 안정성 |
|---|---|---|---|
| **A. ScraperAPI** (잔류용 IP 풀) | $0 ~ $49 | 30분 | 매우 높음 |
| **B. ZenRows** | $49+ | 30분 | 매우 높음 |
| **C. BrightData 혼합 풀** | $150+ | 1시간 | 최상 |
| **D. 브라우저 기반 스크래퍼** (운영자 PC가 fetch → API 업로드) | $0 | 4시간+ (CORS 처리) | 보통 |
| **E. 수동 입력** (관리 UI에서 직접) | $0 | 이미 가능 | 100% |
| **F. 한국 잔류 VPS + SOCKS proxy** | $5+ + 설정 | 반나절 | 좋음 |

### 추천: A (ScraperAPI 무료 tier 부터 시작)

월 1000 요청 무료. 사이트 1개 마이그레이션 ~30 요청 → 월 약 30개 사이트 처리 가능. 동작 확인 후 유료 ($49/100K) 전환.

구현 단계:
1. scraperapi.com 가입 → API 키 발급
2. Railway api-server Variables 에 `SCRAPER_API_KEY` 추가
3. `migration-agent.ts` 의 `proxiedFetch()` 에 ScraperAPI 경로 추가:
   ```ts
   if (env.SCRAPER_API_KEY) {
     return await fetch(
       `http://api.scraperapi.com?api_key=${env.SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`,
       { ...init }
     );
   }
   ```
4. Worker 프록시는 그대로 두고 fallback 으로 사용
5. 라그란지 마이그레이션 재실행 → 200 OK + WP REST 데이터

## 인증 정보

- 슈퍼어드민: `superadmin@truelight.app` / `TrueLight2026!`
- 로그인: `POST https://api.truelight.app/api/v1/auth/login`
- `SAAS_PROXY_SECRET`: `a728ae83063c340449bcdf743bc4282037a0c0f3958d3981c38f5361c99a3c0e`
  - Worker + Railway api-server + Railway web 셋다 동일 값

## 테스트 명령

```bash
# 토큰
TK=$(curl -s -X POST https://api.truelight.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@truelight.app","password":"TrueLight2026!"}' \
  | grep -oE '"accessToken":"[^"]+"' | sed 's/"accessToken":"\(.*\)"/\1/')

# 마이그레이션 실행
curl -sS -X POST https://api.truelight.app/api/v1/migration/migrate-url \
  -H "Authorization: Bearer $TK" \
  -H "Content-Type: application/json" \
  -d '{"sourceUrl":"https://lagrangechurch.org","tenantSlug":"lagrangechurch","include":"static","useLlm":true}' \
  --max-time 600

# 로그 추적
cd dw-church-app && railway logs --service api-server | grep -E "tool:|result:|agent-warn"
```

## 최근 커밋 흐름

```
b8fe7132 fix(docker): COPY tsconfig.base.json in apps/server Dockerfile
b456933d fix(docker): COPY tsconfig.base.json in dw-church-app/Dockerfile.server (실제 사용)
706db69e fix(docker): preserve workspace layout in production stage (fastify resolve)
91bb6ecd chore(migration): crawler + LLM diagnostics
bf8f1167 fix(crawler): realistic browser UA + HTML response logging
b2f72ead feat(migration): AI agent with tool calling (replaces crawler-first)
e2480d46 fix(agent): explicit anti-bot fallback + exact ClassifiedData field names
607e06a5 chore(agent): per-tool result diagnostics + payload item count
6e1d995c feat(migration): route fetches through Cloudflare Worker proxy
```

## 검증된 결정 (변경 금지)

- Migration = AI agent orchestrated (NOT crawler-first) — `feedback_migration_ai_only`
- Per-tenant SSL = Cloudflare for SaaS (NOT Railway customDomain)
- Image upload = 1600px / WebP 0.85, 모든 콘텐츠 동일 (NOT 컨텐츠별 preset)
- 배너 = 자동 마이그레이션 제외
- 정적 콘텐츠 항상 포함 / 동적 = opt-in 체크박스

## 미해결 / 검증 대기

이 모든 항목은 코드는 작성됐지만 WAF 차단 때문에 실제 동작 확인이 안 됐습니다:

- 페이지 자동 생성 (담임목사 인사말 / 비전 등 슬러그가 DB에 없으면 신규 생성)
- 정적 블록 타입 매핑 (pastor_message / church_intro / mission_vision / location_map / contact_info / newcomer_info / text_image)
- 칼럼 작성일 보존 (ClassifiedColumn.date → columns_pastoral.created_at)
- LLM breakdown / warnings 응답 노출
- Agent 의 commit_result 페이로드 매핑

운영자가 egress 옵션 결정 → 적용 → 즉시 위 항목 검증 가능.
