<?php
/**
 * Plugin Name: DW Church Management System
 * Plugin URI: https://github.com/dasomweb/dasom-church-management-system
 * Description: Complete church management system for bulletins, sermons, columns, and albums with modern security practices.
 * Version: 1.3.6
 * Author: Dasomweb
 * Author URI: https://dasomweb.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: dasom-church
 * Domain Path: /languages
 * Requires at least: 5.8
 * Tested up to: 6.8
 * Requires PHP: 7.4
 * GitHub Plugin URI: dasomweb/dasom-church-management-system
 * GitHub Branch: main
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('DASOM_CHURCH_VERSION', '1.3.6');
define('DASOM_CHURCH_PLUGIN_URL', plugin_dir_url(__FILE__));
define('DASOM_CHURCH_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('DASOM_CHURCH_PLUGIN_FILE', __FILE__);

// Auto-update configuration
add_filter('auto_update_plugin', function($update, $item) {
    // Enable auto-update for this plugin only
    if ($item->plugin === plugin_basename(__FILE__)) {
        // Optional: Add conditions for auto-update
        // 예: 특정 사용자만 자동 업데이트
        // if (current_user_can('manage_options')) {
        //     return true;
        // }
        return true;
    }
    return $update;
}, 10, 2);

// Add update checker for GitHub releases
add_action('init', function() {
    if (is_admin()) {
        add_filter('pre_set_site_transient_update_plugins', 'dasom_church_check_for_updates');
        add_filter('plugins_api', 'dasom_church_plugin_info', 20, 3);
        add_action('upgrader_process_complete', 'dasom_church_clear_update_cache', 10, 2);
    }
});

/**
 * Get GitHub API headers with optional authentication
 *
 * @return array Headers for GitHub API request
 */
function dasom_church_get_github_headers() {
    $headers = array(
        'Accept' => 'application/vnd.github.v3+json',
        'User-Agent' => 'WordPress/' . get_bloginfo('version') . '; ' . get_bloginfo('url')
    );
    
    // Get GitHub token from settings (for private repositories)
    $github_token = get_option('dw_github_access_token', '');
    
    if (!empty($github_token)) {
        $headers['Authorization'] = 'token ' . $github_token;
    }
    
    return $headers;
}

/**
 * Check for plugin updates from GitHub
 *
 * @param object $transient Update transient
 * @return object Modified transient
 */
function dasom_church_check_for_updates($transient) {
    if (empty($transient->checked)) {
        return $transient;
    }
    
    // Plugin configuration
    $plugin_slug = plugin_basename(__FILE__);
    $github_username = 'dasomweb';
    $github_repo = 'dasom-church-management-system';
    
    // Check cache first (12 hours)
    $cache_key = 'dasom_church_update_' . md5($github_username . $github_repo);
    $cached_data = get_transient($cache_key);
    
    if ($cached_data !== false) {
        $release = $cached_data;
    } else {
        // Get latest release from GitHub API
        $response = wp_remote_get(
            "https://api.github.com/repos/{$github_username}/{$github_repo}/releases/latest",
            array(
                'timeout' => 15,
                'headers' => dasom_church_get_github_headers()
            )
        );
        
        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            return $transient;
        }
        
        $release = json_decode(wp_remote_retrieve_body($response), true);
        
        // Cache for 12 hours
        set_transient($cache_key, $release, 12 * HOUR_IN_SECONDS);
    }
    
    if (isset($release['tag_name']) && isset($release['zipball_url'])) {
        $latest_version = ltrim($release['tag_name'], 'v');
        $current_version = DASOM_CHURCH_VERSION;
        
        if (version_compare($latest_version, $current_version, '>')) {
            $plugin_data = array(
                'slug' => dirname($plugin_slug),
                'plugin' => $plugin_slug,
                'new_version' => $latest_version,
                'url' => "https://github.com/{$github_username}/{$github_repo}",
                'package' => $release['zipball_url'],
                'tested' => '6.8',
                'requires_php' => '7.4',
                'compatibility' => new stdClass(),
            );
            
            $transient->response[$plugin_slug] = (object) $plugin_data;
        }
    }
    
    return $transient;
}

/**
 * Provide plugin information for update details
 *
 * @param false|object|array $result The result object or array
 * @param string $action The type of information being requested
 * @param object $args Plugin API arguments
 * @return false|object|array Modified result
 */
function dasom_church_plugin_info($result, $action, $args) {
    $plugin_slug = dirname(plugin_basename(__FILE__));
    
    if ($action !== 'plugin_information' || !isset($args->slug) || $args->slug !== $plugin_slug) {
        return $result;
    }
    
    $github_username = 'dasomweb';
    $github_repo = 'dasom-church-management-system';
    
    // Check cache first
    $cache_key = 'dasom_church_plugin_info_' . md5($github_username . $github_repo);
    $cached_info = get_transient($cache_key);
    
    if ($cached_info !== false) {
        return $cached_info;
    }
    
    // Get latest release info
    $response = wp_remote_get(
        "https://api.github.com/repos/{$github_username}/{$github_repo}/releases/latest",
        array(
            'timeout' => 15,
            'headers' => dasom_church_get_github_headers()
        )
    );
    
    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
        return $result;
    }
    
    $release = json_decode(wp_remote_retrieve_body($response), true);
    
    if (isset($release['tag_name'])) {
        $latest_version = ltrim($release['tag_name'], 'v');
        
        $plugin_info = new stdClass();
        $plugin_info->name = 'DW Church Management System';
        $plugin_info->slug = $plugin_slug;
        $plugin_info->version = $latest_version;
        $plugin_info->author = '<a href="https://dasomweb.com">Dasomweb</a>';
        $plugin_info->homepage = "https://github.com/{$github_username}/{$github_repo}";
        $plugin_info->tested = '6.8';
        $plugin_info->requires = '5.8';
        $plugin_info->requires_php = '7.4';
        $plugin_info->last_updated = $release['published_at'];
        $plugin_info->download_link = $release['zipball_url'];
        
        // Sections
        $plugin_info->sections = array(
            'description' => 'Complete church management system for bulletins, sermons, pastoral columns, and photo albums with modern security practices.',
            'installation' => 'Upload the plugin files to the /wp-content/plugins/ directory, or install through the WordPress plugins screen. Activate the plugin and configure settings under DW 교회관리 menu.',
            'changelog' => !empty($release['body']) ? $release['body'] : 'See full changelog at ' . $release['html_url']
        );
        
        // Cache for 12 hours
        set_transient($cache_key, $plugin_info, 12 * HOUR_IN_SECONDS);
        
        return $plugin_info;
    }
    
    return $result;
}

/**
 * Clear update cache after plugin update
 *
 * @param object $upgrader_object Upgrader object
 * @param array $options Update options
 */
function dasom_church_clear_update_cache($upgrader_object, $options) {
    if ($options['action'] === 'update' && $options['type'] === 'plugin') {
        $github_username = 'dasomweb';
        $github_repo = 'dasom-church-management-system';
        
        // Clear update cache
        delete_transient('dasom_church_update_' . md5($github_username . $github_repo));
        delete_transient('dasom_church_plugin_info_' . md5($github_username . $github_repo));
    }
}

/**
 * Force check for updates (for debugging)
 * Usage: Add ?dasom_check_update=1 to admin URL
 */
add_action('admin_init', function() {
    if (isset($_GET['dasom_check_update']) && current_user_can('update_plugins')) {
        $github_username = 'dasomweb';
        $github_repo = 'dasom-church-management-system';
        
        delete_transient('dasom_church_update_' . md5($github_username . $github_repo));
        delete_transient('dasom_church_plugin_info_' . md5($github_username . $github_repo));
        
        wp_redirect(admin_url('plugins.php'));
        exit;
    }
    
    // Force migration (for debugging)
    // Usage: Add ?dasom_force_migration=1 to admin URL
    if (isset($_GET['dasom_force_migration']) && current_user_can('manage_options')) {
        // Reset migration version to force re-run
        delete_option('dasom_church_migration_version');
        
        // Show notice
        add_action('admin_notices', function() {
            echo '<div class="notice notice-success is-dismissible">';
            echo '<p><strong>DW Church Management System:</strong> 마이그레이션 버전이 초기화되었습니다. 페이지를 새로고침하면 자동으로 마이그레이션이 실행됩니다.</p>';
            echo '</div>';
        });
    }
});

/**
 * Main plugin class
 */
class Dasom_Church_Management {
    
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
        $this->dasom_church_load_dependencies();
        $this->dasom_church_init_hooks();
    }
    
    /**
     * Load plugin dependencies
     */
    private function dasom_church_load_dependencies() {
        // Load core files
        require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/functions-helpers.php';
        
        // Load admin files - ALWAYS load to register post types
        require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dasom-church-admin.php';
        // Initialize admin class
        Dasom_Church_Admin::get_instance();
        
        // Load public files
        if (!is_admin()) {
            require_once DASOM_CHURCH_PLUGIN_PATH . 'public/class-dasom-church-public.php';
        }
    }
    
    /**
     * Initialize hooks
     */
    private function dasom_church_init_hooks() {
        add_action('plugins_loaded', array($this, 'dasom_church_load_textdomain'));
        register_activation_hook(__FILE__, array($this, 'dasom_church_activation'));
        register_deactivation_hook(__FILE__, array($this, 'dasom_church_deactivation'));
        
        // Initialize loader
        add_action('init', array($this, 'dasom_church_init'));
    }
    
    /**
     * Load text domain for internationalization
     */
    public function dasom_church_load_textdomain() {
        load_plugin_textdomain('dasom-church', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    /**
     * Plugin activation
     */
    public function dasom_church_activation() {
        // Register post types first
        require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dasom-church-admin.php';
        $admin = Dasom_Church_Admin::get_instance();
        $admin->dasom_church_register_post_types();
        $admin->dasom_church_register_taxonomies();
        
        // Create default sermon categories
        $default_categories = array(
            __('주일설교', 'dasom-church'),
            __('새벽설교', 'dasom-church'),
            __('수요설교', 'dasom-church'),
            __('금요설교', 'dasom-church')
        );
        
        foreach ($default_categories as $category) {
            if (!term_exists($category, 'sermon_category')) {
                wp_insert_term($category, 'sermon_category');
            }
        }
        
        // Create default preacher
        $default_preacher = __('담임목사', 'dasom-church');
        if (!term_exists($default_preacher, 'sermon_preacher')) {
            wp_insert_term($default_preacher, 'sermon_preacher');
        }
        update_option('default_sermon_preacher', $default_preacher);
        
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation
     */
    public function dasom_church_deactivation() {
        flush_rewrite_rules();
    }
    
    /**
     * Initialize plugin
     */
    public function dasom_church_init() {
        // Check if migration is needed (one-time for v1.2.0)
        add_action('admin_init', array($this, 'dasom_church_check_migration'));
    }
    
    /**
     * Check and run migration if needed
     */
    public function dasom_church_check_migration() {
        $migration_version = get_option('dasom_church_migration_version', '0');
        
        // Migration for version 1.2.0
        if (version_compare($migration_version, '1.2.0', '<')) {
            $this->dasom_church_run_migration();
            update_option('dasom_church_migration_version', '1.2.0');
            
            // Show admin notice
            add_action('admin_notices', function() {
                echo '<div class="notice notice-success is-dismissible">';
                echo '<p><strong>DW Church Management System:</strong> 데이터 마이그레이션이 완료되었습니다.</p>';
                echo '</div>';
            });
        }
        
        // Migration for version 1.3.4 - Fix church settings prefix
        if (version_compare($migration_version, '1.3.4', '<')) {
            $this->dasom_church_run_settings_migration();
            update_option('dasom_church_migration_version', '1.3.4');
            
            // Show admin notice
            add_action('admin_notices', function() {
                echo '<div class="notice notice-success is-dismissible">';
                echo '<p><strong>DW Church Management System:</strong> 교회 설정 데이터 마이그레이션이 완료되었습니다.</p>';
                echo '</div>';
            });
        }
    }
    
    /**
     * Run database migration
     */
    private function dasom_church_run_migration() {
        global $wpdb;
        
        // Meta key mappings: old_key => new_key
        $meta_key_map = array(
            'bulletin_date' => 'dw_bulletin_date',
            'bulletin_pdf' => 'dw_bulletin_pdf',
            'bulletin_images' => 'dw_bulletin_images',
            'sermon_title' => 'dw_sermon_title',
            'sermon_youtube' => 'dw_sermon_youtube',
            'sermon_scripture' => 'dw_sermon_scripture',
            'sermon_date' => 'dw_sermon_date',
            'sermon_thumb_id' => 'dw_sermon_thumb_id',
            'column_title' => 'dw_column_title',
            'column_content' => 'dw_column_content',
            'column_top_image' => 'dw_column_top_image',
            'column_bottom_image' => 'dw_column_bottom_image',
            'column_youtube' => 'dw_column_youtube',
            'column_thumb_id' => 'dw_column_thumb_id',
            'album_images' => 'dw_album_images',
            'dasom_album_images' => 'dw_album_images',
            'album_youtube' => 'dw_album_youtube',
            'album_thumb_id' => 'dw_album_thumb_id',
        );
        
        foreach ($meta_key_map as $old_key => $new_key) {
            // Update meta keys directly in database
            $wpdb->query($wpdb->prepare(
                "UPDATE {$wpdb->postmeta} pm1
                LEFT JOIN {$wpdb->postmeta} pm2 ON pm1.post_id = pm2.post_id AND pm2.meta_key = %s
                SET pm1.meta_key = %s
                WHERE pm1.meta_key = %s AND pm2.meta_id IS NULL",
                $new_key,
                $new_key,
                $old_key
            ));
        }
        
        // Migrate taxonomy
        if (taxonomy_exists('sermon_preacher') && taxonomy_exists('dw_sermon_preacher')) {
            $old_terms = get_terms(array('taxonomy' => 'sermon_preacher', 'hide_empty' => false));
            
            if (!empty($old_terms) && !is_wp_error($old_terms)) {
                foreach ($old_terms as $old_term) {
                    $existing = get_term_by('name', $old_term->name, 'dw_sermon_preacher');
                    
                    if (!$existing) {
                        $new_term = wp_insert_term($old_term->name, 'dw_sermon_preacher', array(
                            'description' => $old_term->description,
                            'slug' => $old_term->slug,
                        ));
                        
                        if (!is_wp_error($new_term)) {
                            $posts = get_posts(array(
                                'post_type' => 'sermon',
                                'posts_per_page' => -1,
                                'tax_query' => array(array(
                                    'taxonomy' => 'sermon_preacher',
                                    'field' => 'term_id',
                                    'terms' => $old_term->term_id,
                                )),
                            ));
                            
                            foreach ($posts as $post) {
                                wp_set_post_terms($post->ID, array($new_term['term_id']), 'dw_sermon_preacher', false);
                            }
                        }
                    }
                }
            }
        }
        
        // Migrate church settings options
        $settings_map = array(
            'dasom_church_name' => 'dw_church_name',
            'dasom_church_address' => 'dw_church_address',
            'dasom_church_phone' => 'dw_church_phone',
            'dasom_church_email' => 'dw_church_email',
            'dasom_church_website' => 'dw_church_website',
            'dasom_social_youtube' => 'dw_social_youtube',
            'dasom_social_instagram' => 'dw_social_instagram',
            'dasom_social_facebook' => 'dw_social_facebook',
            'dasom_social_linkedin' => 'dw_social_linkedin',
            'dasom_social_tiktok' => 'dw_social_tiktok',
            'dasom_social_kakaotalk' => 'dw_social_kakaotalk',
            'dasom_social_kakaotalk_channel' => 'dw_social_kakaotalk_channel',
        );
        
        foreach ($settings_map as $old_option => $new_option) {
            $value = get_option($old_option);
            if ($value !== false) {
                update_option($new_option, $value);
                delete_option($old_option);
            }
        }
    }
    
    /**
     * Run settings migration for v1.3.4
     * This ensures church settings are properly migrated
     */
    private function dasom_church_run_settings_migration() {
        // Check if old settings exist and migrate them
        $old_settings = array(
            'dasom_church_name',
            'dasom_church_address',
            'dasom_church_phone',
            'dasom_church_email',
            'dasom_church_website',
            'dasom_social_youtube',
            'dasom_social_instagram',
            'dasom_social_facebook',
            'dasom_social_linkedin',
            'dasom_social_tiktok',
            'dasom_social_kakaotalk',
            'dasom_social_kakaotalk_channel',
        );
        
        foreach ($old_settings as $old_key) {
            $value = get_option($old_key, false);
            if ($value !== false && $value !== '') {
                // Convert to new key format
                $new_key = str_replace('dasom_', 'dw_', $old_key);
                
                // Only update if new key doesn't exist or is empty
                $existing_value = get_option($new_key, '');
                if (empty($existing_value)) {
                    update_option($new_key, $value);
                }
            }
        }
    }
}

// Initialize the plugin
Dasom_Church_Management::get_instance();


