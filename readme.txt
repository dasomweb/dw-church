=== DW Church Management System ===
Contributors: dasomweb
Tags: church, management, sermon, bulletin, worship
Requires at least: 5.8
Tested up to: 6.8
Stable tag: 1.10.4
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Complete church management system for bulletins, sermons, pastoral columns, and photo albums with modern security practices.

== Description ==

DW Church Management System is a comprehensive WordPress plugin designed specifically for churches to manage their digital content efficiently.

= Features =

* **Church Bulletins** - Manage weekly bulletins with PDF uploads and image galleries
* **Sermons** - Organize sermons with YouTube integration, scripture references, and dates
* **Pastoral Columns** - Share pastoral messages with images and YouTube videos
* **Photo Albums** - Create beautiful photo galleries with YouTube video support
* **Preacher Management** - Organize sermons by preacher with custom taxonomy
* **Church Information** - Store and display church contact information and social media links
* **Dashboard** - Quick overview of recent content and custom field references
* **Elementor Compatible** - Use custom fields with Elementor's dynamic tags
* **Permission Management** - Control who can view custom field guides in the dashboard
* **Multilingual Ready** - Translation-ready with Korean language support included

= Custom Post Types =

* Bulletin (주보)
* Sermon (설교)
* Pastoral Column (목회 컬럼)
* Church Album (교회 앨범)

= Custom Taxonomies =

* Sermon Preacher (설교자)

= Security Features =

* Nonce verification for all form submissions
* Input sanitization and output escaping
* User capability checks
* SQL injection prevention with prepared statements

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/dasom-church-management-system` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. Use the DW 교회관리 menu to configure the plugin settings.
4. Navigate to 교회 정보 tab to enter your church information.
5. Navigate to 설정 tab to configure dashboard permissions.

== Frequently Asked Questions ==

= Can I use this plugin with Elementor? =

Yes! The plugin provides custom field keys that can be used with Elementor's Dynamic Tags feature.

= How do I migrate from an older version? =

The plugin automatically migrates your data when you update. The migration runs once when you visit any admin page after updating.

= Can I customize who sees the custom field guides? =

Yes! Go to DW 교회관리 → 설정 → 플러그인 설정 and choose the minimum user role that can view the custom field guides.

= What happens to my data when I uninstall the plugin? =

All plugin data, including custom posts, settings, and meta fields, will be removed when you uninstall the plugin.

== Screenshots ==

1. Dashboard overview with recent content
2. Church bulletin management
3. Sermon management with YouTube integration
4. Pastoral column editor
5. Church album with photo gallery
6. Church information settings
7. Plugin settings and permissions

== Changelog ==

= 1.10.4 =
* Feature: Advanced typography controls for sermon widget
* Feature: Customizable date and preacher icons
* Feature: Icon show/hide toggle for date and preacher
* Feature: Independent icon color and size controls
* Feature: Google Fonts support with font weight, letter-spacing, line-height
* Feature: Title hover color customization
* Feature: Card background, border radius, and shadow controls
* Improvement: Full design control over sermon widget elements
* Improvement: Font Awesome icon library integration

= 1.10.3 =
* Fix: Banner slider now respects start and end dates
* Fix: Expired banners no longer displayed in slider widget
* Fix: Scheduled banners only show after start date
* Improvement: Real-time banner schedule filtering in widget query

= 1.10.2 =
* Feature: Gallery lightbox with previous/next navigation (GLightbox)
* Feature: View all album images in slideshow mode
* Feature: Touch navigation support for mobile devices
* Feature: Image captions in lightbox
* Feature: Loop through gallery images seamlessly
* Improvement: Better user experience for viewing church album photos
* Compatibility: Elementor uses native lightbox, Gutenberg uses GLightbox

= 1.10.1 =
* Fix: Undefined array key warnings in all Elementor widgets
* Fix: Add null coalescing operators for safe array access
* Fix: Gallery widget border_radius warning
* Fix: All widget settings now have default values
* Improvement: More stable widget rendering

= 1.10.0 =
* Feature: DW Recent Sermons Widget (Elementor)
* Feature: DW Bulletins Widget (Elementor)
* Feature: DW Pastoral Columns Widget (Elementor)
* Feature: DW Banner Slider Widget with Swiper.js (Elementor)
* Feature: Individual widget enable/disable controls
* Feature: Recent sermons with grid/list layouts
* Feature: Bulletin list with PDF download links
* Feature: Column list with thumbnails and excerpts
* Feature: Banner slider with autoplay and navigation
* Improvement: Comprehensive widget management system
* Improvement: 5 widgets total for complete church website
* UX: Easy widget activation from settings panel

= 1.9.0 =
* Feature: DW Gallery Widget for Elementor, Gutenberg, and Kadence Block Pro
* Feature: Widget management tab in settings (enable/disable widgets)
* Feature: Album gallery display with Grid and Masonry layouts
* Feature: Responsive column settings (1-6 columns)
* Feature: Multiple image size options (Thumbnail to Full)
* Feature: Customizable gap, border radius, and hover effects
* Feature: Elementor lightbox integration
* Improvement: Modular widget architecture for future expansions
* UX: Easy-to-use widget interface across all page builders
* Compatibility: Works seamlessly with Elementor, Gutenberg, and Kadence

= 1.8.0 =
* Feature: Banner categories (Main Banner / Sub Banner)
* Feature: Sub banner with customizable aspect ratios (16:9, 4:3, 1:1)
* Feature: Dynamic meta box fields based on banner category
* Feature: Main banner uses PC (1920px) + Mobile (720px) images
* Feature: Sub banner uses single image with 1024px width and selectable ratio
* Improvement: Enhanced banner admin columns with category display
* Improvement: Visual category badges with color coding
* UX: Automatic field toggle based on category selection
* UX: Informative banner type guide in meta box

= 1.7.5 =
* Feature: Added Reset buttons for banner start/end date fields
* Improvement: Easier to clear scheduled dates with one click
* UX: Better date management workflow

= 1.7.4 =
* Feature: Data preservation option on plugin uninstall
* Feature: User can choose whether to delete data when removing plugin
* Improvement: Added comprehensive update guide (UPDATE_GUIDE.md)
* Safety: Data is preserved by default (opt-in data deletion)
* Settings: New "플러그인 삭제 시 데이터 삭제" option in Plugin Settings tab

= 1.7.3 =
* Feature: Banner post type for Hero sections (PC/Mobile images)
* Feature: Banner scheduling (start/end dates)
* Feature: Automatic banner expiration (converts to draft)
* Feature: Banner dashboard card with status indicators
* Feature: Banner custom fields in dashboard guide
* Feature: Hourly cron job for banner schedule management
* Built on stable v1.6.6 foundation with all features preserved

= 1.3.1 =
* Fix: Added dw_ prefix to sermon_preacher custom field key in dashboard

= 1.3.0 =
* Feature: Added tabbed settings page (Church Info and Plugin Settings)
* Feature: Added dashboard custom field guide visibility permissions
* Feature: Support for Administrator, Editor, Author, and Contributor roles
* Improvement: Better organization of settings

= 1.2.9 =
* Feature: Added YouTube thumbnail delete button for all post types
* Feature: Church settings custom field prefix unified to dw_
* Feature: Migration script for church settings options
* Improvement: Automatic migration on plugin update

= 1.2.8 =
* Feature: Added social media URL fields (YouTube, Instagram, Facebook, LinkedIn, TikTok, KakaoTalk, KakaoTalk Channel)
* Feature: Dashboard redesign with modern, responsive layout
* Feature: Display only 7 most recent items per post type
* Feature: Custom field keys displayed in dashboard
* Improvement: All custom field prefixes changed to dw_

= 1.2.3 =
* Feature: Automatic data migration on plugin update
* Feature: Migration from old meta keys to dw_ prefixed keys
* Feature: Taxonomy migration (sermon_preacher to dw_sermon_preacher)
* Improvement: One-time migration process

= 1.2.0 =
* Feature: Pastoral column redesign with top/bottom images
* Feature: YouTube thumbnail fetch and management
* Feature: Featured image automation for albums
* Improvement: Custom field prefix standardization
* Fix: Author section hidden in sermon and column additions

= 1.1.0 =
* Feature: Added church album post type
* Feature: YouTube thumbnail support
* Feature: Image gallery with drag-and-drop reordering
* Improvement: Enhanced meta box UI

= 1.0.4 =
* Fix: Fixed foreach() warning for null values
* Improvement: Better error handling for album images

= 1.0.0 =
* Initial release

== Upgrade Notice ==

= 1.7.4 =
Critical safety update! Adds data preservation option. Your data is now safe by default when uninstalling. See UPDATE_GUIDE.md for safe update methods.

= 1.7.3 =
Major feature update! Adds Banner post type for Hero sections with scheduling capabilities. Built on stable v1.6.6 foundation with all core features preserved. Recommended update for churches needing dynamic banner management.

= 1.3.1 =
Minor fix for custom field key display in dashboard.

= 1.3.0 =
New tabbed settings interface and dashboard permission management. Recommended update for better organization.

= 1.2.9 =
Important update with church settings prefix unification and YouTube thumbnail delete feature.

= 1.2.8 =
Major update with social media integration and dashboard redesign. Automatic migration included.

= 1.2.3 =
Automatic migration feature added. Your data will be migrated automatically on update.

= 1.2.0 =
Major update with pastoral column redesign and custom field prefix changes. Migration required.

== Support ==

For support, please visit [GitHub Repository](https://github.com/dasomweb/dasom-church-management-system) or contact the author at [Dasomweb](https://dasomweb.com).

== Privacy Policy ==

This plugin does not collect or store any personal data from your website visitors. All data is stored locally in your WordPress database.

== Credits ==

Developed by Dasomweb

