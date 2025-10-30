<?php
/**
 * Unit Tests for DW Church Dashboard Access
 * 
 * Tests Author/Editor access to dasom-church-dashboard
 * 
 * @package DW_Church_Management
 * @since 1.37.90
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class Test_Dashboard_Access {
    
    /**
     * Test Author role access to dashboard
     */
    public function test_author_dashboard_access() {
        echo "=== Testing Author Dashboard Access ===\n";
        
        // Create test author user
        $author_id = wp_create_user('test_author', 'password123', 'author@test.com');
        if (is_wp_error($author_id)) {
            echo "ERROR: Failed to create author user\n";
            return false;
        }
        
        // Set author role
        $user = new WP_User($author_id);
        $user->set_role('author');
        
        // Switch to author user
        wp_set_current_user($author_id);
        
        // Test if user can access dashboard
        $can_access = current_user_can('edit_posts');
        echo "Author can edit_posts: " . ($can_access ? 'YES' : 'NO') . "\n";
        
        // Test dashboard page function
        $admin = DW_Church_Admin::get_instance();
        
        // Capture output
        ob_start();
        try {
            $admin->DW_Church_dashboard_page();
            $output = ob_get_clean();
            echo "Dashboard page executed successfully\n";
            echo "Output length: " . strlen($output) . " characters\n";
            return true;
        } catch (Exception $e) {
            ob_end_clean();
            echo "ERROR: Dashboard page failed - " . $e->getMessage() . "\n";
            return false;
        }
    }
    
    /**
     * Test Editor role access to dashboard
     */
    public function test_editor_dashboard_access() {
        echo "\n=== Testing Editor Dashboard Access ===\n";
        
        // Create test editor user
        $editor_id = wp_create_user('test_editor', 'password123', 'editor@test.com');
        if (is_wp_error($editor_id)) {
            echo "ERROR: Failed to create editor user\n";
            return false;
        }
        
        // Set editor role
        $user = new WP_User($editor_id);
        $user->set_role('editor');
        
        // Switch to editor user
        wp_set_current_user($editor_id);
        
        // Test if user can access dashboard
        $can_access = current_user_can('edit_posts');
        echo "Editor can edit_posts: " . ($can_access ? 'YES' : 'NO') . "\n";
        
        // Test dashboard page function
        $admin = DW_Church_Admin::get_instance();
        
        // Capture output
        ob_start();
        try {
            $admin->DW_Church_dashboard_page();
            $output = ob_get_clean();
            echo "Dashboard page executed successfully\n";
            echo "Output length: " . strlen($output) . " characters\n";
            return true;
        } catch (Exception $e) {
            ob_end_clean();
            echo "ERROR: Dashboard page failed - " . $e->getMessage() . "\n";
            return false;
        }
    }
    
    /**
     * Test menu visibility for Author/Editor
     */
    public function test_menu_visibility() {
        echo "\n=== Testing Menu Visibility ===\n";
        
        // Test Author
        $author_id = wp_create_user('test_author_menu', 'password123', 'author_menu@test.com');
        if (!is_wp_error($author_id)) {
            $user = new WP_User($author_id);
            $user->set_role('author');
            wp_set_current_user($author_id);
            
            $menu_visibility = DW_Church_Menu_Visibility::get_instance();
            $can_access_dashboard = $menu_visibility->user_can_access_menu('dasom-church-admin', 'author');
            echo "Author can access dasom-church-admin: " . ($can_access_dashboard ? 'YES' : 'NO') . "\n";
        }
        
        // Test Editor
        $editor_id = wp_create_user('test_editor_menu', 'password123', 'editor_menu@test.com');
        if (!is_wp_error($editor_id)) {
            $user = new WP_User($editor_id);
            $user->set_role('editor');
            wp_set_current_user($editor_id);
            
            $menu_visibility = DW_Church_Menu_Visibility::get_instance();
            $can_access_dashboard = $menu_visibility->user_can_access_menu('dasom-church-admin', 'editor');
            echo "Editor can access dasom-church-admin: " . ($can_access_dashboard ? 'YES' : 'NO') . "\n";
        }
        
        return true;
    }
    
    /**
     * Test WordPress capabilities
     */
    public function test_wordpress_capabilities() {
        echo "\n=== Testing WordPress Capabilities ===\n";
        
        // Test Author capabilities
        $author_id = wp_create_user('test_author_caps', 'password123', 'author_caps@test.com');
        if (!is_wp_error($author_id)) {
            $user = new WP_User($author_id);
            $user->set_role('author');
            wp_set_current_user($author_id);
            
            echo "Author capabilities:\n";
            echo "  - edit_posts: " . (current_user_can('edit_posts') ? 'YES' : 'NO') . "\n";
            echo "  - read: " . (current_user_can('read') ? 'YES' : 'NO') . "\n";
            echo "  - manage_options: " . (current_user_can('manage_options') ? 'YES' : 'NO') . "\n";
        }
        
        // Test Editor capabilities
        $editor_id = wp_create_user('test_editor_caps', 'password123', 'editor_caps@test.com');
        if (!is_wp_error($editor_id)) {
            $user = new WP_User($editor_id);
            $user->set_role('editor');
            wp_set_current_user($editor_id);
            
            echo "Editor capabilities:\n";
            echo "  - edit_posts: " . (current_user_can('edit_posts') ? 'YES' : 'NO') . "\n";
            echo "  - read: " . (current_user_can('read') ? 'YES' : 'NO') . "\n";
            echo "  - manage_options: " . (current_user_can('manage_options') ? 'YES' : 'NO') . "\n";
        }
        
        return true;
    }
    
    /**
     * Run all tests
     */
    public function run_all_tests() {
        echo "Starting DW Church Dashboard Access Tests...\n";
        echo "==========================================\n";
        
        $results = array();
        
        // Test Author access
        $results['author_access'] = $this->test_author_dashboard_access();
        
        // Test Editor access
        $results['editor_access'] = $this->test_editor_dashboard_access();
        
        // Test menu visibility
        $results['menu_visibility'] = $this->test_menu_visibility();
        
        // Test WordPress capabilities
        $results['capabilities'] = $this->test_wordpress_capabilities();
        
        // Summary
        echo "\n=== TEST SUMMARY ===\n";
        foreach ($results as $test => $result) {
            echo $test . ": " . ($result ? "PASS" : "FAIL") . "\n";
        }
        
        $all_passed = !in_array(false, $results);
        echo "\nOverall Result: " . ($all_passed ? "ALL TESTS PASSED" : "SOME TESTS FAILED") . "\n";
        
        return $all_passed;
    }
}

// Run tests if called directly
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    $tester = new Test_Dashboard_Access();
    $tester->run_all_tests();
}
