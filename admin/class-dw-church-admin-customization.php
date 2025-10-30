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

class DW_Church_Admin_Customization {
    
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
        add_action('after_setup_theme', array($this, 'hide_admin_bar_for_roles'));
        add_action('wp_head', array($this, 'add_admin_bar_hide_css'));
        add_action('admin_head', array($this, 'add_admin_bar_hide_css'));
        add_action('admin_head', array($this, 'add_admin_menu_styles'));
        add_action('admin_bar_menu', array($this, 'add_admin_bar_title'), 1);
    }
    
    /**
     * Hide admin bar for all roles except Administrator
     */
    public function hide_admin_bar_for_roles() {
        // Hide admin bar for all roles except Administrator
        if (!current_user_can('administrator')) {
            show_admin_bar(false);
        }
    }
    
    /**
     * Initialize admin customization
     */
    public function init_admin_customization() {
        // Only apply customizations to non-Administrator roles
        if (current_user_can('administrator')) {
            return; // Don't apply customizations to Administrator
        }
        
        // Hide admin bar for both frontend and backend if enabled
        // Default: hide admin bar for all non-Administrator roles
        $admin_bar_hide = get_option('dw_admin_bar_hide', 'yes'); // Changed default to 'yes'
        if ($admin_bar_hide === 'yes') {
            add_filter('show_admin_bar', '__return_false');
        }
    }
    
    /**
     * Add admin bar hide CSS
     */
    public function add_admin_bar_hide_css() {
        // Only apply to non-Administrator roles
        if (current_user_can('administrator')) {
            return; // Don't apply to Administrator
        }
        
        $admin_bar_hide = get_option('dw_admin_bar_hide', 'yes'); // Changed default to 'yes'
        if ($admin_bar_hide === 'yes') {
            echo '<style type="text/css">
                #wpadminbar { display: none !important; }
                html { margin-top: 0 !important; }
                body.admin-bar { padding-top: 0 !important; }
                .admin-bar #wpbody { padding-top: 0 !important; }
                .admin-bar #wpcontent { padding-top: 0 !important; }
                body { padding-top: 0 !important; }
                #wpbody { padding-top: 0 !important; }
                #wpcontent { padding-top: 0 !important; }
                .wp-admin #wpbody { padding-top: 0 !important; }
                .wp-admin #wpcontent { padding-top: 0 !important; }
                .wp-admin body { padding-top: 0 !important; }
            </style>';
        }
    }
    
    /**
     * Add admin menu styles
     */
    public function add_admin_menu_styles() {
        // Apply to all roles including Administrator
        $admin_menu_bg_color = get_option('dw_admin_menu_bg_color', '#1d2327');
        $admin_menu_font_color = get_option('dw_admin_menu_font_color', '#ffffff');
        $admin_menu_font_size = get_option('dw_admin_menu_font_size', '14');
        $admin_menu_font_weight = get_option('dw_admin_menu_font_weight', '400');
        $church_name = get_option('dw_admin_menu_church_name', '');
        $top_image = get_option('dw_admin_menu_top_image', '');
        
        // Add HTML for top content using JavaScript to insert into adminmenu
        if ($top_image || $church_name) {
            echo '<script type="text/javascript">
                document.addEventListener("DOMContentLoaded", function() {
                    var adminmenu = document.getElementById("adminmenu");
                    if (adminmenu) {
                        var topContent = document.createElement("div");
                        topContent.id = "adminmenu-top-content";
                        topContent.style.backgroundColor = "' . esc_attr($admin_menu_bg_color) . '";
                        topContent.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";
                        
                        var imageDiv = document.createElement("div");
                        imageDiv.id = "adminmenu-top-image";
                        imageDiv.style.display = "' . ($top_image ? 'block' : 'none') . '";
                        imageDiv.style.backgroundImage = "url(' . esc_attr($top_image) . ')";
                        imageDiv.style.backgroundSize = "50%";
                        imageDiv.style.backgroundRepeat = "no-repeat";
                        imageDiv.style.backgroundPosition = "center";
                        imageDiv.style.height = "60px";
                        imageDiv.style.padding = "40px";
                        imageDiv.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";
                        
                        var titleDiv = document.createElement("div");
                        titleDiv.id = "adminmenu-top-title";
                        titleDiv.style.display = "' . ($church_name ? 'block' : 'none') . '";
                        titleDiv.style.backgroundColor = "' . esc_attr($admin_menu_bg_color) . '";
                        titleDiv.style.color = "' . esc_attr($admin_menu_font_color) . '";
                        titleDiv.style.padding = "15px 20px";
                        titleDiv.style.fontSize = "16px";
                        titleDiv.style.fontWeight = "bold";
                        titleDiv.style.textAlign = "center";
                        titleDiv.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";
                        titleDiv.style.marginBottom = "0";
                        titleDiv.innerHTML = ' . json_encode($church_name) . ';
                        
                        if (' . ($top_image ? 'true' : 'false') . ') {
                            topContent.appendChild(imageDiv);
                        }
                        if (' . ($church_name ? 'true' : 'false') . ') {
                            topContent.appendChild(titleDiv);
                        }
                        
                        adminmenu.insertBefore(topContent, adminmenu.firstChild);
                    }
                });
            </script>';
        }
        
                echo '<style type="text/css">
                    /* Custom Top Content Container */
                    #adminmenu-top-content {
                        background-color: ' . esc_attr($admin_menu_bg_color) . ';
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    
                    /* Custom Top Image Display */
                    #adminmenu-top-image {
                        display: ' . ($top_image ? 'block' : 'none') . ';
                        background-image: url(' . esc_attr($top_image) . ');
                        background-size: contain;
                        background-repeat: no-repeat;
                        background-position: center;
                        height: 60px;
                        padding: 40px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    
                    /* Custom Top Title Display */
                    #adminmenu-top-title {
                        display: ' . ($church_name ? 'block' : 'none') . ';
                        background-color: ' . esc_attr($admin_menu_bg_color) . ';
                        color: ' . esc_attr($admin_menu_font_color) . ';
                        padding: 15px 20px;
                        font-size: 16px;
                        font-weight: bold;
                        text-align: center;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                        margin-bottom: 0;
                    }
            
            /* Remove top spacing when admin bar is hidden */
            body.admin-bar #adminmenu {
                margin-top: 0 !important;
                padding-top: 0 !important;
            }
            
            /* Admin Menu Background - More specific selectors */
            #adminmenu, 
            #adminmenu .wp-submenu, 
            #adminmenu .wp-submenu-head,
            #adminmenu .wp-menu-separator,
            #adminmenu .wp-menu-separator:last-child,
            #adminmenu li,
            #adminmenu li a,
            #adminmenu li.wp-has-current-submenu,
            #adminmenu li.wp-has-current-submenu a,
            #adminmenu li.current,
            #adminmenu li.current a {
                background-color: ' . esc_attr($admin_menu_bg_color) . ' !important;
            }
            
            /* Admin Menu Font Family, Color, Size and Weight */
            #adminmenu a, #adminmenu .wp-submenu a, #adminmenu .wp-submenu-head {
                font-family: "Noto Sans KR", sans-serif !important;
                color: ' . esc_attr($admin_menu_font_color) . ' !important;
                font-size: ' . esc_attr($admin_menu_font_size) . 'px !important;
                font-weight: ' . esc_attr($admin_menu_font_weight) . ' !important;
            }
            
            /* DW 교회관�?메뉴 ?�별 ?��???*/
            #adminmenu a[href*="dasom-church-admin"] {
                font-weight: 700 !important;
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
            
            /* Hide Collapse Menu Button - Enhanced */
            #adminmenu .wp-menu-separator:last-child,
            #adminmenu .wp-menu-separator:last-of-type,
            #adminmenu .wp-menu-separator[aria-label*="Collapse"],
            #adminmenu .wp-menu-separator[aria-label*="collapse"],
            #adminmenu .wp-menu-separator[aria-label*="Collapse Menu"],
            #adminmenu .wp-menu-separator[aria-label*="collapse menu"],
            #adminmenu .wp-menu-separator[title*="Collapse"],
            #adminmenu .wp-menu-separator[title*="collapse"],
            #adminmenu .wp-menu-separator[title*="Collapse Menu"],
            #adminmenu .wp-menu-separator[title*="collapse menu"],
            #adminmenu li:last-child.wp-menu-separator,
            #adminmenu li.wp-menu-separator:last-child,
            #adminmenu .wp-menu-separator {
                display: none !important;
            }
            
            /* Hide any collapse menu related elements */
            #adminmenu [aria-label*="Collapse"],
            #adminmenu [title*="Collapse"],
            #adminmenu [aria-label*="collapse"],
            #adminmenu [title*="collapse"] {
                display: none !important;
            }
        </style>';
    }
    
    /**
     * Add custom title to admin bar
     */
    public function add_admin_bar_title($wp_admin_bar) {
        // Only apply to non-Administrator roles
        if (current_user_can('administrator')) {
            return; // Don't apply to Administrator
        }
        
        $admin_bar_title = get_option('dw_admin_bar_title', 'DW 교회관�?);
        
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
            'admin_bar_title' => get_option('dw_admin_bar_title', 'DW 교회관�?)
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
DW_Church_Admin_Customization::get_instance();
