<?php
/**
 * DW Elementor Gallery Widget
 *
 * @package Dasom_Church
 * @since 1.9.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Gallery_Widget extends \Elementor\Widget_Base {
    
    /**
     * Get widget name
     */
    public function get_name() {
        return 'dw_gallery_widget';
    }
    
    /**
     * Get widget title
     */
    public function get_title() {
        return __('DW Gallery', 'dasom-church');
    }
    
    /**
     * Get widget icon
     */
    public function get_icon() {
        return 'eicon-gallery-grid';
    }
    
    /**
     * Get widget categories
     */
    public function get_categories() {
        return ['general'];
    }
    
    /**
     * Get widget keywords
     */
    public function get_keywords() {
        return ['gallery', 'images', 'album', 'church', 'dw', '갤러리', '앨범'];
    }
    
    /**
     * Register widget controls
     */
    protected function register_controls() {
        
        // Content Section
        $this->start_controls_section(
            'dw_gallery_section',
            [
                'label' => __('Gallery Source', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'meta_key',
            [
                'label' => __('Meta Field Key', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => 'dw_album_images',
                'description' => __('Enter the meta key containing comma-separated image IDs. Default: dw_album_images for Church Album', 'dasom-church'),
            ]
        );
        
        $this->add_control(
            'image_size',
            [
                'label' => __('Image Size', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'medium',
                'options' => [
                    'thumbnail' => __('Thumbnail (150x150)', 'dasom-church'),
                    'medium' => __('Medium (300x300)', 'dasom-church'),
                    'medium_large' => __('Medium Large (768x768)', 'dasom-church'),
                    'large' => __('Large (1024x1024)', 'dasom-church'),
                    'full' => __('Full (Original)', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_control(
            'layout_type',
            [
                'label' => __('Layout Type', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'grid',
                'options' => [
                    'grid' => __('Grid (Equal Heights)', 'dasom-church'),
                    'masonry' => __('Masonry (Pinterest Style)', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_responsive_control(
            'columns',
            [
                'label' => __('Columns', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 3,
                'tablet_default' => 2,
                'mobile_default' => 1,
                'min' => 1,
                'max' => 6,
                'description' => __('Number of columns per row', 'dasom-church'),
            ]
        );
        
        $this->add_responsive_control(
            'gap',
            [
                'label' => __('Gap (px)', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 10,
                'min' => 0,
                'max' => 50,
                'description' => __('Space between images', 'dasom-church'),
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section
        $this->start_controls_section(
            'dw_gallery_style_section',
            [
                'label' => __('Gallery Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'border_radius',
            [
                'label' => __('Border Radius (px)', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 8,
                'min' => 0,
                'max' => 50,
                'selectors' => [
                    '{{WRAPPER}} .dw-gallery-item img' => 'border-radius: {{VALUE}}px;',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'image_shadow',
                'label' => __('Image Shadow', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-gallery-item img',
            ]
        );
        
        $this->add_control(
            'hover_effect',
            [
                'label' => __('Hover Effect', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'zoom',
                'options' => [
                    'none' => __('None', 'dasom-church'),
                    'zoom' => __('Zoom In', 'dasom-church'),
                    'opacity' => __('Opacity', 'dasom-church'),
                ],
            ]
        );
        
        $this->end_controls_section();
    }
    
    /**
     * Render widget output on the frontend
     */
    protected function render() {
        global $post;
        
        if (!$post) {
            echo '<p>' . __('Please add this widget to a page or post.', 'dasom-church') . '</p>';
            return;
        }
        
        $settings = $this->get_settings_for_display();
        $meta_key = $settings['meta_key'];
        $raw = get_post_meta($post->ID, $meta_key, true);
        
        if (empty($raw)) {
            echo '<p>' . __('No images found in this album.', 'dasom-church') . '</p>';
            return;
        }
        
        // Parse image IDs
        $ids = array_filter(array_map('intval', explode(',', $raw)));
        if (empty($ids)) {
            echo '<p>' . __('No valid image IDs found.', 'dasom-church') . '</p>';
            return;
        }
        
        $size = $settings['image_size'] ?? 'medium';
        $layout = $settings['layout_type'] ?? 'grid';
        $columns = max(1, intval($settings['columns'] ?? 3));
        $gap = intval($settings['gap'] ?? 10);
        $border_radius = intval($settings['border_radius'] ?? 8);
        $hover_effect = $settings['hover_effect'] ?? 'zoom';
        
        $col_width = 100 / $columns;
        
        // Masonry Layout
        if ($layout === 'masonry') {
            wp_enqueue_script('jquery-masonry');
            wp_enqueue_script('imagesloaded');
            ?>
            <script>
            jQuery(document).ready(function($){
                $('.dw-masonry-grid-<?php echo $this->get_id(); ?>').imagesLoaded(function() {
                    $('.dw-masonry-grid-<?php echo $this->get_id(); ?>').masonry({
                        itemSelector: '.dw-gallery-item',
                        percentPosition: true,
                        columnWidth: '.dw-gallery-sizer',
                        gutter: <?php echo $gap; ?>
                    });
                });
            });
            </script>
            <?php
        }
        
        // Hover effect styles
        $hover_style = '';
        if ($hover_effect === 'zoom') {
            $hover_style = 'transform:scale(1.05);';
        } elseif ($hover_effect === 'opacity') {
            $hover_style = 'opacity:0.8;';
        }
        
        $grid_class = $layout === 'masonry' ? 'dw-masonry-grid dw-masonry-grid-' . $this->get_id() : 'dw-grid-layout';
        
        echo '<div class="dw-gallery-grid ' . esc_attr($grid_class) . '" style="display:flex;flex-wrap:wrap;gap:' . $gap . 'px;">';
        
        // Sizer for masonry
        if ($layout === 'masonry') {
            echo '<div class="dw-gallery-sizer" style="width:calc(' . $col_width . '% - ' . $gap . 'px);"></div>';
        }
        
        foreach ($ids as $img_id) {
            $url = wp_get_attachment_image_url($img_id, $size);
            $full = wp_get_attachment_image_url($img_id, 'full');
            $alt = get_post_meta($img_id, '_wp_attachment_image_alt', true);
            
            if ($url) {
                echo '<div class="dw-gallery-item" style="flex:0 0 calc(' . $col_width . '% - ' . $gap . 'px);box-sizing:border-box;">';
                echo '<a href="' . esc_url($full) . '" data-elementor-open-lightbox="yes" data-elementor-lightbox-slideshow="dw-gallery-' . $this->get_id() . '">';
                echo '<img src="' . esc_url($url) . '" alt="' . esc_attr($alt) . '" 
                    style="width:100%;height:auto;display:block;border-radius:' . $border_radius . 'px;box-shadow:0 2px 8px rgba(0,0,0,0.1);transition:all 0.3s ease;"
                    onmouseover="this.style.cssText+=\'' . $hover_style . '\'" 
                    onmouseout="this.style.transform=\'scale(1)\';this.style.opacity=\'1\';">';
                echo '</a>';
                echo '</div>';
            }
        }
        
        echo '</div>';
    }
    
    /**
     * Render widget output in the editor
     */
    protected function content_template() {
        ?>
        <# 
        var columns = settings.columns || 3;
        var gap = settings.gap || 10;
        var colWidth = 100 / columns;
        #>
        <div class="dw-gallery-grid" style="display:flex;flex-wrap:wrap;gap:{{{ gap }}}px;">
            <div class="dw-gallery-item" style="flex:0 0 calc({{{ colWidth }}}% - {{{ gap }}}px);">
                <div style="background:#f0f0f0;padding:40px;text-align:center;border-radius:8px;">
                    <i class="eicon-gallery-grid" style="font-size:48px;color:#888;"></i>
                    <p style="margin:10px 0 0 0;color:#666;">
                        <?php _e('Gallery Preview', 'dasom-church'); ?><br>
                        <small><?php _e('Images will appear here on the frontend', 'dasom-church'); ?></small>
                    </p>
                </div>
            </div>
        </div>
        <?php
    }
}

