<?php
/**
 * WordPress Test Runner for DW Church Dashboard Access
 * 
 * @package DW_Church_Management
 * @since 1.37.90
 */

// Load WordPress
require_once('../../../wp-config.php');
require_once('../../../wp-includes/wp-db.php');
require_once('../../../wp-includes/pluggable.php');
require_once('../../../wp-includes/user.php');
require_once('../../../wp-includes/capabilities.php');

// Load our plugin classes
require_once('../admin/class-dasom-church-admin.php');
require_once('../admin/class-dasom-church-menu-visibility.php');

// Initialize WordPress
if (!function_exists('wp_set_current_user')) {
    echo "ERROR: WordPress not loaded properly\n";
    exit(1);
}

echo "WordPress loaded successfully\n";
echo "Testing DW Church Dashboard Access...\n";
echo "=====================================\n";

// Test Author role access
echo "\n=== Testing Author Dashboard Access ===\n";

// Create test author user
$author_id = wp_create_user('test_author_' . time(), 'password123', 'author@test.com');
if (is_wp_error($author_id)) {
    echo "ERROR: Failed to create author user - " . $author_id->get_error_message() . "\n";
} else {
    echo "Author user created with ID: $author_id\n";
    
    // Set author role
    $user = new WP_User($author_id);
    $user->set_role('author');
    echo "Author role set\n";
    
    // Switch to author user
    wp_set_current_user($author_id);
    echo "Current user set to author\n";
    
    // Test capabilities
    echo "Author capabilities:\n";
    echo "  - edit_posts: " . (current_user_can('edit_posts') ? 'YES' : 'NO') . "\n";
    echo "  - read: " . (current_user_can('read') ? 'YES' : 'NO') . "\n";
    echo "  - manage_options: " . (current_user_can('manage_options') ? 'YES' : 'NO') . "\n";
    
    // Test menu visibility
    if (class_exists('DW_Church_Menu_Visibility')) {
        $menu_visibility = DW_Church_Menu_Visibility::get_instance();
        $can_access = $menu_visibility->user_can_access_menu('dasom-church-admin', 'author');
        echo "Author can access dasom-church-admin: " . ($can_access ? 'YES' : 'NO') . "\n";
    }
    
    // Test dashboard page function
    if (class_exists('DW_Church_Admin')) {
        $admin = DW_Church_Admin::get_instance();
        echo "Testing dashboard page function...\n";
        
        // Capture output
        ob_start();
        try {
            $admin->DW_Church_dashboard_page();
            $output = ob_get_clean();
            echo "Dashboard page executed successfully\n";
            echo "Output length: " . strlen($output) . " characters\n";
            if (strlen($output) > 0) {
                echo "Dashboard content loaded successfully\n";
            } else {
                echo "WARNING: Dashboard output is empty\n";
            }
        } catch (Exception $e) {
            ob_end_clean();
            echo "ERROR: Dashboard page failed - " . $e->getMessage() . "\n";
        }
    } else {
        echo "ERROR: DW_Church_Admin class not found\n";
    }
}

// Test Editor role access
echo "\n=== Testing Editor Dashboard Access ===\n";

$editor_id = wp_create_user('test_editor_' . time(), 'password123', 'editor@test.com');
if (is_wp_error($editor_id)) {
    echo "ERROR: Failed to create editor user - " . $editor_id->get_error_message() . "\n";
} else {
    echo "Editor user created with ID: $editor_id\n";
    
    // Set editor role
    $user = new WP_User($editor_id);
    $user->set_role('editor');
    echo "Editor role set\n";
    
    // Switch to editor user
    wp_set_current_user($editor_id);
    echo "Current user set to editor\n";
    
    // Test capabilities
    echo "Editor capabilities:\n";
    echo "  - edit_posts: " . (current_user_can('edit_posts') ? 'YES' : 'NO') . "\n";
    echo "  - read: " . (current_user_can('read') ? 'YES' : 'NO') . "\n";
    echo "  - manage_options: " . (current_user_can('manage_options') ? 'YES' : 'NO') . "\n";
    
    // Test menu visibility
    if (class_exists('DW_Church_Menu_Visibility')) {
        $menu_visibility = DW_Church_Menu_Visibility::get_instance();
        $can_access = $menu_visibility->user_can_access_menu('dasom-church-admin', 'editor');
        echo "Editor can access dasom-church-admin: " . ($can_access ? 'YES' : 'NO') . "\n";
    }
    
    // Test dashboard page function
    if (class_exists('DW_Church_Admin')) {
        $admin = DW_Church_Admin::get_instance();
        echo "Testing dashboard page function...\n";
        
        // Capture output
        ob_start();
        try {
            $admin->DW_Church_dashboard_page();
            $output = ob_get_clean();
            echo "Dashboard page executed successfully\n";
            echo "Output length: " . strlen($output) . " characters\n";
            if (strlen($output) > 0) {
                echo "Dashboard content loaded successfully\n";
            } else {
                echo "WARNING: Dashboard output is empty\n";
            }
        } catch (Exception $e) {
            ob_end_clean();
            echo "ERROR: Dashboard page failed - " . $e->getMessage() . "\n";
        }
    } else {
        echo "ERROR: DW_Church_Admin class not found\n";
    }
}

echo "\n=== Test Complete ===\n";
