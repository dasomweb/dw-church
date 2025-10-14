<?php
/**
 * Meta Key Migration Script
 * 
 * This script migrates all custom field keys from the old prefix to 'dw_' prefix.
 * Run this ONCE after updating the plugin to version 1.2.0+
 * 
 * Usage: Access this file via browser: http://yoursite.com/wp-content/plugins/dasom-church-management-system/admin/migrate-meta-keys.php
 * Or run via WP-CLI: wp eval-file migrate-meta-keys.php
 */

// Load WordPress
require_once('../../../../wp-load.php');

// Check if user is admin
if (!current_user_can('manage_options')) {
    die('Access denied. You must be an administrator to run this migration.');
}

// Meta key mappings: old_key => new_key
$meta_key_map = array(
    // Bulletin fields
    'bulletin_date' => 'dw_bulletin_date',
    'bulletin_pdf' => 'dw_bulletin_pdf',
    'bulletin_images' => 'dw_bulletin_images',
    
    // Sermon fields
    'sermon_title' => 'dw_sermon_title',
    'sermon_youtube' => 'dw_sermon_youtube',
    'sermon_scripture' => 'dw_sermon_scripture',
    'sermon_date' => 'dw_sermon_date',
    'sermon_thumb_id' => 'dw_sermon_thumb_id',
    
    // Column fields
    'column_title' => 'dw_column_title',
    'column_content' => 'dw_column_content',
    'column_top_image' => 'dw_column_top_image',
    'column_bottom_image' => 'dw_column_bottom_image',
    'column_youtube' => 'dw_column_youtube',
    'column_thumb_id' => 'dw_column_thumb_id',
    'column_author' => 'dw_column_author', // Legacy field
    'column_topic' => 'dw_column_topic', // Legacy field
    
    // Album fields
    'album_images' => 'dw_album_images',
    'album_youtube' => 'dw_album_youtube',
    'album_thumb_id' => 'dw_album_thumb_id',
);

echo '<h1>DW Church Management System - Meta Key Migration</h1>';
echo '<p>Starting migration from old meta keys to dw_ prefixed keys...</p>';
echo '<hr>';

$total_migrated = 0;
$errors = array();

foreach ($meta_key_map as $old_key => $new_key) {
    echo "<h3>Migrating: {$old_key} → {$new_key}</h3>";
    
    // Find all posts with this meta key
    global $wpdb;
    $posts_with_meta = $wpdb->get_results($wpdb->prepare(
        "SELECT post_id, meta_value FROM {$wpdb->postmeta} WHERE meta_key = %s",
        $old_key
    ));
    
    if (empty($posts_with_meta)) {
        echo "<p style='color:gray;'>No posts found with meta key '{$old_key}'</p>";
        continue;
    }
    
    $count = count($posts_with_meta);
    echo "<p>Found {$count} post(s) with this meta key</p>";
    
    foreach ($posts_with_meta as $meta) {
        $post_id = $meta->post_id;
        $meta_value = $meta->meta_value;
        
        // Check if new key already exists
        $existing_new_value = get_post_meta($post_id, $new_key, true);
        
        if ($existing_new_value !== '' && $existing_new_value !== false) {
            echo "<p style='color:orange;'>⚠️ Post ID {$post_id}: New key '{$new_key}' already exists, skipping...</p>";
            continue;
        }
        
        // Add new meta key
        $updated = update_post_meta($post_id, $new_key, $meta_value);
        
        if ($updated) {
            // Delete old meta key only if new one was successfully created
            delete_post_meta($post_id, $old_key);
            echo "<p style='color:green;'>✓ Post ID {$post_id}: Migrated successfully</p>";
            $total_migrated++;
        } else {
            $error_msg = "Failed to migrate post ID {$post_id}";
            $errors[] = $error_msg;
            echo "<p style='color:red;'>✗ {$error_msg}</p>";
        }
    }
    
    echo '<hr>';
}

// Summary
echo '<h2>Migration Summary</h2>';
echo "<p><strong>Total meta entries migrated:</strong> {$total_migrated}</p>";

if (!empty($errors)) {
    echo '<h3 style="color:red;">Errors:</h3>';
    echo '<ul>';
    foreach ($errors as $error) {
        echo '<li>' . esc_html($error) . '</li>';
    }
    echo '</ul>';
} else {
    echo '<p style="color:green;"><strong>✓ Migration completed successfully with no errors!</strong></p>';
}

echo '<hr>';
echo '<p><strong>IMPORTANT:</strong> After verifying the migration, you should delete this file (migrate-meta-keys.php) for security reasons.</p>';
echo '<p><a href="' . admin_url('admin.php?page=dasom-church-dashboard') . '" style="display:inline-block;padding:10px 20px;background:#0073aa;color:white;text-decoration:none;border-radius:3px;">Go to Dashboard</a></p>';

