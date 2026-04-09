# MIGRATION.md — 마이그레이션 시스템 설계서

---

## 1. 기본 원칙

- 기존 시스템(블록, 페이지, CRUD, API)은 일절 변경하지 않는다
- 마이그레이션은 기존 시스템 위에 올라가는 별도 모듈이다
- 마이그레이션이 하는 일 = 관리자가 어드민에서 수동으로 하는 작업의 자동화
- 소스 사이트에서 가져오는 것은 오직 **이미지와 텍스트**뿐이다
- CSS, 스타일시트, JavaScript, 레이아웃 구조는 가져오지 않는다

---

## 2. 기존 시스템 구조 (변경 없음)

```
테넌트 생성 → seedDefaultData()
  ├── pages 생성 (home, about, worship, sermons ...)
  ├── page_sections 생성 (각 페이지별 블록 배치)
  │     ├── 정적 블록 → props에 콘텐츠 저장 (title, content, imageUrl 등)
  │     └── 동적 블록 → props에 표시 설정만 (title, limit, variant)
  │                      데이터는 각 DB 테이블에서 fetch
  ├── menus 생성
  ├── settings 기본값
  └── theme 기본값

관리자 어드민에서 CRUD:
  ├── 정적 블록 → PageEditor에서 props 수정
  ├── 동적 콘텐츠 → 각 관리 페이지에서 CRUD
  │     ├── 설교 관리 → sermons 테이블
  │     ├── 주보 관리 → bulletins 테이블
  │     ├── 교역자 관리 → staff 테이블
  │     ├── 앨범 관리 → albums 테이블
  │     ├── 칼럼 관리 → columns_pastoral 테이블
  │     ├── 행사 관리 → events 테이블
  │     ├── 연혁 관리 → history 테이블
  │     ├── 게시판 관리 → boards 테이블
  │     └── 배너 관리 → banners 테이블
  ├── 메뉴 편집 → menus 테이블
  ├── 테마 편집 → theme 테이블
  └── 설정 편집 → settings 테이블
```

---

## 3. 마이그레이션 범위

### 자동화 대상

| 구분 | 대상 | 저장 위치 |
|------|------|----------|
| 포스팅형 | 설교, 주보, 칼럼, 행사, 앨범, 게시판 | 각 DB 테이블 INSERT |
| 설정형 | 교역자, 연혁, 예배시간, 교회정보, 메뉴 | DB upsert |
| 정적 블록 | 텍스트+이미지 콘텐츠 (교회소개, 인사말 등) | page_sections.props 업데이트 |
| 이미지 | 콘텐츠 이미지, 교역자 사진, 주보 이미지 등 | R2 업로드 |

### 자동화 대상 아님 (관리자 직접 세팅)

- hero_banner 배경 이미지
- banner_slider 슬라이드
- 테마 / 색상 / 폰트
- 로고

---

## 4. 데이터 흐름

```
[소스 사이트]
     │
     │  이미지 + 텍스트만 추출
     ▼
[추출 단계] ─── Extractor
     │          (HTML 스크래핑 / YouTube 채널 / AI 분석)
     │
     │  원본 데이터 (Raw)
     ▼
[임시 저장] ─── migration_jobs 테이블에 JSON으로 저장
     │          (중단/재개 가능, 여러 세션에 걸쳐 작업 가능)
     │
     ▼
[분류 단계] ─── Classifier
     │          이미지와 텍스트를 우리 데이터 구조에 매핑
     │
     │  분류된 ClassifiedData (JSON)
     ▼
[검토 단계] ─── 관리자가 매핑 결과 확인/수정
     │          - 잘못 분류된 항목 수정
     │          - 불필요한 항목 제외
     │          - 누락된 항목 수동 추가
     │
     │  승인된 ClassifiedData
     ▼
[적용 단계] ─── Applier
     │          (기존 DB/R2와 동일한 방식으로 INSERT)
     ▼
[테넌트 완성]
```

---

## 5. 분류 단계 상세

분류(classify)는 추출된 이미지+텍스트를 우리 데이터 구조의 어디에 넣을지 결정하는 핵심 단계이다.

### 5-1. 페이지 매핑

소스 사이트 페이지 URL → 우리 페이지 slug

```
/about-us         → about
/sunday-service   → worship
/our-pastors      → staff
/sermon-archive   → sermons
/photo-gallery    → albums
매핑 안되면        → 새 slug 제안 또는 제외
```

### 5-2. 텍스트 분류

추출된 텍스트를 필드에 매핑:

```
"김철수 목사"                → staff.name + staff.role
"02-1234-5678"              → churchInfo.phone
"요한복음 3:16"              → sermon.scripture
"주일 1부 오전 7시 본당"      → worshipTimes { name, day, time, location }
"1990년 3월 교회설립"         → history { year, month, title }
"저희 교회에 오신 것을..."     → pastor_message.message
"서울시 강남구 역삼동 123"    → churchInfo.address
```

### 5-3. 이미지 분류

추출된 이미지를 용도별 분류:

```
[인물 사진]          → staff.photoUrl
[주보 스캔]          → bulletin.images
[행사 사진]          → album.images / event.imageUrl
[교회 건물/내부]     → church_intro.imageUrl
[YouTube 썸네일]     → 사용 안함 (자동 생성됨)
[텍스트 합성 이미지]  → 사용 안함
[로고]              → 사용 안함 (관리자 직접 세팅)
```

### 5-4. 링크 분류

```
youtube.com/watch?v=...  → sermon.youtubeUrl
youtu.be/...             → sermon.youtubeUrl
*.pdf                    → bulletin.pdfUrl
기타 외부 링크            → 무시
```

### 5-5. 분류 방법 (하이브리드)

```
1차: 규칙 기반 자동 분류
  - URL 패턴 매칭 (/sermon → sermons)
  - 정규식 (전화번호, 주소, 성경구절)
  - HTML 구조 분석 (테이블 → 예배시간)

2차: AI 분석 (확신도 낮은 항목)
  - 추출된 텍스트+이미지를 AI에게 보내서 분류
  - "이 텍스트/이미지가 우리 구조의 어디에 해당하는지"

3차: 관리자 최종 검토/수정
  - 자동 분류 결과를 UI에서 확인
  - 잘못된 분류 수정, 누락 추가, 불필요한 항목 제외
```

---

## 6. 데이터 타입 정의 (Single Source of Truth)

### 6-1. 추출 원본 데이터 (RawExtractedData)

```typescript
interface RawExtractedData {
  source: {
    url: string;
    type: 'html' | 'youtube' | 'manual';
    scrapedAt: string;
  };
  pages: {
    url: string;
    title: string;
    textContent: string;
    images: string[];
    links: { text: string; href: string }[];
  }[];
  youtubeVideos: {
    title: string;
    videoId: string;
    date: string;
    thumbnailUrl: string;
  }[];
}
```

### 6-2. 분류된 데이터 (ClassifiedData)

```typescript
interface ClassifiedData {
  // ─── 교회 기본정보 → settings 테이블 ───
  churchInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    description: string;
  };

  // ─── 포스팅형 데이터 → 각 테이블 INSERT ───

  sermons: {
    title: string;
    scripture: string;
    preacher: string;
    date: string;
    youtubeUrl: string;
    thumbnailUrl: string;
  }[];

  bulletins: {
    title: string;
    date: string;
    pdfUrl: string;
    images: string[];
  }[];

  columns: {
    title: string;
    content: string;
    topImageUrl: string;
    youtubeUrl: string;
  }[];

  events: {
    title: string;
    description: string;
    date: string;
    location: string;
    imageUrl: string;
  }[];

  albums: {
    title: string;
    images: string[];
    youtubeUrl: string;
  }[];

  boards: {
    boardSlug: string;
    posts: {
      title: string;
      content: string;
      author: string;
      date: string;
    }[];
  }[];

  // ─── 설정형 데이터 → upsert ───

  staff: {
    name: string;
    role: string;
    department: string;
    photoUrl: string;
    bio: string;
  }[];

  history: {
    year: string;
    month: string;
    title: string;
    description: string;
  }[];

  worshipTimes: {
    name: string;
    day: string;
    time: string;
    location: string;
  }[];

  menus: {
    label: string;
    pageSlug: string;
    parentLabel: string | null;
    sortOrder: number;
  }[];

  // ─── 정적 블록 콘텐츠 → page_sections.props 업데이트 ───
  // hero_banner 제외 (관리자 직접 세팅)

  pageContents: {
    pageSlug: string;
    blocks: {
      blockType: string;
      props: Record<string, unknown>;
    }[];
  }[];

  // ─── R2 업로드 대상 이미지 ───
  images: string[];
}
```

---

## 7. 정적 블록 props 구조

hero_banner는 마이그레이션 대상이 아님.

| 블록 | props 필드 |
|------|-----------|
| `text_image` | title, content, imageUrl, images[] |
| `text_only` | title, content |
| `pastor_message` | title, name, message, photoUrl |
| `church_intro` | title, content, imageUrl |
| `mission_vision` | title, content, imageUrl |
| `worship_times` | title, services: {name, day, time, location}[] |
| `location_map` | title, address |
| `contact_info` | title, phone, address, email |
| `newcomer_info` | title, content, imageUrl |
| `image_gallery` | title, images[] |
| `video` | title, youtubeUrl |
| `quote_block` | title, content |

---

## 8. 동적 블록 props + 테이블 데이터 구조

### recent_sermons → sermons 테이블

블록 props: `{ title, limit, variant }`

| 테이블 필드 | 설명 | 예시 |
|------------|------|------|
| title | 설교 제목 | 믿음의 사람들 |
| scripture | 성경구절 | 히브리서 11:1-6 |
| preacher | 설교자 | 김철수 목사 |
| date | 설교 날짜 | 2024-01-07 |
| youtubeUrl | YouTube 링크 | https://youtu.be/... |
| thumbnailUrl | 썸네일 이미지 | https://img.youtube.com/vi/.../maxresdefault.jpg |

※ 설교는 YouTube 채널 연동이 가장 효과적. 썸네일은 YouTube에서 자동 추출 가능.

### recent_bulletins → bulletins 테이블

블록 props: `{ title, limit, variant }`

| 테이블 필드 | 설명 | 예시 |
|------------|------|------|
| title | 주보 제목 | 2024년 1월 첫째주 |
| date | 주보 날짜 | 2024-01-07 |
| pdfUrl | PDF 링크 | https://... |
| images[] | 주보 이미지 | ["https://...", ...] |

### staff_grid → staff 테이블

블록 props: `{ title, limit, variant, groupBy, photoStyle }`

| 테이블 필드 | 설명 | 예시 |
|------------|------|------|
| name | 이름 | 김철수 |
| role | 직분 | 담임목사 |
| department | 부서 | 목회실 |
| photoUrl | 프로필 사진 | https://... |
| bio | 소개글 | 총신대학교 신학대학원... |

### album_gallery → albums 테이블

블록 props: `{ title, limit, variant }`

| 테이블 필드 | 설명 | 예시 |
|------------|------|------|
| title | 앨범 제목 | 2024 성탄절 행사 |
| images[] | 사진 목록 | ["https://...", ...] |
| youtubeUrl | 영상 링크 | https://youtu.be/... |

### recent_columns → columns_pastoral 테이블

블록 props: `{ title, limit, variant }`

| 테이블 필드 | 설명 | 예시 |
|------------|------|------|
| title | 칼럼 제목 | 은혜의 계절 |
| content | 본문 | 가을이 깊어가는... |
| topImageUrl | 상단 이미지 | https://... |
| youtubeUrl | 영상 링크 | https://youtu.be/... |

### event_grid → events 테이블

블록 props: `{ title, limit, variant }`

| 테이블 필드 | 설명 | 예시 |
|------------|------|------|
| title | 행사 제목 | 부활절 연합예배 |
| description | 설명 | 올해 부활절은... |
| date | 날짜 | 2024-03-31 |
| location | 장소 | 본당 |
| imageUrl | 이미지 | https://... |

### history_timeline → history 테이블

블록 props: `{ title }`

| 테이블 필드 | 설명 | 예시 |
|------------|------|------|
| year | 연도 | 1990 |
| month | 월 | 3 |
| title | 제목 | 교회 설립 |
| description | 설명 | 김철수 목사에 의해... |

### board → boards 테이블

블록 props: `{ title, boardSlug }`

| 테이블 필드 | 설명 | 예시 |
|------------|------|------|
| boardSlug | 게시판 식별자 | mission |
| title | 글 제목 | 필리핀 단기선교 보고 |
| content | 글 내용 | 이번 여름... |
| author | 작성자 | 홍길동 |
| date | 작성일 | 2024-07-15 |
| attachments[] | 첨부파일 | ["https://..."] |

### banner_slider → banners 테이블

블록 props: `{ title }`

| 테이블 필드 | 설명 | 예시 |
|------------|------|------|
| title | 배너 제목 | 부활절 특별예배 |
| textOverlay | 오버레이 텍스트 | 함께 기쁨을 나눕시다 |
| pcImageUrl | PC 이미지 | https://... |
| mobileImageUrl | 모바일 이미지 | https://... |
| linkUrl | 클릭시 링크 | /events |

※ banner_slider는 마이그레이션 자동화 대상 아님 (관리자 직접 세팅)

---

## 9. 임시 저장 구조 (migration_jobs)

```sql
-- public 스키마 (테넌트 공통)
CREATE TABLE migration_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug     VARCHAR(100) NOT NULL,
  source_url      VARCHAR(500),
  status          VARCHAR(20) DEFAULT 'draft',
    -- draft: 작업 생성
    -- extracting: 추출 중
    -- extracted: 추출 완료
    -- classifying: 분류 중
    -- classified: 분류 완료
    -- approved: 관리자 승인
    -- applying: 적용 중
    -- done: 완료
    -- failed: 실패
  raw_data        JSONB DEFAULT '{}',
  classified_data JSONB DEFAULT '{}',
  apply_result    JSONB DEFAULT '{}',
  error_message   TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 10. 모듈 구조

```
apps/server/src/modules/migration/
  │
  ├── types.ts              ← RawExtractedData, ClassifiedData 타입 정의
  ├── routes.ts             ← API 엔드포인트
  ├── job.ts                ← migration_jobs CRUD (임시저장/상태관리)
  │
  ├── extractors/           ← 소스에서 이미지+텍스트 추출
  │   ├── html-scraper.ts   ← 일반 웹사이트 스크래핑
  │   ├── youtube.ts        ← YouTube 채널 영상 목록 추출
  │   └── manual.ts         ← JSON 직접 입력 (향후)
  │
  ├── classifier.ts         ← 추출된 이미지+텍스트를 우리 구조로 분류
  │                            (규칙 기반 + AI 분석 하이브리드)
  │
  └── appliers/             ← 분류된 데이터를 테넌트에 적용
      ├── index.ts          ← 오케스트레이터 (전체 적용 순서 관리)
      ├── settings.ts       ← churchInfo → settings 테이블
      ├── posts.ts          ← sermons, bulletins, columns, events, albums, boards → 각 테이블
      ├── config.ts         ← staff, history, worshipTimes, menus → 각 테이블
      ├── pages.ts          ← pageContents → page_sections.props 업데이트
      └── images.ts         ← 외부 이미지 → R2 업로드 + URL 치환
```

---

## 11. API 엔드포인트

```
POST   /api/v1/migration/jobs                  ← 새 작업 생성
GET    /api/v1/migration/jobs                  ← 작업 목록
GET    /api/v1/migration/jobs/:id              ← 작업 상세
PUT    /api/v1/migration/jobs/:id              ← 분류 데이터 수정 (관리자 검토)
DELETE /api/v1/migration/jobs/:id              ← 작업 삭제

POST   /api/v1/migration/jobs/:id/extract      ← 추출 실행
POST   /api/v1/migration/jobs/:id/classify     ← 분류 실행
POST   /api/v1/migration/jobs/:id/apply        ← 적용 실행

POST   /api/v1/migration/youtube/channel       ← YouTube 채널 영상 목록 추출
```

---

## 12. UI 흐름 (MigrationTab)

```
Step 1: 소스 입력
  - 웹사이트 URL 입력
  - YouTube 채널 URL 입력 (선택)
  - 대상 테넌트 선택
  - [추출 시작]

Step 2: 추출 결과 확인
  - 수집된 페이지 수, 이미지 수, 텍스트 블록 수
  - YouTube 영상 수 (입력한 경우)
  - 원본 데이터 미리보기
  - [분류 시작]

Step 3: 분류 결과 검토 (핵심 단계)
  - 교회정보: 이름, 주소, 전화 등 확인/수정
  - 설교 목록: 체크박스로 포함/제외, 필드 수정
  - 교역자 목록: 이름, 직분, 사진 확인/수정
  - 주보, 칼럼, 행사, 앨범, 게시판: 각각 확인/수정
  - 예배시간표: 확인/수정
  - 페이지 콘텐츠: 어떤 블록에 어떤 내용이 들어가는지 확인
  - ⚠️ hero_banner, banner_slider는 목록에 표시하지 않음
  - [승인 및 적용]

Step 4: 적용 진행
  - 항목별 진행 상태 표시 (이미지 업로드, 설교 등록 등)
  - 진행률 바
  - 에러 발생 시 해당 항목 표시

Step 5: 완료
  - 항목별 등록 건수 요약
  - 관리자 직접 세팅 필요 목록 안내
    (hero_banner, banner_slider, 테마, 로고)
  - [새 마이그레이션] [작업 내역 보기]
```

---

## 13. 적용 순서

```
1. 이미지 R2 업로드 (먼저 — URL 치환 필요)
2. 교회 기본정보 → settings upsert
3. 교역자 → staff INSERT
4. 설교 → sermons INSERT
5. 주보 → bulletins INSERT
6. 칼럼 → columns_pastoral INSERT
7. 행사 → events INSERT
8. 앨범 → albums INSERT
9. 연혁 → history INSERT
10. 게시판 → boards INSERT
11. 정적 블록 콘텐츠 → page_sections.props UPDATE
12. 예배시간 → worship_times 블록 props UPDATE
13. 메뉴 → menus upsert
```

---

## 14. 기본 페이지 slug 매핑 참조

| slug | 페이지 제목 | 소속 메뉴 |
|------|-----------|----------|
| `home` | 홈 | - |
| `about` | 교회 소개 | 교회안내 |
| `pastor-greeting` | 담임목사 인사말 | 교회안내 |
| `vision` | 비전/미션 | 교회안내 |
| `history` | 교회 연혁 | 교회안내 |
| `directions` | 오시는 길 | 교회안내 |
| `staff` | 교역자 소개 | 교회안내 |
| `worship` | 예배 안내 | 예배 및 모임 |
| `newcomer` | 새가족 안내 | 예배 및 모임 |
| `sermons` | 설교 | 설교/칼럼 |
| `columns` | 목회칼럼 | 설교/칼럼 |
| `bulletins` | 주보 | 설교/칼럼 |
| `edu-children` | 유초등부 | 교육 |
| `edu-youth` | 중고등부 | 교육 |
| `edu-young-adult` | 청년부 | 교육 |
| `mission` | 선교 | 선교 |
| `events` | 교회 소식 | 교회소식 |
| `albums` | 앨범/갤러리 | 교회소식 |

---

## 15. 설교 마이그레이션 특이사항

설교는 대부분 YouTube 영상이 핵심 데이터.

```
YouTube URL만 있으면 자동 추출 가능:
  - 썸네일: https://img.youtube.com/vi/{videoId}/maxresdefault.jpg
  - 제목: YouTube oEmbed API
  - 업로드 날짜

마이그레이션 소스 우선순위:
  1순위: YouTube 채널 URL → 영상 전체 목록 bulk import
  2순위: 웹사이트 설교 페이지 → YouTube 임베드 URL 추출
  3순위: 수동 입력
```

---

## 16. 향후 확장

```
현재 구현:
  - HTML 스크래핑 (일반 웹사이트)
  - YouTube 채널 연동 (설교 영상)
  - 규칙 기반 분류 + 관리자 검토

향후 추가 가능:
  - WordPress REST API 연동
  - AI 분석 (이미지/텍스트 자동 분류 정확도 향상)
  - CSV/Excel 일괄 업로드
  - 다른 교회 플랫폼 API 연동
  - 부분 재마이그레이션 (특정 카테고리만 다시)
```
