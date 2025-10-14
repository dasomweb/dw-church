# DW Church Management System - Migration Guide

## Version 1.2.0 - Custom Field Prefix Change

### 개요
버전 1.2.0부터 모든 커스텀 필드의 접두어가 `dw_`로 통일되었습니다.

### 변경된 커스텀 필드

#### 교회주보 (Bulletin)
- `bulletin_date` → `dw_bulletin_date`
- `bulletin_pdf` → `dw_bulletin_pdf`
- `bulletin_images` → `dw_bulletin_images`

#### 설교 (Sermon)
- `sermon_title` → `dw_sermon_title`
- `sermon_youtube` → `dw_sermon_youtube`
- `sermon_scripture` → `dw_sermon_scripture`
- `sermon_date` → `dw_sermon_date`
- `sermon_thumb_id` → `dw_sermon_thumb_id`

#### 목회컬럼 (Column)
- `column_title` → `dw_column_title`
- `column_content` → `dw_column_content`
- `column_top_image` → `dw_column_top_image`
- `column_bottom_image` → `dw_column_bottom_image`
- `column_youtube` → `dw_column_youtube`
- `column_thumb_id` → `dw_column_thumb_id`

#### 교회앨범 (Album)
- `album_images` → `dw_album_images`
- `dasom_album_images` → `dw_album_images`
- `album_youtube` → `dw_album_youtube`
- `album_thumb_id` → `dw_album_thumb_id`

### 마이그레이션 방법

#### 옵션 1: 자동 마이그레이션 스크립트 사용 (권장)

1. 플러그인을 버전 1.2.0으로 업데이트합니다.

2. 브라우저에서 다음 URL에 접속합니다:
   ```
   http://yoursite.com/wp-content/plugins/dasom-church-management-system/admin/migrate-meta-keys.php
   ```
   
3. 관리자로 로그인되어 있어야 하며, 마이그레이션이 자동으로 진행됩니다.

4. 마이그레이션이 완료되면, 반드시 `admin/migrate-meta-keys.php` 파일을 삭제하세요.

#### 옵션 2: WP-CLI 사용

```bash
wp eval-file wp-content/plugins/dasom-church-management-system/admin/migrate-meta-keys.php
```

### Elementor 사용자 주의사항

Elementor에서 커스텀 필드를 사용하고 있다면, 다음과 같이 필드 이름을 업데이트해야 합니다:

**이전:**
```
{{post_meta:bulletin_date}}
{{post_meta:sermon_title}}
```

**변경 후:**
```
{{post_meta:dw_bulletin_date}}
{{post_meta:dw_sermon_title}}
```

### ACF (Advanced Custom Fields) 사용자

ACF를 사용하는 경우, 필드 그룹 설정에서 필드 이름을 업데이트하거나, ACF의 필드 매핑 기능을 사용하세요.

### 백업 권장

마이그레이션 전에 반드시 데이터베이스 백업을 수행하시기 바랍니다:
- WordPress 대시보드 → 도구 → 내보내기
- 또는 phpMyAdmin을 통한 데이터베이스 백업

### 문제 해결

마이그레이션 후 데이터가 표시되지 않는 경우:

1. Dashboard에서 커스텀 필드 키를 확인하세요.
2. Elementor 위젯에서 필드 이름이 올바르게 업데이트되었는지 확인하세요.
3. 여전히 문제가 있다면, GitHub Issues에 문의하세요: https://github.com/dasomweb/dasom-church-management-system/issues

### 지원

문제가 발생하면 다음 정보를 포함하여 문의하세요:
- WordPress 버전
- PHP 버전
- 플러그인 버전
- 에러 메시지 (있는 경우)

