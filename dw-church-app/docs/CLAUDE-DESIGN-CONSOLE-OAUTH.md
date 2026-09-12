# 콘솔-네이티브 Claude Design 연결 (로컬 커넥터 OAuth) — 개발 문서

> **확정 2026-09-11.** truelight.app 슈퍼어드민 콘솔에서 Claude Design 계정을 **연결**하고,
> 완성된 시안(`.dc.html` 캔버스)을 **콘솔에서 직접 가져와** 테넌트에 반영하기 위한 기능.
> "요청 복사(에이전트에게 넘기기)" 모델을 폐기하고, 서버가 Claude Design MCP 를 직접
> 호출하도록 재설계했다.

---

## 1. 배경 — 왜 서버가 직접 인증할 수 없었나 (검증된 사실)

Claude Design MCP(`https://api.anthropic.com/v1/design/mcp`)는 표준 OAuth 2.0 보호 리소스지만,
**native-app(public) 클라이언트 정책**을 강제한다. 2026-09-11 엔드포인트를 직접 프로빙해 확인:

| 항목 | 검증 결과 |
|---|---|
| redirect_uri | **loopback 전용.** `https://api.truelight.app/...` → `400 "only loopback redirect_uris are accepted"`. `http://127.0.0.1:PORT` / `http://localhost:PORT` → `201`. |
| client 타입 | `token_endpoint_auth_method: none` (public only). confidential(secret) 로도 https 콜백 거부. |
| grant_types | `authorization_code`, `refresh_token` **만**. device flow 없음(엔드포인트 404). |
| PKCE | `S256` 필수. |

OIDC 디스커버리(`https://claude.ai/v1/design/mcp/.well-known/openid-configuration`, 브라우저 UA 필요)도 동일 확인.

**결론:** api.truelight.app(서버 호스팅) 콜백은 **등록 자체가 불가**. 따라서 "콘솔 버튼 →
claude.ai 로그인 → 서버가 콜백 수신" 은 브라우저만으로는 불가능하다. 로그인은 **대표님 로컬
머신의 loopback 포트**에서 완료돼야 한다(= `claude` CLI 와 동일한 native-app 패턴).

> 이 사실을 **먼저 프로빙으로 검증**한 뒤 설계했다. 이전에 서버 https 콜백(구 Stage 1)을
> 만든 것은 이 제약을 확인하지 않은 채였고, `/start` 500 의 실제 원인이었다.

---

## 2. 채택한 모델 — "1회 로컬 커넥터 + 자동 fetch"

대표님 선택. 최초 1회만 로컬 명령을 실행하고, 이후는 콘솔에서 처리한다.

```
[콘솔]  연결 클릭
   → POST /design/oauth/local/init         (super-admin)
   ← { connectToken(1회용·15분), command }  콘솔이 명령을 표시
[로컬]  node scripts/design-connect.mjs <connectToken>   (대표님이 1회 실행)
   → loopback DCR(client_id) + PKCE
   → 브라우저에서 claude.ai 로그인/동의 (redirect_uri=http://127.0.0.1:PORT/cb)
   → code → token 교환(public client)
   → POST /design/oauth/local/complete { connectToken, clientId, accessToken, refreshToken, ... }
[서버]  connectToken 검증 → public.design_oauth 에 토큰+client_id 저장
[콘솔]  status 폴링 → connected:true 감지 → "연결됨"
--- 이후 ---
[콘솔]  포인터 붙여넣기 → POST /design/import/preview
[서버]  getAccessToken(refresh) → MCP fetch → canvas 파싱 → 화면→블록 구조 반환(쓰기 없음)
```

- **connect_token**: 콘솔(super-admin)만 발급, 15분 TTL, 단일 사용. 로컬 커넥터의 `/complete`
  콜백을 인증하므로 TrueLight JWT 가 브라우저 밖으로 나가지 않는다.
- **refresh**: 저장한 `client_id`(public) + `refresh_token` 으로 서버가 갱신 → 장기 연결 유지.

---

## 3. 구성요소 (파일)

### 서버 — `apps/server/src/modules/design-oauth/`
- **service.ts** — 토큰 저장/갱신. `ensureDesignOauthTables`(public.design_oauth[+client_id],
  design_oauth_connect), `initLocalConnect`, `completeLocalConnect`, `getStatus`, `disconnect`,
  `getAccessToken`(만료 시 refresh). 상수: TOKEN/AUTHORIZE/REGISTER 엔드포인트, DESIGN_MCP_URL.
- **routes.ts** — `POST /design/oauth/local/init`(super), `POST /design/oauth/local/complete`
  (public, connect_token 인증), `GET /design/oauth/status`(super), `DELETE /design/oauth`(super),
  `POST /design/oauth/mcp/probe`(super, tools/list 실측).
- **mcp-client.ts** — 최소 MCP Streamable-HTTP 클라이언트. `initialize`→`notifications/initialized`
  →`tools/list`→`tools/call`. 응답이 `application/json` 또는 `text/event-stream(SSE)` 둘 다 처리
  (`parseRpcFrames`). `Mcp-Session-Id` 유지. `probeTools(token)`.

### 서버 — `apps/server/src/modules/design-import/`
- **canvas-parse.ts** — `.dc.html` 구조 파싱(순수·무DOM·정규식). PREP-PROMPT 계약을 읽는다:
  `data-page-slug`(화면=페이지)·`data-screen-label`·`data-block`(섹션 block_type,
  `NEEDS_BLOCK:` 포함)·`<sc-for list="{{…}}">`(동적)·`<dc-import name>`(헤더/푸터). 각 data-block
  은 가장 가까운 앞의 data-page-slug 에 배정.
- **mcp-fetch.ts** — `fetchCanvas(token, {projectId, file})`. `list_files`/`get_file` 는 **이름**만
  문서화돼 있어(docs/CLAUDE-DESIGN-WORKFLOW.md), 인자는 **tools/list 의 inputSchema 를 실측으로 읽어**
  프로퍼티명 매칭으로 채운다(추측 하드코딩 안 함). `get_file` 가 JSON `{content}`(base64 가능)면 디코드.
- **routes.ts** — `POST /design/import/preview`(super) { projectId, file } → fetch+parse →
  { pages, imports, warnings, toolNote, htmlLength }. **쓰기 없음(dry-run).**

### 로컬 커넥터 — `scripts/design-connect.mjs`
Node 18+ 내장 모듈만(무의존). loopback 리스너 → DCR → PKCE → 브라우저 오픈 → code 캐치 →
token 교환 → 서버 `/complete` 전달. 토큰 값은 절대 로그 안 함.

### 콘솔 UI — `packages/admin-app/src/components/super-admin/ClaudeDesignDialog.tsx`
슈퍼어드민 테넌트 드롭다운 "🎨 Claude Design". ① 연결(명령 표시+상태 폴링+MCP 점검+해제)
② 가져오기(포인터 붙여넣기 → 미리보기: 화면→블록 배지 + 경고). `/api/v1/design/*` 직접 호출.

---

## 4. 데이터 모델 (public 스키마 · 전역 · super-admin 전용)

```sql
public.design_oauth(user_id PK, access_token, refresh_token, expires_at, scope, client_id, updated_at)
public.design_oauth_connect(connect_token PK, user_id, created_at)   -- 15분 TTL, 단일 사용
```
- 토큰은 평문 저장(super-admin 전용·전역). **암호화는 후속 과제.**
- 테넌트 미들웨어 스킵: `/api/v1/design/`(index.ts preHandler + middleware/tenant SKIP_PREFIXES).

---

## 5. 검증 상태 (정직)

**라이브/오프라인 검증 완료**
- OAuth 제약(loopback 전용·device flow 없음): api.anthropic.com 직접 프로빙.
- 서버 타입체크 통과, **서버 테스트 770 통과**(신규 20: canvas 파싱 7 / MCP 프레이밍 5 / 연결
  라이프사이클·probe 8), admin 타입체크 통과.
- 로컬 커넥터 문법(`node --check`) + loopback DCR 201.

**첫 연결 후 라이브 확정 필요 (아직 실측 전)**
- `list_files`/`get_file` 의 실제 인자 스키마 → `POST /design/oauth/mcp/probe` 로 tools/list 실측 후 확정.
- 실제 `.dc.html` 이 PREP-PROMPT 계약(data-page-slug/data-block)을 지키는지 → preview 로 확인.
- **실제 반영(테마+페이지 apply)** 은 preview 가 실측 확인된 뒤 이어서 배선(추측 구조를 테넌트에 쓰지 않는다).

---

## 6. 사용법

1. 콘솔 → 테넌트 드롭다운 → 🎨 Claude Design → **claude.ai 로그인(연결)**.
2. 표시된 한 줄 명령을 **로컬 레포 루트**에서 1회 실행:
   `node scripts/design-connect.mjs <connectToken>`
   (api base 가 기본과 다르면 뒤에 인자로 붙는다.)
3. 브라우저에서 claude.ai 로그인/동의 → 콘솔이 자동으로 "연결됨" 표시.
4. Claude Design 포인터(프로젝트 링크 + `.dc.html`) 붙여넣기 → **가져오기(미리보기)** → 화면→블록 구조 확인.

## 7. 후속 과제
- preview 실측 확인 → **apply**(테마 STEP1 + 페이지 조합) 배선(migration 의 classify→review→apply UX 재사용).
- 토큰 at-rest 암호화. 대용량 `.dc.html` get_file 페이지네이션 확정. 매핑표 skin/new 판단 자동화.

## 관련
- 표준 순서/매핑 규칙: [CLAUDE-DESIGN-WORKFLOW.md](./CLAUDE-DESIGN-WORKFLOW.md)
- 캔버스 계약(기본 프롬프트): `scripts/design-importer/CLAUDE-DESIGN-PREP-PROMPT.md`
- 블록 카탈로그/토큰: `scripts/design-importer/CLAUDE-DESIGN-CATALOG.md`, `CLAUDE-DESIGN-TOKENS.md`
