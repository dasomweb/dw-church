<?php
/**
 * Admin Customization for DW Church Management System
 * 
 * @package DW_Church_Management
 * @since 1.37.32
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class Dasom_Church_Admin_Customization {
    
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
        add_action('init', array($this, 'init_admin_customization'));
        add_action('wp_head', array($this, 'add_admin_bar_hide_css'));
        add_action('admin_head', array($this, 'add_admin_bar_hide_css'));
        add_action('admin_head', array($this, 'add_admin_menu_styles'));
        add_action('admin_bar_menu', array($this, 'add_admin_bar_title'), 1);
    }
    
    /**
     * Initialize admin customization
     */
    public function init_admin_customization() {
        // Only apply customizations to Author and Editor roles
        $current_user = wp_get_current_user();
        if (!in_array('author', $current_user->roles) && !in_array('editor', $current_user->roles)) {
            return; // Don't apply customizations to Administrator
        }
        
        // Hide admin bar for both frontend and backend if enabled
        // Default: show admin bar (admin_bar_hide = 'no')
        $admin_bar_hide = get_option('dw_admin_bar_hide', 'no');
        if ($admin_bar_hide === 'yes') {
            add_filter('show_admin_bar', '__return_false');
        }
    }
    
    /**
     * Add admin bar hide CSS
     */
    public function add_admin_bar_hide_css() {
        // Only apply to Author and Editor roles
        $current_user = wp_get_current_user();
        if (!in_array('author', $current_user->roles) && !in_array('editor', $current_user->roles)) {
            return; // Don't apply to Administrator
        }
        
        $admin_bar_hide = get_option('dw_admin_bar_hide', 'no');
        if ($admin_bar_hide === 'yes') {
            echo '<style type="text/css">
                #wpadminbar { display: none !important; }
                html { margin-top: 0 !important; }
                body.admin-bar { padding-top: 0 !important; }
                .admin-bar #wpbody { padding-top: 0 !important; }
                .admin-bar #wpcontent { padding-top: 0 !important; }
            </style>';
        }
    }
    
    /**
     * Add admin menu styles
     */
    public function add_admin_menu_styles() {
        // Only apply to Author and Editor roles
        $current_user = wp_get_current_user();
        if (!in_array('author', $current_user->roles) && !in_array('editor', $current_user->roles)) {
            return; // Don't apply to Administrator
        }
        
        $admin_menu_bg_color = get_option('dw_admin_menu_bg_color', '#1d2327');
        $admin_menu_font_color = get_option('dw_admin_menu_font_color', '#ffffff');
        
        echo '<style type="text/css">
            /* Admin Menu Background */
            #adminmenu, #adminmenu .wp-submenu, #adminmenu .wp-submenu-head {
                background-color: ' . esc_attr($admin_menu_bg_color) . ' !important;
            }
            
            /* Admin Menu Font Color */
            #adminmenu a, #adminmenu .wp-submenu a, #adminmenu .wp-submenu-head {
                color: ' . esc_attr($admin_menu_font_color) . ' !important;
            }
            
            /* Admin Menu Hover Effects */
            #adminmenu a:hover, #adminmenu .wp-submenu a:hover {
                background-color: rgba(255, 255, 255, 0.1) !important;
                color: ' . esc_attr($admin_menu_font_color) . ' !important;
            }
            
            /* Admin Menu Active States */
            #adminmenu .current a, #adminmenu .wp-has-current-submenu a {
                background-color: rgba(255, 255, 255, 0.2) !important;
                color: ' . esc_attr($admin_menu_font_color) . ' !important;
            }
            
            /* Admin Menu Separators */
            #adminmenu .wp-menu-separator {
                background-color: rgba(255, 255, 255, 0.1) !important;
            }
            
            /* Admin Menu Icons */
            #adminmenu .wp-menu-image:before {
                color: ' . esc_attr($admin_menu_font_color) . ' !important;
            }
            
            /* Admin Menu Submenu Arrows */
            #adminmenu .wp-submenu-head:after {
                color: ' . esc_attr($admin_menu_font_color) . ' !important;
            }
            
            /* Hide Collapse Menu Button */
            #adminmenu .wp-menu-separator:last-child,
            #adminmenu .wp-menu-separator:last-of-type,
            #adminmenu .wp-menu-separator[aria-label*="Collapse"],
            #adminmenu .wp-menu-separator[aria-label*="collapse"],
            #adminmenu .wp-menu-separator[aria-label*="Collapse Menu"],
            #adminmenu .wp-menu-separator[aria-label*="collapse menu"],
            #adminmenu .wp-menu-separator[title*="Collapse"],
            #adminmenu .wp-menu-separator[title*="collapse"],
            #adminmenu .wp-menu-separator[title*="Collapse Menu"],
            #adminmenu .wp-menu-separator[title*="collapse menu"] {
                display: none !important;
            }
            
            /* Hide Collapse Menu Button by text content */
            #adminmenu .wp-menu-separator:has-text("Collapse"),
            #adminmenu .wp-menu-separator:has-text("collapse"),
            #adminmenu .wp-menu-separator:has-text("Collapse Menu"),
            #adminmenu .wp-menu-separator:has-text("collapse menu") {
                display: none !important;
            }
            
            /* Alternative method to hide last separator (usually collapse button) */
            #adminmenu li:last-child.wp-menu-separator {
                display: none !important;
            }
        </style>';
    }
    
    /**
     * Add custom title to admin bar
     */
    public function add_admin_bar_title($wp_admin_bar) {
        // Only apply to Author and Editor roles
        $current_user = wp_get_current_user();
        if (!in_array('author', $current_user->roles) && !in_array('editor', $current_user->roles)) {
            return; // Don't apply to Administrator
        }
        
        $admin_bar_title = get_option('dw_admin_bar_title', 'DW 교회관리');
        
        if (!empty($admin_bar_title)) {
            $wp_admin_bar->add_node(array(
                'id' => 'dw-church-title',
                'title' => esc_html($admin_bar_title),
                'href' => admin_url('admin.php?page=dasom-church-admin'),
                'meta' => array(
                    'class' => 'dw-church-admin-title',
                    'title' => esc_attr($admin_bar_title)
                )
            ));
        }
    }
    
    /**
     * Get admin customization settings
     */
    public function get_settings() {
        return array(
            'admin_bar_hide' => get_option('dw_admin_bar_hide', 'no'),
            'admin_menu_bg_color' => get_option('dw_admin_menu_bg_color', '#1d2327'),
            'admin_menu_font_color' => get_option('dw_admin_menu_font_color', '#ffffff'),
            'admin_bar_title' => get_option('dw_admin_bar_title', 'DW 교회관리')
        );
    }
    
    /**
     * Update admin customization settings
     */
    public function update_settings($settings) {
        if (isset($settings['admin_bar_hide'])) {
            update_option('dw_admin_bar_hide', sanitize_text_field($settings['admin_bar_hide']));
        }
        
        if (isset($settings['admin_menu_bg_color'])) {
            update_option('dw_admin_menu_bg_color', sanitize_hex_color($settings['admin_menu_bg_color']));
        }
        
        if (isset($settings['admin_menu_font_color'])) {
            update_option('dw_admin_menu_font_color', sanitize_hex_color($settings['admin_menu_font_color']));
        }
        
        if (isset($settings['admin_bar_title'])) {
            update_option('dw_admin_bar_title', sanitize_text_field($settings['admin_bar_title']));
        }
    }
}

// Initialize the class
Dasom_Church_Admin_Customization::get_instance();
