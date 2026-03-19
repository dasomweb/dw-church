# 운영 매뉴얼 (Operations Guide)

DW Church Management System의 설치, 설정, 업데이트, 트러블슈팅 가이드입니다.

---

## 목차

1. [설치](#1-설치)
2. [초기 설정](#2-초기-설정)
3. [교회 정보 관리](#3-교회-정보-관리)
4. [사용자 권한 관리](#4-사용자-권한-관리)
5. [위젯 관리](#5-위젯-관리)
6. [업데이트](#6-업데이트)
7. [데이터 마이그레이션](#7-데이터-마이그레이션)
8. [백업 및 복원](#8-백업-및-복원)
9. [트러블슈팅](#9-트러블슈팅)
10. [성능 최적화](#10-성능-최적화)
11. [보안 체크리스트](#11-보안-체크리스트)
12. [FAQ](#12-faq)

---

## 1. 설치

### 방법 1: GitHub 릴리스에서 설치

1. [최신 릴리스](https://github.com/dasomweb/dasom-church-management-system/releases) 페이지에서 ZIP 파일 다운로드
2. WordPress 관리자 → **플러그인 → 새로 추가 → 플러그인 업로드**
3. ZIP 파일 선택 후 **지금 설치** 클릭
4. **활성화** 클릭

### 방법 2: FTP/SFTP 직접 설치

1. ZIP 파일 압축 해제
2. `dw-church/` 폴더를 `/wp-content/plugins/`에 업로드
3. WordPress 관리자 → **플러그인**에서 **DW Church** 활성화

### 설치 후 자동 처리

활성화 시 자동으로 수행되는 작업:
- 커스텀 포스트 타입 등록 및 리라이트 규칙 갱신
- 기본 설교 카테고리 생성 (주일/새벽/수요/금요설교)
- 기본 배너 카테고리 생성 (메인/서브 배너)
- 기본 설교자 등록 (담임목사)
- 모든 Elementor 위젯 활성화

---

## 2. 초기 설정

### 2.1 관리자 메뉴 접근

플러그인 활성화 후 왼쪽 메뉴에 **DW 교회관리**가 나타납니다:

- **대시보드** — 최근 콘텐츠 요약
- **교회주보** — 주보 관리
- **설교** — 설교 관리
- **목회컬럼** — 목회자 글 관리
- **교회앨범** — 사진 앨범 관리
- **배너** — 홈페이지 배너 관리
- **이벤트** — 이벤트 관리
- **설정** — 교회 정보, 플러그인 설정

### 2.2 GitHub 자동 업데이트 설정

비공개 레포지토리에서 자동 업데이트를 받으려면:

1. WordPress 관리자 → **설정 → DW 설정**
2. **GitHub Personal Access Token** 입력
   - GitHub → Settings → Developer settings → Personal access tokens → Generate new token
   - `repo` 스코프 선택
3. **저장** 클릭
4. **업데이트 강제 확인** 버튼으로 연결 테스트

---

## 3. 교회 정보 관리

**DW 교회관리 → 설정 → 교회 정보** 탭:

| 필드 | 설명 |
|------|------|
| 교회 이름 | 사이트 전역에 표시 |
| 주소 | 교회 주소 |
| 전화번호 | 연락처 |
| 이메일 | 교회 이메일 |
| 웹사이트 | 교회 웹사이트 URL |
| YouTube | YouTube 채널 URL |
| Instagram | Instagram 프로필 URL |
| Facebook | Facebook 페이지 URL |
| LinkedIn | LinkedIn 페이지 URL |
| TikTok | TikTok 프로필 URL |
| KakaoTalk | 카카오톡 오픈채팅 URL |
| KakaoTalk Channel | 카카오톡 채널 URL |

---

## 4. 사용자 권한 관리

### 역할별 접근 권한

| 기능 | Administrator | Editor | Author |
|------|:---:|:---:|:---:|
| 모든 콘텐츠 CRUD | ✅ | ✅ | ✅ |
| 플러그인 설정 | ✅ | 설정에 따라 | 설정에 따라 |
| GitHub 업데이트 설정 | ✅ | ❌ | ❌ |
| 사용자 관리 | ✅ | ❌ | ❌ |
| WordPress 대시보드 | ✅ | ❌ (DW 대시보드로 리디렉트) | ❌ |

### 메뉴 가시성 설정

**DW 교회관리 → 설정**에서 Editor/Author 역할에 대해 개별 메뉴 표시를 제어할 수 있습니다.

### Author/Editor 로그인 동작

- 로그인 시 자동으로 **DW 대시보드**로 리디렉트
- WordPress 기본 대시보드 접근 시 DW 대시보드로 리디렉트
- 사용자 프로필 페이지는 DW 교회관리 내에서 별도 제공

---

## 5. 위젯 관리

### Elementor 위젯 목록

| 위젯 | 설정 키 | 용도 |
|------|---------|------|
| Bulletin Widget | `dw_enable_bulletin_widget` | 최근 주보 목록 |
| Single Bulletin Widget | `dw_enable_single_bulletin_widget` | 단일 주보 상세 |
| Sermon Widget | `dw_enable_sermon_widget` | 최근 설교 목록 |
| Single Sermon Widget | `dw_enable_single_sermon_widget` | 단일 설교 상세 |
| Column Widget | `dw_enable_column_widget` | 목회컬럼 목록 |
| Pastoral Column Widget | `dw_enable_pastoral_column_widget` | 목회컬럼 (대안 레이아웃) |
| Pastoral Columns Grid | `dw_enable_pastoral_columns_grid_widget` | 목회컬럼 그리드 |
| Gallery Widget | `dw_enable_gallery_widget` | 앨범 갤러리 |
| Recent Gallery Widget | — | 최근 앨범 |
| Banner Slider Widget | `dw_enable_banner_slider_widget` | 배너 슬라이더 |
| Banner Grid Widget | — | 배너 그리드 |
| Event Widget | — | 이벤트 목록 |
| Event Grid Widget | — | 이벤트 그리드 |

### 위젯 활성화/비활성화

**DW 교회관리 → 설정 → 위젯 설정** 탭에서 개별 위젯을 활성화/비활성화할 수 있습니다.

---

## 6. 업데이트

### 자동 업데이트

GitHub Personal Access Token이 설정된 경우:
1. WordPress가 자동으로 새 버전 감지 (12시간 캐시)
2. **플러그인** 페이지에 업데이트 알림 표시
3. **지금 업데이트** 클릭

### 수동 업데이트 강제

1. **설정 → DW 설정** → **업데이트 강제 확인** 클릭
2. 또는 관리자 URL에 `?dasom_check_update=1` 추가 (Nonce 필요)

### 업데이트 후 자동 활성화

플러그인이 업데이트 중 비활성화되어도 자동으로 다시 활성화됩니다:
1. 업데이트 전 활성 상태를 Transient에 저장
2. 업데이트 후 자동 활성화 복원
3. 실패 시 `admin_init`에서 비상 활성화 시도

### 폴더 이름 자동 수정

GitHub ZIP 다운로드 시 `dasomweb-dasom-church-management-system-xxxxx` 형식의 폴더명이 자동으로 `dw-church`로 변경됩니다.

---

## 7. 데이터 마이그레이션

### ACF 주보 마이그레이션

**기존 ACF 주보(Jubo) → DW 주보로 변환**

1. **DW 교회관리 → 설정 → 플러그인 설정** 탭
2. **ACF 주보 마이그레이션** 체크박스 활성화 → 저장
3. **대시보드**에 마이그레이션 버튼 표시
4. 버튼 클릭 시 실행

변환되는 필드:
- `sunday` → `dw_bulletin_date`
- `jubo_file_url` → `dw_bulletin_pdf` (PDF 파일을 미디어 폴더로 복사)
- 이미지 → `dw_bulletin_images`
- 원본 `post_date` 유지 (published date 보존)

### ACF 설교 마이그레이션

`date`, `preacher`, `scripture`, `youtube_url` 필드를 대응하는 메타로 변환합니다.

### Post → 컬럼/앨범 마이그레이션

특정 카테고리의 일반 포스트를 해당 CPT로 변환합니다:
- 목회컬럼 카테고리 → `column` CPT
- 교회앨범 카테고리 → `album` CPT

---

## 8. 백업 및 복원

### 백업 대상

| 항목 | 위치 | 포함 내용 |
|------|------|-----------|
| 데이터베이스 | `wp_posts`, `wp_postmeta` | 모든 콘텐츠 및 메타 데이터 |
| 미디어 파일 | `wp-content/uploads/` | 주보 PDF, 이미지, 설교 썸네일 |
| 플러그인 설정 | `wp_options` 테이블 | `dw_church_*`, `dw_enable_*` 키 |
| 플러그인 파일 | `wp-content/plugins/dw-church/` | 플러그인 코드 |

### 권장 백업 도구

- **UpdraftPlus** — 전체 사이트 백업 (무료)
- **WP-CLI** — `wp db export` 명령
- **호스팅 cPanel** — 자동 백업 기능

### 플러그인 삭제 시 데이터 처리

**DW 교회관리 → 설정 → 플러그인 설정** 탭에서:
- **데이터 삭제 옵션** 체크 해제 시: 플러그인 삭제해도 데이터 유지
- **데이터 삭제 옵션** 체크 시: 플러그인 삭제 시 모든 CPT 데이터 + 설정 삭제

---

## 9. 트러블슈팅

### 문제: 주보/설교 URL이 404 오류

**원인:** 리라이트 규칙이 갱신되지 않음

**해결:**
1. **설정 → 퍼머링크**로 이동
2. 아무 변경 없이 **변경 저장** 클릭
3. 캐시 플러그인 사용 시 캐시 비우기

### 문제: 업데이트가 감지되지 않음

**해결:**
1. **설정 → DW 설정**에서 GitHub Token 확인
2. **업데이트 강제 확인** 버튼 클릭
3. Token 권한에 `repo` 스코프가 있는지 확인

### 문제: 업데이트 후 플러그인 비활성화

**자동 복원:** 플러그인이 자동으로 재활성화를 시도합니다.

**수동 해결:**
1. **플러그인** 페이지에서 DW Church **활성화** 클릭
2. 폴더명이 `dw-church`인지 확인 (FTP에서)

### 문제: Elementor 위젯이 보이지 않음

**해결:**
1. **DW 교회관리 → 설정 → 위젯 설정**에서 해당 위젯 활성화 확인
2. Elementor 캐시 비우기: **Elementor → 도구 → 재생성 CSS & 데이터**
3. 브라우저 캐시 비우기

### 문제: 이미지 업로드 실패 (앨범)

**원인:** 허용되지 않은 이미지 형식

**지원 형식:** JPEG, PNG, GIF, WebP, HEIC/HEIF

**해결:**
- 지원되지 않는 형식을 JPEG/PNG로 변환 후 업로드
- 파일 크기가 WordPress 업로드 제한을 초과하지 않는지 확인

### 문제: 혼합 콘텐츠(Mixed Content) 경고

**해결:** `DW_Church_HTTPS_Enforcer` 클래스가 자동으로 처리합니다.

추가 조치가 필요한 경우:
1. WordPress 주소와 사이트 주소가 모두 `https://`인지 확인
2. **설정 → 일반**에서 두 URL 모두 `https://` 사용

### 문제: 날짜 정렬이 올바르지 않음

**해결:** 주보/설교 메타 날짜 형식이 `YYYY-MM-DD`인지 확인. 마이그레이션된 데이터의 경우 날짜 형식이 비표준일 수 있습니다.

---

## 10. 성능 최적화

### 적용된 최적화

| 항목 | 설명 |
|------|------|
| Transient 캐시 | Elementor 위젯 포스트 목록 1시간 캐시 |
| GitHub API 캐시 | 업데이트 체크 결과 12시간 캐시 |
| HTTPS 필터 통합 | 15개+ 중복 필터 → 단일 클래스 |
| 배너 크론 최적화 | DB에서 만료 배너만 직접 조회 |
| 이미지 리사이징 | 앨범 이미지 업로드 시 1280px 자동 리사이징 |

### 추가 권장 사항

- **오브젝트 캐시** 플러그인 사용 (Redis/Memcached)
- **CDN** 연동 (이미지/CSS/JS 제공)
- **캐싱 플러그인** 사용 (WP Super Cache, W3 Total Cache 등)
- 앨범 이미지 최대 개수 관리 (15개 제한 적용됨)

---

## 11. 보안 체크리스트

### 운영 환경 확인

- [ ] WordPress, PHP, 플러그인 최신 버전 유지
- [ ] WordPress 주소 + 사이트 주소 모두 HTTPS 사용
- [ ] GitHub Token이 최소 권한(repo만)으로 설정
- [ ] 관리자 계정에 강력한 비밀번호 설정
- [ ] Author/Editor 역할에 적절한 메뉴 가시성 설정
- [ ] `dw_delete_data_on_uninstall` 옵션이 의도대로 설정
- [ ] 정기 백업 설정

### 플러그인 보안 기능

- 모든 폼 제출에 Nonce 검증 적용
- 사용자 권한 체크 (`current_user_can()`)
- 입력값 소독 및 출력 이스케이프
- HTTPS 강제 적용 (모든 자산)
- 앨범 업로드 시 MIME 타입 검증
- JSON 데이터 파싱 시 유효성 검증

---

## 12. FAQ

### Q: 플러그인을 삭제하면 데이터도 사라지나요?

기본적으로 **데이터는 유지**됩니다. **DW 교회관리 → 설정 → 플러그인 설정**에서 "삭제 시 데이터 제거" 옵션을 활성화한 경우에만 데이터가 함께 삭제됩니다.

### Q: 다른 교회 테마/플러그인과 충돌하나요?

DW Church는 고유한 접두사(`dw_`, `dasom_church_`)를 사용하며, WordPress 표준 API만 활용하므로 대부분의 테마/플러그인과 호환됩니다. Elementor가 설치되지 않은 경우 위젯 기능만 비활성화됩니다.

### Q: 다국어를 지원하나요?

네. 텍스트 도메인 `dw-church`로 번역 파일을 제공할 수 있습니다. `languages/dasom-church.pot` 파일을 기반으로 `.po`/`.mo` 파일을 생성하면 됩니다. 현재 기본 UI는 한국어입니다.

### Q: 주보/설교 목록 정렬 기준은?

- **주보**: `dw_bulletin_date` 메타 기준 내림차순 (DATE 타입)
- **설교**: `dw_sermon_date` 메타 기준 내림차순 (DATE 타입)
- 관리자 목록과 Elementor 위젯 모두 동일

### Q: YouTube 썸네일은 자동으로 설정되나요?

설교에 YouTube URL을 입력하면 자동으로 최고 화질(maxresdefault) 썸네일을 다운로드하여 대표 이미지로 설정합니다. maxresdefault가 없는 경우 hqdefault로 대체합니다.

### Q: 배너 스케줄링은 어떻게 작동하나요?

배너에 종료 날짜를 설정하면 WordPress 크론이 매시간 만료된 배너를 확인하여 자동으로 `draft` 상태로 전환합니다.
