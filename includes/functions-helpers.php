<?php
/**
 * Helper functions for Dasom Church Management
 *
 * @package Dasom_Church
 * @since 1.0.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Get YouTube video ID from URL
 *
 * @param string $url YouTube URL
 * @return string|false Video ID or false if invalid
 */
function dasom_church_get_youtube_id($url) {
    if (empty($url)) {
        return false;
    }
    
    $pattern = '/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^\&\?\/]+)/';
    preg_match($pattern, $url, $matches);
    
    return isset($matches[1]) ? $matches[1] : false;
}

/**
 * Get YouTube thumbnail URL
 *
 * @param string $video_id YouTube video ID
 * @param string $quality Thumbnail quality (maxresdefault, hqdefault, mqdefault, default)
 * @return string Thumbnail URL
 */
function dasom_church_get_youtube_thumbnail($video_id, $quality = 'maxresdefault') {
    if (empty($video_id)) {
        return '';
    }
    
    return "https://img.youtube.com/vi/{$video_id}/{$quality}.jpg";
}

/**
 * Download and attach YouTube thumbnail
 *
 * @param int $post_id Post ID
 * @param string $youtube_url YouTube URL
 * @param string $title Image title
 * @return int|false Attachment ID or false on failure
 */
function dasom_church_download_youtube_thumbnail($post_id, $youtube_url, $title = '') {
    $video_id = dasom_church_get_youtube_id($youtube_url);
    if (!$video_id) {
        return false;
    }
    
    // Try maxresdefault first
    $thumbnail_url = dasom_church_get_youtube_thumbnail($video_id, 'maxresdefault');
    
    if (!function_exists('media_sideload_image')) {
        require_once(ABSPATH . 'wp-admin/includes/media.php');
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/image.php');
    }
    
    $image_id = media_sideload_image($thumbnail_url, $post_id, $title, 'id');
    
    // If maxresdefault fails, try hqdefault
    if (is_wp_error($image_id)) {
        $thumbnail_url = dasom_church_get_youtube_thumbnail($video_id, 'hqdefault');
        $image_id = media_sideload_image($thumbnail_url, $post_id, $title, 'id');
    }
    
    return is_wp_error($image_id) ? false : $image_id;
}

/**
 * Sanitize image IDs array
 *
 * @param array $images Array of image IDs
 * @return array Sanitized array of image IDs
 */
function dasom_church_sanitize_image_ids($images) {
    if (!is_array($images)) {
        return array();
    }
    
    return array_map('absint', $images);
}

/**
 * Get post meta with default value
 *
 * @param int $post_id Post ID
 * @param string $meta_key Meta key
 * @param mixed $default Default value
 * @return mixed Meta value or default
 */
function dasom_church_get_post_meta($post_id, $meta_key, $default = '') {
    $value = get_post_meta($post_id, $meta_key, true);
    return empty($value) ? $default : $value;
}

/**
 * Format date for display
 *
 * @param string $date Date string
 * @param string $format Date format
 * @return string Formatted date
 */
function dasom_church_format_date($date, $format = 'Y-m-d') {
    if (empty($date)) {
        return '';
    }
    
    return date_i18n($format, strtotime($date));
}

/**
 * Get church settings
 *
 * @param string $key Setting key
 * @param mixed $default Default value
 * @return mixed Setting value
 */
function dasom_church_get_setting($key, $default = '') {
    return get_option("dasom_church_{$key}", $default);
}

/**
 * Update church settings
 *
 * @param string $key Setting key
 * @param mixed $value Setting value
 * @return bool True on success, false on failure
 */
function dasom_church_update_setting($key, $value) {
    return update_option("dasom_church_{$key}", $value);
}

/**
 * Check if user can manage church content
 *
 * @return bool True if user can manage content
 */
function dasom_church_can_manage_content() {
    return current_user_can('edit_posts');
}

/**
 * Get recent posts by type
 *
 * @param string $post_type Post type
 * @param int $limit Number of posts to retrieve
 * @return array Array of post objects
 */
function dasom_church_get_recent_posts($post_type, $limit = 5) {
    return get_posts(array(
        'post_type' => $post_type,
        'posts_per_page' => $limit,
        'orderby' => 'date',
        'order' => 'DESC',
        'post_status' => 'publish'
    ));
}

/**
 * Generate auto title for bulletin
 *
 * @param string $date Bulletin date
 * @return string Generated title
 */
function dasom_church_generate_bulletin_title($date) {
    if (empty($date)) {
        return '';
    }
    
    $formatted_date = date_i18n(__('Y년 n월 j일', 'dasom-church'), strtotime($date));
    return $formatted_date . ' ' . __('Church Bulletin', 'dasom-church');
}

/**
 * Get image gallery HTML
 *
 * @param array $image_ids Array of image IDs
 * @param string $size Image size
 * @param array $attributes Additional attributes
 * @return string HTML output
 */
function dasom_church_get_image_gallery_html($image_ids, $size = 'thumbnail', $attributes = array()) {
    if (empty($image_ids) || !is_array($image_ids)) {
        return '';
    }
    
    $default_attributes = array(
        'style' => 'display:flex;gap:10px;flex-wrap:wrap;'
    );
    
    $attributes = wp_parse_args($attributes, $default_attributes);
    
    $output = '<div';
    foreach ($attributes as $key => $value) {
        $output .= ' ' . esc_attr($key) . '="' . esc_attr($value) . '"';
    }
    $output .= '>';
    
    foreach ($image_ids as $id) {
        $url = wp_get_attachment_url($id);
        if ($url) {
            $output .= '<img src="' . esc_url($url) . '" style="width:100px;height:100px;object-fit:cover;" />';
        }
    }
    
    $output .= '</div>';
    
    return $output;
}

/**
 * Log debug information
 *
 * @param mixed $data Data to log
 * @param string $level Log level
 */
function dasom_church_log($data, $level = 'info') {
    if (!defined('WP_DEBUG') || !WP_DEBUG) {
        return;
    }
    
    if (function_exists('error_log')) {
        $message = is_array($data) || is_object($data) ? print_r($data, true) : $data;
        error_log("[Dasom Church {$level}] " . $message);
    }
}

