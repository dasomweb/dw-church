# TEST.md — 테스트 가이드

---

## 실행 방법

```bash
# 전체 테스트 (유닛 + 통합)
pnpm test

# 서버 유닛/통합 테스트만
cd apps/server && pnpm test

# API 클라이언트 테스트만
cd packages/api-client && pnpm test

# E2E 테스트 (운영환경 대상)
pnpm test:e2e

# E2E 브라우저 UI 보면서 실행
pnpm test:e2e:headed

# 특정 E2E 파일만
npx playwright test e2e/full-user-journey.spec.ts --project=desktop
```

---

## 테스트 현황

### 서버 유닛/통합 테스트 (Vitest) — 26파일, 425테스트

| 파일 | 테스트 수 | 검증 내용 |
|------|----------|----------|
| **스키마 검증** | | |
| auth-schema.test.ts | 31 | 회원가입/로그인/초대/비밀번호 Zod 검증 |
| sermons-schema.test.ts | 14 | 설교 생성/수정 입력값 검증 |
| bulletins-schema.test.ts | 8 | 주보 입력값 검증 |
| columns-schema.test.ts | 8 | 칼럼 입력값 검증 |
| albums-schema.test.ts | 9 | 앨범 입력값 + 이미지 URL 배열 검증 |
| events-schema.test.ts | 9 | 행사 입력값 + 날짜 형식 검증 |
| staff-schema.test.ts | 14 | 교역자 입력값 + SNS 링크 + reorder 검증 |
| history-schema.test.ts | 12 | 연혁 year 범위 + items JSONB 검증 |
| boards-schema.test.ts | 15 | 게시판 + 게시글 입력값 검증 |
| banners-schema.test.ts | 12 | 배너 입력값 + 텍스트오버레이 + 날짜 검증 |
| menus-schema.test.ts | 15 | 메뉴 생성/수정/reorder UUID 검증 |
| pages-schema.test.ts | 17 | 페이지 + 블록 섹션 + 모든 blockType 검증 |
| **미들웨어 통합** | | |
| auth-integration.test.ts | 16 | 실제 auth 미들웨어 + JWT 서명/검증/만료/역할체크 |
| tenant-integration.test.ts | 10 | 실제 tenant 미들웨어 + 헤더/서브도메인/커스텀도메인 해석 |
| auth.test.ts | 16 | 토큰 추출 + 역할 체크 순수 로직 |
| tenant.test.ts | 16 | URL 스킵 + 서브도메인 파싱 순수 로직 |
| **API 라우트 통합 (Fastify inject)** | | |
| sermons-routes.test.ts | 12 | 설교 CRUD 엔드포인트 (GET/POST/PUT/DELETE + 인증 + 검증) |
| crud-routes.test.ts | 24 | 주보/교역자/앨범/행사/칼럼/연혁 CRUD 라우트 |
| error-cases.test.ts | 15 | 인증실패(5종)/검증실패(6종)/404/500 에러 |
| **Auth 서비스** | | |
| auth-service.test.ts | 20 | 비밀번호 해싱 + JWT 토큰 + 슈퍼어드민 체크 + YouTube 썸네일 추출 |
| **마이그레이션** | | |
| migration-classifier.test.ts | 15 | URL→slug 매핑 + 전화/이메일/주소 추출 + 페이지 블록 매핑 |
| migration-youtube.test.ts | 14 | videoId 추출 + 썸네일 URL + 페이지 내 YouTube URL 추출 |
| migration-images.test.ts | 8 | 이미지 URL 치환 (single/array/missing/empty) |
| migration-types.test.ts | 5 | 빈 객체 생성 + 불변성 검증 |
| **유틸리티** | | |
| validate-schema.test.ts | 23 | 스키마 이름/slug 검증 + SQL injection 방지 |
| presets.test.ts | 67 | 테마 프리셋 구조 + 색상/폰트/레이아웃 검증 |

### API 클라이언트 테스트 (Vitest) — 3파일, 56테스트

| 파일 | 테스트 수 | 검증 내용 |
|------|----------|----------|
| utils.test.ts | 21 | camelizeKeys/snakeizeKeys 변환 + 라운드트립 |
| client.test.ts | 18 | FetchAdapter + MockAdapter + 에러 핸들링 |
| types.test.ts | 17 | 타입 구조 검증 |

### E2E 테스트 (Playwright, 운영환경) — 5파일, 96테스트

| 파일 | 테스트 수 | 검증 내용 |
|------|----------|----------|
| **full-user-journey.spec.ts** | **13** | **사용자 여정 관통 테스트 (아래 상세)** |
| crud-lifecycle.spec.ts | 36 | 6개 콘텐츠 × (생성→확인→수정→반영확인→삭제→사라짐확인) |
| tenant-lifecycle.spec.ts | 25 | 테넌트 구조 + CRUD + 프론트 렌더링 + 이미지 업로드 |
| tenant-isolation.spec.ts | 9 | 테넌트 간 데이터 격리 (ID 겹침 없음, 크로스 접근 차단) |
| user-flow.spec.ts | 13 | 로그인 흐름 + 콘텐츠 생성→프론트 + 설정→프론트 + 네비게이션 |

### 사용자 여정 관통 테스트 (full-user-journey.spec.ts)

하나의 연속된 시나리오:

```
Step 1:  회원가입 — 새 테넌트 + 관리자 계정 생성
Step 2:  로그인 — 브라우저 폼 인증
Step 3:  설교 등록 → 프론트 상세 페이지에서 제목+성경구절 확인
Step 4:  설교 수정 → 프론트에서 수정된 제목+성경구절 반영 확인
Step 5:  주보 등록 → 프론트 상세 페이지에서 제목 확인
Step 6:  교역자 등록 → 프론트 상세 페이지에서 이름 확인
Step 7:  앨범 등록 (R2 이미지 업로드) → 프론트에서 제목+이미지 확인
Step 8:  행사 등록 → 프론트 상세 페이지에서 제목 확인
Step 9:  칼럼 등록 → 프론트에서 제목+본문 확인
Step 10: 설정 변경 (교회 이름) → 프론트 홈페이지에서 반영 확인
Step 11: 설교 삭제 → 프론트에서 사라짐 확인
Step 12: 로그아웃
Step 13: 테넌트 정리 (삭제)
```

자체 테넌트를 생성하고 끝나면 삭제 — 기존 데이터에 영향 없음.

---

## 총합

```
서버 유닛/통합:     26파일,  425테스트
API 클라이언트:      3파일,   56테스트
E2E (운영환경):      5파일,   96테스트
────────────────────────────────────────
합계:               34파일,  577테스트
```

---

## 테스트 규칙

### 새 기능 개발 시

1. **기능 구현 전** — 관련 스키마/서비스 테스트 존재 여부 확인
2. **기능 구현 후** — 반드시 `pnpm test` 통과 확인 후 커밋
3. **새 API 추가 시** — `routes/*.test.ts`에 해당 라우트 테스트 추가
4. **새 스키마 추가 시** — `modules/*-schema.test.ts` 추가
5. **프론트 변경 시** — 관련 E2E 테스트가 깨지지 않는지 확인

### 커밋 전 체크리스트

```bash
# 1. 서버 테스트 통과
cd apps/server && pnpm test

# 2. API 클라이언트 테스트 통과
cd packages/api-client && pnpm test

# 3. TypeScript 빌드 에러 없음
npx tsc --noEmit -p apps/server/tsconfig.json

# 4. (선택) E2E 테스트 통과
npx playwright test e2e/full-user-journey.spec.ts --project=desktop
```

### 테스트 작성 가이드

```
스키마 테스트:
  - 유효 입력, 무효 입력, 기본값, 경계값, null 허용 여부

라우트 통합 테스트:
  - Fastify inject() 사용
  - vi.mock()으로 서비스/DB mock (factory 안에 vi.fn() 직접 사용)
  - errorHandler 등록 필수
  - 인증 필요 라우트: 토큰 있는/없는 케이스 모두

E2E 테스트:
  - 테스트 데이터는 직접 생성 → 테스트 후 삭제 (cleanup)
  - DELETE 요청 시 Content-Type 헤더 제외
  - 프론트 확인 시 waitUntil: 'networkidle' 사용
```

---

## 도구

- **유닛/통합**: Vitest v3.2
- **E2E**: Playwright
- **E2E 대상**: Railway 운영 서버 + truelight.app
- **뷰포트**: Desktop (1280×720), Mobile (375×667)
