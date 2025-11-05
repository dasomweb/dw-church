<?php
/**
 * Plugin Name: DW Church
 * Description: DW Church Management System
 * Version: 2.62.26
 * Author: DasomWeb
 * Author URI: https://dasomweb.com
 * Plugin URI: https://github.com/dasomweb/dasom-church-management-system
 * Update URI: dw-church
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: dw-church
 * Domain Path: /languages
 * Requires at least: 6.0
 * Tested up to: 6.8
 * Requires PHP: 8.0
 * Network: false
 */

/**
 * 보안: 직접 접근 차단
 * WordPress가 로드되지 않은 상태에서 직접 접근 시 종료
 */
if (!defined('ABSPATH')) {
    exit;
}

/**
 * 플러그인 상수 정의
 * 
 * @const string DASOM_CHURCH_VERSION 플러그인 버전 번호
 * @const string DASOM_CHURCH_PLUGIN_URL 플러그인 URL (HTTPS 강제)
 * @const string DASOM_CHURCH_PLUGIN_PATH 플러그인 디렉토리 경로
 * @const string DASOM_CHURCH_PLUGIN_FILE 플러그인 메인 파일 경로
 * @const string DASOM_CHURCH_PLUGIN_BASENAME 플러그인 베이스네임 (예: 'dw-church/dw-church.php')
 */
define('DASOM_CHURCH_VERSION', '2.62.24');
// 플러그인 URL을 HTTPS로 강제 변환 (보안 및 혼합 콘텐츠 문제 방지)
define('DASOM_CHURCH_PLUGIN_URL', str_replace('http://', 'https://', plugin_dir_url(__FILE__)));
// 플러그인 파일 시스템 경로
define('DASOM_CHURCH_PLUGIN_PATH', plugin_dir_path(__FILE__));
// 플러그인 메인 파일의 절대 경로
define('DASOM_CHURCH_PLUGIN_FILE', __FILE__);
// WordPress 플러그인 디렉토리 기준 상대 경로
define('DASOM_CHURCH_PLUGIN_BASENAME', plugin_basename(__FILE__));

/**
 * 플러그인 자산에 HTTPS 강제 적용
 * 
 * script_loader_src 필터를 통해 플러그인의 모든 JavaScript 파일이 HTTPS로 로드되도록 보장
 * 혼합 콘텐츠 경고를 방지하고 보안을 강화
 */
add_filter('script_loader_src', function($src, $handle) {
    // 플러그인 URL이 포함된 스크립트 소스인지 확인
    if (strpos($src, DASOM_CHURCH_PLUGIN_URL) !== false) {
        // HTTP를 HTTPS로 변환
        return str_replace('http://', 'https://', $src);
    }
    return $src;
}, 10, 2);

/**
 * 플러그인 스타일시트에 HTTPS 강제 적용
 * 
 * style_loader_src 필터를 통해 플러그인의 모든 CSS 파일이 HTTPS로 로드되도록 보장
 */
add_filter('style_loader_src', function($src, $handle) {
    // 플러그인 URL이 포함된 스타일 소스인지 확인
    if (strpos($src, DASOM_CHURCH_PLUGIN_URL) !== false) {
        // HTTP를 HTTPS로 변환
        return str_replace('http://', 'https://', $src);
    }
    return $src;
}, 10, 2);

/**
 * 외부 CDN 리소스에 HTTPS 강제 적용
 * 
 * 일반적인 CDN 서비스(jSDelivr, Google Fonts, Google APIs)의 리소스가
 * HTTPS로 로드되도록 보장하여 혼합 콘텐츠 문제를 방지
 */
add_filter('script_loader_src', function($src, $handle) {
    // 일반적인 CDN 서비스 URL 패턴 확인
    // 프로토콜 상대 URL(//)도 처리하여 안전하게 HTTPS로 변환
    if (strpos($src, '//cdn.jsdelivr.net') !== false || 
        strpos($src, '//fonts.googleapis.com') !== false ||
        strpos($src, '//fonts.gstatic.com') !== false ||
        strpos($src, '//ajax.googleapis.com') !== false) {
        // HTTP 또는 프로토콜 상대 URL을 HTTPS로 변환
        return str_replace('http://', 'https://', $src);
    }
    return $src;
}, 10, 2);

/**
 * 외부 CDN 스타일시트에 HTTPS 강제 적용
 */
add_filter('style_loader_src', function($src, $handle) {
    // 일반적인 CDN 서비스 URL 패턴 확인
    if (strpos($src, '//cdn.jsdelivr.net') !== false || 
        strpos($src, '//fonts.googleapis.com') !== false ||
        strpos($src, '//fonts.gstatic.com') !== false ||
        strpos($src, '//ajax.googleapis.com') !== false) {
        // HTTP를 HTTPS로 변환
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

// Save active state before update - MUST be registered globally, not in is_admin()
// This hook runs during update process and must be available at all times
add_filter('upgrader_pre_install', 'dw_church_save_active_state', 10, 2);

// Restore active state after update - MUST be registered globally
// This hook runs during update process and must be available at all times
add_action('upgrader_process_complete', 'dw_church_restore_active_state', 20, 2);

// Add update checker for GitHub releases
add_action('init', function() {
    if (is_admin()) {
        add_filter('pre_set_site_transient_update_plugins', 'dw_church_check_for_updates');
        add_filter('plugins_api', 'dw_church_plugin_info', 20, 3);
        add_action('upgrader_process_complete', 'dw_church_clear_update_cache', 10, 2);
        add_filter('upgrader_source_selection', 'dw_church_fix_update_folder', 10, 4);
        add_filter('upgrader_pre_download', 'dw_church_upgrader_pre_download', 10, 3);
    }
});

/**
 * Get GitHub API headers with optional authentication
 *
 * @return array Headers for GitHub API request
 */
function dw_church_get_github_headers() {
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
function dw_church_check_for_updates($transient) {
    if (empty($transient->checked)) {
        return $transient;
    }
    
    // Plugin configuration
    $plugin_slug = plugin_basename(__FILE__);
    $github_username = 'dasomweb';
    $github_repo = 'dasom-church-management-system';
    
    // Check cache first (12 hours)
    $cache_key = 'dw_church_update_' . md5($github_username . $github_repo);
    $cached_data = get_transient($cache_key);
    
    if ($cached_data !== false) {
        $release = $cached_data;
    } else {
        // Get latest release from GitHub API
        $response = wp_remote_get(
            "https://api.github.com/repos/{$github_username}/{$github_repo}/releases/latest",
            array(
                'timeout' => 15,
                'headers' => dw_church_get_github_headers()
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
function dw_church_plugin_info($result, $action, $args) {
    $plugin_slug = dirname(plugin_basename(__FILE__));
    
    if ($action !== 'plugin_information' || !isset($args->slug) || $args->slug !== $plugin_slug) {
        return $result;
    }
    
    $github_username = 'dasomweb';
    $github_repo = 'dasom-church-management-system';
    
    // Check cache first
    $cache_key = 'dw_church_plugin_info_' . md5($github_username . $github_repo);
    $cached_info = get_transient($cache_key);
    
    if ($cached_info !== false) {
        return $cached_info;
    }
    
    // Get latest release info
    $response = wp_remote_get(
        "https://api.github.com/repos/{$github_username}/{$github_repo}/releases/latest",
        array(
            'timeout' => 15,
            'headers' => dw_church_get_github_headers()
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
 * 플러그인 업데이트 전에 활성 상태를 저장하는 함수
 * 
 * WordPress의 upgrader_pre_install 필터에서 호출됨
 * 플러그인이 업데이트되기 전에 현재 활성화 상태를 transient에 저장하여
 * 업데이트 후 자동으로 다시 활성화할 수 있도록 함
 *
 * @param mixed $response WordPress upgrader 응답 객체 (필터 체인에서 다음 필터로 전달)
 * @param array $hook_extra 업데이트 관련 추가 정보
 *                          - 'plugin': 업데이트 대상 플러그인 경로 (예: 'dw-church/dw-church.php')
 * @return mixed 원본 $response 객체 반환 (다른 플러그인에 영향을 주지 않음)
 */
function dw_church_save_active_state($response, $hook_extra) {
    // 업데이트 대상이 현재 플러그인인지 확인
    // $hook_extra['plugin']에 플러그인 경로가 포함되어 있음
    if (isset($hook_extra['plugin']) && $hook_extra['plugin'] === plugin_basename(__FILE__)) {
        // WordPress 옵션에서 현재 활성화된 플러그인 목록 가져오기
        // active_plugins 옵션은 배열 형태로 플러그인 경로들을 저장
        $active_plugins = get_option('active_plugins', array());
        
        // 현재 플러그인이 활성화되어 있는지 확인
        if (in_array(plugin_basename(__FILE__), $active_plugins)) {
            // 활성화되어 있다면 transient에 상태 저장 (5분간 유효)
            // 5분(300초)은 업데이트가 완료될 때까지 충분한 시간
            // transient는 임시 데이터 저장소로, 자동으로 만료됨
            set_transient('dw_church_was_active', true, 300); // 5 minutes
        }
    }
    // 원본 응답 객체를 그대로 반환 (다른 플러그인에 영향을 주지 않음)
    return $response;
}

/**
 * 플러그인 업데이트 후 저장된 활성 상태를 복원하는 함수
 * 
 * WordPress의 upgrader_process_complete 액션에서 호출됨
 * 업데이트 전에 저장된 활성 상태를 확인하고, 활성화되어 있었다면 자동으로 다시 활성화
 *
 * @param object $upgrader_object WordPress Upgrader 객체 (현재 사용하지 않음)
 * @param array $options 업데이트 옵션
 *                       - 'action': 액션 타입 ('update', 'install' 등)
 *                       - 'type': 업데이트 타입 ('plugin', 'theme' 등)
 *                       - 'plugins': 업데이트된 플러그인 경로 배열
 * @return void
 */
function dw_church_restore_active_state($upgrader_object, $options) {
    // 업데이트 액션이고 플러그인 타입인지 확인
    // 다른 타입(테마, 코어 등)의 업데이트는 건너뜀
    if ($options['action'] === 'update' && $options['type'] === 'plugin') {
        $plugin = plugin_basename(__FILE__);
        $is_our_plugin = false;
        
        // 업데이트된 플러그인 목록 확인 (여러 형태 지원)
        if (isset($options['plugins']) && is_array($options['plugins'])) {
            // 배열 형태인 경우
            $is_our_plugin = in_array($plugin, $options['plugins'], true);
        } elseif (isset($options['plugin']) && is_string($options['plugin'])) {
            // 단일 플러그인 문자열인 경우
            $is_our_plugin = ($options['plugin'] === $plugin);
        } elseif (isset($upgrader_object->skin) && isset($upgrader_object->skin->plugin)) {
            // Upgrader 객체에서 직접 확인
            $is_our_plugin = ($upgrader_object->skin->plugin === $plugin);
        }
        
        // 현재 플러그인이 업데이트된 경우에만 처리
        if ($is_our_plugin) {
            // 업데이트 전에 저장된 활성 상태 확인
            // transient에 'dw_church_was_active' 값이 있으면 업데이트 전에 활성화되어 있었던 것
            if (get_transient('dw_church_was_active')) {
                // transient 삭제 (한 번만 사용)
                delete_transient('dw_church_was_active');
                
                // 플러그인이 비활성화되어 있으면 활성화
                if (!is_plugin_active($plugin)) {
                    // 플러그인 자동 활성화
                    // activate_plugin(플러그인경로, 리다이렉트URL, 네트워크활성화여부, silent모드)
                    // silent 모드(true)로 설정하여 리다이렉트 없이 조용히 활성화
                    $result = activate_plugin($plugin, '', false, true);
                    if (is_wp_error($result)) {
                        error_log('DW Church: Failed to restore active state - ' . $result->get_error_message());
                    } else {
                        error_log('DW Church: Successfully restored active state after update');
                    }
                }
            } else {
                // transient가 없어도, 플러그인이 비활성화되어 있으면 활성화 시도
                // (다른 메커니즘으로 저장된 경우를 대비)
                if (!is_plugin_active($plugin)) {
                    $result = activate_plugin($plugin, '', false, true);
                    if (!is_wp_error($result)) {
                        error_log('DW Church: Auto-reactivated plugin (transient not found but was inactive)');
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
function dw_church_clear_update_cache($upgrader_object, $options) {
    if ($options['action'] === 'update' && $options['type'] === 'plugin') {
        $github_username = 'dasomweb';
        $github_repo = 'dasom-church-management-system';
        
        // Clear update cache
        delete_transient('dw_church_update_' . md5($github_username . $github_repo));
        delete_transient('dw_church_plugin_info_' . md5($github_username . $github_repo));
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
function dw_church_upgrader_pre_download($reply, $package, $upgrader) {
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
            __('❌ GitHub Personal Access Token이 필요합니다. DW 교회관리 → 설정에서 토큰을 입력해주세요.', 'dw-church') . '<br>' .
            sprintf(__('현재 Token 상태: %s', 'dw-church'), empty($github_token) ? '없음' : '있음')
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
            sprintf(__('❌ 다운로드 오류: %s', 'dw-church'), $response->get_error_message())
        );
    }
    
    $code = wp_remote_retrieve_response_code($response);
    if ($code !== 200) {
        $error_body = wp_remote_retrieve_body($response);
        $error_data = json_decode($error_body, true);
        $error_message = isset($error_data['message']) ? $error_data['message'] : $error_body;
        
        return new WP_Error(
            'download_failed',
            sprintf(__('❌ 다운로드 실패: HTTP %d', 'dw-church'), $code) . '<br>' .
            sprintf(__('URL: %s', 'dw-church'), esc_url($package)) . '<br>' .
            sprintf(__('Token: %s...', 'dw-church'), substr($github_token, 0, 10)) . '<br>' .
            sprintf(__('오류: %s', 'dw-church'), esc_html(substr($error_message, 0, 200)))
        );
    }
    
    // Save to temporary file
    $tmpfname = wp_tempnam($package);
    if (!$tmpfname) {
        return new WP_Error('temp_file_failed', __('❌ 임시 파일 생성 실패', 'dw-church'));
    }
    
    $body = wp_remote_retrieve_body($response);
    if (file_put_contents($tmpfname, $body) === false) {
        @unlink($tmpfname);
        return new WP_Error('file_write_failed', __('❌ 파일 쓰기 실패', 'dw-church'));
    }
    
    return $tmpfname;
}

/**
 * GitHub 아카이브 폴더 이름을 업데이트/설치 중에 수정하는 함수
 * 
 * GitHub 아카이브는 {repo-name}-{tag}/ 또는 {user}-{repo}-{hash}/ 형식으로 압축 해제되지만,
 * WordPress는 실제 플러그인 폴더 이름(dw-church)을 기대함
 * 이 함수는 압축 해제된 폴더를 올바른 이름으로 변경
 * 
 * WordPress의 upgrader_source_selection 필터에서 호출됨
 *
 * @param string $source 압축 해제된 소스 디렉토리 경로
 * @param string $remote_source 원격 소스 경로 (사용하지 않음)
 * @param WP_Upgrader $upgrader WordPress Upgrader 객체 (사용하지 않음)
 * @param array $hook_extra 추가 훅 정보 (사용하지 않음)
 * @return string|WP_Error 수정된 소스 경로 또는 에러 객체
 */
function dw_church_fix_update_folder($source, $remote_source, $upgrader, $hook_extra) {
    // WordPress 파일 시스템 API 가져오기
    global $wp_filesystem;
    
    // 파일 시스템이 초기화되지 않았으면 원본 경로 반환
    if (!$wp_filesystem) {
        return $source;
    }
    
    // 예상되는 플러그인 폴더 이름 (WordPress 설치에서 실제로 사용되는 이름과 일치해야 함)
    $expected_folder = 'dw-church';
    
    /**
     * 소스 디렉토리에 플러그인 파일이 있는지 확인
     * 두 가지 경우를 확인:
     * 1. 소스 폴더 안에 dw-church 폴더가 있는 경우
     * 2. 소스 폴더 자체가 플러그인 폴더인 경우
     */
    $plugin_file_path = trailingslashit($source) . $expected_folder . '.php';
    if (!$wp_filesystem->exists($plugin_file_path)) {
        // 소스 폴더 자체에 dw-church.php가 있는지 확인
        $plugin_file_path = trailingslashit($source) . 'dw-church.php';
        if (!$wp_filesystem->exists($plugin_file_path)) {
            // 플러그인 파일이 없으면 우리 플러그인이 아님 - 원본 반환
            return $source; // Not our plugin, return as-is
        }
    }
    
    // 소스 경로에서 실제 폴더 이름 추출
    $source_folder = basename($source);
    
    // 폴더 이름이 이미 올바르면 변경 불필요 - 원본 반환
    if ($source_folder === $expected_folder) {
        return $source;
    }
    
    // 올바른 폴더 이름으로 새 소스 경로 생성
    // dirname()으로 부모 디렉토리 경로 가져오기
    $new_source = trailingslashit(dirname($source)) . $expected_folder . '/';
    
    // 새 소스 경로가 이미 존재하면 먼저 삭제
    // (중복 폴더 방지)
    if ($wp_filesystem->exists($new_source)) {
        $wp_filesystem->delete($new_source, true); // true = 재귀적 삭제
    }
    
    // 폴더 이름을 예상되는 이름으로 변경 (이동)
    if ($wp_filesystem->move($source, $new_source)) {
        return $new_source;
    }
    
    /**
     * 이동 실패 시 대안: 복사 시도
     * 파일 시스템 권한 문제 등으로 이동이 실패할 수 있으므로
     * 복사 후 원본 삭제하는 방식으로 시도
     */
    if ($wp_filesystem->copy($source, $new_source, true)) {
        // 복사 성공 후 원본 삭제
        $wp_filesystem->delete($source, true);
        return $new_source;
    }
    
    // 모든 시도 실패 시 에러 반환
    return new WP_Error('rename_failed', __('Unable to rename the update folder to dw-church.', 'dw-church'));
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
        delete_transient('dw_church_update_' . md5($github_username . $github_repo));
        delete_transient('dw_church_plugin_info_' . md5($github_username . $github_repo));
        
        // Delete WordPress update transients to force refresh
        delete_site_transient('update_plugins');
        delete_transient('update_plugins');
        
        // Force WordPress to check for updates
        wp_update_plugins();
        
        // Add admin notice
        add_action('admin_notices', function() {
            echo '<div class="notice notice-success is-dismissible"><p>';
            echo esc_html__('업데이트 캐시가 삭제되었습니다. 플러그인 목록을 새로고침하세요.', 'dw-church');
            echo '</p></div>';
        });
        
        wp_redirect(admin_url('plugins.php'));
        exit;
    }
});

/**
 * Main plugin class
 */
class DW_Church_Management {
    
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
        $this->dw_church_load_dependencies();
        $this->dw_church_init_hooks();
    }
    
    /**
     * Load dependencies
     */
    private function dw_church_load_dependencies() {
        // Load core files
        require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/functions-helpers.php';
        
        // Load admin files in correct order - ALWAYS load to register post types
        require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dw-church-menu-visibility.php';
        require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dw-church-admin-customization.php';
        require_once DASOM_CHURCH_PLUGIN_PATH . 'admin/class-dw-church-admin.php';
        // Initialize admin class
        DW_Church_Admin::get_instance();
        
        // Load public files
        if (!is_admin()) {
            require_once DASOM_CHURCH_PLUGIN_PATH . 'public/class-dw-church-public.php';
        }
    }
    
    /**
     * Initialize hooks
     */
    private function dw_church_init_hooks() {
        // Plugin activation/deactivation hooks
        register_activation_hook(__FILE__, array($this, 'dw_church_activation'));
        register_deactivation_hook(__FILE__, array($this, 'dw_church_deactivation'));
        
        // Initialize plugin
        add_action('init', array($this, 'dw_church_init'));
    }
    
    /**
     * Plugin activation
     */
    public function dw_church_activation() {
        // Create default terms
        $default_preacher = __('담임목사', 'dw-church');
        if (!term_exists($default_preacher, 'dw_sermon_preacher')) {
            wp_insert_term($default_preacher, 'dw_sermon_preacher');
        }
        update_option('default_sermon_preacher', $default_preacher);
        
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation
     */
    public function dw_church_deactivation() {
        flush_rewrite_rules();
    }
    
    /**
     * Initialize plugin
     */
    public function dw_church_init() {
        // Plugin initialization
        // Force flush rewrite rules on init to ensure post type URLs work
        if (!get_option('dw_church_rewrite_rules_flushed')) {
            flush_rewrite_rules();
            update_option('dw_church_rewrite_rules_flushed', true);
        }
    }
}

// Initialize the plugin
DW_Church_Management::get_instance();

// Load widgets
require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/class-dw-church-widgets.php';

// Load update manager
require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/class-dw-church-update-manager.php';

// Plugin activation hook
register_activation_hook(__FILE__, function() {
    add_option('dw_church_version', DASOM_CHURCH_VERSION);
    add_option('dw_church_installed', current_time('mysql'));
    
    // Flush rewrite rules
    flush_rewrite_rules();
});


// Auto-reactivate plugin after updates to prevent deactivation
// 우선순위 30으로 설정하여 다른 핸들러보다 나중에 실행
add_action('upgrader_process_complete', function($upgrader_object, $options) {
    if ($options['type'] === 'plugin' && $options['action'] === 'update') {
        $plugin = 'dw-church/dw-church.php';
        
        // 플러그인이 업데이트된 것인지 확인
        $is_our_plugin = false;
        if (isset($options['plugins']) && is_array($options['plugins'])) {
            $is_our_plugin = in_array($plugin, $options['plugins'], true);
        } elseif (isset($options['plugin']) && $options['plugin'] === $plugin) {
            $is_our_plugin = true;
        }
        
        if ($is_our_plugin && !is_plugin_active($plugin)) {
            $result = activate_plugin($plugin, '', false, true);
            if (is_wp_error($result)) {
                error_log('DW Church: Auto-reactivate failed - ' . $result->get_error_message());
            } else {
                error_log('DW Church: Auto-reactivated plugin after update');
            }
        }
    }
}, 30, 2);

// Additional safety: Check and reactivate on admin_init if needed
// 우선순위 1로 설정하여 가장 먼저 실행
add_action('admin_init', function() {
    // 한 번만 실행되도록 체크 (중복 실행 방지)
    static $executed = false;
    if ($executed) {
        return;
    }
    $executed = true;
    
    $plugin = 'dw-church/dw-church.php';
    $current_plugin = plugin_basename(__FILE__);
    
    // 현재 플러그인이 우리 플러그인이고, 비활성화되어 있으며, 권한이 있는 경우
    if ($current_plugin === $plugin && !is_plugin_active($plugin) && current_user_can('activate_plugins')) {
        // transient를 확인하여 업데이트 후인지 확인
        $was_active = get_transient('dw_church_was_active');
        // transient가 있으면 업데이트 전에 활성화되어 있었던 것
        // transient가 없어도 비활성화되어 있으면 활성화 시도 (안전장치)
        if ($was_active || (!$was_active && !is_plugin_active($plugin))) {
            $result = activate_plugin($plugin, '', false, true);
            if (is_wp_error($result)) {
                error_log('DW Church: Emergency reactivation failed - ' . $result->get_error_message());
            } else {
                error_log('DW Church: Emergency reactivation on admin_init');
                // transient 삭제
                delete_transient('dw_church_was_active');
            }
        }
    }
}, 1);


// Plugin deactivation hook
register_deactivation_hook(__FILE__, function() {
    // Flush rewrite rules
    flush_rewrite_rules();
});

// Data migration on update
add_action('upgrader_process_complete', function($upgrader, $hook_extra) {
    if (($hook_extra['type'] ?? '') === 'plugin' && ($hook_extra['action'] ?? '') === 'update') {
        if (in_array(DASOM_CHURCH_PLUGIN_BASENAME, (array)($hook_extra['plugins'] ?? []), true)) {
            $old_version = get_option('dw_church_version', '1.0.0');
            $new_version = DASOM_CHURCH_VERSION;
            
            if (version_compare($old_version, $new_version, '<')) {
                // 데이터 마이그레이션 수행
                dw_church_migrate_data($old_version, $new_version);
                update_option('dw_church_version', $new_version);
            }
        }
    }
}, 10, 2);

// Data migration function
function dw_church_migrate_data($old_version, $new_version) {
    // 버전별 마이그레이션 로직
    if (version_compare($old_version, '2.0.0', '<')) {
        // 2.0.0 이전 버전에서 마이그레이션
        // 예: 옵션명 변경, 데이터 구조 변경 등
    }
    
    if (version_compare($old_version, '2.20.0', '<')) {
        // 2.20.0 이전 버전에서 마이그레이션
        // 예: 새로운 설정 옵션 추가
    }
    
    // 로그 기록
    error_log("DW Church: Migrated from {$old_version} to {$new_version}");
}

/**
 * Fix folder name if installed with hash suffix or wrong folder name
 * This handles cases where the plugin was installed with various wrong folder names
 */
function dw_church_fix_folder_name() {
    $plugin_dir = WP_PLUGIN_DIR;
    $target_dir = $plugin_dir . '/dw-church';
    
    // Check if target directory already exists and is correct
    if (file_exists($target_dir) && file_exists($target_dir . '/dw-church.php')) {
        return; // Already correct
    }
    
    // Look for various wrong folder name patterns
    $patterns = array(
        $plugin_dir . '/dasomweb-dasom-church-management-system-*',
        $plugin_dir . '/dasom-church-management-system-*',
        $plugin_dir . '/dasom-church-management-system',
        $plugin_dir . '/dw-church-management-system-*',
    );
    
    $found_folders = array();
    foreach ($patterns as $pattern) {
        $folders = glob($pattern, GLOB_ONLYDIR);
        if (!empty($folders)) {
            $found_folders = array_merge($found_folders, $folders);
        }
    }
    
    // Also check for any folder containing dw-church.php but with wrong name
    $all_plugin_folders = glob($plugin_dir . '/*', GLOB_ONLYDIR);
    foreach ($all_plugin_folders as $folder) {
        $folder_name = basename($folder);
        // Skip if already correct name or doesn't contain our plugin file
        if ($folder_name === 'dw-church' || !file_exists($folder . '/dw-church.php')) {
            continue;
        }
        // Skip if it's a known WordPress plugin folder (like akismet, hello.php, etc.)
        if (in_array($folder_name, array('akismet', 'hello.php', 'index.php'))) {
            continue;
        }
        // Check if this folder contains our plugin
        if (file_exists($folder . '/dw-church.php') && 
            file_get_contents($folder . '/dw-church.php', false, null, 0, 100) !== false &&
            strpos(file_get_contents($folder . '/dw-church.php', false, null, 0, 200), 'DW Church') !== false) {
            $found_folders[] = $folder;
        }
    }
    
    // Remove duplicates and target directory
    $found_folders = array_unique($found_folders);
    $found_folders = array_filter($found_folders, function($folder) use ($target_dir) {
        return $folder !== $target_dir;
    });
    
    if (empty($found_folders)) {
        return; // No wrong folders found
    }
    
    // Process each found folder
    foreach ($found_folders as $source_dir) {
        $source_dir = realpath($source_dir);
        if (!$source_dir || !file_exists($source_dir . '/dw-church.php')) {
            continue;
        }
        
        // If target exists, remove it first (but only if it's empty or doesn't have our plugin)
        if (file_exists($target_dir)) {
            if (!file_exists($target_dir . '/dw-church.php')) {
                // Target exists but doesn't have our plugin - remove it
                if (is_dir($target_dir)) {
                    // Try to remove directory
                    $files = glob($target_dir . '/*');
                    if (empty($files)) {
                        @rmdir($target_dir);
                    }
                }
            } else {
                // Target already has correct plugin, skip
                continue;
            }
        }
        
        // Rename the folder
        if (@rename($source_dir, $target_dir)) {
            error_log('DW Church: Renamed folder from ' . basename($source_dir) . ' to dw-church');
            
            // Update active plugins option
            $active_plugins = get_option('active_plugins', array());
            $old_plugin_path = basename($source_dir) . '/dw-church.php';
            $new_plugin_path = 'dw-church/dw-church.php';
            
            foreach ($active_plugins as $key => $plugin_path) {
                if ($plugin_path === $old_plugin_path || strpos($plugin_path, basename($source_dir) . '/') === 0) {
                    $active_plugins[$key] = $new_plugin_path;
                }
            }
            update_option('active_plugins', array_unique($active_plugins));
            
            // Update sitewide active plugins for multisite
            if (is_multisite()) {
                $sitewide_plugins = get_site_option('active_sitewide_plugins', array());
                $updated = false;
                foreach ($sitewide_plugins as $plugin_path => $timestamp) {
                    if ($plugin_path === $old_plugin_path || strpos($plugin_path, basename($source_dir) . '/') === 0) {
                        unset($sitewide_plugins[$plugin_path]);
                        $sitewide_plugins[$new_plugin_path] = $timestamp;
                        $updated = true;
                    }
                }
                if ($updated) {
                    update_site_option('active_sitewide_plugins', $sitewide_plugins);
                }
            }
            
            // Clear rewrite rules
            flush_rewrite_rules();
            break; // Only process first match
        }
    }
}

// Run folder name fix on init with transient to prevent repeated execution
add_action('init', function() {
    $transient_key = 'dw_church_folder_fix_run';
    if (!get_transient($transient_key)) {
        dw_church_fix_folder_name();
        set_transient($transient_key, true, HOUR_IN_SECONDS);
    }
});


