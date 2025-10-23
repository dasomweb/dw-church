# Changelog

All notable changes to the DW Church Management System project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
