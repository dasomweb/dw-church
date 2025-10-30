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
        
        // Add modern lightbox navigation styles and scripts
        ?>
        <style>
        /* Modern Lightbox Navigation */
        .dw-lightbox-nav {
            position: absolute !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            z-index: 9999 !important;
            width: 60px !important;
            height: 60px !important;
            background: rgba(255, 255, 255, 0.9) !important;
            border: none !important;
            border-radius: 50% !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: all 0.3s ease !important;
            backdrop-filter: blur(10px) !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
            font-size: 24px !important;
            font-weight: bold !important;
            color: #333 !important;
        }
        
        .dw-lightbox-nav:hover {
            background: rgba(255, 255, 255, 1) !important;
            transform: translateY(-50%) scale(1.1) !important;
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2) !important;
        }
        
        .dw-lightbox-nav--prev {
            left: 30px !important;
        }
        
        .dw-lightbox-nav--next {
            right: 30px !important;
        }
        
        /* Hide navigation on mobile */
        @media (max-width: 768px) {
            .dw-lightbox-nav {
                display: none !important;
            }
        }
        
        /* Lightbox counter */
        .dw-lightbox-counter {
            position: absolute !important;
            bottom: 30px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: rgba(0, 0, 0, 0.7) !important;
            color: white !important;
            padding: 8px 16px !important;
            border-radius: 20px !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            z-index: 9999 !important;
            backdrop-filter: blur(10px) !important;
        }
        </style>
        
        <script>
        (function($) {
            $(document).ready(function() {
                // Multiple ways to detect lightbox opening
                $(document).on('elementor/popup/show', function(e, popup) {
                    setTimeout(function() {
                        addLightboxNavigation();
                    }, 200);
                });
                
                // Also listen for lightbox events
                $(document).on('elementor/frontend/lightbox/show', function() {
                    setTimeout(function() {
                        addLightboxNavigation();
                    }, 200);
                });
                
                // Check periodically for lightbox
                setInterval(function() {
                    addLightboxNavigation();
                }, 1000);
                
                function addLightboxNavigation() {
                    // Check for different lightbox types
                    var $lightbox = $('.elementor-lightbox-slideshow, .elementor-lightbox, .swiper-container');
                    if (!$lightbox.length) return;
                    
                    // Find the actual lightbox container
                    var $container = null;
                    if ($lightbox.hasClass('swiper-container')) {
                        $container = $lightbox;
                    } else {
                        $container = $lightbox.find('.elementor-lightbox-slideshow__container, .elementor-lightbox__container, .swiper-container');
                        if (!$container.length) {
                            $container = $lightbox;
                        }
                    }
                    
                    if ($container.find('.dw-lightbox-nav').length) {
                        return; // Already has navigation
                    }
                    
                    console.log('DW Gallery: Adding navigation to container', $container);
                    
                    // Add navigation buttons
                    var $prevBtn = $('<button class="dw-lightbox-nav dw-lightbox-nav--prev" aria-label="Previous image">‹</button>');
                    var $nextBtn = $('<button class="dw-lightbox-nav dw-lightbox-nav--next" aria-label="Next image">›</button>');
                    var $counter = $('<div class="dw-lightbox-counter"></div>');
                    
                    $container.append($prevBtn);
                    $container.append($nextBtn);
                    $container.append($counter);
                    
                    // Navigation click handlers
                    $prevBtn.on('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Try Swiper first
                        if ($container[0] && $container[0].swiper) {
                            $container[0].swiper.slidePrev();
                        } else if (window.Swiper && $container.find('.swiper-container')[0] && $container.find('.swiper-container')[0].swiper) {
                            $container.find('.swiper-container')[0].swiper.slidePrev();
                        } else {
                            // Try Elementor methods
                            if (window.elementorFrontend && window.elementorFrontend.lightbox) {
                                var lightbox = window.elementorFrontend.lightbox;
                                if (lightbox.previous) {
                                    lightbox.previous();
                                }
                            }
                            
                            // Alternative method
                            var $prevLink = $lightbox.find('.elementor-lightbox-slideshow__prev, .elementor-lightbox__prev, .swiper-button-prev');
                            if ($prevLink.length) {
                                $prevLink[0].click();
                            }
                        }
                        
                        setTimeout(updateCounter, 100);
                    });
                    
                    $nextBtn.on('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Try Swiper first
                        if ($container[0] && $container[0].swiper) {
                            $container[0].swiper.slideNext();
                        } else if (window.Swiper && $container.find('.swiper-container')[0] && $container.find('.swiper-container')[0].swiper) {
                            $container.find('.swiper-container')[0].swiper.slideNext();
                        } else {
                            // Try Elementor methods
                            if (window.elementorFrontend && window.elementorFrontend.lightbox) {
                                var lightbox = window.elementorFrontend.lightbox;
                                if (lightbox.next) {
                                    lightbox.next();
                                }
                            }
                            
                            // Alternative method
                            var $nextLink = $lightbox.find('.elementor-lightbox-slideshow__next, .elementor-lightbox__next, .swiper-button-next');
                            if ($nextLink.length) {
                                $nextLink[0].click();
                            }
                        }
                        
                        setTimeout(updateCounter, 100);
                    });
                    
                    updateCounter();
                }
                
                function updateCounter() {
                    var $lightbox = $('.elementor-lightbox-slideshow, .elementor-lightbox, .swiper-container');
                    if (!$lightbox.length) return;
                    
                    var $counter = $lightbox.find('.dw-lightbox-counter');
                    if (!$counter.length) return;
                    
                    var current = 1;
                    var total = 1;
                    
                    // Try Swiper first
                    if ($lightbox[0] && $lightbox[0].swiper) {
                        var swiper = $lightbox[0].swiper;
                        current = swiper.activeIndex + 1;
                        total = swiper.slides.length;
                    } else if (window.Swiper && $lightbox.find('.swiper-container')[0] && $lightbox.find('.swiper-container')[0].swiper) {
                        var swiper = $lightbox.find('.swiper-container')[0].swiper;
                        current = swiper.activeIndex + 1;
                        total = swiper.slides.length;
                    } else {
                        // Try Elementor methods
                        var $currentSlide = $lightbox.find('.elementor-lightbox-slideshow__slide--active, .elementor-lightbox__slide--active, .swiper-slide-active');
                        if ($currentSlide.length) {
                            current = $currentSlide.index() + 1;
                        }
                        
                        var $allSlides = $lightbox.find('.elementor-lightbox-slideshow__slide, .elementor-lightbox__slide, .swiper-slide');
                        if ($allSlides.length) {
                            total = $allSlides.length;
                        }
                    }
                    
                    $counter.text(current + ' / ' + total);
                }
            });
        })(jQuery);
        </script>
        <?php
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

