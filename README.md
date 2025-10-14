# DW Church Management System

DW Church Management System - 주보, 설교, 목회컬럼, 교회앨범 관리를 위한 WordPress 플러그인

## Changelog

### Version 1.0.8 (2025-01-10)
**Plugin Name Change:**
- Changed plugin name from "Dasom Church Management System" to "DW Church Management System"
- Updated author information and repository URLs
- Improved remove button design for image previews
- Auto-set first album image as featured image

### Version 1.0.7 (2025-01-10)
**UI Improvements:**
- Improved remove button design for image previews
- Fixed X button centering issue
- Added hover effects and smooth transitions
- Auto-set first album image as featured image

### Version 1.0.6 (2025-01-10)
**Bug Fixes:**
- Fixed album images display issues
- Fixed meta key inconsistency between meta boxes and column display
- Added better error handling for missing attachment URLs

### Version 1.0.5 (2025-01-10)
**Bug Fixes:**
- Fixed foreach() warning in meta boxes
- Added null safety checks for images array
- Improved error handling for empty or invalid image data

### Version 1.0.4 (2025-01-10)
**Bug Fixes:**
- **CRITICAL**: Fixed missing admin menu and post types
- Admin class now always loads to properly register post types
- Fixed activation hook to create default categories and preacher

### Version 1.0.3 (2025-01-10)
**Bug Fixes:**
- **CRITICAL**: Completely removed legacy loader class to fix map_meta_cap warnings
- Fixed function redeclaration errors
- Removed duplicate save_post hooks causing conflicts

### Version 1.0.2 (2025-01-10)
**Bug Fixes:**
- Fixed `map_meta_cap` warning in WordPress 6.1+ (removed conflicting capabilities settings)

### Version 1.0.1 (2025-01-10)
**Bug Fixes:**
- 설교 저장 시 무한 로딩 문제 수정 (wp_update_post 무한 루프 방지)
- 설교 삭제 권한 문제 해결
- 중복 포스트 타입 등록 제거
- YouTube 썸네일 다운로드 시 필요한 파일 자동 로드 추가

### Version 1.0.0
- 초기 릴리스
