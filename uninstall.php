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

// Remove plugin options
$options_to_remove = array(
    'dasom_church_name',
    'dasom_church_address',
    'dasom_church_phone',
    'dasom_church_email',
    'dasom_church_website'
);

foreach ($options_to_remove as $option) {
    delete_option($option);
}

// Remove custom post types and their meta
$post_types = array('dasom_bulletin', 'dasom_sermon', 'dasom_column', 'dasom_album');

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
$taxonomies = array('dasom_sermon_category');

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
    'dasom_bulletin_date',
    'dasom_bulletin_pdf',
    'dasom_bulletin_images',
    'dasom_sermon_title',
    'dasom_sermon_youtube',
    'dasom_sermon_scripture',
    'dasom_sermon_date',
    'dasom_sermon_thumb_id',
    'dasom_column_author',
    'dasom_column_topic',
    'dasom_album_images',
    'dasom_album_youtube',
    'dasom_album_thumb_id'
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
    'edit_dasom_albums'
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



