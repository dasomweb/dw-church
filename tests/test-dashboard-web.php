<?php
/**
 * Web-based Test for DW Church Dashboard Access
 * 
 * Access this file via: https://johnk574.sg-host.com/wp-content/plugins/dasomweb-dasom-church-management-system-262ce26351663fc52a3246fa87e074f23834d23d/tests/test-dashboard-web.php
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
require_once('../admin/class-dw-church-admin.php');
require_once('../admin/class-dw-church-menu-visibility.php');

// Initialize WordPress
if (!function_exists('wp_set_current_user')) {
    die("ERROR: WordPress not loaded properly");
}

echo "<h1>DW Church Dashboard Access Test</h1>";
echo "<style>body{font-family:Arial,sans-serif;margin:20px;} .pass{color:green;} .fail{color:red;} .info{color:blue;}</style>";

// Test Author role access
echo "<h2>Testing Author Dashboard Access</h2>";

// Create test author user
$author_id = wp_create_user('test_author_' . time(), 'password123', 'author@test.com');
if (is_wp_error($author_id)) {
    echo "<p class='fail'>ERROR: Failed to create author user - " . $author_id->get_error_message() . "</p>";
} else {
    echo "<p class='info'>Author user created with ID: $author_id</p>";
    
    // Set author role
    $user = new WP_User($author_id);
    $user->set_role('author');
    echo "<p class='info'>Author role set</p>";
    
    // Switch to author user
    wp_set_current_user($author_id);
    echo "<p class='info'>Current user set to author</p>";
    
    // Test capabilities
    echo "<h3>Author Capabilities:</h3>";
    echo "<ul>";
    echo "<li>edit_posts: " . (current_user_can('edit_posts') ? '<span class="pass">YES</span>' : '<span class="fail">NO</span>') . "</li>";
    echo "<li>read: " . (current_user_can('read') ? '<span class="pass">YES</span>' : '<span class="fail">NO</span>') . "</li>";
    echo "<li>manage_options: " . (current_user_can('manage_options') ? '<span class="pass">YES</span>' : '<span class="fail">NO</span>') . "</li>";
    echo "</ul>";
    
    // Test menu visibility
    if (class_exists('Dasom_Church_Menu_Visibility')) {
        $menu_visibility = Dasom_Church_Menu_Visibility::get_instance();
        $can_access = $menu_visibility->user_can_access_menu('dasom-church-admin', 'author');
        echo "<p>Author can access dasom-church-admin: " . ($can_access ? '<span class="pass">YES</span>' : '<span class="fail">NO</span>') . "</p>";
    }
    
    // Test dashboard page function
    if (class_exists('Dasom_Church_Admin')) {
        $admin = Dasom_Church_Admin::get_instance();
        echo "<h3>Testing Dashboard Page Function:</h3>";
        
        // Capture output
        ob_start();
        try {
            $admin->dasom_church_dashboard_page();
            $output = ob_get_clean();
            echo "<p class='pass'>Dashboard page executed successfully</p>";
            echo "<p class='info'>Output length: " . strlen($output) . " characters</p>";
            if (strlen($output) > 0) {
                echo "<p class='pass'>Dashboard content loaded successfully</p>";
            } else {
                echo "<p class='fail'>WARNING: Dashboard output is empty</p>";
            }
        } catch (Exception $e) {
            ob_end_clean();
            echo "<p class='fail'>ERROR: Dashboard page failed - " . $e->getMessage() . "</p>";
        }
    } else {
        echo "<p class='fail'>ERROR: Dasom_Church_Admin class not found</p>";
    }
}

// Test Editor role access
echo "<h2>Testing Editor Dashboard Access</h2>";

$editor_id = wp_create_user('test_editor_' . time(), 'password123', 'editor@test.com');
if (is_wp_error($editor_id)) {
    echo "<p class='fail'>ERROR: Failed to create editor user - " . $editor_id->get_error_message() . "</p>";
} else {
    echo "<p class='info'>Editor user created with ID: $editor_id</p>";
    
    // Set editor role
    $user = new WP_User($editor_id);
    $user->set_role('editor');
    echo "<p class='info'>Editor role set</p>";
    
    // Switch to editor user
    wp_set_current_user($editor_id);
    echo "<p class='info'>Current user set to editor</p>";
    
    // Test capabilities
    echo "<h3>Editor Capabilities:</h3>";
    echo "<ul>";
    echo "<li>edit_posts: " . (current_user_can('edit_posts') ? '<span class="pass">YES</span>' : '<span class="fail">NO</span>') . "</li>";
    echo "<li>read: " . (current_user_can('read') ? '<span class="pass">YES</span>' : '<span class="fail">NO</span>') . "</li>";
    echo "<li>manage_options: " . (current_user_can('manage_options') ? '<span class="pass">YES</span>' : '<span class="fail">NO</span>') . "</li>";
    echo "</ul>";
    
    // Test menu visibility
    if (class_exists('Dasom_Church_Menu_Visibility')) {
        $menu_visibility = Dasom_Church_Menu_Visibility::get_instance();
        $can_access = $menu_visibility->user_can_access_menu('dasom-church-admin', 'editor');
        echo "<p>Editor can access dasom-church-admin: " . ($can_access ? '<span class="pass">YES</span>' : '<span class="fail">NO</span>') . "</p>";
    }
    
    // Test dashboard page function
    if (class_exists('Dasom_Church_Admin')) {
        $admin = Dasom_Church_Admin::get_instance();
        echo "<h3>Testing Dashboard Page Function:</h3>";
        
        // Capture output
        ob_start();
        try {
            $admin->dasom_church_dashboard_page();
            $output = ob_get_clean();
            echo "<p class='pass'>Dashboard page executed successfully</p>";
            echo "<p class='info'>Output length: " . strlen($output) . " characters</p>";
            if (strlen($output) > 0) {
                echo "<p class='pass'>Dashboard content loaded successfully</p>";
            } else {
                echo "<p class='fail'>WARNING: Dashboard output is empty</p>";
            }
        } catch (Exception $e) {
            ob_end_clean();
            echo "<p class='fail'>ERROR: Dashboard page failed - " . $e->getMessage() . "</p>";
        }
    } else {
        echo "<p class='fail'>ERROR: Dasom_Church_Admin class not found</p>";
    }
}

echo "<h2>Test Complete</h2>";
echo "<p>Check the results above to verify that Author and Editor roles can access the DW Church Dashboard.</p>";
echo "<p><strong>Expected Results:</strong></p>";
echo "<ul>";
echo "<li>Author should have edit_posts capability: YES</li>";
echo "<li>Editor should have edit_posts capability: YES</li>";
echo "<li>Both should be able to access dasom-church-admin: YES</li>";
echo "<li>Dashboard page function should execute successfully</li>";
echo "<li>Dashboard should output content (not empty)</li>";
echo "</ul>";
?>
