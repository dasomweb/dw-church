<?php
/**
 * Simple Test for DW Church Dashboard Access
 * 
 * @package DW_Church_Management
 * @since 1.37.90
 */

echo "=== DW Church Dashboard Access Test ===\n";
echo "Testing WordPress permission system...\n\n";

// Test 1: Check if WordPress functions are available
echo "Test 1: WordPress Functions\n";
if (function_exists('current_user_can')) {
    echo "??current_user_can() function available\n";
} else {
    echo "??current_user_can() function NOT available\n";
}

if (function_exists('wp_get_current_user')) {
    echo "??wp_get_current_user() function available\n";
} else {
    echo "??wp_get_current_user() function NOT available\n";
}

// Test 2: Check plugin classes
echo "\nTest 2: Plugin Classes\n";
if (file_exists('../admin/class-dasom-church-admin.php')) {
    echo "??DW_Church_Admin class file exists\n";
} else {
    echo "??DW_Church_Admin class file NOT found\n";
}

if (file_exists('../admin/class-dasom-church-menu-visibility.php')) {
    echo "??DW_Church_Menu_Visibility class file exists\n";
} else {
    echo "??DW_Church_Menu_Visibility class file NOT found\n";
}

// Test 3: Check recent changes
echo "\nTest 3: Recent Changes Verification\n";

// Check if permission bypass code exists
$admin_file = '../admin/class-dasom-church-admin.php';
if (file_exists($admin_file)) {
    $content = file_get_contents($admin_file);
    
    if (strpos($content, 'FORCE ALLOW dashboard access') !== false) {
        echo "??Dashboard force access code found\n";
    } else {
        echo "??Dashboard force access code NOT found\n";
    }
    
    if (strpos($content, 'filter_admin_menus') !== false) {
        echo "??Conflicting filter_admin_menus still exists\n";
    } else {
        echo "??Conflicting filter_admin_menus removed\n";
    }
} else {
    echo "??Admin file not found\n";
}

// Check menu visibility file
$menu_file = '../admin/class-dasom-church-menu-visibility.php';
if (file_exists($menu_file)) {
    $content = file_get_contents($menu_file);
    
    if (strpos($content, 'FORCE ALLOW dashboard access') !== false) {
        echo "??Menu visibility force access code found\n";
    } else {
        echo "??Menu visibility force access code NOT found\n";
    }
} else {
    echo "??Menu visibility file not found\n";
}

echo "\n=== Test Summary ===\n";
echo "This test verifies that the permission conflict fixes are in place.\n";
echo "If all tests show ?? the dashboard access should work for Author/Editor roles.\n";
echo "\nTo test actual access, you need to:\n";
echo "1. Access the WordPress admin area\n";
echo "2. Login as Author or Editor user\n";
echo "3. Navigate to: wp-admin/admin.php?page=dasom-church-dashboard\n";
echo "4. Verify no 'Sorry, you are not allowed to access this page' error\n";
?>
