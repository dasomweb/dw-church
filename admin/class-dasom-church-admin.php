<?php
/**
 * Church Admin – Bulletins, Sermons, Columns, Albums
 * Complete integrated version with security improvements and Quick Edit support
 *
 * @package Dasom_Church
 * @since 1.0.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Admin class
 */
class Dasom_Church_Admin {
    
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
        $this->dasom_church_init_hooks();
    }
    
    /**
     * Initialize hooks
     */
    private function dasom_church_init_hooks() {
        // Admin menu
        add_action('admin_menu', array($this, 'dasom_church_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'dasom_church_admin_scripts'));
        add_action('admin_init', array($this, 'dasom_church_handle_settings_save'));
        
        // Custom Post Types
        add_action('init', array($this, 'dasom_church_register_post_types'));
        add_action('init', array($this, 'dasom_church_register_taxonomies'));
        
        // Load meta boxes and columns classes
        require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dasom-church-meta-boxes.php';
        require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dasom-church-columns.php';
        
        // Remove default editor support
        add_action('admin_init', array($this, 'dasom_church_remove_editor_support'));
        add_filter('use_block_editor_for_post_type', array($this, 'dasom_church_disable_block_editor'), 10, 2);
        
        // Elementor compatibility
        add_filter('get_post_metadata', array($this, 'dasom_church_elementor_metadata'), 9, 4);
        
        // Admin head styles
        add_action('admin_head', array($this, 'dasom_church_admin_head_styles'));
    }
    
    /**
     * Add admin menu
     */
    public function dasom_church_admin_menu() {
        // Main menu - 고유한 슬러그 사용
        add_menu_page(
            __('DW 교회관리', 'dasom-church'),
            __('DW 교회관리', 'dasom-church'),
            'manage_options',
            'dasom-church-admin',
            array($this, 'dasom_church_dashboard_page'),
            'data:image/svg+xml;base64,' . base64_encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M11 2v6h6v3h-6v7H8v-7H2V8h6V2z"/></svg>'),
            5
        );
        
        // 디버깅: 메뉴가 등록되었는지 확인
        if (current_user_can('manage_options')) {
            error_log('Dasom Church Admin Menu Registered');
        }
        
        // Dashboard submenu
        add_submenu_page(
            'dasom-church-admin',
            __('대시보드', 'dasom-church'),
            __('대시보드', 'dasom-church'),
            'manage_options',
            'dasom-church-dashboard',
            array($this, 'dasom_church_dashboard_page')
        );
        
        // Settings submenu
        add_submenu_page(
            'dasom-church-admin',
            __('설정', 'dasom-church'),
            __('설정', 'dasom-church'),
            'manage_options',
            'dasom-church-settings',
            array($this, 'dasom_church_settings_page')
        );
        
        // Add GitHub Update settings to WordPress Settings menu (독립적)
        add_options_page(
            __('DW 설정', 'dasom-church'),
            __('DW 설정', 'dasom-church'),
            'manage_options',
            'dasom-church-github-update',
            array($this, 'dasom_church_github_update_page')
        );
    }
    
    /**
     * Register Custom Post Types
     */
    public function dasom_church_register_post_types() {
        // 교회주보
        register_post_type('bulletin', array(
            'labels' => array(
                'name' => __('교회주보', 'dasom-church'),
                'singular_name' => __('주보', 'dasom-church'),
                'menu_name' => __('교회주보', 'dasom-church'),
                'add_new' => __('새 주보 추가', 'dasom-church'),
                'add_new_item' => __('새 주보 추가', 'dasom-church'),
                'edit_item' => __('주보 편집', 'dasom-church'),
                'new_item' => __('새 주보', 'dasom-church'),
                'view_item' => __('주보 보기', 'dasom-church'),
                'search_items' => __('주보 검색', 'dasom-church'),
                'not_found' => __('주보를 찾을 수 없습니다', 'dasom-church'),
                'not_found_in_trash' => __('휴지통에서 주보를 찾을 수 없습니다', 'dasom-church'),
            ),
            'public' => true,
            'show_ui' => true,
            'show_in_menu' => 'dasom-church-admin',
            'menu_position' => 1,
            'supports' => array('title', 'author'),
            'show_in_rest' => true,
            'has_archive' => true,
            'rewrite' => array('slug' => 'bulletin'),
            'capability_type' => 'post',
            'map_meta_cap' => true,
        ));
        
        // 설교
        register_post_type('sermon', array(
            'labels' => array(
                'name' => __('설교', 'dasom-church'),
                'singular_name' => __('설교', 'dasom-church'),
                'menu_name' => __('설교', 'dasom-church'),
                'add_new' => __('새 설교 추가', 'dasom-church'),
                'add_new_item' => __('새 설교 추가', 'dasom-church'),
                'edit_item' => __('설교 편집', 'dasom-church'),
                'new_item' => __('새 설교', 'dasom-church'),
                'view_item' => __('설교 보기', 'dasom-church'),
                'search_items' => __('설교 검색', 'dasom-church'),
                'not_found' => __('설교를 찾을 수 없습니다', 'dasom-church'),
                'not_found_in_trash' => __('휴지통에서 설교를 찾을 수 없습니다', 'dasom-church'),
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
                'name' => __('목회컬럼', 'dasom-church'),
                'singular_name' => __('컬럼', 'dasom-church'),
                'menu_name' => __('목회컬럼', 'dasom-church'),
                'add_new' => __('새 컬럼 추가', 'dasom-church'),
                'add_new_item' => __('새 컬럼 추가', 'dasom-church'),
                'edit_item' => __('컬럼 편집', 'dasom-church'),
                'new_item' => __('새 컬럼', 'dasom-church'),
                'view_item' => __('컬럼 보기', 'dasom-church'),
                'search_items' => __('컬럼 검색', 'dasom-church'),
                'not_found' => __('컬럼을 찾을 수 없습니다', 'dasom-church'),
                'not_found_in_trash' => __('휴지통에서 컬럼을 찾을 수 없습니다', 'dasom-church'),
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
                'name' => __('교회앨범', 'dasom-church'),
                'singular_name' => __('앨범', 'dasom-church'),
                'menu_name' => __('교회앨범', 'dasom-church'),
                'add_new' => __('새 앨범 추가', 'dasom-church'),
                'add_new_item' => __('새 앨범 추가', 'dasom-church'),
                'edit_item' => __('앨범 편집', 'dasom-church'),
                'new_item' => __('새 앨범', 'dasom-church'),
                'view_item' => __('앨범 보기', 'dasom-church'),
                'search_items' => __('앨범 검색', 'dasom-church'),
                'not_found' => __('앨범을 찾을 수 없습니다', 'dasom-church'),
                'not_found_in_trash' => __('휴지통에서 앨범을 찾을 수 없습니다', 'dasom-church'),
            ),
            'public' => true,
            'show_in_menu' => 'dasom-church-admin',
            'menu_position' => 4,
            'supports' => array('title', 'thumbnail'),
            'show_in_rest' => false,
            'capability_type' => 'post',
            'map_meta_cap' => true,
        ));
    }
    
    /**
     * Register Taxonomies
     */
    public function dasom_church_register_taxonomies() {
        // 설교 카테고리
        register_taxonomy('sermon_category', 'sermon', array(
            'labels' => array(
                'name' => __('설교 카테고리', 'dasom-church'),
                'singular_name' => __('설교 카테고리', 'dasom-church'),
                'menu_name' => __('설교 카테고리', 'dasom-church'),
                'add_new_item' => __('새 카테고리 추가', 'dasom-church'),
                'edit_item' => __('카테고리 편집', 'dasom-church'),
                'update_item' => __('카테고리 업데이트', 'dasom-church'),
                'search_items' => __('카테고리 검색', 'dasom-church'),
                'not_found' => __('카테고리를 찾을 수 없습니다', 'dasom-church'),
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
                'name' => __('설교자', 'dasom-church'),
                'singular_name' => __('설교자', 'dasom-church'),
                'menu_name' => __('설교자 관리', 'dasom-church'),
                'add_new_item' => __('새 설교자 추가', 'dasom-church'),
                'edit_item' => __('설교자 편집', 'dasom-church'),
                'update_item' => __('설교자 업데이트', 'dasom-church'),
                'search_items' => __('설교자 검색', 'dasom-church'),
                'not_found' => __('설교자를 찾을 수 없습니다', 'dasom-church'),
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
        
        // 기본 카테고리 및 설교자 생성
        $this->dasom_church_create_default_terms();
    }
    
    /**
     * Create default terms
     */
    private function dasom_church_create_default_terms() {
        // 기본 설교 카테고리 생성
        $default_categories = array(
            __('주일설교', 'dasom-church'),
            __('새벽설교', 'dasom-church'),
            __('수요설교', 'dasom-church'),
            __('금요설교', 'dasom-church')
        );
        
        foreach ($default_categories as $category) {
            if (!term_exists($category, 'sermon_category')) {
                $result = wp_insert_term($category, 'sermon_category');
                if (is_wp_error($result)) {
                    error_log('Failed to create sermon category: ' . $result->get_error_message());
                }
            }
        }
        
        // 기본 설교자 설정
        if (false === get_option('default_sermon_preacher', false)) {
            update_option('default_sermon_preacher', __('담임목사', 'dasom-church'));
        }
        
        $default_preacher = get_option('default_sermon_preacher', __('담임목사', 'dasom-church'));
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
    public function dasom_church_remove_editor_support() {
        remove_post_type_support('bulletin', 'title');
        remove_post_type_support('bulletin', 'editor');
        remove_post_type_support('sermon', 'title');
        remove_post_type_support('sermon', 'editor');
    }
    
    /**
     * Disable block editor
     */
    public function dasom_church_disable_block_editor($use, $post_type) {
        if (in_array($post_type, array('bulletin', 'sermon'))) {
            return false;
        }
        return $use;
    }
    
    /**
     * Handle preacher management actions
     */
    private function dasom_church_handle_preacher_action($action) {
        // Verify nonce
        if (!isset($_POST['_wpnonce']) || !wp_verify_nonce($_POST['_wpnonce'], 'sermon_preacher_actions')) {
            wp_die(__('Security check failed', 'dasom-church'));
        }
        
        // Check user permissions
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to perform this action.', 'dasom-church'));
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
            echo '<div class="updated"><p>' . __('설정이 저장되었습니다.', 'dasom-church') . '</p></div>';
        });
    }
    
    /**
     * Dashboard page
     */
    public function dasom_church_dashboard_page() {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'dasom-church'));
        }
        
        // 설교자 관리 액션 처리
        if (isset($_POST['preacher_action']) && check_admin_referer('sermon_preacher_actions')) {
            if (!current_user_can('manage_options')) {
                wp_die(__('권한이 없습니다.', 'dasom-church'));
            }
            
            $action = sanitize_text_field($_POST['preacher_action']);
            $this->dasom_church_handle_preacher_action($action);
        }
        
        // Load dashboard view
        include DASOM_CHURCH_PLUGIN_PATH . 'admin/views/dashboard.php';
    }
    
    /**
     * Settings page
     */
    public function dasom_church_settings_page() {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'dasom-church'));
        }
        
        // Load settings view
        include DASOM_CHURCH_PLUGIN_PATH . 'admin/views/settings.php';
    }
    
    /**
     * GitHub Update page (독립적 - WordPress Settings 메뉴)
     */
    public function dasom_church_github_update_page() {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'dasom-church'));
        }
        
        // Load GitHub update view
        include DASOM_CHURCH_PLUGIN_PATH . 'admin/views/github-update.php';
    }
    
    /**
     * Elementor compatibility - metadata filter
     */
    public function dasom_church_elementor_metadata($value, $post_id, $meta_key, $single) {
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
        
        // bulletin_date → YYYY년 M월 D일 형식으로 변환
        if ($meta_key === 'bulletin_date' || $meta_key === 'dw_bulletin_date') {
            $actual_key = $meta_key === 'bulletin_date' ? 'dw_bulletin_date' : $meta_key;
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
    public function dasom_church_admin_head_styles() {
        global $post_type;
        if (in_array($post_type, array('bulletin', 'sermon'))) {
            echo '<style>#titlediv { display: none; }</style>';
        }
    }
    
    /**
     * Handle settings form submission
     */
    public function dasom_church_handle_settings_save() {
        if (!isset($_POST['dasom_church_settings_nonce']) || 
            !wp_verify_nonce($_POST['dasom_church_settings_nonce'], 'dasom_church_settings_action')) {
            return;
        }
        
        if (!current_user_can('manage_options')) {
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
            dasom_church_update_setting($key, $value);
        }
        
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
                delete_transient('dasom_church_update_' . md5($github_username . $github_repo));
                delete_transient('dasom_church_plugin_info_' . md5($github_username . $github_repo));
            }
        }
        
        add_action('admin_notices', function() {
            echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__('Settings saved successfully!', 'dasom-church') . '</p></div>';
        });
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function dasom_church_admin_scripts($hook) {
        // Only load on our admin pages
        if (strpos($hook, 'dasom-church') === false) {
            return;
        }
        
        wp_enqueue_style('dasom-church-admin', DASOM_CHURCH_PLUGIN_URL . 'assets/css/admin.css', array(), DASOM_CHURCH_VERSION);
        wp_enqueue_script('dasom-church-admin', DASOM_CHURCH_PLUGIN_URL . 'assets/js/admin.js', array('jquery'), DASOM_CHURCH_VERSION, true);
        
        // Localize script
        wp_localize_script('dasom-church-admin', 'dasomChurchAdmin', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('dasom_church_admin_nonce'),
            'strings' => array(
                'confirmDelete' => __('Are you sure you want to delete this item?', 'dasom-church'),
                'uploadError' => __('Upload failed. Please try again.', 'dasom-church'),
                'invalidUrl' => __('Invalid URL format.', 'dasom-church')
            )
        ));
    }
}

