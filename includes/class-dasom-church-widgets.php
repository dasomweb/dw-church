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
        // Check if gallery widget is enabled
        if (get_option('dw_enable_gallery_widget', 'yes') === 'yes') {
            // Elementor Widget
            add_action('elementor/widgets/register', array($this, 'register_elementor_widgets'));
            
            // Gutenberg Block
            add_action('init', array($this, 'register_gutenberg_blocks'));
            
            // Enqueue scripts and styles
            add_action('wp_enqueue_scripts', array($this, 'enqueue_widget_assets'));
            add_action('enqueue_block_editor_assets', array($this, 'enqueue_block_editor_assets'));
        }
    }
    
    /**
     * Register Elementor Widgets
     */
    public function register_elementor_widgets($widgets_manager) {
        // Check if Elementor is installed
        if (!did_action('elementor/loaded')) {
            return;
        }
        
        // Include widget file
        require_once DASOM_CHURCH_PLUGIN_PATH . 'includes/widgets/elementor/class-dw-elementor-gallery-widget.php';
        
        // Register widget
        $widgets_manager->register(new DW_Elementor_Gallery_Widget());
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
            
            if ($url) {
                $output .= '<div class="dw-gallery-item" style="flex:0 0 calc(' . $col_width . '% - ' . $gap . 'px);box-sizing:border-box;">';
                $output .= '<a href="' . esc_url($full) . '" data-lightbox="dw-gallery" data-title="' . esc_attr($alt) . '">';
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
        
        // Lightbox CSS (Simple lightbox effect)
        wp_add_inline_style('wp-block-library', '
            [data-lightbox] {
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

