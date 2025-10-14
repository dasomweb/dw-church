<?php
/**
 * Plugin Name: DW Church Management System
 * Plugin URI: https://github.com/dasomweb/dasom-church-management-system
 * Description: Complete church management system for bulletins, sermons, columns, and albums with modern security practices.
 * Version: 1.2.3
 * Author: Dasomweb
 * Author URI: https://dasomweb.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: dasom-church
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('DASOM_CHURCH_VERSION', '1.0.4');
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
    }
});

function dasom_church_check_for_updates($transient) {
    if (empty($transient->checked)) {
        return $transient;
    }
    
    $plugin_slug = 'dasom-church-management';
    $github_username = 'dasowmeb';
    $github_repo = 'dasom-church-management-system';
    
    // Get latest release from GitHub
    $response = wp_remote_get("https://api.github.com/repos/{$github_username}/{$github_repo}/releases/latest", array(
        'timeout' => 15,
        'headers' => array(
            'Accept' => 'application/vnd.github.v3+json',
        )
    ));
    
    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
        return $transient;
    }
    
    $release = json_decode(wp_remote_retrieve_body($response), true);
    
    if (isset($release['tag_name']) && isset($release['zipball_url'])) {
        $latest_version = str_replace('v', '', $release['tag_name']);
        $current_version = DASOM_CHURCH_VERSION;
        
        if (version_compare($latest_version, $current_version, '>')) {
            $transient->response[plugin_basename(__FILE__)] = (object) array(
                'slug' => $plugin_slug,
                'plugin' => plugin_basename(__FILE__),
                'new_version' => $latest_version,
                'url' => $release['html_url'],
                'package' => $release['zipball_url'],
                'icons' => array(),
                'banners' => array(),
                'banners_rtl' => array(),
                'tested' => '6.4',
                'requires_php' => '7.4',
                'compatibility' => new stdClass(),
                'id' => plugin_basename(__FILE__),
                'slug' => $plugin_slug,
            );
        }
    }
    
    return $transient;
}

function dasom_church_plugin_info($result, $action, $args) {
    if ($action !== 'plugin_information' || $args->slug !== 'dasom-church-management') {
        return $result;
    }
    
    $github_username = 'dasowmeb';
    $github_repo = 'dasom-church-management-system';
    
    $response = wp_remote_get("https://api.github.com/repos/{$github_username}/{$github_repo}/releases/latest");
    
    if (is_wp_error($response)) {
        return $result;
    }
    
    $release = json_decode(wp_remote_retrieve_body($response), true);
    
    if (isset($release['tag_name'])) {
        $latest_version = str_replace('v', '', $release['tag_name']);
        
        $result = new stdClass();
        $result->name = 'Dasom Church Management System';
        $result->slug = 'dasom-church-management';
        $result->version = $latest_version;
        $result->tested = '6.4';
        $result->requires = '5.0';
        $result->requires_php = '7.4';
        $result->last_updated = $release['published_at'];
        $result->homepage = $release['html_url'];
        $result->sections = array(
            'description' => 'Complete church management system for bulletins, sermons, columns, and albums.',
            'changelog' => $release['body'] ?: 'No changelog available.'
        );
        $result->download_link = $release['zipball_url'];
    }
    
    return $result;
}

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
        
        // Only run migration once for version 1.2.0
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
    }
}

// Initialize the plugin
Dasom_Church_Management::get_instance();


