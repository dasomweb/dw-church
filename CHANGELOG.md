# Changelog

All notable changes to the DW Church Management System project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
