# 개발자 가이드 (Developer Guide)

DW Church Management System 플러그인의 아키텍처, 코드 구조, 확장 방법을 설명합니다.

---

## 목차

1. [기술 스택 및 요구사항](#1-기술-스택-및-요구사항)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [아키텍처 패턴](#3-아키텍처-패턴)
4. [커스텀 포스트 타입 (CPT)](#4-커스텀-포스트-타입-cpt)
5. [커스텀 택소노미](#5-커스텀-택소노미)
6. [메타 키 상수 (DW_Meta_Keys)](#6-메타-키-상수-dw_meta_keys)
7. [데이터베이스 구조](#7-데이터베이스-구조)
8. [Elementor 위젯 개발](#8-elementor-위젯-개발)
9. [HTTPS 강제 적용 (DW_Church_HTTPS_Enforcer)](#9-https-강제-적용)
10. [GitHub 자동 업데이트 시스템](#10-github-자동-업데이트-시스템)
11. [데이터 마이그레이션](#11-데이터-마이그레이션)
12. [헬퍼 함수](#12-헬퍼-함수)
13. [보안 가이드라인](#13-보안-가이드라인)
14. [빌드 및 배포](#14-빌드-및-배포)
15. [코딩 컨벤션](#15-코딩-컨벤션)

---

## 1. 기술 스택 및 요구사항

| 항목 | 요구사항 |
|------|----------|
| WordPress | 6.0 이상 |
| PHP | 8.0 이상 |
| Elementor | 선택사항 (위젯 기능용) |
| ACF | 선택사항 (마이그레이션용) |

### 개발 환경 설정

```bash
# 의존성 설치
composer install

# 테스트 실행
vendor/bin/phpunit
```

---

## 2. 프로젝트 구조

```
dw-church/
├── dw-church.php                    # 메인 진입점 (플러그인 헤더, 상수, HTTPS, 업데이트)
├── uninstall.php                    # 플러그인 삭제 시 데이터 정리
├── composer.json                    # PHP 의존성
├── build.ps1                        # 빌드 스크립트
│
├── admin/                           # 관리자 기능
│   ├── class-dw-church-admin.php              # 메인 Admin 클래스 (CPT 등록, 메뉴, 설정)
│   ├── class-dw-church-meta-boxes.php         # 메타박스 UI 및 저장
│   ├── class-dw-church-columns.php            # 관리자 목록 컬럼 표시
│   ├── class-dw-church-admin-customization.php # 관리자 UI 커스터마이징
│   ├── class-dw-church-menu-visibility.php    # 메뉴 권한 제어
│   ├── class-dw-church-acf-bulletin-migration.php  # ACF → 주보 마이그레이션
│   ├── class-dw-church-acf-sermon-migration.php    # ACF → 설교 마이그레이션
│   ├── class-dw-church-post-column-migration.php   # Post → 컬럼 마이그레이션
│   ├── class-dw-church-post-album-migration.php    # Post → 앨범 마이그레이션
│   └── views/
│       ├── dashboard.php            # 대시보드 뷰
│       ├── settings.php             # 설정 페이지 뷰
│       └── github-update.php        # GitHub 업데이트 설정 뷰
│
├── includes/                        # 코어 기능
│   ├── class-dw-church-loader.php              # 레거시 CPT (하위 호환)
│   ├── class-dw-church-widgets.php             # Elementor 위젯 로더
│   ├── class-dw-church-update-manager.php      # GitHub 업데이트 매니저
│   ├── functions-helpers.php                   # 유틸리티 함수 + DW_Meta_Keys 상수
│   └── widgets/elementor/                      # Elementor 위젯 (13개)
│       ├── class-dw-elementor-bulletin-widget.php
│       ├── class-dw-elementor-single-bulletin-widget.php
│       ├── class-dw-elementor-sermon-widget.php
│       ├── class-dw-elementor-single-sermon-widget.php
│       ├── class-dw-elementor-column-widget.php
│       ├── class-dw-elementor-pastoral-column-widget.php
│       ├── class-dw-elementor-pastoral-columns-grid-widget.php
│       ├── class-dw-elementor-gallery-widget.php
│       ├── class-dw-elementor-recent-gallery-widget.php
│       ├── class-dw-elementor-banner-slider-widget.php
│       ├── class-dw-elementor-banner-grid-widget.php
│       ├── class-dw-elementor-event-widget.php
│       └── class-dw-elementor-event-grid-widget.php
│
├── public/                          # 프론트엔드
│   └── class-dw-church-public.php   # 숏코드, 프론트엔드 출력
│
├── assets/                          # 정적 자산
│   ├── css/ (admin.css, public.css, dw-bulletin-widget.css)
│   └── js/  (admin.js, public.js)
│
└── languages/                       # 다국어
    └── dasom-church.pot
```

---

## 3. 아키텍처 패턴

### 싱글톤 패턴

모든 주요 클래스는 싱글톤 패턴을 사용합니다:

```php
class DW_Church_Admin {
    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->dw_church_init_hooks();
    }
}
```

### 초기화 흐름

```
dw-church.php (진입점)
  ├─ 상수 정의 (DASOM_CHURCH_VERSION, _PLUGIN_URL, _PLUGIN_PATH, ...)
  ├─ DW_Church_HTTPS_Enforcer::init()     ← HTTPS 강제
  ├─ GitHub 업데이트 훅 등록
  ├─ DW_Church_Management::get_instance()  ← 메인 클래스
  │    ├─ functions-helpers.php 로드
  │    ├─ Admin 클래스들 require + init
  │    ├─ Public 클래스 로드 (!is_admin 시)
  │    └─ 활성화/비활성화 훅 등록
  ├─ class-dw-church-widgets.php 로드      ← Elementor 위젯
  └─ class-dw-church-update-manager.php 로드
```

---

## 4. 커스텀 포스트 타입 (CPT)

`DW_Church_Admin::dw_church_register_post_types()`에서 등록됩니다.

| 포스트 타입 | 슬러그 | 지원 기능 | 용도 |
|------------|--------|-----------|------|
| 교회주보 | `bulletin` | title, author, thumbnail | 주간 주보 |
| 설교 | `sermon` | title, author | 설교 영상/정보 |
| 목회컬럼 | `column` | title, editor, author, thumbnail | 목회자 글 |
| 교회앨범 | `album` | title, thumbnail | 사진 갤러리 |
| 배너 | `banner` | title | 홈페이지 배너 |
| 이벤트 | `event` | title | 교회 이벤트 |

모든 CPT는 `show_in_rest: true`로 REST API를 지원합니다.

---

## 5. 커스텀 택소노미

| 택소노미 | 연결 CPT | 계층형 | 용도 |
|----------|---------|--------|------|
| `sermon_category` | sermon | Yes | 설교 분류 (주일/새벽/수요/금요) |
| `dw_sermon_preacher` | sermon | No | 설교자 관리 |
| `banner_category` | banner | Yes | 배너 분류 (메인/서브) |
| `album_category` | album | Yes | 앨범 분류 |

---

## 6. 메타 키 상수 (DW_Meta_Keys)

`includes/functions-helpers.php`에 정의된 상수 클래스:

```php
class DW_Meta_Keys {
    // Bulletin
    const BULLETIN_DATE   = 'dw_bulletin_date';
    const BULLETIN_PDF    = 'dw_bulletin_pdf';
    const BULLETIN_IMAGES = 'dw_bulletin_images';

    // Sermon
    const SERMON_TITLE     = 'dw_sermon_title';
    const SERMON_YOUTUBE   = 'dw_sermon_youtube';
    const SERMON_SCRIPTURE = 'dw_sermon_scripture';
    const SERMON_DATE      = 'dw_sermon_date';
    const SERMON_THUMB_ID  = 'dw_sermon_thumb_id';

    // Column
    const COLUMN_TITLE        = 'dw_column_title';
    const COLUMN_CONTENT      = 'dw_column_content';
    const COLUMN_TOP_IMAGE    = 'dw_column_top_image';
    const COLUMN_BOTTOM_IMAGE = 'dw_column_bottom_image';
    const COLUMN_YOUTUBE      = 'dw_column_youtube';
    const COLUMN_THUMB_ID     = 'dw_column_thumb_id';

    // Album
    const ALBUM_IMAGES   = 'dw_album_images';
    const ALBUM_YOUTUBE  = 'dw_album_youtube';
    const ALBUM_THUMB_ID = 'dw_album_thumb_id';

    // Banner
    const BANNER_IMAGE    = 'dw_banner_image';
    const BANNER_URL      = 'dw_banner_url';
    const BANNER_END_DATE = 'dw_banner_end_date';

    // Event
    const EVENT_DATE     = 'dw_event_date';
    const EVENT_END_DATE = 'dw_event_end_date';
    const EVENT_LOCATION = 'dw_event_location';
    const EVENT_URL      = 'dw_event_url';
}
```

**사용 예:**
```php
$date = get_post_meta($post_id, DW_Meta_Keys::BULLETIN_DATE, true);
```

---

## 7. 데이터베이스 구조

이 플러그인은 별도의 테이블을 생성하지 않고, WordPress 기본 테이블을 사용합니다:

- `wp_posts` — CPT 데이터 저장
- `wp_postmeta` — 메타 데이터 (날짜, PDF, 이미지 등)
- `wp_terms / wp_term_taxonomy / wp_term_relationships` — 택소노미
- `wp_options` — 플러그인 설정

### 주요 Options 키

| 옵션 키 | 용도 |
|---------|------|
| `dw_church_version` | 설치된 버전 |
| `dw_church_installed` | 설치 일시 |
| `dw_github_access_token` | GitHub API 토큰 |
| `dw_church_{name,address,phone,...}` | 교회 기본 정보 |
| `dw_enable_*_widget` | 위젯 활성화 여부 |
| `dw_dashboard_fields_visibility` | 대시보드 필드 노출 제어 |
| `dw_delete_data_on_uninstall` | 삭제 시 데이터 제거 여부 |

### 이미지 저장 형식

주보/앨범 이미지는 JSON 배열로 저장됩니다:

```json
[2526, 2527, 2528]  // WordPress attachment ID 배열
```

---

## 8. Elementor 위젯 개발

### 위젯 등록 흐름

```
class-dw-church-widgets.php
  └─ elementor/widgets_registered 액션
       ├─ 각 위젯 PHP 파일 require
       └─ $widgets_manager->register(new Widget_Class())
```

### 새 위젯 만들기

1. `includes/widgets/elementor/`에 파일 생성
2. `\Elementor\Widget_Base` 상속
3. `_register_controls()`, `render()` 구현
4. `class-dw-church-widgets.php`에 등록

```php
class DW_Elementor_My_Widget extends \Elementor\Widget_Base {
    public function get_name() { return 'dw-my-widget'; }
    public function get_title() { return __('My Widget', 'dw-church'); }
    public function get_icon() { return 'eicon-posts-grid'; }
    public function get_categories() { return ['dw-church']; }

    protected function _register_controls() {
        $this->start_controls_section('content', [
            'label' => __('Content', 'dw-church'),
        ]);

        // 포스트 선택 시 캐시된 헬퍼 사용
        $this->add_control('selected_post', [
            'label' => __('Select Post', 'dw-church'),
            'type' => \Elementor\Controls_Manager::SELECT2,
            'options' => dasom_church_get_post_options('my_post_type'),
            'multiple' => true,
        ]);

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        // 렌더링 로직
    }
}
```

### 위젯 쿼리 캐싱

위젯 컨트롤에서 포스트 목록을 가져올 때는 반드시 `dasom_church_get_post_options()`를 사용합니다:

```php
// ❌ 직접 쿼리 (성능 문제)
$posts = get_posts(['post_type' => 'sermon', 'posts_per_page' => -1]);

// ✅ Transient 캐시 사용 (1시간 캐시, save_post 시 자동 무효화)
$options = dasom_church_get_post_options('sermon');
```

---

## 9. HTTPS 강제 적용

`DW_Church_HTTPS_Enforcer` 클래스가 모든 URL을 HTTPS로 변환합니다.

적용 대상:
- `script_loader_src` / `style_loader_src` — JS/CSS 소스
- `content_url`, `plugins_url`, `admin_url`, `login_url` 등 — WordPress URL
- `upload_dir` — 업로드 디렉토리
- `wp_get_attachment_url` / `post_thumbnail_html` — 이미지/썸네일
- `elementor/frontend/print_google_fonts` — Elementor 폰트

---

## 10. GitHub 자동 업데이트 시스템

### 구조

```
dw-church.php
  ├─ dw_church_check_for_updates()     # pre_set_site_transient_update_plugins
  ├─ dw_church_plugin_info()           # plugins_api
  ├─ dw_church_upgrader_pre_download() # 인증 다운로드
  ├─ dw_church_fix_update_folder()     # 폴더명 수정
  ├─ dw_church_save_active_state()     # 업데이트 전 활성 상태 저장
  └─ dw_church_restore_active_state()  # 업데이트 후 자동 활성화
```

### 작동 원리

1. WordPress가 업데이트 체크 시 GitHub API에서 최신 릴리스 조회
2. 12시간 Transient 캐시 사용
3. 비공개 레포 지원: `dw_github_access_token` 옵션으로 인증
4. 다운로드 후 폴더명을 `dw-church`로 자동 수정
5. 업데이트 후 자동 활성화 복원

---

## 11. 데이터 마이그레이션

4가지 마이그레이션 도구가 있습니다:

| 클래스 | 원본 → 대상 | 설명 |
|--------|------------|------|
| `DW_Church_ACF_Bulletin_Migration` | ACF 주보(Jubo) → `bulletin` | ACF 필드 → 주보 메타 |
| `DW_Church_ACF_Sermon_Migration` | ACF 설교 → `sermon` | ACF 필드 → 설교 메타 |
| `DW_Church_Post_Column_Migration` | Post(목회컬럼 카테고리) → `column` | 본문에서 YouTube URL 추출 |
| `DW_Church_Post_Album_Migration` | Post(교회앨범 카테고리) → `album` | 본문에서 이미지 추출 |

활성화: **DW 교회관리 → 설정 → 플러그인 설정** 탭에서 개별 토글.

---

## 12. 헬퍼 함수

`includes/functions-helpers.php`에 정의된 유틸리티:

| 함수 | 용도 |
|------|------|
| `dasom_church_get_youtube_id($url)` | YouTube URL에서 비디오 ID 추출 |
| `dasom_church_get_youtube_thumbnail($id, $quality)` | YouTube 썸네일 URL 생성 |
| `dasom_church_download_youtube_thumbnail($post_id, $url)` | YouTube 썸네일 다운로드 후 미디어에 첨부 |
| `dasom_church_get_post_options($type, $limit)` | CPT 목록 Transient 캐시 조회 |
| `dasom_church_invalidate_post_options_cache($post_id)` | 캐시 무효화 (save_post/delete_post) |
| `dasom_church_get_post_meta($id, $key, $default)` | 메타 조회 (기본값 지원) |
| `dasom_church_format_date($date, $format)` | 날짜 포맷 (다국어) |
| `dasom_church_get_setting($key, $default)` | 플러그인 설정 조회 |
| `dasom_church_update_setting($key, $value)` | 플러그인 설정 저장 |
| `dasom_church_sanitize_image_ids($images)` | 이미지 ID 배열 검증 |

---

## 13. 보안 가이드라인

### 필수 체크리스트

- **Nonce 검증**: 모든 폼 제출에 `wp_nonce_field()` / `wp_verify_nonce()` 사용
- **권한 체크**: `current_user_can()` 으로 접근 제어
- **입력 검증**: `sanitize_text_field()`, `absint()`, `esc_url_raw()` 사용
- **출력 이스케이프**: `esc_html()`, `esc_attr()`, `esc_url()` 사용
- **SQL 인젝션 방지**: `$wpdb->prepare()` 사용 (직접 쿼리 시)
- **JSON 검증**: `json_decode()` 후 반드시 `is_array()` 체크

### 금지 사항

```php
// ❌ $_SERVER 직접 접근
wp_redirect('https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']);

// ✅ WordPress 함수 사용
wp_safe_redirect(admin_url('plugins.php'));

// ❌ 검증 없는 GET 파라미터
if (isset($_GET['action'])) { do_something(); }

// ✅ Nonce 검증 포함
if (isset($_GET['action']) && wp_verify_nonce($_GET['_wpnonce'], 'my_action')) { do_something(); }
```

---

## 14. 빌드 및 배포

### 로컬 빌드

```powershell
# PowerShell 빌드 스크립트 실행
.\build.ps1
# → build/dw-church/ 디렉토리에 배포용 파일 생성
```

### GitHub Actions 자동 릴리스

`.github/workflows/release.yml`이 태그 push 시 자동으로:
1. 배포용 ZIP 생성
2. GitHub Release에 첨부

### 릴리스 프로세스

```bash
# 1. 버전 업데이트 (dw-church.php 헤더)
# 2. 커밋 & 푸시
git add -A && git commit -m "v2.x.x 설명" && git push

# 3. 릴리스 생성
gh release create v2.x.x --title "v2.x.x" --notes "변경사항"
```

---

## 15. 코딩 컨벤션

### 네이밍

- **클래스**: `DW_Church_Admin`, `DW_Elementor_Sermon_Widget`
- **메서드**: `dw_church_register_post_types()` (클래스 접두사 포함)
- **함수**: `dasom_church_get_post_meta()` (전역 함수)
- **상수**: `DASOM_CHURCH_VERSION`, `DW_Meta_Keys::SERMON_DATE`
- **메타 키**: `dw_` 접두사 (`dw_bulletin_date`, `dw_sermon_youtube`)
- **옵션 키**: `dw_church_` 또는 `dw_enable_` 접두사
- **텍스트 도메인**: `dw-church`

### 파일 구조

- 클래스 파일: `class-{name}.php`
- 뷰 파일: `admin/views/{name}.php`
- 위젯 파일: `class-dw-elementor-{name}-widget.php`

### 기타

- PHP 8.0+ 문법 사용 가능
- 모든 문자열은 `__()` 또는 `esc_html__()` 로 번역 가능하게
- `error_log()`는 개발 중에만 사용, 프로덕션 커밋 전 반드시 제거
