<?php
/**
 * Plugin Name: DW Church Management System
 * Plugin URI: https://github.com/dasomweb/dasom-church-management-system
 * Description: Complete church management system for bulletins, sermons, columns, and albums with modern security practices.
 * Version: 1.4.1
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
define('DASOM_CHURCH_VERSION', '1.4.1');
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
    
    if (isset($release['tag_name'])) {
        $latest_version = ltrim($release['tag_name'], 'v');
        $current_version = DASOM_CHURCH_VERSION;
        
        if (version_compare($latest_version, $current_version, '>')) {
            // Use GitHub archive URL instead of zipball_url for better compatibility
            $download_url = "https://github.com/{$github_username}/{$github_repo}/archive/refs/tags/{$release['tag_name']}.zip";
            
            $plugin_data = array(
                'slug' => dirname($plugin_slug),
                'plugin' => $plugin_slug,
                'new_version' => $latest_version,
                'url' => "https://github.com/{$github_username}/{$github_repo}",
                'package' => $download_url,
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
        
        // Use GitHub archive URL instead of zipball_url for better compatibility
        $download_url = "https://github.com/{$github_username}/{$github_repo}/archive/refs/tags/{$release['tag_name']}.zip";
        
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
        $plugin_info->download_link = $download_url;
        
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
        // Plugin initialization
    }
}

// Initialize the plugin
Dasom_Church_Management::get_instance();


