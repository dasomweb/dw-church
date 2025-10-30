<?php
/**
 * Clear WordPress Update Cache
 * 
 * This script clears all update-related caches to force WordPress
 * to check for updates again.
 */

// Only run if accessed via WordPress admin
if (!defined('ABSPATH')) {
    // Try to load WordPress
    $wp_load_paths = [
        '../../../wp-load.php',
        '../../../../wp-load.php',
        '../../../../../wp-load.php',
        '../../../../../../wp-load.php'
    ];
    
    $wp_loaded = false;
    foreach ($wp_load_paths as $path) {
        if (file_exists($path)) {
            require_once $path;
            $wp_loaded = true;
            break;
        }
    }
    
    if (!$wp_loaded) {
        die('WordPress not found. Please run this script from WordPress admin area.');
    }
}

// Check if user has permission
if (!current_user_can('manage_options')) {
    die('You do not have permission to run this script.');
}

echo "<h2>WordPress Update Cache Clear</h2>";

// Clear update transients
$transients_to_clear = [
    'dasom_church_update_' . md5('dasomweb' . 'dasom-church-management-system'),
    'dasom_church_plugin_info_' . md5('dasomweb' . 'dasom-church-management-system'),
    'update_plugins',
    'update_themes',
    'update_core',
    '_site_transient_update_plugins',
    '_site_transient_update_themes',
    '_site_transient_update_core'
];

$cleared_count = 0;
foreach ($transients_to_clear as $transient) {
    if (delete_transient($transient)) {
        echo "<p>??Cleared transient: {$transient}</p>";
        $cleared_count++;
    } else {
        echo "<p>??Transient not found: {$transient}</p>";
    }
}

// Clear site transients
foreach ($transients_to_clear as $transient) {
    if (delete_site_transient($transient)) {
        echo "<p>??Cleared site transient: {$transient}</p>";
        $cleared_count++;
    }
}

// Force WordPress to check for updates
if (function_exists('wp_update_plugins')) {
    wp_update_plugins();
    echo "<p>??Forced plugin update check</p>";
}

if (function_exists('wp_update_themes')) {
    wp_update_themes();
    echo "<p>??Forced theme update check</p>";
}

if (function_exists('wp_version_check')) {
    wp_version_check();
    echo "<p>??Forced core update check</p>";
}

echo "<h3>Cache Clear Complete!</h3>";
echo "<p>Cleared {$cleared_count} cache entries.</p>";
echo "<p>Please refresh your WordPress admin page to see the updated plugin information.</p>";

// Auto-redirect after 3 seconds
echo "<script>setTimeout(function(){ window.location.href = '" . admin_url('plugins.php') . "'; }, 3000);</script>";
echo "<p><a href='" . admin_url('plugins.php') . "'>Go to Plugins page</a></p>";
?>
