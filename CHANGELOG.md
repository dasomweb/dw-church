# Changelog

All notable changes to the DW Church Management System project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.71.13] - 2025-03-06

### Changed
- **목회컬럼 마이그레이션**: 카테고리 "목회컬럼"(column), "베델믿음교회 개척 이야기"(churchplanting)에 속한 글만 목록에 표시되도록 필터 적용

## [2.71.12] - 2025-03-06

### Added
- **목회컬럼 마이그레이션 (Post→Column)**: ACF 없이 일반 Post(제목, 본문, 대표 이미지)를 목회컬럼(column)으로 옮기는 도구 — 본문 내 YouTube URL 자동 추출

## [2.71.11] - 2025-03-06

### Added
- **ACF 설교 마이그레이션**: Post의 ACF Sermon 필드(일자, 설교자, 성경구절, YouTube)를 교회 설교(sermon)로 옮기는 마이그레이션 도구 — ACF 주보 마이그레이션 옵션 활성화 시 "ACF 설교 마이그레이션" 메뉴 표시
- **로컬 빌드 스크립트**: `build.ps1` — GitHub Actions와 동일한 방식으로 dw-church.zip 생성

## [2.71.10] - 2025-03-06

### Fixed
- **ACF 주보 마이그레이션 날짜**: ACF Sunday 필드의 다양한 날짜 형식(Ymd, 배열, 타임스탬프, 한글 등)을 인식해 정규화하도록 개선 — 날짜 형식 오류로 건너뛰되던 항목 마이그레이션 가능

## [2.71.9] - 2025-03-06

### Fixed
- **플러그인 설정 저장**: 플러그인 설정 탭의 필드(대시보드 권한, ACF 주보 마이그레이션, 삭제 시 데이터 삭제)가 form 밖에 있어 저장되지 않던 문제 수정 — 필드를 하나의 form으로 감싸고, 탭별로 해당 폼에서 제출된 값만 저장하도록 저장 로직 정리

## [2.71.8] - 2025-03-06

### Added
- **ACF 주보 마이그레이션**: Post의 ACF Jubo 필드(Sunday, Jubo File Url, Image 01~04)를 교회주보(bulletin)로 옮기는 선택적 마이그레이션 도구 (설정 → DW 설정 → 플러그인 설정에서 활성화)

## [2.62.22] - 2025-01-XX

### Fixed
- **Plugin Auto-Activation**: Improved detection and multiple activation methods to ensure plugin stays active after updates
- **Error Logging**: Added better error logging for activation failures

### Enhanced
- **Multiple Activation Mechanisms**: Primary, Secondary, and Emergency activation methods
- **Better Error Handling**: Enhanced error detection and logging for activation issues

## [2.62.21] - 2025-01-XX

### Fixed
- **Church Information Settings**: Fixed nonce field name mismatch that prevented church information from being saved

## [2.46] - 2025-01-30

### Cleaned
- **Repository Cleanup**: Removed 34 unnecessary files and folders
- **Development Files**: Removed build scripts, debug files, and test files
- **Documentation**: Removed outdated guide files
- **Duplicate Folders**: Removed redundant dasomweb-dasom-church-management-system folder
- **Migration Scripts**: Removed completed migration files

### Improved
- **Code Organization**: Cleaner, production-ready folder structure
- **Maintenance**: Easier maintenance with reduced file clutter
- **Performance**: Smaller repository size for faster downloads

## [2.45] - 2025-01-30

## [1.35.3] - 2025-01-27

### Enhanced
- **Image Size Controls**: Added image size type selection (aspect ratio or custom)
- **Image Position**: Added image position selection (left or top)
- **Aspect Ratios**: Multiple aspect ratio options (16:9, 4:3, 3:2, 1:1, 2:3, 3:4, 9:16)
- **Layout Alignment**: Left-aligned date and download button for better layout
- **Responsive Design**: Mobile-optimized layout with forced top positioning

### Features
- **Image Size Type**: Choose between aspect ratio or custom size
- **Image Position**: Select left or top positioning for images
- **Aspect Ratio Options**: 7 different aspect ratios for flexible layouts
- **Custom Sizing**: Width and height controls for custom image sizes
- **Mobile Optimization**: Automatic layout adjustment for mobile devices

### Technical Improvements
- Enhanced CSS with aspect ratio support
- Flexible layout system for different image positions
- Responsive design with mobile-first approach
- Improved content alignment and spacing

## [1.35.2] - 2025-01-27

### Fixed
- **Bulletin Widget Layout**: Updated display templates for proper layout structure
- **Image Template**: Now shows image + date | download button (removed title)
- **Button Template**: Shows title + date | download button
- **Date Display**: Uses dw_bulletin_date meta field for accurate date formatting

### Enhanced
- **Template Structure**: Aligned templates with user requirements
- **Date Source**: Prioritizes dw_bulletin_date meta field over post date
- **Layout Consistency**: Both templates now follow the specified format

## [1.35.1] - 2025-01-27

### Fixed
- **Bulletin Featured Image**: Added thumbnail support to bulletin post type
- **Bulletin Widget**: Updated to use correct 'bulletin' post type instead of 'dasom_bulletin'
- **Post Type Consistency**: Aligned bulletin widget with actual registered post type
- **Featured Image Display**: Bulletin post editing now shows Featured Image meta box

### Enhanced
- **Bulletin Post Type**: Added 'thumbnail' support to bulletin post type registration
- **Widget Compatibility**: Ensured bulletin widget queries correct post type
- **Admin Interface**: Bulletin posts now support Featured Image management

## [1.35.0] - 2025-01-27

### Reverted
- **Sermon Widget Configuration**: Restored sermon widgets to v1.33.0 working configuration
- **Post Type**: Reverted to 'sermon' post type for compatibility
- **Meta Field Prefix**: Restored 'dw_sermon_' prefix for meta fields
- **Widget Functionality**: Ensured full compatibility with existing data structure

### Fixed
- **DW Recent Sermons Widget**: Now works with 'sermon' post type and 'dw_sermon_' meta fields
- **DW Sermon Widget**: Restored compatibility with existing sermon data
- **Data Display**: Both widgets now display sermon data correctly
- **Backward Compatibility**: Maintains compatibility with existing sermon posts

### Enhanced
- **Widget Reliability**: Improved widget functionality and data retrieval
- **Data Consistency**: Aligned widget behavior with v1.33.0 working state
- **User Experience**: Restored full sermon widget functionality

## [1.34.9] - 2025-01-27

### Fixed
- **Sermon Widget Meta Fields**: Corrected meta field names from 'dw_sermon_' to 'dasom_sermon_'
- **Sermon Post Type Support**: Added thumbnail support to sermon post type
- **Widget Data Display**: Fixed sermon widgets to display data correctly
- **Meta Field Consistency**: Aligned widget meta field names with actual stored fields

### Enhanced
- **Sermon Widget Functionality**: Improved sermon widget data retrieval
- **Post Type Features**: Added thumbnail support to sermon post type
- **Widget Reliability**: Enhanced widget data consistency

## [1.34.7] - 2025-01-27

### Fixed
- **Sermon Widget Post Type**: Corrected sermon widget post type from 'sermon' to 'dasom_sermon'
- **Recent Sermons Widget**: Fixed post type query in DW Recent Sermons widget
- **Single Sermon Widget**: Fixed post type query in DW Single Sermon widget
- **Widget Compatibility**: Ensured sermon widgets work with correct post type

### Enhanced
- **Widget Functionality**: Improved sermon widget functionality and reliability
- **Post Type Consistency**: Aligned all sermon widgets with correct post type

## [1.34.6] - 2025-01-27

### Enhanced
- **Query Source Options**: Added 'Current Post' option to bulletin widget query source
- **Query Handling**: Improved query source handling for better flexibility
- **Current Post Detection**: Enhanced current post detection for bulletin posts

### Fixed
- **Widget Functionality**: Ensured current post detection works correctly for bulletins
- **Query Logic**: Fixed query logic to handle all three source types properly

## [1.34.5] - 2025-01-27

### Fixed
- **Featured Image Support**: Enabled featured image support for bulletin post type
- **Post Type Name**: Corrected post type name from 'bulletin' to 'dasom_bulletin' in widget
- **Widget Compatibility**: Fixed bulletin widget to work with correct post type

### Enhanced
- **Post Type Registration**: Added thumbnail support to bulletin post type registration
- **Widget Functionality**: Ensured bulletin widget works with correct post type

## [1.34.4] - 2025-01-27

### Fixed
- Update DASOM_CHURCH_VERSION constant to match plugin header
- Resolve continuous update prompts caused by version mismatch

### Enhanced
- Add cache clear utility for manual cache clearing
- Ensure all version references are consistent

## [1.34.3] - 2025-01-27

### Fixed
- Update plugin header version to match readme.txt
- Resolve version mismatch that could cause activation issues

### Enhanced
- Ensure consistency between plugin header and readme.txt
- Improved version management process

## [1.34.2] - 2025-01-27

### Added
- Automatic featured image setting for bulletin posts
- First uploaded image automatically becomes featured image

### Enhanced
- Consistent behavior with church album functionality
- Better visual representation in DW Bulletin Widget
- Improved bulletin post management workflow

## [1.34.1] - 2025-01-27

### Fixed
- Add announcement icon to DW Bulletin Widget
- Improve widget identification in Elementor panel

### Enhanced
- Use appropriate icon for church bulletin functionality
- Better visual consistency with other widgets

## [1.34.0] - 2025-01-27

### Added
- DW Bulletin Widget for Elementor with two display templates
- Image template with featured image, title, date, and download button
- Button template matching modern design concept with hover effects
- PDF download functionality with new window target
- Support for both latest posts and manual selection query sources
- Comprehensive responsive design for mobile, tablet, and desktop
- Complete styling controls for buttons, titles, and download buttons
- Seamless integration with existing widget registration system

### Technical
- New CSS framework for bulletin widget styling
- Elementor widget registration system integration
- Mobile-first responsive design approach
- PDF file handling with proper security

## [1.33.0] - 2025-01-20

### Added
- Advanced image controls to DW Pastoral Column Widget (width, height, object-fit, object-position)
- Width options for images (Full Size, Box Size, Custom)
- Text alignment controls for Title and Published Date (left, center, right)
- Title & Date display order option (Title → Date or Date → Title)

### Enhanced
- Image controls support responsive settings for all devices
- Object-fit options include Cover, Contain, Fill, None, Scale Down
- Object-position with 9-point alignment grid

## [1.32.1] - 2025-01-15

### Fixed
- Unit tests for sermon meta fields and plugin activation
- GitHub Actions workflow optimization to reduce build time
- Subversion installation step for WordPress test suite
- Auto-confirm database reinstall in CI environment

## [1.32.0] - 2025-01-10

### Added
- DW Pastoral Column Widget - Display single pastoral column with top image, title, date, content, bottom image, and YouTube
- DW Pastoral Columns Recent Grid Widget - Display recent pastoral columns in grid/list layout with pagination support
- Query options for Pastoral Column Widget (Current Post, Latest Post, Manual Selection)
- Thumbnail, date, excerpt controls for Pastoral Columns Grid Widget

### Enhanced
- Widget count increased from 6 to 8
- Consistent styling with existing DW widgets
- Updated widget settings page with new widget descriptions

## [1.31.0] - 2025-01-05

### Added
- Comprehensive PHPUnit testing framework
- Test coverage for custom post types (Bulletin, Sermon, Column, Album, Banner, Event)
- Meta box save/retrieve tests
- Widget registration tests
- Helper function tests
- GitHub Actions CI/CD workflow for automated testing
- Test matrix includes PHP 7.4-8.2 and WordPress 6.3-latest

### Documentation
- Detailed testing guide (README-TESTING.md)

### Development
- Composer.json with PHPUnit dependencies
- Test installation script (bin/install-wp-tests.sh)

---

## Version History Summary

- **v1.34.0**: DW Bulletin Widget with image/button templates
- **v1.33.0**: Advanced image controls for Pastoral Column Widget
- **v1.32.1**: Unit test fixes and CI optimization
- **v1.32.0**: Pastoral Column Widgets with pagination
- **v1.31.0**: Comprehensive testing framework
