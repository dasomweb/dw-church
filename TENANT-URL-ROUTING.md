# Tenant Admin Routing — `/t/:slug` (Shopify-style)

DW Church의 관리자 앱이 테넌트 컨텍스트를 **세션이 아닌 URL에서 읽도록** 리팩터링한 기록.
Shopify의 `admin.shopify.com/store/:name` 패턴을 그대로 가져왔다.

## 왜 바꿨나

이전 구조는 한 호스트(`admin.truelight.app`) 아래에서 로그인한 사용자의 JWT `tenantSlug`를
"지금 관리 중인 테넌트"로 사용했다. 동일 origin에 같은 `localStorage` 키를 공유하기 때문에
발생하던 만성 문제:

- **세션 충돌**: 슈퍼어드민이 grace 테넌트를 들여다보려면 `?tenant=grace` 쿼리파라미터 + 서버의
  `switch-tenant` API가 JWT `tenantSlug`를 갈아끼우는 구조였다. 원래 슈퍼어드민 세션이
  "grace로 스위치된 세션"으로 덮였고, 다시 슈퍼어드민으로 돌아오려면 로그인을 다시 해야 했다.
- **Next.js 페이지 캐시 오염 의심**: 여러 테넌트 데이터가 URL 기반으로 분리돼 있지 않아서
  `revalidate: false` + 헤더만 다른 fetch 호출이 서로 캐시를 타고 넘어갈 가능성이 있었다.
- **탭 동시 작업 불가**: 여러 테넌트를 브라우저 탭으로 띄워 동시에 관리하는 게 구조적으로 안 됐다.
  URL이 같고 `localStorage`가 같으니 마지막으로 로그인한 세션이 전부를 덮어쓴다.
- **감사 로그 흐림**: "슈퍼어드민이 grace에 어떤 작업을 했는지" 추적하려면 switch-tenant 콜 전후로
  엮어야 해서 한 눈에 안 보였다.

## 새 URL 구조

```
/super-admin                              플랫폼 관리 (슈퍼어드민)
/t/grace                                  grace 테넌트 대시보드
/t/grace/sermons                          grace 설교 관리
/t/grace/bulletins, /albums, /events,
  /banners, /staff, /history, /boards,
  /columns                                콘텐츠 모듈 관리
/t/grace/pages, /page-wizard,
  /menus, /theme                          디자인
/t/grace/settings, /domains,
  /users, /billing                        설정
/t/grace/login                            테넌트-스코프 로그인 (support 계정용)
/t/grace/forgot-password                  테넌트-스코프 비밀번호 찾기
/login, /register, /forgot-password       공용 (테넌트 미지정)
/profile                                  모든 인증 사용자 공용
/                                         역할 기반 자동 리다이렉트
```

- `/t/grace`와 `/t/bethel`은 **다른 URL**이므로 두 탭에 띄워도 브라우저 라우팅/캐시 수준에서 완전 격리
- URL만 보면 "지금 어느 테넌트 작업 중인지" 즉답 가능
- 북마크 / 링크 공유 가능

## 핵심 구성요소

### `App.tsx` — Routes + Guards

```tsx
<Route path="/super-admin" element={<RequireAuth><RequireSuperAdmin>...</RequireSuperAdmin></RequireAuth>} />

<Route path="/t/:slug/login" element={<PublicOnly><LoginPage /></PublicOnly>} />

<Route
  path="/t/:slug"
  element={
    <RequireAuth>
      <RequireTenantAccess>
        <TenantAdminLayout client={client} />
      </RequireTenantAccess>
    </RequireAuth>
  }
>
  <Route index element={<Dashboard />} />
  <Route path="sermons" element={<SermonManagement />} />
  {/* ... 관리 페이지들 ... */}
</Route>

<Route path="/" element={<RoleHomeRedirect />} />
<Route path="*" element={<RoleHomeRedirect />} />
```

- `RequireTenantAccess` — URL의 `:slug`와 JWT의 `tenantSlug`를 비교:
  - 슈퍼어드민 → 통과 (모든 테넌트 접근 가능)
  - JWT slug와 URL slug 일치 → 통과
  - 불일치 → `/t/:slug/login?redirect=<원래 URL>`로 리다이렉트 (support 크리덴셜로 로그인 유도)
- `RoleHomeRedirect` — `/` 또는 매칭 실패 시 역할별로 착지:
  - 슈퍼어드민 → `/super-admin`
  - 테넌트 사용자 → `/t/{자기 slug}`
  - 미인증 → `/login`

### `TenantAdminLayout` — 클라이언트 테넌트 바인딩

```tsx
function TenantAdminLayout({ client }: { client: DWChurchClient }) {
  const { slug = '' } = useParams<{ slug: string }>();
  useEffect(() => {
    if (slug) client.setTenantSlug(slug);
  }, [slug, client]);
  return <AdminLayout />;
}
```

`DWChurchClient`의 `X-Tenant-Slug` 헤더를 **URL의 slug와 동기화**한다. 슈퍼어드민이 `/t/beta`를
열면 이 이펙트가 헤더를 `beta`로 설정해서 후속 API 호출이 전부 beta 스키마를 읽는다. 이 한 줄이
"URL이 진실의 원천" 원칙을 런타임 레벨에서 강제한다.

### `AdminLayout` — 사이드바 재구성

내비게이션 엔트리는 **상대 경로**(`sermons`, `pages` …)로 정의하고, 레이아웃이
`useParams`로 slug를 읽어 `/t/:slug/` 접두사를 붙여 링크를 만든다.

```tsx
const { slug = '' } = useParams<{ slug: string }>();
const tenantRoot = `/t/${slug}`;
const pathFor = (to: string) => (to ? `${tenantRoot}/${to}` : tenantRoot);
```

페이지 타이틀 lookup은 path 전체가 아닌 **leaf segment**(`sermons`, `pages` …)를 키로 사용하도록
바뀌었다. 테넌트 slug가 바뀌어도 타이틀 lookup이 작동한다.

### 세션 저장소 — `sessionStorage` (per-tab)

`stores/auth.ts`가 `localStorage` → `sessionStorage`로 이관됐다. 각 브라우저 탭이 자기만의 세션을
갖기 때문에:

- 슈퍼어드민 탭 + grace 지원계정 탭 + bethel 지원계정 탭을 동시에 띄워도 서로 덮지 않는다
- 탭을 닫으면 세션이 날아가는 보안상 엄격한 트레이드오프를 받아들임 (동일 탭 새로고침은 유지)
- 최초 로드 시 기존 `localStorage` 세션을 `sessionStorage`로 일회성 마이그레이션 후 정리

### `LoginPage` — URL 인지, 리다이렉트 인지

```tsx
const { slug: urlSlug } = useParams<{ slug?: string }>();
const [searchParams] = useSearchParams();
const prefillEmail = searchParams.get('email') ?? '';
const redirectParam = searchParams.get('redirect');
```

로그인 성공 후:

1. `?redirect=` 파라미터 있으면 그쪽으로 (게이트가 강제로 보낸 경우)
2. 슈퍼어드민 → `/super-admin`
3. URL slug가 있으면 `/t/{urlSlug}` (support 로그인 흐름)
4. 아니면 JWT의 `tenantSlug`로 `/t/{userSlug}` 착지

`?email=` 파라미터가 있으면 기존 세션을 즉시 초기화한다 — 슈퍼어드민이 "관리자 페이지" 버튼으로
support 계정으로 들어갈 때의 진입점.

### `SuperAdminDashboardV2` — 관리자 페이지 버튼

```tsx
const tenantAdminUrl = detail
  ? `/t/${detail.slug}/login?email=${encodeURIComponent(`support-${detail.slug}@truelight.app`)}`
  : '#';
```

클릭 → 새 탭 → 테넌트-스코프 로그인 페이지 → support 이메일 프리필 → 슈퍼어드민이 **발급한 임시
비밀번호**를 붙여넣어 로그인 → `/t/{slug}`에 support 계정으로 진입. 원본 탭의 슈퍼어드민 세션은
`sessionStorage` 덕분에 그대로 유지된다.

"관리" 버튼도 `window.location.href = /?tenant=...` 대신 직접 `/t/{slug}`로 이동하도록 바꿨다.

## 서버 측 보강 — 같이 들어간 보안

URL 기반 분리가 프론트 레벨이라면, 서버에서도 **헤더 오염 방어**를 추가했다
(`apps/server/src/middleware/auth.ts`):

```ts
if (payload.tenantSlug && request.tenant && request.tenant.slug !== payload.tenantSlug) {
  if (payload.role === 'support') {
    throw new AppError('FORBIDDEN', 403, 'Support session cannot access another tenant');
  }
  // super_admin 등은 헤더 해석값 버리고 JWT tenant로 재바인딩
  request.tenant = undefined;
  request.tenantSchema = undefined;
}
```

- `X-Tenant-Slug` 헤더를 그대로 믿었던 `tenantMiddleware`에 JWT 검증 레이어를 덧댄 것
- `role === 'support'`인 사용자가 헤더 조작으로 다른 테넌트를 읽으려 하면 **즉시 403**
- 그 외 롤도 JWT tenant가 강제 우선됨 (헤더는 힌트일 뿐)
- 두 층 모두 방어 — 프론트가 URL로 막고, 서버가 JWT로 재확인

## 리팩터링 영향 파일

### admin-app
- `src/App.tsx` — Routes 전면 재구성, `RequireTenantAccess` / `RoleHomeRedirect` / `TenantAdminLayout`
- `src/layouts/AdminLayout.tsx` — nav 상대경로화 + slug 주입
- `src/stores/auth.ts` — localStorage → sessionStorage
- `src/pages/LoginPage.tsx` — slug 파라미터 + redirect 지원 + 프리필
- `src/pages/RegisterPage.tsx` — 신규 교회 등록 시 `/t/{slug}`로 착지
- `src/pages/ForgotPasswordPage.tsx` — 테넌트-스코프 로그인으로 돌아가기
- `src/pages/ProfilePage.tsx` — homePath 계산 slug 인지
- `src/pages/Dashboard.tsx` — 통계 카드, 최근 콘텐츠 링크, 페이지 마법사 navigate
- `src/pages/PageWizard.tsx` — 생성 후 `/t/{slug}/pages`로 이동
- `src/pages/BillingPage.tsx` — Stripe successUrl/cancelUrl/portalUrl에 tenant path 반영
- `src/pages/SuperAdminDashboardV2.tsx` — "관리자 페이지" URL, "관리" 버튼

### api-client
- `src/client.ts` — `get adapter()` public getter 추가 (AI 등 ad-hoc API 호출용)
- `src/client.ts` — FetchAdapter의 snakeizeKeys 제거 (Zod 서버 스키마가 camelCase 기대)

### server
- `src/middleware/auth.ts` — JWT tenantSlug와 header tenant 불일치 시 방어
- support 계정 자동 생성 + 임시 비밀번호 발급 엔드포인트는 동일 리팩터링 흐름의 일부

## 새 admin 페이지 추가 가이드

1. `App.tsx`의 `/t/:slug` 하위에 `<Route path="xxx" element={<XxxPage />} />` 추가
2. 페이지 내부에서 `useParams<{ slug: string }>()`로 slug 읽기. navigate / Link는 `/t/${slug}/...` 형식으로
3. `AdminLayout`의 `navGroups`에 상대 경로 엔트리 추가 (접두사 자동)
4. `pageTitlesByLeaf`에 leaf 세그먼트로 타이틀 등록
5. API 호출은 `DWChurchClient`의 타입된 메서드 사용. ad-hoc 엔드포인트가 필요하면 `apiClient.adapter.post('/api/v1/...', body)` (네임스페이스 접두사 필수)

## 주의사항

- `ApiAdapter`를 통하는 요청 body는 **camelCase 그대로** 보내야 한다. 서버 Zod 스키마가 camelCase를 기대하고, 예전에 있던 `snakeizeKeys` 변환은 제거됨.
- `useParams<{ slug: string }>`에 빈 문자열 기본값을 주는 것이 안전하다. 라우트 매칭이 실패해 slug가 undefined일 때 `/t/undefined/...` 같은 URL을 만들지 않도록.
- 탭을 닫으면 세션이 사라지는 것은 **의도된 동작**이다. 사용자에게 "브라우저 재시작 시 다시 로그인"이 보안상 더 안전하다는 점을 고지.
- 슈퍼어드민 계정이 테넌트 URL에 접근하는 건 허용되지만, 가급적 support 크리덴셜을 발급받아 지원 세션으로 들어가는 것을 권장 — 감사 로그가 깨끗하게 남는다.
