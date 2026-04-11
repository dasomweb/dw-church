# LOGIN-ISSUES.md — 로그인/인증 관련 문제 해결 기록

---

## 1. snake_case / camelCase 필드명 불일치 (전체 시스템)

### 문제
서버 API는 `snake_case` (DB 컨벤션)로 응답하는데, 프론트엔드는 `camelCase`로 읽으려 해서 모든 곳에서 데이터가 `undefined`로 나옴.

```
서버 응답: { church_name: "...", sermon_date: "..." }
프론트 읽기: data.churchName → undefined
→ 화면에 데이터가 안 나옴 (blank)
```

### 해결
`api-client/FetchAdapter`에 `camelizeKeys`/`snakeizeKeys` 자동 변환 추가.

```typescript
// 응답: snake_case → camelCase
const data = camelizeKeys(await res.json());

// 요청: camelCase → snake_case  
body: JSON.stringify(snakeizeKeys(payload))
```

### 영향 범위
- 배너 관리: `text_overlay` → `textOverlay`
- 설정 저장: `church_name` → `churchName`
- 메뉴 표시: `parent_id` → `parentId`
- 페이지 편집: `block_type` → `blockType`
- 사용자 목록: `is_active` → `isActive`
- **모든 API 통신**에 적용

### 관련 커밋
- `930065f` Root fix: add camelizeKeys/snakeizeKeys to api-client FetchAdapter
- `486ca77` Fix Super Admin: add camelizeKeys to apiFetch responses
- `aad1b89` Fix settings save: align field names
- `b4d4e02` Fix banner management: snake_case/camelCase mismatch

---

## 2. 비밀번호 리셋 필드명 불일치

### 문제
프론트에서 `newPassword`를 보내는데 서버는 `password`를 기대.

```
클라이언트: { newPassword: "abc" }
서버 스키마: { password: string } ← 필드명 불일치
→ "Validation error" → 비밀번호 변경 실패
```

### 해결
클라이언트에서 `password` 필드명으로 전송하도록 수정.

### 관련 커밋
- `ee43d3e` Fix: password reset sends 'password' field

---

## 3. Super Admin 접속 불가

### 문제
Super Admin 계정이 DB에 없거나, `SUPER_ADMIN_EMAILS` 환경변수가 비어있어서 어드민 접근 불가.

### 해결 과정
1. `SUPER_ADMIN_EMAILS` 환경변수로 이메일 등록 → Railway 환경변수 설정 필요
2. 환경변수만으로는 계정 자체가 없으면 로그인 불가
3. Bootstrap 엔드포인트 추가 → 초기 super admin 계정 생성

```
POST /api/v1/migration/bootstrap
Body: { secret: "truelight-bootstrap-2026" }
→ superadmin@truelight.app 계정 생성/비밀번호 리셋
```

### 점검 사항
- `users` 테이블에 `role = 'super_admin'` 계정 존재 여부
- `SUPER_ADMIN_EMAILS` 환경변수에 해당 이메일 포함 여부
- JWT 토큰의 `role` 필드가 `super_admin`인지 확인

### 관련 커밋
- `272c53a` chore: add one-time bootstrap endpoint
- `2848bea` fix: register bootstrap in separate Fastify scope
- `80ca5f5` fix: skip auth for bootstrap/health via URL check
- `a00a5d4` chore: remove bootstrap endpoint (보안상 삭제)

---

## 4. Super Admin 프로필 페이지 접근 불가

### 문제
Super Admin으로 로그인 후 프로필 페이지(`/profile`)에 접근하면 `/super-admin`으로 리다이렉트됨.

### 원인
`/profile` 라우트가 `BlockSuperAdmin` 컴포넌트 안에 있어서, super admin은 모든 tenant admin 라우트에서 차단됨.

```typescript
// App.tsx 라우트 구조
<BlockSuperAdmin>     ← super admin 차단
  <AdminLayout>
    <Route path="profile" />  ← 접근 불가
  </AdminLayout>
</BlockSuperAdmin>
```

### 해결
`/profile` 라우트를 `BlockSuperAdmin` 바깥으로 이동.

```typescript
// 수정 후
<Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

<BlockSuperAdmin>
  <AdminLayout>
    {/* 나머지 tenant admin 라우트 */}
  </AdminLayout>
</BlockSuperAdmin>
```

### 관련 커밋
- `1fe23be` fix: move profile route outside BlockSuperAdmin
- `43900d9` fix: make email in super admin header clickable to profile page

---

## 5. 프로필에서 이메일 변경 불가

### 문제
프로필 페이지에서 이메일 필드가 읽기 전용(read-only)으로 되어있어 변경 불가.

### 해결
이메일 필드를 편집 가능한 `<input>`으로 변경하고, `updateProfile` API에 email도 전송.

### 관련 커밋
- `2744787` fix: make email editable in ProfilePage + add super_admin role label

---

## 6. Super Admin 역할 라벨 누락

### 문제
프로필 페이지에서 역할(role) 표시 시 `super_admin`에 대한 한글 라벨이 없어서 그대로 `super_admin`으로 표시됨.

### 해결
`ROLE_LABELS`에 `super_admin: '슈퍼 관리자'` 추가.

### 관련 커밋
- `2744787` fix: make email editable + add super_admin role label

---

## 7. 사용자 활성화/비활성화 (isActive)

### 문제
사용자 목록 API 응답에 `is_active` 필드가 누락되어 관리자가 사용자 활성 상태를 확인/변경할 수 없음.

### 해결
사용자 목록 API 응답에 `is_active` 필드 추가.

### 관련 커밋
- `11d7944` Fix: include isActive in user list API response
- `7cd7d0f` Add user activate/deactivate + super_admin always active

---

## 8. Fastify 라우트 등록 순서 문제

### 문제
Migration 모듈의 `health`와 `bootstrap` 엔드포인트가 인증 없이 접근 가능해야 하는데, `addHook('preHandler', requireSuperAdmin)`이 같은 플러그인 내 모든 라우트에 적용됨.

### 시도한 방법들

| 시도 | 결과 |
|------|------|
| `app.register(async (pub) => { ... })` nested scope | Fastify가 prefix를 상속 안 함 → 404 |
| 별도 파일로 분리 | 복잡도 증가 |
| **preHandler에서 URL 체크로 스킵** | ✅ 동작 |

### 해결
```typescript
app.addHook('preHandler', async (request, reply) => {
  const url = request.url;
  if (url.endsWith('/health') || url.endsWith('/bootstrap')) return;
  await requireSuperAdmin(request, reply);
});
```

### 관련 커밋
- `80ca5f5` fix: skip auth for bootstrap/health via URL check
- `2848bea` fix: register in separate Fastify scope (실패)

---

## 9. Railway 배포 시 코드 반영 안 됨

### 문제
`git push` 후 `railway redeploy`를 해도 이전 코드가 실행됨. `dist/` 캐시가 남아있거나 빌드가 안 됨.

### 원인
- `railway redeploy`는 기존 빌드를 재시작만 함
- 소스 변경이 반영되려면 `railway up` (새 빌드 트리거) 필요

### 해결
```bash
# git push만으로는 안 됨
git push origin main

# 새 빌드 트리거 필요
railway up
```

### 점검 방법
```bash
# 서버 로그 확인
railway logs -n 30

# health 엔드포인트로 새 코드 확인
curl https://api-server-production-c612.up.railway.app/api/v1/migration/health
```

---

## 10. Prisma prepared statement 에러

### 문제
`migration_jobs` 테이블 생성 SQL이 멀티라인으로 작성되어 Prisma `$executeRawUnsafe`에서 "cannot insert multiple commands into a prepared statement" 에러 발생.

### 해결
SQL을 한 줄로 압축.

```typescript
// Before (에러)
await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS migration_jobs (
    id UUID PRIMARY KEY ...
  )
`);

// After (정상)
await prisma.$executeRawUnsafe(
  `CREATE TABLE IF NOT EXISTS migration_jobs (id UUID PRIMARY KEY ...)`
);
```

### 관련 커밋
- `065a334` fix: single-line CREATE TABLE SQL

---

## 점검 체크리스트

로그인/인증 문제 발생 시 확인 순서:

```
1. [ ] API 응답 필드명이 snake_case인지 (camelizeKeys 적용 확인)
2. [ ] 프론트에서 읽는 필드명이 camelCase인지
3. [ ] JWT 토큰이 유효한지 (만료 여부, secret 일치)
4. [ ] X-Tenant-Slug 헤더가 올바른지
5. [ ] users 테이블에 해당 이메일 계정 존재하는지
6. [ ] role 필드가 올바른지 (admin/owner/super_admin)
7. [ ] CORS origin이 허용 목록에 있는지
8. [ ] Fastify 라우트가 정상 등록되었는지 (health 엔드포인트 확인)
9. [ ] Railway 배포가 최신 코드인지 (railway logs 확인)
10. [ ] 브라우저 localStorage에 오래된 세션이 남아있는지
```

---

## 현재 인증 아키텍처

```
로그인 요청
  ↓
POST /api/v1/auth/login { email, password }
  ↓
bcrypt.compare(password, user.password_hash)
  ↓ (성공)
JWT 토큰 발급 { userId, email, tenantId, tenantSlug, role }
  ↓
accessToken (1시간) + refreshToken (7일)
  ↓
프론트: localStorage에 저장, 4분마다 refresh 체크
  ↓
API 요청 시: Authorization: Bearer {accessToken}
  ↓
requireAuth 미들웨어: JWT 검증 → request.user 설정
  ↓
requireAdmin: role이 admin/owner/super_admin인지
requireOwner: role이 owner/super_admin인지
optionalAuth: 토큰 있으면 검증, 없으면 통과
```
