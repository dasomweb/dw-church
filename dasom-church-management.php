<?php
/**
 * Plugin Name: DW Church Management System
 * Plugin URI: https://github.com/dasomweb/dasom-church-management-system
 * Description: Complete church management system for bulletins, sermons, columns, and albums with modern security practices.
 * Version: 1.37.84
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
define('DASOM_CHURCH_VERSION', '1.37.84');
define('DASOM_CHURCH_PLUGIN_URL', str_replace('http://', 'https://', plugin_dir_url(__FILE__)));
define('DASOM_CHURCH_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('DASOM_CHURCH_PLUGIN_FILE', __FILE__);

// Force HTTPS for plugin assets
add_filter('script_loader_src', function($src, $handle) {
    if (strpos($src, DASOM_CHURCH_PLUGIN_URL) !== false) {
        return str_replace('http://', 'https://', $src);
    }
    return $src;
}, 10, 2);

add_filter('style_loader_src', function($src, $handle) {
    if (strpos($src, DASOM_CHURCH_PLUGIN_URL) !== false) {
        return str_replace('http://', 'https://', $src);
    }
    return $src;
}, 10, 2);

// Force HTTPS for all external resources
add_filter('script_loader_src', function($src, $handle) {
    // Force HTTPS for common CDN resources
    if (strpos($src, '//cdn.jsdelivr.net') !== false || 
        strpos($src, '//fonts.googleapis.com') !== false ||
        strpos($src, '//fonts.gstatic.com') !== false ||
        strpos($src, '//ajax.googleapis.com') !== false) {
        return str_replace('http://', 'https://', $src);
    }
    return $src;
}, 10, 2);

add_filter('style_loader_src', function($src, $handle) {
    // Force HTTPS for common CDN resources
    if (strpos($src, '//cdn.jsdelivr.net') !== false || 
        strpos($src, '//fonts.googleapis.com') !== false ||
        strpos($src, '//fonts.gstatic.com') !== false ||
        strpos($src, '//ajax.googleapis.com') !== false) {
        return str_replace('http://', 'https://', $src);
    }
    return $src;
}, 10, 2);

// Force HTTPS for all WordPress assets
add_filter('script_loader_src', function($src, $handle) {
    // Force HTTPS for WordPress core and plugin assets
    if (strpos($src, home_url()) !== false) {
        return str_replace('http://', 'https://', $src);
    }
    return $src;
}, 10, 2);

add_filter('style_loader_src', function($src, $handle) {
    // Force HTTPS for WordPress core and plugin assets
    if (strpos($src, home_url()) !== false) {
        return str_replace('http://', 'https://', $src);
    }
    return $src;
}, 10, 2);

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

// Force HTTPS for WordPress
add_action('init', function() {
    if (is_ssl()) {
        // Force HTTPS for WordPress admin
        if (is_admin() && !is_ssl()) {
            wp_redirect('https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'], 301);
            exit;
        }
    }
});

// Force HTTPS for WordPress content
add_filter('content_url', function($url) {
    return str_replace('http://', 'https://', $url);
});

add_filter('plugins_url', function($url) {
    return str_replace('http://', 'https://', $url);
});

add_filter('theme_root_uri', function($url) {
    return str_replace('http://', 'https://', $url);
});

// Force HTTPS for WordPress uploads
add_filter('upload_dir', function($uploads) {
    $uploads['url'] = str_replace('http://', 'https://', $uploads['url']);
    $uploads['baseurl'] = str_replace('http://', 'https://', $uploads['baseurl']);
    return $uploads;
});

// Force HTTPS for Elementor assets
add_action('elementor/frontend/after_enqueue_styles', function() {
    // Force HTTPS for Elementor Google Fonts
    add_filter('elementor/frontend/print_google_fonts', function($google_fonts) {
        if (is_array($google_fonts)) {
            foreach ($google_fonts as $key => $font) {
                if (isset($font['font_url'])) {
                    $google_fonts[$key]['font_url'] = str_replace('http://', 'https://', $font['font_url']);
                }
            }
        }
        return $google_fonts;
    });
});

// Smart HTTPS enforcement - only when SSL is detected and needed
add_filter('style_loader_src', function($src, $handle) {
    // Only enforce HTTPS if SSL is actually detected and URL is HTTP
    if (is_ssl() && strpos($src, 'http://') === 0) {
        // Check if it's an Elementor Google Font CSS file
        if (strpos($handle, 'elementor-gf-local-') === 0 || strpos($src, '/wp-content/uploads/elementor/') !== false) {
            return str_replace('http://', 'https://', $src);
        }
    }
    return $src;
}, 10, 2);

// Force HTTPS for Elementor uploaded assets
add_filter('elementor/frontend/print_google_fonts', function($google_fonts) {
    if (is_array($google_fonts)) {
        foreach ($google_fonts as $key => $font) {
            if (isset($font['font_url'])) {
                $google_fonts[$key]['font_url'] = str_replace('http://', 'https://', $font['font_url']);
            }
        }
    }
    return $google_fonts;
});

// Force HTTPS for Elementor CSS files
add_filter('elementor/frontend/print_google_fonts', function($google_fonts) {
    if (is_array($google_fonts)) {
        foreach ($google_fonts as $key => $font) {
            if (isset($font['font_url'])) {
                $google_fonts[$key]['font_url'] = str_replace('http://', 'https://', $font['font_url']);
            }
        }
    }
    return $google_fonts;
});

// Force HTTPS for Elementor uploaded CSS files
add_filter('elementor/frontend/print_google_fonts', function($google_fonts) {
    if (is_array($google_fonts)) {
        foreach ($google_fonts as $key => $font) {
            if (isset($font['font_url'])) {
                $google_fonts[$key]['font_url'] = str_replace('http://', 'https://', $font['font_url']);
            }
        }
    }
    return $google_fonts;
});

// Force HTTPS for all Elementor assets
add_filter('elementor/frontend/print_google_fonts', function($google_fonts) {
    if (is_array($google_fonts)) {
        foreach ($google_fonts as $key => $font) {
            if (isset($font['font_url'])) {
                $google_fonts[$key]['font_url'] = str_replace('http://', 'https://', $font['font_url']);
            }
        }
    }
    return $google_fonts;
});

// Force HTTPS for all WordPress URLs
add_filter('wp_get_attachment_url', function($url) {
    return str_replace('http://', 'https://', $url);
});

add_filter('wp_get_attachment_image_src', function($image) {
    if (is_array($image) && isset($image[0])) {
        $image[0] = str_replace('http://', 'https://', $image[0]);
    }
    return $image;
});

// Force HTTPS for WordPress post thumbnail URLs
add_filter('post_thumbnail_html', function($html) {
    return str_replace('http://', 'https://', $html);
});

// Force HTTPS for WordPress attachment image URLs
add_filter('wp_get_attachment_image_url', function($url) {
    return str_replace('http://', 'https://', $url);
});

// Force HTTPS for WordPress post thumbnail URLs
add_filter('get_the_post_thumbnail_url', function($url) {
    return str_replace('http://', 'https://', $url);
});

// Force HTTPS for WordPress site URL
add_filter('option_siteurl', function($url) {
    return str_replace('http://', 'https://', $url);
});

add_filter('option_home', function($url) {
    return str_replace('http://', 'https://', $url);
});

// Force HTTPS for WordPress admin
add_filter('admin_url', function($url) {
    return str_replace('http://', 'https://', $url);
});

// Force HTTPS for WordPress login
add_filter('login_url', function($url) {
    return str_replace('http://', 'https://', $url);
});

// Clear Elementor cache when plugin is updated
add_action('upgrader_process_complete', function($upgrader_object, $options) {
    if ($options['action'] === 'update' && $options['type'] === 'plugin') {
        if (isset($options['plugins']) && in_array(plugin_basename(__FILE__), $options['plugins'])) {
            // Clear Elementor cache
            if (class_exists('\Elementor\Plugin')) {
                \Elementor\Plugin::$instance->files_manager->clear_cache();
            }
            // Clear WordPress cache
            if (function_exists('wp_cache_flush')) {
                wp_cache_flush();
            }
        }
    }
}, 10, 2);

// Alternative approach: Use protocol-relative URLs for fonts
add_filter('elementor/frontend/print_google_fonts', function($google_fonts) {
    if (is_array($google_fonts)) {
        foreach ($google_fonts as $key => $font) {
            if (isset($font['font_url']) && strpos($font['font_url'], 'http://') === 0) {
                // Convert to protocol-relative URL
                $google_fonts[$key]['font_url'] = str_replace('http://', '//', $font['font_url']);
            }
        }
    }
    return $google_fonts;
});

// Force WordPress to use HTTPS for content URLs when SSL is detected
add_filter('content_url', function($url) {
    if (is_ssl() && strpos($url, 'http://') === 0) {
        return str_replace('http://', 'https://', $url);
    }
    return $url;
});

// Alternative approach: Set WordPress to force SSL for admin and login
add_action('init', function() {
    if (is_ssl()) {
        // Force SSL for admin
        if (is_admin() && !is_ssl()) {
            wp_redirect('https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'], 301);
            exit();
        }
    }
});

// Smart URL handling - use protocol-relative URLs when possible
add_filter('wp_get_attachment_url', function($url) {
    if (is_ssl() && strpos($url, 'http://') === 0) {
        return str_replace('http://', 'https://', $url);
    }
    return $url;
});

// Handle Elementor font URLs more intelligently
add_filter('elementor/frontend/print_google_fonts', function($google_fonts) {
    if (is_array($google_fonts)) {
        foreach ($google_fonts as $key => $font) {
            if (isset($font['font_url'])) {
                // Use protocol-relative URL for better compatibility
                if (strpos($font['font_url'], 'http://') === 0) {
                    $google_fonts[$key]['font_url'] = str_replace('http://', '//', $font['font_url']);
                }
            }
        }
    }
    return $google_fonts;
});

// Add update checker for GitHub releases
add_action('init', function() {
    if (is_admin()) {
        add_filter('pre_set_site_transient_update_plugins', 'dasom_church_check_for_updates');
        add_filter('plugins_api', 'dasom_church_plugin_info', 20, 3);
        add_action('upgrader_process_complete', 'dasom_church_clear_update_cache', 10, 2);
        add_filter('upgrader_source_selection', 'dasom_church_fix_update_folder', 10, 4);
        add_filter('upgrader_pre_download', 'dasom_church_upgrader_pre_download', 10, 3);
        
        // Save active state before update
        add_filter('upgrader_pre_install', 'dasom_church_save_active_state', 10, 2);
        // Restore active state after update
        add_action('upgrader_process_complete', 'dasom_church_restore_active_state', 20, 2);
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
            // Use GitHub API zipball_url for private repository support
            $download_url = $release['zipball_url'];
            
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
    
    if (isset($release['tag_name']) && isset($release['zipball_url'])) {
        $latest_version = ltrim($release['tag_name'], 'v');
        
        // Use GitHub API zipball_url for private repository support
        $download_url = $release['zipball_url'];
        
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
 * Save plugin active state before update
 *
 * @param bool $response
 * @param array $hook_extra
 * @return bool
 */
function dasom_church_save_active_state($response, $hook_extra) {
    if (isset($hook_extra['plugin']) && $hook_extra['plugin'] === plugin_basename(__FILE__)) {
        $active_plugins = get_option('active_plugins', array());
        if (in_array(plugin_basename(__FILE__), $active_plugins)) {
            set_transient('dasom_church_was_active', true, 300); // 5 minutes
        }
    }
    return $response;
}

/**
 * Restore plugin active state after update
 *
 * @param object $upgrader_object Upgrader object
 * @param array $options Update options
 */
function dasom_church_restore_active_state($upgrader_object, $options) {
    if ($options['action'] === 'update' && $options['type'] === 'plugin') {
        if (isset($options['plugins'])) {
            foreach ($options['plugins'] as $plugin) {
                if ($plugin === plugin_basename(__FILE__)) {
                    // Check if plugin was active before update
                    if (get_transient('dasom_church_was_active')) {
                        delete_transient('dasom_church_was_active');
                        activate_plugin($plugin, '', false, true);
                    }
                }
            }
        }
    }
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
 * Add GitHub authentication to download requests for private repositories
 *
 * @param bool $reply Whether to bail without returning the package
 * @param string $package The package file name
 * @param WP_Upgrader $upgrader The WP_Upgrader instance
 * @return bool|string False to continue, string path to downloaded package
 */
function dasom_church_upgrader_pre_download($reply, $package, $upgrader) {
    // Check if this is a GitHub API zipball URL
    if (strpos($package, 'api.github.com') === false || strpos($package, 'zipball') === false) {
        return $reply;
    }
    
    // Check if this is our plugin
    if (strpos($package, 'dasomweb/dasom-church-management-system') === false) {
        return $reply;
    }
    
    // Get GitHub token
    $github_token = get_option('dw_github_access_token', '');
    
    if (empty($github_token)) {
        return new WP_Error(
            'no_github_token',
            __('❌ GitHub Personal Access Token이 필요합니다. DW 교회관리 → 설정에서 토큰을 입력해주세요.', 'dasom-church') . '<br>' .
            sprintf(__('현재 Token 상태: %s', 'dasom-church'), empty($github_token) ? '없음' : '있음')
        );
    }
    
    // Download with authentication using wp_remote_get
    $response = wp_remote_get($package, array(
        'timeout' => 300,
        'headers' => array(
            'Authorization' => 'token ' . $github_token,
            'Accept' => 'application/vnd.github.v3+json',
            'User-Agent' => 'WordPress/' . get_bloginfo('version') . '; ' . get_bloginfo('url')
        )
    ));
    
    if (is_wp_error($response)) {
        return new WP_Error(
            'download_error',
            sprintf(__('❌ 다운로드 오류: %s', 'dasom-church'), $response->get_error_message())
        );
    }
    
    $code = wp_remote_retrieve_response_code($response);
    if ($code !== 200) {
        $error_body = wp_remote_retrieve_body($response);
        $error_data = json_decode($error_body, true);
        $error_message = isset($error_data['message']) ? $error_data['message'] : $error_body;
        
        return new WP_Error(
            'download_failed',
            sprintf(__('❌ 다운로드 실패: HTTP %d', 'dasom-church'), $code) . '<br>' .
            sprintf(__('URL: %s', 'dasom-church'), esc_url($package)) . '<br>' .
            sprintf(__('Token: %s...', 'dasom-church'), substr($github_token, 0, 10)) . '<br>' .
            sprintf(__('오류: %s', 'dasom-church'), esc_html(substr($error_message, 0, 200)))
        );
    }
    
    // Save to temporary file
    $tmpfname = wp_tempnam($package);
    if (!$tmpfname) {
        return new WP_Error('temp_file_failed', __('❌ 임시 파일 생성 실패', 'dasom-church'));
    }
    
    $body = wp_remote_retrieve_body($response);
    if (file_put_contents($tmpfname, $body) === false) {
        @unlink($tmpfname);
        return new WP_Error('file_write_failed', __('❌ 파일 쓰기 실패', 'dasom-church'));
    }
    
    return $tmpfname;
}

/**
 * Fix GitHub archive folder name during update
 *
 * GitHub archives extract to {repo-name}-{tag}/ but WordPress expects the plugin folder name
 * This function renames the extracted folder to match the expected plugin folder name
 *
 * @param string $source File source location
 * @param string $remote_source Remote file source location
 * @param WP_Upgrader $upgrader WP_Upgrader instance
 * @param array $hook_extra Extra arguments passed to hooked filters
 * @return string|WP_Error Modified source location or WP_Error on failure
 */
function dasom_church_fix_update_folder($source, $remote_source, $upgrader, $hook_extra) {
    global $wp_filesystem;
    
    // Check if this is our plugin
    $plugin_slug = 'dasom-church-management-system';
    
    if (!isset($hook_extra['plugin']) || dirname($hook_extra['plugin']) !== $plugin_slug) {
        return $source;
    }
    
    // Get the expected folder name
    $new_source = trailingslashit($remote_source) . $plugin_slug . '/';
    
    // If the folder already has the correct name, return it
    if ($source === $new_source) {
        return $source;
    }
    
    // Rename the folder
    if ($wp_filesystem->move($source, $new_source)) {
        return $new_source;
    }
    
    return new WP_Error('rename_failed', __('Unable to rename the update folder.', 'dasom-church'));
}

/**
 * Force check for updates (for debugging)
 * Usage: Add ?dasom_check_update=1 to admin URL
 */
add_action('admin_init', function() {
    if (isset($_GET['dasom_check_update']) && current_user_can('update_plugins')) {
        $github_username = 'dasomweb';
        $github_repo = 'dasom-church-management-system';
        
        // Delete our custom transients
        delete_transient('dasom_church_update_' . md5($github_username . $github_repo));
        delete_transient('dasom_church_plugin_info_' . md5($github_username . $github_repo));
        
        // Delete WordPress update transients to force refresh
        delete_site_transient('update_plugins');
        delete_transient('update_plugins');
        
        // Force WordPress to check for updates
        wp_update_plugins();
        
        // Add admin notice
        add_action('admin_notices', function() {
            echo '<div class="notice notice-success is-dismissible"><p>';
            echo esc_html__('업데이트 캐시가 삭제되었습니다. 플러그인 목록을 새로고침하세요.', 'dasom-church');
            echo '</p></div>';
        });
        
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
        
        // Load admin files in correct order - ALWAYS load to register post types
        require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dasom-church-menu-visibility.php';
        require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dasom-church-admin-customization.php';
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
        // Load classes in correct order
        require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dasom-church-menu-visibility.php';
        require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dasom-church-admin-customization.php';
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
        if (!term_exists($default_preacher, 'dw_sermon_preacher')) {
            wp_insert_term($default_preacher, 'dw_sermon_preacher');
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

// Load widgets
require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/class-dasom-church-widgets.php';


