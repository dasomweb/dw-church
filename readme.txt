=== DW Church ===
Contributors: dasomweb
Donate link: https://dasomweb.com
Tags: church, management, sermon, bulletin, worship, gallery, events, dashboard
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 8.0
Stable tag: 2.60.1
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

= 2.60.1 =
* Fix: Fix ArgumentCountError in album meta box sprintf() call

= 2.60 =
* Feature: Limit album images to maximum 16 images
* Feature: Auto-resize uploaded album images to maximum 1280px width
* Feature: Restrict image file types for album uploads (JPEG, PNG, GIF, WebP, HEIC, HEIF)
* Enhancement: Display current/maximum image count in album editor
* Enhancement: Improve image upload validation and error messages

= 2.59 =
* Fix: Remove default hover effects and enable Elementor hover controls
* Feature: Add Card Hover section with Normal/Hover tabs in DW Single Bulletin widget
* Enhancement: Replace custom hover_effect control with Elementor's standard hover controls
* Enhancement: Add Hover Shadow, Hover Border, Transform, and Transition Duration controls
* Fix: Remove data-hover attribute and related CSS to prevent conflicts

= 2.58 =
* Fix: Remove hardcoded box-shadow and border from CSS to allow Elementor controls to work
* Fix: Remove hardcoded border-radius from CSS and inline styles to allow Elementor controls to work
* Fix: Enable Card Border control in DW Single Bulletin and DW Bulletin widgets
* Fix: Enable Card Shadow control by removing conflicting CSS
* Fix: Enable Card Border Radius control by removing conflicting CSS
* Enhancement: All Elementor Group_Control styles now work correctly without CSS conflicts

= 2.57 =
* Fix: Prevent content overflow with comprehensive CSS overflow controls
* Enhancement: Add word-wrap and break-word properties to all text elements
* Enhancement: Ensure max-width and max-height constraints on all containers
* Feature: Allow simple HTML tags (br, strong, em, span) in Title and Date/Time fields
* Fix: Apply overflow:hidden and containment properties to prevent any content from escaping card boundaries

= 2.56 =
* Feature: Make Text Position responsive (Desktop/Tablet/Mobile)
* Enhancement: Add responsive control for Text Position with separate settings for each device
* Enhancement: Auto-apply text alignment based on responsive Text Position values
* Fix: Apply correct text position and alignment for each device using CSS media queries

= 2.55 =
* Fix: Remove Text Alignment control and auto-apply text-align based on Text Position
* Fix: Left positions (top-left, center-left, bottom-left) automatically use left text alignment
* Fix: Right positions (top-right, center-right, bottom-right) automatically use right text alignment
* Fix: Center positions (top-center, center-center, bottom-center) automatically use center text alignment
* Enhancement: Simplify widget controls by removing redundant Text Alignment option

= 2.54 =
* Fix: Replace inline styles with CSS classes for consistent text position alignment
* Fix: Add explicit CSS classes for all 9 text position options (top-left, top-center, etc.)
* Fix: Ensure all cards receive identical CSS classes for consistent styling
* Enhancement: Remove dependency on inline styles that caused random alignment issues

= 2.53 =
* Fix: Resolve random text position alignment issue in DW Event Grid widget
* Fix: Use :not() selector to exclude text-content from universal max-width rule
* Fix: Add all possible CSS selector combinations to ensure consistent application
* Fix: Explicitly set flex-shrink, flex-grow, and flex-basis for reliable flex behavior
* Enhancement: All 9 text position options now work consistently on every card without random failures

= 2.52 =
* Fix: Ensure consistent text position alignment across all cards in DW Event Grid widget
* Fix: Remove default width constraints and apply responsive width rules separately for mobile and desktop
* Fix: Strengthen CSS selectors with multiple variations to ensure all cards receive styling
* Enhancement: All 9 text position options now work consistently on every card in the grid

= 2.51 =
* Fix: Improve text position alignment fix with stronger CSS rules for PC/Laptop/Tablet
* Fix: Add !important flags and flex properties to ensure all 9 text positions work correctly
* Enhancement: All text position options now properly apply across all desktop device sizes

= 2.50 =
* Fix: Resolve text position alignment issue in DW Event Grid widget for PC/Laptop/Tablet
* Fix: Allow all text position options to work correctly (left, center, right alignments)
* Enhancement: Text position control now properly aligns content for all 9 position options

= 2.49 =
* Fix: Allow Typography controls to work properly in DW Event Grid widget
* Fix: Remove hardcoded color from Date/Time element to enable Typography control
* Enhancement: Department and Date/Time Typography settings now properly apply styles

= 2.48 =
* Fix: Resolve pagination overflow issue in DW Recent Gallery widget on mobile devices
* Fix: Apply containment and isolation CSS to prevent widget content from escaping boundaries
* Enhancement: Add overflow protection and layout isolation for gallery widget container
* Technical: Implement same overflow fix pattern used in DW Event Grid widget

= 1.35.3 =
* Enhancement: Add image size and position controls to bulletin widget
* Feature: Image size type selection (aspect ratio or custom)
* Feature: Image position selection (left or top)
* Feature: Multiple aspect ratio options (16:9, 4:3, 3:2, 1:1, 2:3, 3:4, 9:16)
* Improvement: Left-aligned date and download button for better layout
* Enhancement: Responsive design for mobile devices

= 1.35.2 =
* Fix: Update bulletin widget display templates for proper layout
* Enhancement: Image template now shows image + date | download button
* Enhancement: Button template shows title + date | download button
* Improvement: Use dw_bulletin_date meta field for date display

= 1.35.1 =
* Fix: Add thumbnail support to bulletin post type for Featured Image display
* Fix: Update bulletin widget to use correct 'bulletin' post type
* Enhancement: Ensure bulletin post editing shows Featured Image meta box
* Improvement: Align bulletin widget with correct post type and meta fields

= 1.35.0 =
* Revert: Restore sermon widgets to v1.33.0 working configuration
* Fix: Use 'sermon' post type and 'dw_sermon_' meta field prefix
* Enhancement: Ensure compatibility with existing sermon data structure
* Improvement: Restore full functionality of DW Recent Sermons and DW Sermon widgets

= 1.34.9 =
* Fix: Correct sermon widget meta field names from 'dw_sermon_' to 'dasom_sermon_'
* Fix: Add thumbnail support to sermon post type
* Enhancement: Ensure sermon widgets display data correctly

= 1.34.8 =
* Enhancement: Add DW Single Sermon Widget settings to admin page
* Fix: Include missing widget configuration in settings interface
* Improvement: Update widget count from 8 to 9 widgets

= 1.34.7 =
* Fix: Correct sermon widget post type from 'sermon' to 'dasom_sermon'
* Fix: Update both Recent Sermons and Single Sermon widgets
* Enhancement: Ensure sermon widgets work with correct post type

= 1.34.6 =
* Enhancement: Add 'Current Post' option to bulletin widget query source
* Improvement: Better query source handling for bulletin widget
* Fix: Ensure current post detection works correctly for bulletins

= 1.34.5 =
* Fix: Enable featured image support for bulletin post type
* Fix: Correct post type name from 'bulletin' to 'dasom_bulletin' in widget
* Enhancement: Add thumbnail support to bulletin post type registration
* Improvement: Ensure bulletin widget works with correct post type

= 1.34.4 =
* Fix: Update DASOM_CHURCH_VERSION constant to match plugin header
* Fix: Resolve continuous update prompts caused by version mismatch
* Enhancement: Add cache clear utility for manual cache clearing
* Improvement: Ensure all version references are consistent

= 1.34.3 =
* Fix: Update plugin header version to match readme.txt
* Fix: Resolve version mismatch that could cause activation issues
* Enhancement: Ensure consistency between plugin header and readme.txt

= 1.34.2 =
* Feature: Add automatic featured image setting for bulletin posts
* Enhancement: First uploaded image automatically becomes featured image
* Enhancement: Consistent behavior with church album functionality
* Improvement: Better visual representation in DW Bulletin Widget

= 1.34.1 =
* Fix: Add announcement icon to DW Bulletin Widget
* Enhancement: Improve widget identification in Elementor panel
* Enhancement: Use appropriate icon for church bulletin functionality

= 1.34.0 =
* Feature: Add DW Bulletin Widget for Elementor with two display templates
* Feature: Image template with featured image, title, date, and download button
* Feature: Button template matching modern design concept with hover effects
* Feature: PDF download functionality with new window target
* Feature: Support for both latest posts and manual selection query sources
* Feature: Comprehensive responsive design for mobile, tablet, and desktop
* Enhancement: Complete styling controls for buttons, titles, and download buttons
* Enhancement: Seamless integration with existing widget registration system

= 1.33.0 =
* Feature: Add advanced image controls to DW Pastoral Column Widget (width, height, object-fit, object-position)
* Feature: Add width options for images (Full Size, Box Size, Custom)
* Feature: Add text alignment controls for Title and Published Date (left, center, right)
* Feature: Add Title & Date display order option (Title → Date or Date → Title)
* Enhancement: Image controls support responsive settings for all devices
* Enhancement: Object-fit options include Cover, Contain, Fill, None, Scale Down
* Enhancement: Object-position with 9-point alignment grid

= 1.32.1 =
* Fix: Fix unit tests for sermon meta fields and plugin activation
* Fix: Optimize GitHub Actions workflow to reduce build time
* Fix: Add Subversion installation step for WordPress test suite
* Fix: Auto-confirm database reinstall in CI environment

= 1.32.0 =
* Feature: Add DW Pastoral Column Widget - Display single pastoral column with top image, title, date, content, bottom image, and YouTube
* Feature: Add DW Pastoral Columns Recent Grid Widget - Display recent pastoral columns in grid/list layout with pagination support
* Feature: Query options for Pastoral Column Widget (Current Post, Latest Post, Manual Selection)
* Feature: Thumbnail, date, excerpt controls for Pastoral Columns Grid Widget
* Enhancement: Widget count increased from 6 to 8
* Enhancement: Consistent styling with existing DW widgets
* Documentation: Updated widget settings page with new widget descriptions

= 1.31.0 =
* Feature: Add comprehensive PHPUnit testing framework
* Feature: Add test coverage for custom post types (Bulletin, Sermon, Column, Album, Banner, Event)
* Feature: Add meta box save/retrieve tests
* Feature: Add widget registration tests
* Feature: Add helper function tests
* Feature: Add GitHub Actions CI/CD workflow for automated testing
* Feature: Test matrix includes PHP 7.4-8.2 and WordPress 6.3-latest
* Documentation: Add detailed testing guide (README-TESTING.md)
* Development: Add composer.json with PHPUnit dependencies
* Development: Add test installation script (bin/install-wp-tests.sh)

= 1.30.1 =
* Fix: Resolve Elementor control name conflict between DW Event and DW Event Grid widgets
* Fix: Rename all DW Event widget controls to unique names (event_single_* prefix)
* Fix: Prevent "Cannot redeclare control" error when both widgets are on same page
* Technical: All style section IDs now use event_single_ prefix for uniqueness

= 1.30.0 =
* Feature: Reorganize DW Event widget content structure
* Feature: New content order - Department → Title → Date/Time → Description → Button
* Feature: Add "Read More" button (자세히 보기) when URL is provided
* Feature: Split Meta section into separate Department and DateTime style controls
* Feature: Add comprehensive Button style controls (Typography, Colors, Padding, Border Radius)
* Feature: Independent styling for Department and Date/Time elements
* Enhancement: Remove title link, add dedicated button instead
* Enhancement: Better visual hierarchy and content organization

= 1.29.2 =
* Enhancement: Add light gray background (#f5f5f5) to pagination buttons
* Enhancement: Darker gray (#e0e0e0) on hover for better visibility
* Enhancement: Current page remains black background (#000)
* Enhancement: Improved visual contrast and modern appearance

= 1.29.1 =
* Fix: Pagination design refinement to match screenshot
* Fix: "처음"/"마지막" now display as text only (no circular background)
* Fix: Reduce circular button size from 40px to 32px for better aesthetics
* Fix: Only page numbers and arrows (‹ ›) have circular buttons
* Fix: Add hover effect for text-only links (처음/마지막)
* Enhancement: More compact and elegant pagination design

= 1.29.0 =
* Feature: Add pagination to DW Recent Gallery widget
* Feature: Add pagination to DW Recent Sermons widget
* Feature: All three widgets (Event Grid, Recent Gallery, Recent Sermons) now support pagination
* Feature: Consistent pagination design across all widgets
* Feature: Enable Pagination toggle for each widget
* Feature: Complete pagination style controls (typography, colors, spacing)
* Enhancement: Beautiful circular pagination buttons with hover effects
* Enhancement: Support for large content lists with page navigation

= 1.28.0 =
* Feature: Add pagination to DW Event Grid widget
* Feature: Pagination on/off toggle (Enable Pagination switch)
* Feature: Beautiful pagination design matching provided screenshot
* Feature: Pagination style controls (colors, typography, spacing)
* Enhancement: Support for large event lists with page navigation
* Note: Pagination only available for Latest Posts query (not Manual Selection)
* Note: DW Recent Gallery and DW Recent Sermons pagination coming in next update

= 1.27.4 =
* Fix: Correct Meta section label to "Meta (Date/Time | Department)" in DW Event widget
* Improvement: More accurate section naming

= 1.27.3 =
* Feature: Add Object Fit control to DW Event widget image (Fill, Contain, Cover, None, Scale Down)
* Feature: Add Object Position control to DW Event widget image (9 position options)
* Enhancement: Better image display control

= 1.27.2 =
* Feature: Add image border control to DW Event widget
* Feature: Add image border radius control to DW Event widget
* Enhancement: Better image styling options

= 1.27.1 =
* Change: Event Grid title now links to event post instead of custom URL
* Enhancement: Better navigation to event detail pages
* Note: Event Grid already has query functionality (Latest/Manual selection)

= 1.27.0 =
* Feature: Add new DW Event widget for single event display
* Feature: Desktop layout - Image (40%) left, content (60%) right
* Feature: Mobile layout - Vertical stacking (Image → Content)
* Feature: Adjustable image ratio (1:1, 4:3, 16:9, 21:9, Custom)
* Feature: Responsive image width control
* Feature: Query options (Current Post, Latest Post, Manual Selection)
* Feature: Typography and color controls for all text elements
* Feature: Clickable title with event URL support
* Enhancement: Display format - Title, Date/Time | Department, Description

= 1.26.3 =
* Enhancement: Make event title clickable with event URL
* Improvement: Title inherits color and text decoration styles
* Enhancement: Better user experience with linked titles

= 1.26.2 =
* Feature: Add Department typography and color controls to Event Grid widget
* Feature: Add spacing controls for Department, Title, and Date/Time
* Enhancement: Separate style controls for Department, Title, and Date/Time
* Enhancement: Responsive spacing adjustments for text elements
* Improvement: Better visual customization for event grid text elements
* Fix: Remove hardcoded margins in favor of Elementor controls

= 1.26.1 =
* Feature: Add height ratio options to Event Grid widget (4:3, 16:9, 9:16, Custom)
* Enhancement: Support aspect ratio-based height control for event grid items
* Improvement: More flexible event grid layout customization

= 1.26.0 =
* Feature: Add Department field to Event post type
* Change: Update Event Grid widget display order (Department → Title → Date/Time)
* Enhancement: Display event department information in grid layout
* Improvement: Better event information organization

= 1.25.5 =
* Change: Update Event description label (remove "간단한")
* Change: Convert Banner link target from radio buttons to checkbox (same as Event)
* Enhancement: Unified UI for link target selection across Event and Banner

= 1.25.4 =
* Fix: Change inline script loading method from wp_add_inline_script to admin_footer
* Fix: Ensure Event media upload buttons work by outputting JavaScript directly
* Enhancement: More reliable JavaScript execution for meta box buttons

= 1.25.3 =
* Fix: Add Event background image upload functionality to inline JavaScript
* Change: Remove redundant hint messages and recommended size text
* Feature: Add "Open in new window" checkbox for Event URL
* Enhancement: Apply URL target setting in Event Grid widget
* Fix: Resolve media uploader button issue in Event meta box
* Improvement: Simplified Event meta box interface

= 1.25.2 =
* Change: Move text position/alignment/padding controls from Event meta box to DW Event Grid widget
* Feature: Add YouTube thumbnail fetch functionality for Event (same as Sermon/Column/Album)
* Fix: Update Event to use standard thumbnail field (dw_event_thumb_id) instead of custom field
* Enhancement: Unified YouTube thumbnail handling across all post types
* Improvement: Simplified Event meta box UI
* Change: Remove Gutenberg editor support for Event post type

= 1.25.1 =
* Fix: Disable Gutenberg editor for Event post type
* Fix: Remove editor and thumbnail from Event supports
* Change: Event post type now uses classic editor interface like Banner

= 1.25.0 =
* Feature: Add Event custom post type
* Feature: Add Event meta boxes (background image, date/time, URL, description, YouTube)
* Feature: Add DW Event Grid widget for Elementor
* Feature: Event text positioning (9 positions) and alignment options
* Feature: Event content padding controls
* Feature: YouTube thumbnail fetch functionality
* Enhancement: Event grid with responsive layout controls
* Enhancement: Customizable button style and text for events

= 1.24.4 =
* Fix: Add !important to CSS rules to ensure proper application
* Fix: Force object-fit: cover with higher CSS specificity
* Fix: Ensure all aspect ratios apply correctly
* Enhancement: Override any conflicting Elementor default styles

= 1.24.3 =
* Fix: Add default object-fit: cover to ensure images fill container
* Fix: Images now crop (not shrink) to fit selected aspect ratio
* Enhancement: Add default object-position: center center
* Behavior: Images always fill container completely at any ratio

= 1.24.2 =
* Feature: Image ratio presets (1:1, 4:3, 3:2, 16:9, 21:9)
* Feature: Custom ratio option for manual height control
* Enhancement: Automatic aspect ratio calculation
* UI: Easy-to-use ratio selector dropdown
* Fix: Images now fill container properly at selected ratios

= 1.24.1 =
* Feature: Responsive image height control (px, %, vh units)
* Feature: Image fit options (Cover, Contain, Fill, None, Scale-down)
* Feature: Image position control (9 alignment options)
* Feature: Image hover effects (Zoom In, Zoom Out, Brightness, Grayscale)
* Style: Image border radius control
* Style: Image box shadow control
* Enhancement: Advanced image display customization
* UI: Separate "Image Style" section in Style tab

= 1.24.0 =
* Feature: New "DW Recent Gallery" widget for displaying album posts
* Feature: Grid and List layout options with responsive columns
* Feature: Show/hide thumbnail, date controls
* Feature: Customizable thumbnail sizes (thumbnail to full size)
* Style: Complete card styling with padding, margin, border, shadow controls
* Style: Title typography, color, hover effects
* Style: Date typography and color controls
* Enhancement: Image hover zoom effect with smooth transitions
* UI: Clean, modern gallery card design

= 1.23.1 =
* Fix: Disable WP_Query caching for banner widgets to ensure fresh data
* Fix: Clear post meta cache before rendering to force fresh meta values
* Fix: Improve padding value detection (handle 0 values correctly)
* Tool: Add debug-banner-meta.php script for troubleshooting meta values
* Enhancement: Ensure banner settings are always current, never cached

= 1.23.0 =
* Feature: Arrow background color control with default and hover states
* Feature: Arrow icon color control with default and hover states
* Feature: Pagination bullet color control (normal and active states)
* Feature: Pagination bullet size control (5-20px range)
* Enhancement: New "Navigation & Pagination Colors" style section
* UI: Complete color customization for all navigation elements
* Defaults: White arrows with dark icons, semi-transparent pagination bullets

= 1.22.2 =
* Fix: Remove hardcoded arrow sizes and positions from CSS
* Fix: Widget controls now fully manage arrow appearance
* Enhancement: Cleaner CSS with only base styling (colors, transitions)
* Enhancement: All sizing and positioning now controlled by widget settings

= 1.22.1 =
* Feature: Responsive navigation arrow size control (20-80px range)
* Feature: Responsive arrow icon size control (10-40px range)
* Feature: Responsive arrow position control (left/right spacing 0-100px)
* Enhancement: Device-specific arrow settings (Desktop, Tablet, Mobile)
* UI: All navigation controls appear when arrows are enabled
* Defaults: Desktop 40px, Tablet 36px, Mobile 32px arrow size
* Flexibility: Fine-tune arrow appearance per device

= 1.22.0 =
* Feature: Responsive slider height control in widget settings
* Feature: Multiple units support (px, vh, %) for height adjustment
* Feature: Device-specific height settings (Desktop, Tablet, Mobile)
* Enhancement: Removed hardcoded 500px min-height constraint
* UI: Slider control with range 200-1000px, 10-100vh, 10-100%
* Flexibility: Users can now set custom heights per device

= 1.21.1 =
* Fix: All banner images now display as background (not img tag)
* Fix: Consistent background-image rendering regardless of text presence
* Enhancement: Background position controls apply to all banners uniformly
* Optimization: Reduced CSS generation for banners without text

= 1.21.0 =
* Feature: Responsive text container width - separate settings for PC, Laptop, Tablet, Mobile
* Feature: Device-specific text box sizing (PC/Laptop: 600px, Tablet: 500px, Mobile: 300px defaults)
* Enhancement: Control text wrapping (single vs multi-line) per device type
* Enhancement: Dynamic CSS generation for responsive max-width
* UI: 4-column grid layout for text width settings
* Design: Modern slider navigation - compact circular arrows (40px PC, 32px mobile)
* Design: Semi-transparent white background with smooth hover effects
* Design: Shadow and scale animations for better UX
* Applied: Banner Slider widget text containers and navigation controls

= 1.20.0 =
* Feature: Responsive background position - separate settings for PC, Laptop, Tablet, Mobile
* Feature: Device-specific image positioning (PC: 1920px+, Laptop: 1024-1919px, Tablet: 768-1023px, Mobile: ~767px)
* Enhancement: Optimize background image display for each device type
* Enhancement: Dynamic CSS generation for responsive background-position
* UI: 4-column grid layout for device-specific settings with clear labels
* Example: Portrait images can show face on mobile (top center) and full body on PC (center)
* Applied: Both Banner Slider and Banner Grid widgets

= 1.19.3 =
* Feature: Added background image position control in banner meta box
* Feature: 9 position options (center top/center/bottom, left/right center, corners)
* Enhancement: Users can control which part of the background image to display
* UI: New "배경 이미지 위치" dropdown with clear Korean + English labels
* Applied: Both Banner Slider and Banner Grid widgets
* Default: Center Center for optimal display

= 1.19.2 =
* Feature: Added text container width setting in banner meta box
* Feature: Adjustable text width (100-2000px) for flexible line breaking control
* Enhancement: Users can now control whether text displays in one line or multiple lines
* UI: New "텍스트 컨테이너 폭" field with helpful description
* Default: 600px width, recommended range 300-1200px

= 1.19.1 =
* Fix: Banner text horizontal positioning now uses center-based alignment
* Fix: Left/Center/Right positions now align based on center point, not screen division
* Improved: Text container max-width increased to 1200px for better layout
* Improved: Text alignment automatically matches horizontal position (left→left, center→center, right→right)
* Enhancement: Removed justify-content, now uses margin-based positioning for clearer alignment

= 1.19.0 =
* Feature: Added Query Source selection to Banner Slider and Grid widgets
* Feature: Latest Posts mode with category filter, order, and orderby controls
* Feature: Manual Selection mode to choose specific banners
* Enhancement: Simplified banner widgets to focus on banner post type only
* UI: Query controls now conditional based on selected source
* UI: Manual selection uses multi-select dropdown with all available banners

= 1.18.4 =
* Fix: Changed date filtering to post-query filtering for better reliability
* Fix: Now correctly displays all published banners regardless of date fields
* Fix: Resolved post__in array issues that prevented banners from showing
* Enhancement: Simplified query logic for better performance

= 1.18.3 =
* Fix: Resolved "No banners found" issue in Banner Slider and Grid widgets
* Fix: Improved date filtering logic to handle empty date fields correctly
* Fix: Changed from complex meta_query to post__in filtering for better reliability
* Enhancement: Banners without start/end dates now display correctly

= 1.18.2 =
* Feature: Added Order and Order By controls to Banner Slider widget
* Feature: Added Banner Category filter to Banner Grid widget
* Improved: Banner Slider now supports date/title/random/menu_order sorting
* Improved: Banner Grid now displays correct images based on category (Main/Sub)
* Enhancement: Both widgets now have complete query control options
* Enhancement: Banner Grid supports all categories, not just sub banners

= 1.18.1 =
* Fix: Banner images now save correctly without requiring category selection
* Fix: Removed category-based save logic that was preventing image uploads from saving
* Improved: All banner image fields (PC, Mobile, Sub) now save independently
* Enhancement: Featured image automatically set based on upload priority (PC > Sub > Mobile)

= 1.18.0 =
* Feature: New DW Banner Grid Widget - Display sub banners in a responsive grid layout
* Feature: Grid widget supports text overlay with customizable positioning
* Feature: Added grid column controls, gap settings, and card styling options
* Feature: Hover effects and responsive behavior for banner grid items
* Improved: Banner field UI - Moved sub banner image ratio below image upload
* Improved: Changed label from "이미지 비율" to "서브 배너 이미지 비율" for clarity
* Enhancement: Grid widget automatically filters active banners by start/end dates
* Enhancement: Seamless integration with existing banner text overlay settings

= 1.17.3 =
* Refactor: Removed category-based field toggling - all banner fields now always visible
* Feature: PC, Mobile, and Sub banner image upload fields all displayed simultaneously
* Improved: Simpler workflow - no need to select category to see upload fields
* Removed: JavaScript toggle logic for banner category selection
* UX: Users can now see and access all banner options immediately

= 1.17.2 =
* Fix: Banner image upload fields now visible when creating new banner
* Fix: Main banner fields (PC/Mobile images) now show by default for new posts
* Improved: Better UX - no need to select category before seeing upload buttons

= 1.17.1 =
* Fix: Removed incorrect semicolon after initBannerAdditionalUploaders function
* Fix: Banner image upload buttons now work correctly
* Critical Fix: JavaScript object syntax now valid

= 1.17.0 =
* Refactor: Simplified banner logic - removed "Display Type" selector
* Feature: Banner images now always serve as backgrounds with optional text overlay
* Feature: Text fields (title, subtitle, description) are now optional - show when filled, hide when empty
* Feature: Entire banner slide is now clickable as a single link (instead of button-only)
* Removed: Button text field and button-specific styling controls
* Removed: Background image field (PC/Mobile images now serve as backgrounds)
* Improved: More intuitive banner creation workflow
* Code Quality: Removed unnecessary JavaScript toggle logic and simplified widget rendering

= 1.16.5 =
* Fix: Added missing semicolon after closing brace of DasomChurchAdmin object
* Fix: Unexpected token ')' error at line 469 resolved
* Critical Fix: Complete JavaScript syntax structure now correct

= 1.16.4 =
* Fix: JavaScript syntax error - removed extra semicolon after closing brace
* Fix: Unexpected token ';' error at line 467 resolved
* Critical Fix: Admin.js now properly loads without syntax errors

= 1.16.3 =
* Fix: jQuery noConflict mode compatibility issue resolved
* Fix: Wrapped admin.js in IIFE (Immediately Invoked Function Expression) with jQuery
* Fix: DasomChurchAdmin now properly assigned to window object
* Fix: All $ references now work correctly in WordPress noConflict mode
* Critical Fix: "$ is not a function" error resolved

= 1.16.2 =
* Fix: Admin JavaScript file (admin.js) now properly loads on banner edit screen
* Fix: Banner display type toggle now works correctly
* Fix: Added proper script enqueue with dependencies
* Fix: Added script localization for translations
* Critical Fix: JavaScript functionality restored for banner meta box

= 1.16.1 =
* UI Improvement: Link target option moved next to URL input field with radio buttons
* UI Improvement: More compact and intuitive layout for link settings
* Change: Link target changed from dropdown to radio buttons (Current Window / New Window)
* Enhancement: Better space utilization in banner meta box

= 1.16.0 =
* New Feature: Text alignment option for banner text content (Left, Center, Right)
* New Feature: Custom padding controls for banner text content (Top, Right, Bottom, Left)
* Improvement: Fine-grained control over banner text positioning with individual padding values
* Improvement: Text alignment is now independent of position alignment for maximum flexibility
* Improvement: Padding values adjustable in 5px increments with minimum value of 0
* Enhancement: Better control over banner text layout and spacing

= 1.15.1 =
* Fix: Banner text fields (Title, Subtitle, Description, Position, Button) now properly show when "Background Image + Text" display type is selected
* Fix: Initial field visibility now correctly reflects the saved display type value
* Fix: Added timeout to ensure DOM is fully loaded before toggling fields
* Improvement: Added console logging for debugging display type issues

= 1.15.0 =
* New Feature: Banner display type option (Image Only / Background Image + Text)
* New Feature: Text overlay mode for banners with customizable Title, Subtitle, and Description
* New Feature: 9-position text alignment (top/center/bottom + left/center/right)
* New Feature: Customizable button with link for text overlay banners
* New Feature: Separate background image field for text overlay mode
* New Feature: Banner slider widget now supports both display modes
* New Feature: Elementor style controls for text, button (typography, colors, hover effects)
* New Feature: Automatic overlay background with customizable opacity
* Improvement: Admin interface updated with display type toggle
* Improvement: Responsive design for text overlay banners on mobile
* Improvement: Enhanced banner admin JavaScript for dynamic field visibility

= 1.14.4 =
* Fix: Video First layout grid ratio improved (2fr 3fr instead of 1fr 2fr)
* Fix: Meta info area width increased to prevent line breaks
* Fix: Title right alignment now properly forced with !important
* Fix: Meta info white-space nowrap to keep in single line
* Improvement: Better visual balance in Video First layout

= 1.14.3 =
* Change: Date format changed to Korean style (년 월 일)
* Change: Sermon date now displays as "2025년 10월 12일" instead of "2025-10-12"
* Improvement: Better localization for Korean users

= 1.14.2 =
* Fix: Video First layout meta alignment set to left
* Fix: Video First layout title alignment remains right
* Improvement: Better visual balance in Video First inline layout
* Improvement: Meta info left-aligned, title right-aligned

= 1.14.1 =
* Fix: Plugin activation issue resolved
* Fix: Added safety checks for Elementor widget registration
* Fix: Added try-catch block for widget loading errors
* Fix: Plugin now activates even if Elementor is not installed
* Improvement: Better error handling for widget registration
* Improvement: More robust WordPress environment checks

= 1.14.0 =
* Feature: Video First layout option for DW Sermon Widget
* Feature: Classic layout (Title → Meta → Video)
* Feature: Video First layout (Video → Meta/Title side-by-side)
* Feature: Grid layout for Video First with meta on left, title on right
* Feature: Responsive layout adaptation for mobile/tablet
* Improvement: YouTube video prominently displayed at top
* Improvement: Side-by-side meta and title below video
* Improvement: Automatic stacking on mobile devices

= 1.13.0 =
* Feature: Mobile-optimized responsive design for DW Sermon Widget
* Feature: Stack layout option for meta info (vertical alignment)
* Feature: Automatic font size reduction on mobile devices
* Feature: Responsive separator spacing for mobile
* Feature: Meta item spacing control for stack layout
* Improvement: Better readability on small screens
* Improvement: Tablet (767px) and mobile (480px) breakpoints
* Improvement: Flexible layout switching (inline/stack)

= 1.12.4 =
* Fix: Separator vertical alignment now works correctly with meta typography
* Fix: Both meta text and separator now share the same vertical alignment
* Fix: Improved inline-block display for consistent alignment
* Improvement: Separator respects meta typography settings for better consistency

= 1.12.3 =
* Feature: Added vertical alignment control for separator
* Feature: Choose between Top, Middle, Bottom, and Baseline alignment
* Improvement: Perfect vertical positioning for separators
* Improvement: Better control over separator appearance with text

= 1.12.2 =
* Feature: Added separator style controls to DW Sermon Widget
* Feature: Separator size control (px, em, rem)
* Feature: Separator color control (independent from meta color)
* Feature: Separator spacing control (left/right margins)
* Feature: Separator opacity control (transparency)
* Improvement: Complete visual customization for meta separators
* Improvement: Better control over separator appearance

= 1.12.1 =
* Feature: Added Query Source to DW Sermon Widget
* Feature: Current Post - automatically displays the current sermon post
* Feature: Latest Post - shows the most recent sermon
* Feature: Manual Selection - choose a specific sermon
* Feature: Fallback to Latest option for Current Post mode
* Improvement: Perfect for sermon detail pages (uses current post automatically)
* Improvement: Better error messages with visual notices
* Improvement: Validates sermon post type for all query sources

= 1.12.0 =
* Feature: New DW Sermon Widget for single sermon display
* Feature: YouTube video embed with responsive aspect ratios (16:9, 4:3, 21:9)
* Feature: Show latest sermon or select specific sermon
* Feature: Display title, date, scripture, preacher with full style control
* Feature: Center-aligned design for hero sections
* Feature: Complete typography controls for title and meta info
* Feature: Video border radius and shadow controls
* Feature: Customizable meta separator
* Feature: Show/hide toggles for all elements
* Improvement: Perfect for sermon detail pages and hero sections

= 1.11.3 =
* Change: Reordered sermon widget display elements
* Change: New display order - Date > Title > Scripture > Preacher
* Improvement: Date appears first for better chronological clarity
* Improvement: Scripture closer to title for better context
* Improvement: More logical information hierarchy

= 1.11.2 =
* Breaking: Removed scripture icon feature completely
* Breaking: Removed all icon features from sermon widget
* Improvement: Pure text-only design for all metadata (date, preacher, scripture)
* Improvement: Cleaner, more minimalist appearance
* Improvement: Maximum readability with no visual distractions
* Improvement: Fastest rendering - zero icon processing

= 1.11.1 =
* Breaking: Removed date icon feature completely
* Breaking: Removed preacher icon feature completely
* Improvement: Cleaner sermon listings with text-only date and preacher
* Improvement: Scripture icon remains for visual interest
* Improvement: Simplified controls - only show/hide toggles for date and preacher
* Improvement: Faster widget rendering without icon logic

= 1.11.0 =
* Breaking: Removed excerpt feature from sermon widget
* Feature: Added scripture (Bible verse) display
* Feature: Scripture show/hide toggle
* Feature: Scripture icon customization (default: book icon)
* Feature: Scripture typography and color controls
* Feature: Scripture icon color and size controls
* Feature: Date, Preacher, Scripture all independently toggleable
* Improvement: More relevant information for sermon listings
* Improvement: Better visual hierarchy with scripture

= 1.10.7 =
* Feature: Card border control (type, width, color)
* Feature: Border style options (Solid, Dashed, Dotted, Double)
* Feature: Individual border width control for each side
* Feature: Border radius works seamlessly with border
* Improvement: Complete card design customization

= 1.10.6 =
* Fix: Typography controls now work properly - removed inline styles
* Fix: Font size, weight, line-height, letter-spacing now applied correctly
* Feature: Date spacing control
* Feature: Preacher spacing control
* Feature: Card padding control with dimensions
* Feature: Hover effect toggle
* Feature: Link text-decoration control
* Improvement: Default color values for all elements
* Improvement: Better CSS selector specificity
* Improvement: Cleaner HTML output without hardcoded styles

= 1.10.5 =
* Feature: Selectable thumbnail image size for sermon widget
* Feature: Thumbnail height control with slider
* Feature: Thumbnail object-fit options (Cover, Contain, Fill, None)
* Feature: Thumbnail border radius control
* Improvement: Better thumbnail display control
* Improvement: Flexible image sizing for different layouts

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

