<?php
/**
 * Uninstall script for Dasom Church Management System
 *
 * @package Dasom_Church
 * @since 1.0.0
 */

// If uninstall not called from WordPress, then exit
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Check if user has permission to uninstall
if (!current_user_can('activate_plugins')) {
    return;
}

// Check if user wants to delete data on uninstall
$delete_data = get_option('dw_delete_data_on_uninstall', 'no');

// If user doesn't want to delete data, exit early
if ($delete_data !== 'yes') {
    // Only delete the uninstall option itself
    delete_option('dw_delete_data_on_uninstall');
    return;
}

// Remove plugin options
$options_to_remove = array(
    // Church info
    'dw_church_name',
    'dw_church_address',
    'dw_church_phone',
    'dw_church_email',
    'dw_church_website',
    // Social media
    'dw_social_youtube',
    'dw_social_instagram',
    'dw_social_facebook',
    'dw_social_linkedin',
    'dw_social_tiktok',
    'dw_social_kakaotalk',
    'dw_social_kakaotalk_channel',
    // Plugin settings
    'dw_dashboard_fields_visibility',
    'dw_github_access_token',
    'default_sermon_preacher'
);

foreach ($options_to_remove as $option) {
    delete_option($option);
}

// Remove custom post types and their meta
$post_types = array('bulletin', 'sermon', 'column', 'album', 'banner');

foreach ($post_types as $post_type) {
    $posts = get_posts(array(
        'post_type' => $post_type,
        'numberposts' => -1,
        'post_status' => 'any'
    ));
    
    foreach ($posts as $post) {
        wp_delete_post($post->ID, true);
    }
}

// Remove custom taxonomies
$taxonomies = array('dw_sermon_preacher');

foreach ($taxonomies as $taxonomy) {
    $terms = get_terms(array(
        'taxonomy' => $taxonomy,
        'hide_empty' => false
    ));
    
    if (!is_wp_error($terms)) {
        foreach ($terms as $term) {
            wp_delete_term($term->term_id, $taxonomy);
        }
    }
}

// Remove custom meta keys
global $wpdb;

$meta_keys_to_remove = array(
    // Bulletin meta
    'dw_bulletin_date',
    'dw_bulletin_pdf',
    'dw_bulletin_images',
    // Sermon meta
    'dw_sermon_title',
    'dw_sermon_youtube',
    'dw_sermon_scripture',
    'dw_sermon_date',
    'dw_sermon_thumb_id',
    // Column meta
    'dw_column_title',
    'dw_column_content',
    'dw_column_top_image',
    'dw_column_bottom_image',
    'dw_column_youtube',
    'dw_column_thumb_id',
    // Album meta
    'dw_album_images',
    'dw_album_youtube',
    'dw_album_thumb_id',
    // Banner meta
    'dw_banner_pc_image',
    'dw_banner_mobile_image',
    'dw_banner_link_url',
    'dw_banner_link_target',
    'dw_banner_start_date',
    'dw_banner_end_date'
);

foreach ($meta_keys_to_remove as $meta_key) {
    $wpdb->delete(
        $wpdb->postmeta,
        array('meta_key' => $meta_key),
        array('%s')
    );
}

// Remove user capabilities (if any were added)
$capabilities_to_remove = array(
    'manage_dasom_church',
    'edit_dasom_bulletins',
    'edit_dasom_sermons',
    'edit_dasom_columns',
    'edit_dasom_albums',
    'edit_dasom_banners'
);

$roles = array('administrator', 'editor', 'author', 'contributor', 'subscriber');

foreach ($roles as $role_name) {
    $role = get_role($role_name);
    if ($role) {
        foreach ($capabilities_to_remove as $cap) {
            $role->remove_cap($cap);
        }
    }
}

// Clear any cached data
wp_cache_flush();

// Log uninstall action
if (function_exists('error_log')) {
    error_log('Dasom Church Management System uninstalled successfully');
}



