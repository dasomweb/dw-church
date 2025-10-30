<?php
/**
 * Menu Visibility Control for DW Church Management System
 * 
 * @package DW_Church_Management
 * @since 1.37.31
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class DW_Church_Menu_Visibility {
    
    /**
     * Singleton instance
     */
    private static $instance = null;
    
    /**
     * Get singleton instance
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
        add_action('admin_menu', array($this, 'hide_menus_for_roles'), 999);
        add_action('admin_init', array($this, 'init_menu_visibility'));
    }
    
    /**
     * Initialize menu visibility settings
     */
    public function init_menu_visibility() {
        // Set default settings if not exists
        $default_settings = get_option('dw_menu_visibility_settings', array());
        if (empty($default_settings)) {
            $this->set_default_settings();
        }
    }
    
    /**
     * Set default menu visibility settings
     */
    private function set_default_settings() {
        $default_menus = array(
            'dashboard' => array('author' => true, 'editor' => true),
            'sermon' => array('author' => true, 'editor' => true),
            'column' => array('author' => true, 'editor' => true),
            'bulletin' => array('author' => true, 'editor' => true),
            'album' => array('author' => true, 'editor' => true),
            'event' => array('author' => true, 'editor' => true),
            'banner' => array('author' => true, 'editor' => true),
            'settings' => array('author' => true, 'editor' => true),
            'posts' => array('author' => true, 'editor' => true),
            'pages' => array('author' => true, 'editor' => true),
            'media' => array('author' => true, 'editor' => true),
            'users' => array('author' => true, 'editor' => true),
            'profile' => array('author' => true, 'editor' => true),
            'logout' => array('author' => true, 'editor' => true),
        );
        
        update_option('dw_menu_visibility_settings', $default_menus);
    }
    
    /**
     * Hide menus for Author and Editor roles
     */
    public function hide_menus_for_roles() {
        // Only apply to Author and Editor roles
        if (!current_user_can('edit_posts') || current_user_can('manage_options')) {
            return;
        }
        
        $current_user = wp_get_current_user();
        $user_role = '';
        
        // Determine user role
        if (in_array('author', $current_user->roles)) {
            $user_role = 'author';
        } elseif (in_array('editor', $current_user->roles)) {
            $user_role = 'editor';
        } else {
            return; // Not Author or Editor
        }
        
        $menu_visibility_settings = get_option('dw_menu_visibility_settings', array());
        
        // Hide menus based on settings
        $this->hide_wordpress_menus($user_role, $menu_visibility_settings);
        $this->hide_plugin_menus($user_role, $menu_visibility_settings);
    }
    
    /**
     * Hide WordPress default menus
     */
    private function hide_wordpress_menus($user_role, $settings) {
        // Hide Posts if not allowed
        if (!isset($settings['posts'][$user_role]) || !$settings['posts'][$user_role]) {
            remove_menu_page('edit.php');
        }
        
        // Hide Pages if not allowed
        if (!isset($settings['pages'][$user_role]) || !$settings['pages'][$user_role]) {
            remove_menu_page('edit.php?post_type=page');
        }
        
        // Hide Media if not allowed
        if (!isset($settings['media'][$user_role]) || !$settings['media'][$user_role]) {
            remove_menu_page('upload.php');
        }
        
        // Hide Users if not allowed
        if (!isset($settings['users'][$user_role]) || !$settings['users'][$user_role]) {
            remove_menu_page('users.php');
        }
        
        // Hide Comments
        remove_menu_page('edit-comments.php');
        
        // Hide Appearance
        remove_menu_page('themes.php');
        
        // Hide Plugins
        remove_menu_page('plugins.php');
        
        // Hide Tools
        remove_menu_page('tools.php');
        
        // Hide Settings (except DW settings)
        remove_menu_page('options-general.php');
        
        // Hide other WordPress menus
        remove_menu_page('link-manager.php');
        remove_menu_page('edit.php?post_type=attachment');
    }
    
    /**
     * Hide plugin menus
     */
    private function hide_plugin_menus($user_role, $settings) {
        global $menu, $submenu;
        
        // Get all menu items
        if (empty($menu)) {
            return;
        }
        
        // List of allowed menu items for Author/Editor
        $allowed_menus = array();
        
        // Add DW Church Management menus if allowed
        if (isset($settings['dashboard'][$user_role]) && $settings['dashboard'][$user_role]) {
            $allowed_menus[] = 'dasom-church-admin';
        }
        
        if (isset($settings['sermon'][$user_role]) && $settings['sermon'][$user_role]) {
            $allowed_menus[] = 'dasom-church-sermon';
        }
        
        if (isset($settings['column'][$user_role]) && $settings['column'][$user_role]) {
            $allowed_menus[] = 'dasom-church-column';
        }
        
        if (isset($settings['bulletin'][$user_role]) && $settings['bulletin'][$user_role]) {
            $allowed_menus[] = 'dasom-church-bulletin';
        }
        
        if (isset($settings['album'][$user_role]) && $settings['album'][$user_role]) {
            $allowed_menus[] = 'dasom-church-album';
        }
        
        if (isset($settings['event'][$user_role]) && $settings['event'][$user_role]) {
            $allowed_menus[] = 'dasom-church-event';
        }
        
        if (isset($settings['banner'][$user_role]) && $settings['banner'][$user_role]) {
            $allowed_menus[] = 'dasom-church-banner';
        }
        
        if (isset($settings['settings'][$user_role]) && $settings['settings'][$user_role]) {
            $allowed_menus[] = 'dasom-church-settings';
        }
        
        // Add WordPress default menus if allowed
        if (isset($settings['posts'][$user_role]) && $settings['posts'][$user_role]) {
            $allowed_menus[] = 'edit.php';
        }
        
        if (isset($settings['pages'][$user_role]) && $settings['pages'][$user_role]) {
            $allowed_menus[] = 'edit.php?post_type=page';
        }
        
        if (isset($settings['media'][$user_role]) && $settings['media'][$user_role]) {
            $allowed_menus[] = 'upload.php';
        }
        
        if (isset($settings['users'][$user_role]) && $settings['users'][$user_role]) {
            $allowed_menus[] = 'users.php';
        }
        
        // Always allow dashboard
        $allowed_menus[] = 'index.php';
        
        // Remove all other menus
        foreach ($menu as $key => $menu_item) {
            if (isset($menu_item[2]) && !in_array($menu_item[2], $allowed_menus)) {
                // Skip if it's a separator or already removed
                if (strpos($menu_item[2], 'separator') === 0 || empty($menu_item[0])) {
                    continue;
                }
                
                // Skip if it's a submenu of allowed parent
                $is_submenu = false;
                foreach ($allowed_menus as $allowed_menu) {
                    if (strpos($menu_item[2], $allowed_menu) === 0) {
                        $is_submenu = true;
                        break;
                    }
                }
                
                if (!$is_submenu) {
                    remove_menu_page($menu_item[2]);
                }
            }
        }
    }
    
    /**
     * Check if user can access specific menu
     */
    public function user_can_access_menu($menu_slug, $user_role = null) {
        // DEBUG: Log menu access check
        error_log('=== USER_CAN_ACCESS_MENU DEBUG ===');
        error_log('Menu Slug: ' . $menu_slug);
        error_log('User Role: ' . ($user_role ?: 'NULL'));
        
        if (!$user_role) {
            $current_user = wp_get_current_user();
            if (in_array('author', $current_user->roles)) {
                $user_role = 'author';
            } elseif (in_array('editor', $current_user->roles)) {
                $user_role = 'editor';
            } else {
                error_log('No specific role, allowing access');
                return true; // Administrator or other roles
            }
        }
        
        $menu_visibility_settings = get_option('dw_menu_visibility_settings', array());
        error_log('Menu visibility settings: ' . print_r($menu_visibility_settings, true));
        
        // Map menu slugs to settings keys
        $menu_mapping = array(
            'dasom-church-admin' => 'dashboard',
            'dasom-church-dashboard' => 'dashboard', // Add dashboard mapping
            'dasom-church-sermon' => 'sermon',
            'dasom-church-column' => 'column',
            'dasom-church-bulletin' => 'bulletin',
            'dasom-church-album' => 'album',
            'dasom-church-event' => 'event',
            'dasom-church-banner' => 'banner',
            'dasom-church-settings' => 'settings',
            'edit.php' => 'posts',
            'edit.php?post_type=page' => 'pages',
            'upload.php' => 'media',
            'users.php' => 'users',
        );
        
        $setting_key = isset($menu_mapping[$menu_slug]) ? $menu_mapping[$menu_slug] : null;
        error_log('Setting key: ' . ($setting_key ?: 'NULL'));
        
        if (!$setting_key) {
            error_log('No setting key found for menu slug: ' . $menu_slug);
            return false;
        }
        
        // FORCE ALLOW dashboard access for Author/Editor
        if ($setting_key === 'dashboard') {
            error_log('Dashboard access - FORCE ALLOWED for Author/Editor');
            return true;
        }
        
        if (!isset($menu_visibility_settings[$setting_key][$user_role])) {
            error_log('No setting found for key: ' . $setting_key . ', role: ' . $user_role);
            return false;
        }
        
        $result = $menu_visibility_settings[$setting_key][$user_role];
        error_log('Final result: ' . ($result ? 'ALLOW' : 'DENY'));
        return $result;
    }
}

// Initialize the class
Dasom_Church_Menu_Visibility::get_instance();
