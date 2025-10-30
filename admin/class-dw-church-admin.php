<?php
/**
 * Church Admin – Bulletins, Sermons, Columns, Albums
 * Complete integrated version with security improvements and Quick Edit support
 *
 * @package DW_Church
 * @since 1.0.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Admin class
 */
class DW_Church_Admin {
    
    /**
     * Single instance of the class
     */
    private static $instance = null;
    
    /**
     * Get single instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        $this->dw_church_init_hooks();
    }
    
    /**
     * Initialize hooks
     */
    private function dw_church_init_hooks() {
        // Set default widget settings on plugin activation
        add_action('admin_init', array($this, 'dw_church_set_default_widget_settings'));
        
        // Admin menu
        add_action('admin_menu', array($this, 'dw_church_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'dw_church_admin_scripts'));
        add_action('admin_init', array($this, 'dw_church_handle_settings_save'));
        add_action('admin_init', array($this, 'redirect_to_dw_dashboard'));
        add_filter('login_redirect', array($this, 'dw_church_login_redirect'), 20, 3);
        // REMOVED: Conflicting menu filter - Dasom_Church_Menu_Visibility handles this
        // add_action('admin_menu', array($this, 'filter_admin_menus'), 9999);
        
        // Custom Post Types
        add_action('init', array($this, 'dw_church_register_post_types'));
        add_action('init', array($this, 'dw_church_register_taxonomies'));
        
        // Load meta boxes and columns classes
        require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dw-church-meta-boxes.php';
        require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dw-church-columns.php';
        
        // Remove default editor support
        add_action('admin_init', array($this, 'dw_church_remove_editor_support'));
        add_filter('use_block_editor_for_post_type', array($this, 'dw_church_disable_block_editor'), 10, 2);
        
        // Elementor compatibility
        add_filter('get_post_metadata', array($this, 'dw_church_elementor_metadata'), 9, 4);
        
        // Admin head styles
        add_action('admin_head', array($this, 'dw_church_admin_head_styles'));
        
        // Banner scheduling cron
        add_action('dw_church_check_banner_schedule', array($this, 'dw_church_check_expired_banners'));
        if (!wp_next_scheduled('dw_church_check_banner_schedule')) {
            wp_schedule_event(time(), 'hourly', 'dw_church_check_banner_schedule');
        }
    }
    
    /**
     * Login redirect for Author/Editor to DW dashboard
     */
    public function dw_church_login_redirect($redirect_to, $requested, $user) {
        if ($user instanceof WP_User) {
            if (in_array('author', (array)$user->roles, true) || in_array('editor', (array)$user->roles, true)) {
                return admin_url('admin.php?page=dasom-church-dashboard');
            }
        }
        return $redirect_to;
    }
    
    /**
     * Redirect to DW dashboard when accessing WordPress dashboard
     */
    public function redirect_to_dw_dashboard() {
        // Don't redirect Administrator
        if (current_user_can('administrator')) {
            return;
        }
        
        // Don't redirect if accessing any specific page
        if (isset($_GET['page']) && $_GET['page'] !== '') {
            return;
        }
        
        // Only redirect when accessing the main WordPress dashboard
        $current_url = $_SERVER['REQUEST_URI'] ?? '';
        $is_main_dashboard = (
            $current_url === '/wp-admin/' || 
            $current_url === '/wp-admin/index.php' ||
            $current_url === '/wp-admin'
        );
        
        if (!$is_main_dashboard) {
            return;
        }
        
        // Only redirect Author/Editor roles
        if (current_user_can('edit_posts') && !current_user_can('manage_options')) {
            // Redirect to DW dashboard for Author/Editor only
            wp_redirect(admin_url('admin.php?page=dasom-church-dashboard'));
            exit;
        }
    }
    
    /**
     * Filter admin menus for Author/Editor roles
     */
    public function filter_admin_menus() {
        if (current_user_can('administrator')) return;
        if (!current_user_can('editor') && !current_user_can('author')) return;

        global $menu, $submenu;
        $allowed_slugs = array(
            'dasom-church-admin',
            'dasom-church-dashboard',
            'dasom-church-sermon',
            'dasom-church-column',
            'dasom-church-bulletin',
            'dasom-church-album',
            'dasom-church-event',
            'dasom-church-banner',
            'dasom-church-settings',
            'edit.php?post_type=bulletin',
            'edit.php?post_type=sermon',
            'edit.php?post_type=column',
            'edit.php?post_type=album',
            'edit.php?post_type=banner',
            'edit.php?post_type=event',
            'edit.php',
            'edit.php?post_type=page',
            'upload.php',
            'users.php'
        );

        foreach ($menu as $index => $item) {
            if (!in_array($item[2] ?? '', $allowed_slugs, true)) {
                unset($menu[$index]);
            }
        }
        
        foreach ((array)$submenu as $parent_slug => $items) {
            if (!in_array($parent_slug, $allowed_slugs, true)) {
                unset($submenu[$parent_slug]);
            }
        }
    }
    
    /**
     * Redirect methods for Author/Editor main menu items
     */
    public function redirect_to_album() {
        wp_redirect(admin_url('edit.php?post_type=album'));
        exit;
    }
    
    public function redirect_to_bulletin() {
        wp_redirect(admin_url('edit.php?post_type=bulletin'));
        exit;
    }
    
    public function redirect_to_event() {
        wp_redirect(admin_url('edit.php?post_type=event'));
        exit;
    }
    
    public function redirect_to_banner() {
        wp_redirect(admin_url('edit.php?post_type=banner'));
        exit;
    }
    
    /**
     * Set default widget settings
     */
    public function dw_church_set_default_widget_settings() {
        // Force all widget settings to 'yes' regardless of current values
        $widget_settings = array(
            'dw_enable_gallery_widget' => 'yes',
            'dw_enable_sermon_widget' => 'yes',
            'dw_enable_single_sermon_widget' => 'yes',
            'dw_enable_bulletin_widget' => 'yes',
            'dw_enable_single_bulletin_widget' => 'yes',
            'dw_enable_column_widget' => 'yes',
            'dw_enable_banner_slider_widget' => 'yes',
            'dw_enable_pastoral_column_widget' => 'yes',
            'dw_enable_pastoral_columns_grid_widget' => 'yes',
        );
        
        // Force update all widget settings to 'yes'
        foreach ($widget_settings as $option_name => $value) {
            update_option($option_name, $value);
        }
    }
    
    /**
     * Check if user can access submenu
     */
    private function can_access_submenu($menu_key) {
        $current_user = wp_get_current_user();
        
        // Administrator can access everything
        if (current_user_can('manage_options')) {
            return true;
        }
        
        // Dashboard is ALWAYS accessible for Author/Editor roles
        if ($menu_key === 'dashboard') {
            return true;
        }
        
        // Check for Author/Editor roles
        if (in_array('author', $current_user->roles) || in_array('editor', $current_user->roles)) {
            $user_role = in_array('author', $current_user->roles) ? 'author' : 'editor';
            
            // Check if class exists before using it
            if (class_exists('DW_Church_Menu_Visibility')) {
                $menu_visibility = DW_Church_Menu_Visibility::get_instance();
                $menu_slug = 'dasom-church-' . $menu_key;
                return $menu_visibility->user_can_access_menu($menu_slug, $user_role);
            } else {
                // Fallback: allow access if class not loaded
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Add admin menu
     */
    public function dw_church_admin_menu() {
        // DEBUG: 메뉴 등록 디버그
        error_log('=== ADMIN MENU DEBUG ===');
        error_log('Current User ID: ' . get_current_user_id());
        error_log('User Roles: ' . implode(', ', wp_get_current_user()->roles));
        error_log('Can edit_posts: ' . (current_user_can('edit_posts') ? 'YES' : 'NO'));
        error_log('Can read: ' . (current_user_can('read') ? 'YES' : 'NO'));
        error_log('Can manage_options: ' . (current_user_can('manage_options') ? 'YES' : 'NO'));
        
        // Main menu - 고유한 슬러그 사용
        add_menu_page(
            __('DW 교회관리', 'dw-church'),
            __('DW 교회관리', 'dw-church'),
            'edit_posts', // Back to edit_posts for Author/Editor
            'dasom-church-admin',
            array($this, 'dw_church_dashboard_page'),
            'data:image/svg+xml;base64,' . base64_encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M11 2v6h6v3h-6v7H8v-7H2V8h6V2z"/></svg>'),
            5
        );
        
        error_log('DW 교회관리 메뉴 등록 완료');
        
        // Remove default submenu
        remove_submenu_page('dasom-church-admin', 'dasom-church-admin');
        
        // Dashboard submenu - ALWAYS accessible
        add_submenu_page(
            'dasom-church-admin',
            __('대시보드', 'dw-church'),
            __('대시보드', 'dw-church'),
            'edit_posts',
            'dasom-church-dashboard',
            array($this, 'dw_church_dashboard_page')
        );
        
        // Settings submenu
        if ($this->can_access_submenu('settings')) {
            add_submenu_page(
                'dasom-church-admin',
                __('설정', 'dw-church'),
                __('설정', 'dw-church'),
                'edit_posts',
                'dasom-church-settings',
                array($this, 'dw_church_settings_page')
            );
        }
        
        // User Profile submenu
        add_submenu_page(
            'dasom-church-admin',
            __('사용자 프로필', 'dw-church'),
            __('사용자 프로필', 'dw-church'),
            'edit_posts',
            'dasom-church-profile',
            array($this, 'dw_church_profile_page')
        );
        
        // Logout submenu
        add_submenu_page(
            'dasom-church-admin',
            __('로그아웃', 'dw-church'),
            __('로그아웃', 'dw-church'),
            'edit_posts',
            'dasom-church-logout',
            array($this, 'dw_church_logout_page')
        );
        
        // Add GitHub Update settings to WordPress Settings menu (독립적)
        add_options_page(
            __('DW 설정', 'dw-church'),
            __('DW 설정', 'dw-church'),
            'manage_options',
            'dasom-church-github-update',
            array($this, 'dw_church_github_update_page')
        );
        
    }
    
    /**
     * Register Custom Post Types
     */
    public function dw_church_register_post_types() {
        // 교회주보
        register_post_type('bulletin', array(
            'labels' => array(
                'name' => __('교회주보', 'dw-church'),
                'singular_name' => __('주보', 'dw-church'),
                'menu_name' => __('교회주보', 'dw-church'),
                'add_new' => __('새 주보 추가', 'dw-church'),
                'add_new_item' => __('새 주보 추가', 'dw-church'),
                'edit_item' => __('주보 편집', 'dw-church'),
                'new_item' => __('새 주보', 'dw-church'),
                'view_item' => __('주보 보기', 'dw-church'),
                'search_items' => __('주보 검색', 'dw-church'),
                'not_found' => __('주보를 찾을 수 없습니다', 'dw-church'),
                'not_found_in_trash' => __('휴지통에서 주보를 찾을 수 없습니다', 'dw-church'),
            ),
            'public' => true,
            'show_ui' => true,
            'show_in_menu' => 'dasom-church-admin',
            'menu_position' => 4,
            'supports' => array('title', 'author', 'thumbnail'),
            'show_in_rest' => true,
            'has_archive' => true,
            'rewrite' => array('slug' => 'bulletin'),
            'capability_type' => 'post',
            'map_meta_cap' => true,
        ));
        
        // 설교
        register_post_type('sermon', array(
            'labels' => array(
                'name' => __('설교', 'dw-church'),
                'singular_name' => __('설교', 'dw-church'),
                'menu_name' => __('설교', 'dw-church'),
                'add_new' => __('새 설교 추가', 'dw-church'),
                'add_new_item' => __('새 설교 추가', 'dw-church'),
                'edit_item' => __('설교 편집', 'dw-church'),
                'new_item' => __('새 설교', 'dw-church'),
                'view_item' => __('설교 보기', 'dw-church'),
                'search_items' => __('설교 검색', 'dw-church'),
                'not_found' => __('설교를 찾을 수 없습니다', 'dw-church'),
                'not_found_in_trash' => __('휴지통에서 설교를 찾을 수 없습니다', 'dw-church'),
            ),
            'public' => true,
            'show_ui' => true,
            'show_in_menu' => 'dasom-church-admin',
            'menu_position' => 2,
            'supports' => array('title', 'author'),
            'show_in_rest' => true,
            'has_archive' => true,
            'rewrite' => array('slug' => 'sermon'),
            'capability_type' => 'post',
            'map_meta_cap' => true,
        ));
        
        // 목회컬럼
        register_post_type('column', array(
            'labels' => array(
                'name' => __('목회컬럼', 'dw-church'),
                'singular_name' => __('컬럼', 'dw-church'),
                'menu_name' => __('목회컬럼', 'dw-church'),
                'add_new' => __('새 컬럼 추가', 'dw-church'),
                'add_new_item' => __('새 컬럼 추가', 'dw-church'),
                'edit_item' => __('컬럼 편집', 'dw-church'),
                'new_item' => __('새 컬럼', 'dw-church'),
                'view_item' => __('컬럼 보기', 'dw-church'),
                'search_items' => __('컬럼 검색', 'dw-church'),
                'not_found' => __('컬럼을 찾을 수 없습니다', 'dw-church'),
                'not_found_in_trash' => __('휴지통에서 컬럼을 찾을 수 없습니다', 'dw-church'),
            ),
            'public' => true,
            'show_ui' => true,
            'show_in_menu' => 'dasom-church-admin',
            'menu_position' => 3,
            'supports' => array('title', 'editor', 'author', 'thumbnail'),
            'show_in_rest' => true,
            'has_archive' => true,
            'rewrite' => array('slug' => 'column'),
            'capability_type' => 'post',
            'map_meta_cap' => true,
        ));
        
        // 교회앨범
        register_post_type('album', array(
            'labels' => array(
                'name' => __('교회앨범', 'dw-church'),
                'singular_name' => __('앨범', 'dw-church'),
                'menu_name' => __('교회앨범', 'dw-church'),
                'add_new' => __('새 앨범 추가', 'dw-church'),
                'add_new_item' => __('새 앨범 추가', 'dw-church'),
                'edit_item' => __('앨범 편집', 'dw-church'),
                'new_item' => __('새 앨범', 'dw-church'),
                'view_item' => __('앨범 보기', 'dw-church'),
                'search_items' => __('앨범 검색', 'dw-church'),
                'not_found' => __('앨범을 찾을 수 없습니다', 'dw-church'),
                'not_found_in_trash' => __('휴지통에서 앨범을 찾을 수 없습니다', 'dw-church'),
            ),
            'public' => true,
            'show_ui' => true,
            'show_in_menu' => 'dasom-church-admin',
            'menu_position' => 5,
            'supports' => array('title', 'thumbnail'),
            'show_in_rest' => true,
            'has_archive' => true,
            'rewrite' => array('slug' => 'album'),
            'capability_type' => 'post',
            'map_meta_cap' => true,
        ));
        
        // 배너
        register_post_type('banner', array(
            'labels' => array(
                'name' => __('배너', 'dw-church'),
                'singular_name' => __('배너', 'dw-church'),
                'menu_name' => __('배너', 'dw-church'),
                'add_new' => __('새 배너 추가', 'dw-church'),
                'add_new_item' => __('새 배너 추가', 'dw-church'),
                'edit_item' => __('배너 편집', 'dw-church'),
                'new_item' => __('새 배너', 'dw-church'),
                'view_item' => __('배너 보기', 'dw-church'),
                'search_items' => __('배너 검색', 'dw-church'),
                'not_found' => __('배너를 찾을 수 없습니다', 'dw-church'),
                'not_found_in_trash' => __('휴지통에서 배너를 찾을 수 없습니다', 'dw-church'),
            ),
            'public' => true,
            'show_ui' => true,
            'show_in_menu' => 'dasom-church-admin',
            'menu_position' => 7,
            'supports' => array('title'),
            'show_in_rest' => true,
            'has_archive' => true,
            'rewrite' => array('slug' => 'banner'),
            'capability_type' => 'post',
            'map_meta_cap' => true,
        ));
        
        // 이벤트
        register_post_type('event', array(
            'labels' => array(
                'name' => __('이벤트', 'dw-church'),
                'singular_name' => __('이벤트', 'dw-church'),
                'menu_name' => __('이벤트', 'dw-church'),
                'add_new' => __('새 이벤트 추가', 'dw-church'),
                'add_new_item' => __('새 이벤트 추가', 'dw-church'),
                'edit_item' => __('이벤트 편집', 'dw-church'),
                'new_item' => __('새 이벤트', 'dw-church'),
                'view_item' => __('이벤트 보기', 'dw-church'),
                'search_items' => __('이벤트 검색', 'dw-church'),
                'not_found' => __('이벤트를 찾을 수 없습니다', 'dw-church'),
                'not_found_in_trash' => __('휴지통에서 이벤트를 찾을 수 없습니다', 'dw-church'),
            ),
            'public' => true,
            'show_ui' => true,
            'show_in_menu' => 'dasom-church-admin',
            'menu_position' => 6,
            'supports' => array('title'),
            'show_in_rest' => true,
            'has_archive' => true,
            'rewrite' => array('slug' => 'event'),
            'capability_type' => 'post',
            'map_meta_cap' => true,
        ));
        
        // Flush rewrite rules after registering post types
        flush_rewrite_rules();
    }
    
    /**
     * Register Taxonomies
     */
    public function dw_church_register_taxonomies() {
        // 설교 카테고리
        register_taxonomy('sermon_category', 'sermon', array(
            'labels' => array(
                'name' => __('설교 카테고리', 'dw-church'),
                'singular_name' => __('설교 카테고리', 'dw-church'),
                'menu_name' => __('설교 카테고리', 'dw-church'),
                'add_new_item' => __('새 카테고리 추가', 'dw-church'),
                'edit_item' => __('카테고리 편집', 'dw-church'),
                'update_item' => __('카테고리 업데이트', 'dw-church'),
                'search_items' => __('카테고리 검색', 'dw-church'),
                'not_found' => __('카테고리를 찾을 수 없습니다', 'dw-church'),
            ),
            'hierarchical' => true,
            'show_admin_column' => true,
            'rewrite' => array('slug' => 'sermon-category'),
            'show_in_rest' => true,
            'capabilities' => array(
                'manage_terms' => 'manage_categories',
                'edit_terms' => 'manage_categories',
                'delete_terms' => 'manage_categories',
                'assign_terms' => 'edit_posts',
            ),
        ));
        
        // 설교자
        register_taxonomy('dw_sermon_preacher', 'sermon', array(
            'labels' => array(
                'name' => __('설교자', 'dw-church'),
                'singular_name' => __('설교자', 'dw-church'),
                'menu_name' => __('설교자 관리', 'dw-church'),
                'add_new_item' => __('새 설교자 추가', 'dw-church'),
                'edit_item' => __('설교자 편집', 'dw-church'),
                'update_item' => __('설교자 업데이트', 'dw-church'),
                'search_items' => __('설교자 검색', 'dw-church'),
                'not_found' => __('설교자를 찾을 수 없습니다', 'dw-church'),
            ),
            'public' => false,
            'show_ui' => true,
            'show_admin_column' => true,
            'hierarchical' => false,
            'show_in_rest' => true,
            'capabilities' => array(
                'manage_terms' => 'manage_categories',
                'edit_terms' => 'manage_categories',
                'delete_terms' => 'manage_categories',
                'assign_terms' => 'edit_posts',
            ),
        ));
        
        // 배너 카테고리
        register_taxonomy('banner_category', 'banner', array(
            'labels' => array(
                'name' => __('배너 카테고리', 'dw-church'),
                'singular_name' => __('배너 카테고리', 'dw-church'),
                'menu_name' => __('배너 카테고리', 'dw-church'),
                'add_new_item' => __('새 카테고리 추가', 'dw-church'),
                'edit_item' => __('카테고리 편집', 'dw-church'),
                'update_item' => __('카테고리 업데이트', 'dw-church'),
                'search_items' => __('카테고리 검색', 'dw-church'),
                'not_found' => __('카테고리를 찾을 수 없습니다', 'dw-church'),
            ),
            'hierarchical' => true,
            'show_admin_column' => true,
            'rewrite' => array('slug' => 'banner-category'),
            'show_in_rest' => true,
            'capabilities' => array(
                'manage_terms' => 'manage_categories',
                'edit_terms' => 'manage_categories',
                'delete_terms' => 'manage_categories',
                'assign_terms' => 'edit_posts',
            ),
        ));
        
        // 기본 카테고리 및 설교자 생성
        $this->dw_church_create_default_terms();
    }
    
    /**
     * Create default terms
     */
    private function dw_church_create_default_terms() {
        // 기본 설교 카테고리 생성
        $default_categories = array(
            __('주일설교', 'dw-church'),
            __('새벽설교', 'dw-church'),
            __('수요설교', 'dw-church'),
            __('금요설교', 'dw-church')
        );
        
        foreach ($default_categories as $category) {
            if (!term_exists($category, 'sermon_category')) {
                $result = wp_insert_term($category, 'sermon_category');
                if (is_wp_error($result)) {
                    error_log('Failed to create sermon category: ' . $result->get_error_message());
                }
            }
        }
        
        // 기본 배너 카테고리 생성
        $default_banner_categories = array(
            __('메인 배너', 'dw-church'),
            __('서브 배너', 'dw-church')
        );
        
        foreach ($default_banner_categories as $category) {
            if (!term_exists($category, 'banner_category')) {
                $result = wp_insert_term($category, 'banner_category');
                if (is_wp_error($result)) {
                    error_log('Failed to create banner category: ' . $result->get_error_message());
                }
            }
        }
        
        // 기본 설교자 설정
        if (false === get_option('default_sermon_preacher', false)) {
            update_option('default_sermon_preacher', __('담임목사', 'dw-church'));
        }
        
        $default_preacher = get_option('default_sermon_preacher', __('담임목사', 'dw-church'));
        if ($default_preacher && !term_exists($default_preacher, 'dw_sermon_preacher')) {
            $result = wp_insert_term($default_preacher, 'dw_sermon_preacher');
            if (is_wp_error($result)) {
                error_log('Failed to create default preacher: ' . $result->get_error_message());
            }
        }
    }
    
    /**
     * Remove editor support
     */
    public function dw_church_remove_editor_support() {
        remove_post_type_support('bulletin', 'title');
        remove_post_type_support('bulletin', 'editor');
        remove_post_type_support('sermon', 'title');
        remove_post_type_support('sermon', 'editor');
    }
    
    /**
     * Disable block editor
     */
    public function dw_church_disable_block_editor($use, $post_type) {
        if (in_array($post_type, array('bulletin', 'sermon'))) {
            return false;
        }
        return $use;
    }
    
    /**
     * Handle preacher management actions
     */
    private function dw_church_handle_preacher_action($action) {
        // Verify nonce
        if (!isset($_POST['_wpnonce']) || !wp_verify_nonce($_POST['_wpnonce'], 'sermon_preacher_actions')) {
            wp_die(__('Security check failed', 'dw-church'));
        }
        
        // Check user permissions - Allow Author/Editor to manage preachers
        if (!current_user_can('edit_posts')) {
            wp_die(__('You do not have sufficient permissions to perform this action.', 'dw-church'));
        }
        
        switch ($action) {
            case 'add':
                $name = trim(sanitize_text_field($_POST['preacher_name'] ?? ''));
                if ($name) {
                    if (!term_exists($name, 'dw_sermon_preacher')) {
                        $result = wp_insert_term($name, 'dw_sermon_preacher');
                        if (is_wp_error($result)) {
                            error_log('Failed to create preacher: ' . $result->get_error_message());
                        }
                    }
                }
                break;
                
            case 'rename':
                $term_id = intval($_POST['term_id'] ?? 0);
                $name = trim(sanitize_text_field($_POST['new_name'] ?? ''));
                if ($term_id && $name) {
                    wp_update_term($term_id, 'dw_sermon_preacher', array('name' => $name));
                }
                break;
                
            case 'delete':
                $term_id = intval($_POST['term_id'] ?? 0);
                if ($term_id) {
                    wp_delete_term($term_id, 'dw_sermon_preacher');
                }
                break;
                
            case 'set_default':
                $term_id = intval($_POST['term_id'] ?? 0);
                if ($term_id) {
                    $term = get_term($term_id, 'dw_sermon_preacher');
                    if ($term && !is_wp_error($term)) {
                        update_option('default_sermon_preacher', $term->name);
                    }
                }
                break;
                
            case 'save_default_name':
                $name = trim(sanitize_text_field($_POST['default_preacher_name'] ?? ''));
                if ($name) {
                    update_option('default_sermon_preacher', $name);
                    if (!term_exists($name, 'dw_sermon_preacher')) {
                        wp_insert_term($name, 'dw_sermon_preacher');
                    }
                }
                break;
        }
        
        add_action('admin_notices', function() {
            echo '<div class="updated"><p>' . __('설정이 저장되었습니다.', 'dw-church') . '</p></div>';
        });
    }
    
    /**
     * Dashboard page
     */
    public function dw_church_dashboard_page() {
        // Allow access for Administrator, Editor, and Author
        if (!current_user_can('edit_posts')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'dw-church'));
        }
        
        // 설교자 관리 액션 처리
        if (isset($_POST['preacher_action']) && check_admin_referer('sermon_preacher_actions')) {
            if (!current_user_can('edit_posts')) {
                wp_die(__('권한이 없습니다.', 'dw-church'));
            }
            
            $action = sanitize_text_field($_POST['preacher_action']);
            $this->dw_church_handle_preacher_action($action);
        }
        
        // Load dashboard view
        include DASOM_CHURCH_PLUGIN_PATH . 'admin/views/dashboard.php';
    }
    
    /**
     * Settings page
     */
    public function dw_church_settings_page() {
        // Allow access for Administrator, Editor, and Author
        if (!current_user_can('edit_posts')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'dw-church'));
        }
        
        // 설교자 관리 액션 처리
        if (isset($_POST['preacher_action']) && check_admin_referer('sermon_preacher_actions')) {
            if (!current_user_can('edit_posts')) {
                wp_die(__('권한이 없습니다.', 'dw-church'));
            }
            
            $action = sanitize_text_field($_POST['preacher_action']);
            $this->dw_church_handle_preacher_action($action);
        }
        
        // Load settings view
        include DASOM_CHURCH_PLUGIN_PATH . 'admin/views/settings.php';
    }
    
    /**
     * GitHub Update page (독립적 - WordPress Settings 메뉴)
     */
    public function dw_church_github_update_page() {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'dw-church'));
        }
        
        // Load GitHub update view
        include DASOM_CHURCH_PLUGIN_PATH . 'admin/views/github-update.php';
    }
    
    /**
     * Elementor compatibility - metadata filter
     */
    public function dw_church_elementor_metadata($value, $post_id, $meta_key, $single) {
        // 관리자 화면에서는 필터 적용하지 않음 (원본 데이터 사용)
        if (is_admin()) {
            return $value;
        }
        
        global $wpdb;
        
        // PDF 첨부 ID → URL 변환
        if ($meta_key === 'bulletin_pdf' || $meta_key === 'dw_bulletin_pdf') {
            // dw_bulletin_pdf 우선 확인
            $actual_key = $meta_key === 'bulletin_pdf' ? 'dw_bulletin_pdf' : $meta_key;
            $raw = $wpdb->get_var($wpdb->prepare(
                "SELECT meta_value FROM $wpdb->postmeta WHERE post_id=%d AND meta_key=%s LIMIT 1",
                $post_id, $actual_key
            ));
            if ($raw) {
                $url = wp_get_attachment_url(intval($raw));
                return $url ? $url : '';
            }
            return '';
        }
        
        // bulletin_date → YYYY년 M월 D일 형식으로 변환 (Elementor용만)
        if ($meta_key === 'bulletin_date_formatted' || $meta_key === 'dw_bulletin_date_formatted') {
            $actual_key = 'dw_bulletin_date';
            $raw = $wpdb->get_var($wpdb->prepare(
                "SELECT meta_value FROM $wpdb->postmeta WHERE post_id=%d AND meta_key=%s LIMIT 1",
                $post_id, $actual_key
            ));
            if ($raw) {
                $ts = strtotime($raw);
                if ($ts) {
                    return date_i18n('Y년 n월 j일', $ts);
                }
            }
            return '';
        }
        
        // JSON 갤러리 → 쉼표 구분 문자열
        if (in_array($meta_key, array('bulletin_images', 'album_images', 'dw_bulletin_images', 'dw_album_images'), true)) {
            $actual_key = $meta_key;
            if ($meta_key === 'bulletin_images') $actual_key = 'dw_bulletin_images';
            if ($meta_key === 'album_images') $actual_key = 'dw_album_images';
            
            $raw = $wpdb->get_var($wpdb->prepare(
                "SELECT meta_value FROM $wpdb->postmeta WHERE post_id=%d AND meta_key=%s LIMIT 1",
                $post_id, $actual_key
            ));
            if ($raw) {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    return implode(',', array_map('intval', $decoded));
                }
            }
            return '';
        }
        
        // 설교자 taxonomy → 커스텀필드처럼 노출
        if ($meta_key === 'sermon_preacher' || $meta_key === 'dw_sermon_preacher') {
            $names = wp_get_post_terms($post_id, 'dw_sermon_preacher', array('fields' => 'names'));
            return (!is_wp_error($names) && !empty($names)) ? implode(', ', $names) : '';
        }
        
        if ($meta_key === 'sermon_preacher_ids' || $meta_key === 'dw_sermon_preacher_ids') {
            $ids = wp_get_post_terms($post_id, 'dw_sermon_preacher', array('fields' => 'ids'));
            return (!is_wp_error($ids) && !empty($ids)) ? implode(',', array_map('intval', $ids)) : '';
        }
        
        if ($meta_key === 'sermon_preacher_slugs' || $meta_key === 'dw_sermon_preacher_slugs') {
            $slugs = wp_get_post_terms($post_id, 'dw_sermon_preacher', array('fields' => 'slugs'));
            return (!is_wp_error($slugs) && !empty($slugs)) ? implode(',', $slugs) : '';
        }
        
        return $value;
    }
    
    /**
     * Admin head styles
     */
    public function dw_church_admin_head_styles() {
        global $post_type;
        if (in_array($post_type, array('bulletin', 'sermon'))) {
            echo '<style>#titlediv { display: none; }</style>';
        }
    }
    
    /**
     * Check and update expired banners
     */
    public function dw_church_check_expired_banners() {
        $args = array(
            'post_type' => 'banner',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'meta_query' => array(
                array(
                    'key' => 'dw_banner_end_date',
                    'value' => '',
                    'compare' => '!='
                )
            )
        );
        
        $banners = get_posts($args);
        $current_time = current_time('timestamp');
        
        foreach ($banners as $banner) {
            $end_date = get_post_meta($banner->ID, 'dw_banner_end_date', true);
            if (!empty($end_date)) {
                $end_timestamp = strtotime($end_date);
                if ($end_timestamp && $end_timestamp < $current_time) {
                    wp_update_post(array(
                        'ID' => $banner->ID,
                        'post_status' => 'draft'
                    ));
                    error_log('Banner ID ' . $banner->ID . ' expired and set to draft');
                }
            }
        }
    }
    
    /**
     * Handle settings form submission
     */
    public function dw_church_handle_settings_save() {
        if (!isset($_POST['dw_church_settings_nonce']) || 
            !wp_verify_nonce($_POST['dw_church_settings_nonce'], 'dw_church_settings_action')) {
            return;
        }
        
        if (!current_user_can('edit_posts')) {
            return;
        }
        
        // Sanitize and save settings
        $settings = array(
            'name' => sanitize_text_field($_POST['dw_church_name'] ?? ''),
            'address' => sanitize_textarea_field($_POST['dw_church_address'] ?? ''),
            'phone' => sanitize_text_field($_POST['dw_church_phone'] ?? ''),
            'email' => sanitize_email($_POST['dw_church_email'] ?? ''),
            'website' => esc_url_raw($_POST['dw_church_website'] ?? ''),
            'social_youtube' => esc_url_raw($_POST['dw_social_youtube'] ?? ''),
            'social_instagram' => esc_url_raw($_POST['dw_social_instagram'] ?? ''),
            'social_facebook' => esc_url_raw($_POST['dw_social_facebook'] ?? ''),
            'social_linkedin' => esc_url_raw($_POST['dw_social_linkedin'] ?? ''),
            'social_tiktok' => esc_url_raw($_POST['dw_social_tiktok'] ?? ''),
            'social_kakaotalk' => esc_url_raw($_POST['dw_social_kakaotalk'] ?? ''),
            'social_kakaotalk_channel' => esc_url_raw($_POST['dw_social_kakaotalk_channel'] ?? '')
        );
        
        foreach ($settings as $key => $value) {
            dw_church_update_setting($key, $value);
        }
        
        // Add success message
        add_action('admin_notices', function() {
            echo '<div class="notice notice-success is-dismissible"><p>' . __('설정이 성공적으로 저장되었습니다.', 'dw-church') . '</p></div>';
        });
        
        // Save dashboard visibility setting
        if (isset($_POST['dw_dashboard_fields_visibility'])) {
            update_option('dw_dashboard_fields_visibility', sanitize_text_field($_POST['dw_dashboard_fields_visibility']));
        }
        
        // Save GitHub access token
        if (isset($_POST['dw_github_access_token'])) {
            $token = sanitize_text_field($_POST['dw_github_access_token']);
            update_option('dw_github_access_token', $token);
            
            // Clear update cache when token is updated
            if (!empty($token)) {
                $github_username = 'dasomweb';
                $github_repo = 'dasom-church-management-system';
                delete_transient('dw_church_update_' . md5($github_username . $github_repo));
                delete_transient('dw_church_plugin_info_' . md5($github_username . $github_repo));
            }
        }
        
        // Save data deletion setting
        $delete_data = isset($_POST['dw_delete_data_on_uninstall']) ? 'yes' : 'no';
        update_option('dw_delete_data_on_uninstall', $delete_data);
        
        // Save widget settings
        $enable_gallery_widget = isset($_POST['dw_enable_gallery_widget']) ? 'yes' : 'no';
        update_option('dw_enable_gallery_widget', $enable_gallery_widget);
        
        $enable_sermon_widget = isset($_POST['dw_enable_sermon_widget']) ? 'yes' : 'no';
        update_option('dw_enable_sermon_widget', $enable_sermon_widget);
        
        $enable_single_sermon_widget = isset($_POST['dw_enable_single_sermon_widget']) ? 'yes' : 'no';
        update_option('dw_enable_single_sermon_widget', $enable_single_sermon_widget);
        
        $enable_bulletin_widget = isset($_POST['dw_enable_bulletin_widget']) ? 'yes' : 'no';
        update_option('dw_enable_bulletin_widget', $enable_bulletin_widget);
        
        $enable_single_bulletin_widget = isset($_POST['dw_enable_single_bulletin_widget']) ? 'yes' : 'no';
        update_option('dw_enable_single_bulletin_widget', $enable_single_bulletin_widget);
        
        $enable_column_widget = isset($_POST['dw_enable_column_widget']) ? 'yes' : 'no';
        update_option('dw_enable_column_widget', $enable_column_widget);
        
        $enable_banner_slider_widget = isset($_POST['dw_enable_banner_slider_widget']) ? 'yes' : 'no';
        update_option('dw_enable_banner_slider_widget', $enable_banner_slider_widget);
        
        $enable_pastoral_column_widget = isset($_POST['dw_enable_pastoral_column_widget']) ? 'yes' : 'no';
        update_option('dw_enable_pastoral_column_widget', $enable_pastoral_column_widget);
        
        $enable_pastoral_columns_grid_widget = isset($_POST['dw_enable_pastoral_columns_grid_widget']) ? 'yes' : 'no';
        update_option('dw_enable_pastoral_columns_grid_widget', $enable_pastoral_columns_grid_widget);
        
        add_action('admin_notices', function() {
            echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__('Settings saved successfully!', 'dw-church') . '</p></div>';
        });
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function dw_church_admin_scripts($hook) {
        // Only load on our admin pages
        if (strpos($hook, 'dw-church') === false) {
            return;
        }
        
        wp_enqueue_style('dasom-church-admin', DASOM_CHURCH_PLUGIN_URL . 'assets/css/admin.css', array(), DASOM_CHURCH_VERSION);
        wp_enqueue_script('dasom-church-admin', DASOM_CHURCH_PLUGIN_URL . 'assets/js/admin.js', array('jquery'), DASOM_CHURCH_VERSION, true);
        
        // Localize script
        wp_localize_script('dasom-church-admin', 'dasomChurchAdmin', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('dw_church_admin_nonce'),
            'strings' => array(
                'confirmDelete' => __('Are you sure you want to delete this item?', 'dw-church'),
                'uploadError' => __('Upload failed. Please try again.', 'dw-church'),
                'invalidUrl' => __('Invalid URL format.', 'dw-church')
            )
        ));
    }
    
    /**
     * User Profile page
     */
    public function dw_church_profile_page() {
        if (!current_user_can('edit_posts')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'dw-church'));
        }
        
        // Handle profile update
        if (isset($_POST['dw_church_profile_nonce']) && wp_verify_nonce($_POST['dw_church_profile_nonce'], 'dw_church_profile_action')) {
            $this->dw_church_handle_profile_update();
        }
        
        $current_user = wp_get_current_user();
        ?>
        <div class="wrap">
            <h1><?php _e('사용자 프로필', 'dw-church'); ?></h1>
            
            <form method="post" action="">
                <?php wp_nonce_field('dw_church_profile_action', 'dw_church_profile_nonce'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="user_login"><?php _e('사용자명', 'dw-church'); ?></label>
                        </th>
                        <td>
                            <input type="text" id="user_login" name="user_login" value="<?php echo esc_attr($current_user->user_login); ?>" class="regular-text" readonly />
                            <p class="description"><?php _e('사용자명은 변경할 수 없습니다.', 'dw-church'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="first_name"><?php _e('이름', 'dw-church'); ?></label>
                        </th>
                        <td>
                            <input type="text" id="first_name" name="first_name" value="<?php echo esc_attr($current_user->first_name); ?>" class="regular-text" />
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="last_name"><?php _e('성', 'dw-church'); ?></label>
                        </th>
                        <td>
                            <input type="text" id="last_name" name="last_name" value="<?php echo esc_attr($current_user->last_name); ?>" class="regular-text" />
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="nickname"><?php _e('닉네임', 'dw-church'); ?></label>
                        </th>
                        <td>
                            <input type="text" id="nickname" name="nickname" value="<?php echo esc_attr($current_user->nickname); ?>" class="regular-text" />
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="user_email"><?php _e('이메일', 'dw-church'); ?></label>
                        </th>
                        <td>
                            <input type="email" id="user_email" name="user_email" value="<?php echo esc_attr($current_user->user_email); ?>" class="regular-text" />
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="user_url"><?php _e('웹사이트', 'dw-church'); ?></label>
                        </th>
                        <td>
                            <input type="url" id="user_url" name="user_url" value="<?php echo esc_attr($current_user->user_url); ?>" class="regular-text" />
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="description"><?php _e('자기소개', 'dw-church'); ?></label>
                        </th>
                        <td>
                            <textarea id="description" name="description" rows="5" cols="30" class="large-text"><?php echo esc_textarea($current_user->description); ?></textarea>
                        </td>
                    </tr>
                </table>
                
                <h2><?php _e('비밀번호 변경', 'dw-church'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="current_pass"><?php _e('현재 비밀번호', 'dw-church'); ?></label>
                        </th>
                        <td>
                            <input type="password" id="current_pass" name="current_pass" class="regular-text" />
                            <p class="description"><?php _e('비밀번호를 변경하려면 현재 비밀번호를 입력하세요.', 'dw-church'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="pass1"><?php _e('새 비밀번호', 'dw-church'); ?></label>
                        </th>
                        <td>
                            <input type="password" id="pass1" name="pass1" class="regular-text" />
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="pass2"><?php _e('새 비밀번호 확인', 'dw-church'); ?></label>
                        </th>
                        <td>
                            <input type="password" id="pass2" name="pass2" class="regular-text" />
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(__('프로필 업데이트', 'dw-church')); ?>
            </form>
        </div>
        <?php
    }
    
    /**
     * Handle profile update
     */
    private function dw_church_handle_profile_update() {
        $current_user = wp_get_current_user();
        $user_id = $current_user->ID;
        
        // Update basic profile fields
        $user_data = array(
            'ID' => $user_id,
            'first_name' => sanitize_text_field($_POST['first_name'] ?? ''),
            'last_name' => sanitize_text_field($_POST['last_name'] ?? ''),
            'nickname' => sanitize_text_field($_POST['nickname'] ?? ''),
            'user_email' => sanitize_email($_POST['user_email'] ?? ''),
            'user_url' => esc_url_raw($_POST['user_url'] ?? ''),
            'description' => sanitize_textarea_field($_POST['description'] ?? '')
        );
        
        $result = wp_update_user($user_data);
        
        if (is_wp_error($result)) {
            add_action('admin_notices', function() use ($result) {
                echo '<div class="notice notice-error"><p>' . $result->get_error_message() . '</p></div>';
            });
        } else {
            // Handle password change
            if (!empty($_POST['current_pass']) && !empty($_POST['pass1'])) {
                if (wp_check_password($_POST['current_pass'], $current_user->user_pass, $user_id)) {
                    if ($_POST['pass1'] === $_POST['pass2']) {
                        wp_set_password($_POST['pass1'], $user_id);
                        add_action('admin_notices', function() {
                            echo '<div class="notice notice-success"><p>' . __('비밀번호가 성공적으로 변경되었습니다.', 'dw-church') . '</p></div>';
                        });
                    } else {
                        add_action('admin_notices', function() {
                            echo '<div class="notice notice-error"><p>' . __('새 비밀번호가 일치하지 않습니다.', 'dw-church') . '</p></div>';
                        });
                    }
                } else {
                    add_action('admin_notices', function() {
                        echo '<div class="notice notice-error"><p>' . __('현재 비밀번호가 올바르지 않습니다.', 'dw-church') . '</p></div>';
                    });
                }
            }
            
            add_action('admin_notices', function() {
                echo '<div class="notice notice-success"><p>' . __('프로필이 성공적으로 업데이트되었습니다.', 'dw-church') . '</p></div>';
            });
        }
    }
    
    /**
     * Logout page
     */
    public function dw_church_logout_page() {
        // Check if headers already sent
        if (headers_sent()) {
            // If headers already sent, use JavaScript redirect
            echo '<script>window.location.href = "' . esc_url(wp_logout_url()) . '";</script>';
            echo '<noscript><meta http-equiv="refresh" content="0;url=' . esc_url(wp_logout_url()) . '"></noscript>';
            echo '<p>' . __('로그아웃 중입니다...', 'dw-church') . '</p>';
            echo '<p><a href="' . esc_url(wp_logout_url()) . '">' . __('여기를 클릭하여 로그아웃하세요.', 'dw-church') . '</a></p>';
            return;
        }
        
        // Safe redirect
        wp_safe_redirect(wp_logout_url());
        exit;
    }
}

