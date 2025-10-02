<?php
/**
 * Plugin Name: Dasom Church Management System
 * Plugin URI: https://github.com/dasom-church/management-system
 * Description: Complete church management system for bulletins, sermons, columns, and albums with modern security practices.
 * Version: 1.0.0
 * Author: Dasom Church
 * Author URI: https://dasom-church.org
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
define('DASOM_CHURCH_VERSION', '1.0.0');
define('DASOM_CHURCH_PLUGIN_URL', plugin_dir_url(__FILE__));
define('DASOM_CHURCH_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('DASOM_CHURCH_PLUGIN_FILE', __FILE__);

// Auto-update configuration
add_filter('auto_update_plugin', function($update, $item) {
    // Enable auto-update for this plugin
    if ($item->plugin === plugin_basename(__FILE__)) {
        return true;
    }
    return $update;
}, 10, 2);

// Add update checker (if using GitHub releases)
add_action('init', function() {
    if (is_admin()) {
        // Check for updates from GitHub
        add_filter('pre_set_site_transient_update_plugins', 'dasom_church_check_for_updates');
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
    $response = wp_remote_get("https://api.github.com/repos/{$github_username}/{$github_repo}/releases/latest");
    
    if (is_wp_error($response)) {
        return $transient;
    }
    
    $release = json_decode(wp_remote_retrieve_body($response), true);
    
    if (isset($release['tag_name'])) {
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
            );
        }
    }
    
    return $transient;
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
        require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/class-dasom-church-loader.php';
        require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/functions-helpers.php';
        
        // Load admin files
        if (is_admin()) {
            require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dasom-church-admin.php';
            // Initialize admin class
            Dasom_Church_Admin::get_instance();
        }
        
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
        // Create default sermon categories
        $default_categories = array(
            __('Sunday Sermon', 'dasom-church'),
            __('Dawn Sermon', 'dasom-church'),
            __('Wednesday Sermon', 'dasom-church'),
            __('Friday Sermon', 'dasom-church')
        );
        
        foreach ($default_categories as $category) {
            if (!term_exists($category, 'dasom_sermon_category')) {
                wp_insert_term($category, 'dasom_sermon_category');
            }
        }
        
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
        // Initialize loader
        Dasom_Church_Loader::get_instance();
    }
}

// Initialize the plugin
Dasom_Church_Management::get_instance();

