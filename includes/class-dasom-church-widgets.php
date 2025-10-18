<?php
/**
 * DW Church Widgets Loader
 *
 * Manages all widgets (Elementor, Gutenberg, etc.)
 *
 * @package Dasom_Church
 * @since 1.9.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class Dasom_Church_Widgets {
    
    /**
     * Constructor
     */
    public function __construct() {
        // Elementor Widgets
        add_action('elementor/widgets/register', array($this, 'register_elementor_widgets'));
        
        // Gutenberg Blocks
        add_action('init', array($this, 'register_gutenberg_blocks'));
        
        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_widget_assets'));
        add_action('enqueue_block_editor_assets', array($this, 'enqueue_block_editor_assets'));
    }
    
    /**
     * Register Elementor Widgets
     */
    public function register_elementor_widgets($widgets_manager) {
        // Check if Elementor is installed
        if (!did_action('elementor/loaded')) {
            return;
        }
        
        // Gallery Widget
        if (get_option('dw_enable_gallery_widget', 'yes') === 'yes') {
            require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/widgets/elementor/class-dw-elementor-gallery-widget.php';
            $widgets_manager->register(new DW_Elementor_Gallery_Widget());
        }
        
        // Recent Sermons Widget
        if (get_option('dw_enable_sermon_widget', 'yes') === 'yes') {
            require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/widgets/elementor/class-dw-elementor-sermon-widget.php';
            $widgets_manager->register(new DW_Elementor_Sermon_Widget());
        }
        
        // Single Sermon Widget
        if (get_option('dw_enable_single_sermon_widget', 'yes') === 'yes') {
            require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/widgets/elementor/class-dw-elementor-single-sermon-widget.php';
            $widgets_manager->register(new DW_Elementor_Single_Sermon_Widget());
        }
        
        // Bulletins Widget
        if (get_option('dw_enable_bulletin_widget', 'yes') === 'yes') {
            require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/widgets/elementor/class-dw-elementor-bulletin-widget.php';
            $widgets_manager->register(new DW_Elementor_Bulletin_Widget());
        }
        
        // Columns Widget
        if (get_option('dw_enable_column_widget', 'yes') === 'yes') {
            require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/widgets/elementor/class-dw-elementor-column-widget.php';
            $widgets_manager->register(new DW_Elementor_Column_Widget());
        }
        
        // Banner Slider Widget
        if (get_option('dw_enable_banner_slider_widget', 'yes') === 'yes') {
            require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/widgets/elementor/class-dw-elementor-banner-slider-widget.php';
            $widgets_manager->register(new DW_Elementor_Banner_Slider_Widget());
        }
    }
    
    /**
     * Register Gutenberg Blocks
     */
    public function register_gutenberg_blocks() {
        // Check if Gutenberg functions exist
        if (!function_exists('register_block_type')) {
            return;
        }
        
        // Register block
        register_block_type('dasom-church/gallery', array(
            'editor_script' => 'dw-gallery-block',
            'editor_style'  => 'dw-gallery-block-editor',
            'style'         => 'dw-gallery-block',
            'render_callback' => array($this, 'render_gallery_block'),
            'attributes' => array(
                'metaKey' => array(
                    'type' => 'string',
                    'default' => 'dw_album_images',
                ),
                'imageSize' => array(
                    'type' => 'string',
                    'default' => 'medium',
                ),
                'layoutType' => array(
                    'type' => 'string',
                    'default' => 'grid',
                ),
                'columns' => array(
                    'type' => 'number',
                    'default' => 3,
                ),
                'gap' => array(
                    'type' => 'number',
                    'default' => 10,
                ),
            ),
        ));
    }
    
    /**
     * Render Gallery Block
     */
    public function render_gallery_block($attributes) {
        global $post;
        
        if (!$post) {
            return '<p>' . __('No post context available.', 'dasom-church') . '</p>';
        }
        
        $meta_key = isset($attributes['metaKey']) ? $attributes['metaKey'] : 'dw_album_images';
        $raw = get_post_meta($post->ID, $meta_key, true);
        
        if (empty($raw)) {
            return '<p>' . __('No images found.', 'dasom-church') . '</p>';
        }
        
        // Parse image IDs
        $ids = array_filter(array_map('intval', explode(',', $raw)));
        if (empty($ids)) {
            return '<p>' . __('No valid image IDs.', 'dasom-church') . '</p>';
        }
        
        $size = isset($attributes['imageSize']) ? $attributes['imageSize'] : 'medium';
        $layout = isset($attributes['layoutType']) ? $attributes['layoutType'] : 'grid';
        $columns = isset($attributes['columns']) ? max(1, intval($attributes['columns'])) : 3;
        $gap = isset($attributes['gap']) ? intval($attributes['gap']) : 10;
        
        return $this->render_gallery($ids, $size, $layout, $columns, $gap);
    }
    
    /**
     * Common Gallery Render Function
     */
    public function render_gallery($ids, $size = 'medium', $layout = 'grid', $columns = 3, $gap = 10) {
        $output = '';
        $col_width = 100 / $columns;
        
        // Masonry requires jQuery Masonry
        if ($layout === 'masonry') {
            wp_enqueue_script('jquery-masonry');
            $output .= '<script>
            jQuery(document).ready(function($){
                $(".dw-masonry-grid").imagesLoaded(function() {
                    $(".dw-masonry-grid").masonry({
                        itemSelector: ".dw-gallery-item",
                        percentPosition: true,
                        columnWidth: ".dw-gallery-sizer"
                    });
                });
            });
            </script>';
        }
        
        $grid_class = $layout === 'masonry' ? 'dw-masonry-grid' : 'dw-grid-layout';
        $output .= '<div class="dw-gallery-grid ' . esc_attr($grid_class) . '" style="display:flex;flex-wrap:wrap;gap:' . $gap . 'px;">';
        
        // Add sizer for masonry
        if ($layout === 'masonry') {
            $output .= '<div class="dw-gallery-sizer" style="width:calc(' . $col_width . '% - ' . $gap . 'px);"></div>';
        }
        
        foreach ($ids as $img_id) {
            $url = wp_get_attachment_image_url($img_id, $size);
            $full = wp_get_attachment_image_url($img_id, 'full');
            $alt = get_post_meta($img_id, '_wp_attachment_image_alt', true);
            $caption = wp_get_attachment_caption($img_id);
            $description = $caption ? $caption : $alt;
            
            if ($url) {
                $output .= '<div class="dw-gallery-item" style="flex:0 0 calc(' . $col_width . '% - ' . $gap . 'px);box-sizing:border-box;">';
                $output .= '<a href="' . esc_url($full) . '" class="glightbox" data-gallery="dw-gallery" data-title="' . esc_attr($alt) . '" data-description="' . esc_attr($description) . '">';
                $output .= '<img src="' . esc_url($url) . '" alt="' . esc_attr($alt) . '" 
                    style="width:100%;height:auto;display:block;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);transition:transform 0.3s ease;"
                    onmouseover="this.style.transform=\'scale(1.05)\'" 
                    onmouseout="this.style.transform=\'scale(1)\'">';
                $output .= '</a>';
                $output .= '</div>';
            }
        }
        
        $output .= '</div>';
        
        return $output;
    }
    
    /**
     * Enqueue Widget Assets (Frontend)
     */
    public function enqueue_widget_assets() {
        // ImagesLoaded for Masonry
        wp_enqueue_script('imagesloaded');
        
        // GLightbox for gallery lightbox
        wp_enqueue_style(
            'glightbox',
            'https://cdn.jsdelivr.net/npm/glightbox@3.2.0/dist/css/glightbox.min.css',
            array(),
            '3.2.0'
        );
        
        wp_enqueue_script(
            'glightbox',
            'https://cdn.jsdelivr.net/npm/glightbox@3.2.0/dist/js/glightbox.min.js',
            array(),
            '3.2.0',
            true
        );
        
        // Initialize GLightbox
        wp_add_inline_script('glightbox', '
            document.addEventListener("DOMContentLoaded", function() {
                if (typeof GLightbox !== "undefined") {
                    GLightbox({
                        touchNavigation: true,
                        loop: true,
                        autoplayVideos: true,
                        closeButton: true,
                        closeOnOutsideClick: true
                    });
                }
            });
        ');
        
        // Gallery styles
        wp_add_inline_style('wp-block-library', '
            .glightbox {
                cursor: zoom-in;
            }
            .dw-gallery-item img {
                transition: all 0.3s ease;
            }
            .dw-gallery-item:hover img {
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
        ');
    }
    
    /**
     * Enqueue Block Editor Assets
     */
    public function enqueue_block_editor_assets() {
        // Register block script
        wp_enqueue_script(
            'dw-gallery-block',
            DASOM_CHURCH_PLUGIN_URL . 'includes/widgets/gutenberg/dw-gallery-block.js',
            array('wp-blocks', 'wp-element', 'wp-components', 'wp-editor', 'wp-i18n'),
            DASOM_CHURCH_VERSION,
            true
        );
        
        // Register block editor style
        wp_enqueue_style(
            'dw-gallery-block-editor',
            DASOM_CHURCH_PLUGIN_URL . 'includes/widgets/gutenberg/dw-gallery-block-editor.css',
            array('wp-edit-blocks'),
            DASOM_CHURCH_VERSION
        );
        
        // Register block frontend style
        wp_enqueue_style(
            'dw-gallery-block',
            DASOM_CHURCH_PLUGIN_URL . 'includes/widgets/gutenberg/dw-gallery-block.css',
            array(),
            DASOM_CHURCH_VERSION
        );
    }
}

// Initialize
new Dasom_Church_Widgets();

