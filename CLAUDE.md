# CLAUDE.md — DW Church (True Light) 개발 규칙

## 절대 금지 사항

### 1. 하드코딩 금지
- 페이지 레이아웃, 제목, 그리드 열 수 등을 코드에 직접 작성하지 않는다
- 모든 페이지 구성은 PageEditor 블록 시스템을 통해 관리된다
- 전용 라우트 페이지도 반드시 `BlockRenderer`로 섹션을 렌더링한다

### 2. 더미/시드 데이터 금지
- 테넌트에 더미 콘텐츠(설교, 주보, 교역자 등)를 절대 넣지 않는다
- 동적 콘텐츠는 관리자가 직접 등록한 것만 표시된다
- 시드 데이터는 페이지/메뉴/테마/설정 구조만 생성한다

### 3. 외부 이미지 직접 링크 금지
- Unsplash 등 외부 URL을 코드에 직접 넣지 않는다 (저작권 문제)
- 모든 이미지는 R2에 업로드하여 자체 호스팅한다

## 아키텍처 3-Layer 원칙

```
테마 (한번 설정)     → 컬러, 폰트, 기본 레이아웃
페이지 (한번 설정)   → 블록 구성, 순서, variant, 히어로 배너
동적 콘텐츠 (매주)   → 설교, 주보, 앨범, 행사, 교역자 등
```

- 동적 콘텐츠는 관리자 페이지에서 등록한 것이 블록을 통해 자동 표시
- 페이지 디자인 변경 없이 콘텐츠만 등록하면 웹사이트에 반영

## 테넌트 격리

- 각 테넌트는 별도 PostgreSQL 스키마 (`tenant_{slug}`)
- R2 파일은 `tenant_{slug}/` 폴더로 분리
- API 요청은 `X-Tenant-Slug` 헤더로 테넌트 식별
- 테넌트 간 데이터 참조 절대 불가

## 블록 렌더링 규칙

- 모든 블록 컴포넌트는 `props.title`, `props.variant` 등을 읽어 동적 렌더링
- 전용 라우트 페이지는 `getPageBySlug()` → `BlockRenderer`로 모든 섹션 렌더링
- 동적 콘텐츠 블록만 페이지네이션/검색 버전으로 교체
- ui-components의 그리드 컴포넌트는 `columns` prop으로 동적 제어

## API 필드명 규칙

- 서버 (DB/API): `snake_case` (church_name, sermon_date 등)
- 클라이언트: `camelCase` (churchName, sermonDate 등)
- api-client FetchAdapter가 자동 변환 (camelizeKeys/snakeizeKeys)
- Super Admin의 apiFetch도 camelizeKeys 적용 필수

## 새 기능 추가 시 체크리스트

1. 새 블록 추가 → BlockRenderer에 매핑 + PageEditor BLOCK_DEFS에 추가
2. 새 전용 라우트 → `getPageBySlug()` + `BlockRenderer` 사용
3. 새 관리 페이지 → AdminLayout navGroups에 추가
4. 새 API → snake_case 응답, api-client가 자동 camelCase 변환
5. 새 테넌트 데이터 → schema-manager.ts의 seedDefaultData에서 구조만 생성
