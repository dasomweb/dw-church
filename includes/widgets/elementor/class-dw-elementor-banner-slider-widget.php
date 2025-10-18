<?php
/**
 * DW Elementor Banner Slider Widget
 *
 * @package Dasom_Church
 * @since 1.10.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Banner_Slider_Widget extends \Elementor\Widget_Base {
    
    public function get_name() {
        return 'dw_banner_slider';
    }
    
    public function get_title() {
        return __('DW Banner Slider', 'dasom-church');
    }
    
    public function get_icon() {
        return 'eicon-slider-push';
    }
    
    public function get_categories() {
        return ['general'];
    }
    
    public function get_keywords() {
        return ['banner', 'slider', 'carousel', 'church', 'dw', '배너', '슬라이더'];
    }
    
    /**
     * Helper function to get taxonomy options
     */
    private function get_taxonomy_options($taxonomy) {
        $options = array('' => __('All', 'dasom-church'));
        $terms = get_terms(array(
            'taxonomy' => $taxonomy,
            'hide_empty' => false,
        ));
        if (!is_wp_error($terms)) {
            foreach ($terms as $term) {
                $options[$term->slug] = $term->name;
            }
        }
        return $options;
    }
    
    protected function register_controls() {
        
        $this->start_controls_section(
            'content_section',
            [
                'label' => __('Settings', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        // Get banner categories
        $categories = get_terms(array(
            'taxonomy' => 'banner_category',
            'hide_empty' => false,
        ));
        
        $category_options = array('' => __('All Banners', 'dasom-church'));
        if (!is_wp_error($categories)) {
            foreach ($categories as $cat) {
                $category_options[$cat->slug] = $cat->name;
            }
        }
        
        $this->add_control(
            'query_source',
            [
                'label' => __('Query Source', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'latest',
                'options' => [
                    'latest' => __('Latest Posts', 'dasom-church'),
                    'manual' => __('Manual Selection', 'dasom-church'),
                ],
            ]
        );
        
        // Get all banners for manual selection
        $banner_options = array();
        $all_banners = get_posts(array(
            'post_type' => 'banner',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'orderby' => 'title',
            'order' => 'ASC',
        ));
        foreach ($all_banners as $banner) {
            $banner_options[$banner->ID] = $banner->post_title;
        }
        
        $this->add_control(
            'manual_selection',
            [
                'label' => __('Select Banners', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT2,
                'multiple' => true,
                'options' => $banner_options,
                'label_block' => true,
                'condition' => [
                    'query_source' => 'manual',
                ],
                'description' => __('Select specific banners to display.', 'dasom-church'),
            ]
        );
        
        $this->add_control(
            'banner_category',
            [
                'label' => __('Banner Category', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => $category_options,
                'default' => '',
                'condition' => [
                    'query_source' => 'latest',
                ],
            ]
        );
        
        $this->add_control(
            'posts_per_page',
            [
                'label' => __('Number of Banners', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 5,
                'min' => 1,
                'max' => 20,
                'condition' => [
                    'query_source' => 'latest',
                ],
            ]
        );
        
        $this->add_control(
            'order',
            [
                'label' => __('Order', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'DESC',
                'options' => [
                    'ASC' => __('Ascending', 'dasom-church'),
                    'DESC' => __('Descending', 'dasom-church'),
                ],
                'condition' => [
                    'query_source' => 'latest',
                ],
            ]
        );
        
        $this->add_control(
            'orderby',
            [
                'label' => __('Order By', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'date',
                'options' => [
                    'date' => __('Date', 'dasom-church'),
                    'title' => __('Title', 'dasom-church'),
                    'rand' => __('Random', 'dasom-church'),
                    'menu_order' => __('Menu Order', 'dasom-church'),
                ],
                'condition' => [
                    'query_source' => 'latest',
                ],
            ]
        );
        
        $this->add_control(
            'autoplay',
            [
                'label' => __('Autoplay', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'autoplay_speed',
            [
                'label' => __('Autoplay Speed (ms)', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 5000,
                'condition' => [
                    'autoplay' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'navigation',
            [
                'label' => __('Show Navigation', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'pagination',
            [
                'label' => __('Show Pagination', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_responsive_control(
            'slider_height',
            [
                'label' => __('Slider Height', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', 'vh', '%'],
                'range' => [
                    'px' => [
                        'min' => 200,
                        'max' => 1000,
                        'step' => 10,
                    ],
                    'vh' => [
                        'min' => 10,
                        'max' => 100,
                        'step' => 1,
                    ],
                    '%' => [
                        'min' => 10,
                        'max' => 100,
                        'step' => 1,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 500,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-bg' => 'min-height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Tab - Text Overlay Settings
        $this->start_controls_section(
            'style_text_section',
            [
                'label' => __('Text Overlay', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'text_overlay_bg',
            [
                'label' => __('Overlay Background', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => 'rgba(0,0,0,0.3)',
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-with-text::before' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'title_heading',
            [
                'label' => __('Title', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'title_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-banner-title',
            ]
        );
        
        $this->add_control(
            'title_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-title' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'subtitle_heading',
            [
                'label' => __('Subtitle', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'subtitle_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-banner-subtitle',
            ]
        );
        
        $this->add_control(
            'subtitle_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-subtitle' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'description_heading',
            [
                'label' => __('Description', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'description_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-banner-description',
            ]
        );
        
        $this->add_control(
            'description_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-description' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_section();
    }
    
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        $current_time = current_time('mysql');
        $query_source = $settings['query_source'] ?? 'latest';
        
        // Build query args based on source
        if ($query_source === 'manual' && !empty($settings['manual_selection'])) {
            // Manual selection
            $args = array(
                'post_type' => 'banner',
                'post__in' => $settings['manual_selection'],
                'post_status' => 'publish',
                'orderby' => 'post__in',
            );
        } else {
            // Latest posts
            $args = array(
                'post_type' => 'banner',
                'posts_per_page' => $settings['posts_per_page'] ?? 5,
                'post_status' => 'publish',
                'orderby' => $settings['orderby'] ?? 'date',
                'order' => $settings['order'] ?? 'DESC',
            );
            
            // Filter by category if selected
            if (!empty($settings['banner_category'] ?? '')) {
                $args['tax_query'] = array(
                    array(
                        'taxonomy' => 'banner_category',
                        'field' => 'slug',
                        'terms' => $settings['banner_category'],
                    ),
                );
            }
        }
        
        $banners = new WP_Query($args);
        
        // Date filtering: Filter results after query
        if ($banners->have_posts()) {
            $filtered_posts = array();
            while ($banners->have_posts()) {
                $banners->the_post();
                $banner_id = get_the_ID();
                
                $start_date = get_post_meta($banner_id, 'dw_banner_start_date', true);
                $end_date = get_post_meta($banner_id, 'dw_banner_end_date', true);
                
                // Check if banner should be displayed
                $show_banner = true;
                
                if (!empty($start_date) && strtotime($start_date) > strtotime($current_time)) {
                    $show_banner = false; // Not started yet
                }
                if (!empty($end_date) && strtotime($end_date) <= strtotime($current_time)) {
                    $show_banner = false; // Already ended
                }
                
                if ($show_banner) {
                    $filtered_posts[] = get_post();
                }
            }
            wp_reset_postdata();
            
            // Replace posts with filtered ones
            $banners->posts = $filtered_posts;
            $banners->post_count = count($filtered_posts);
        }
        
        if (!$banners->have_posts()) {
            echo '<p>' . __('No banners found.', 'dasom-church') . '</p>';
            return;
        }
        
        $slider_id = 'dw-banner-slider-' . $this->get_id();
        $autoplay = ($settings['autoplay'] ?? 'yes') === 'yes' ? 'true' : 'false';
        $autoplay_speed = $settings['autoplay_speed'] ?? 5000;
        $navigation = ($settings['navigation'] ?? 'yes') === 'yes';
        $pagination = ($settings['pagination'] ?? 'yes') === 'yes';
        
        // Enqueue Swiper
        wp_enqueue_style('swiper', 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css', array(), '11.0.0');
        wp_enqueue_script('swiper', 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js', array(), '11.0.0', true);
        
        echo '<div class="dw-banner-slider-wrapper">';
        echo '<div class="swiper ' . esc_attr($slider_id) . '" style="width:100%;height:auto;">';
        echo '<div class="swiper-wrapper">';
        
        while ($banners->have_posts()) {
            $banners->the_post();
            
            // Get banner category
            $terms = wp_get_post_terms(get_the_ID(), 'banner_category');
            $category = !empty($terms) && !is_wp_error($terms) ? $terms[0]->name : '';
            
            // Get appropriate image based on category
            $image_url = '';
            if ($category === '메인 배너' || $category === 'Main Banner') {
                $pc_image = get_post_meta(get_the_ID(), 'dw_banner_pc_image', true);
                $image_url = $pc_image ? wp_get_attachment_url($pc_image) : '';
            } else {
                $sub_image = get_post_meta(get_the_ID(), 'dw_banner_sub_image', true);
                $image_url = $sub_image ? wp_get_attachment_url($sub_image) : '';
            }
            
            // Get link info
            $link_url = get_post_meta(get_the_ID(), 'dw_banner_link_url', true);
            $link_target = get_post_meta(get_the_ID(), 'dw_banner_link_target', true);
            $link_target = $link_target === '_blank' ? '_blank' : '_self';
            
            // Get text overlay fields
            $text_title = get_post_meta(get_the_ID(), 'dw_banner_text_title', true);
            $text_subtitle = get_post_meta(get_the_ID(), 'dw_banner_text_subtitle', true);
            $text_description = get_post_meta(get_the_ID(), 'dw_banner_text_description', true);
            
            // Check if any text content exists
            $has_text = !empty($text_title) || !empty($text_subtitle) || !empty($text_description);
            
            // Always get background position settings (needed for all banners)
            $bg_position_pc = get_post_meta(get_the_ID(), 'dw_banner_bg_position_pc', true);
            $bg_position_pc = $bg_position_pc ? $bg_position_pc : 'center center';
            $bg_position_laptop = get_post_meta(get_the_ID(), 'dw_banner_bg_position_laptop', true);
            $bg_position_laptop = $bg_position_laptop ? $bg_position_laptop : 'center center';
            $bg_position_tablet = get_post_meta(get_the_ID(), 'dw_banner_bg_position_tablet', true);
            $bg_position_tablet = $bg_position_tablet ? $bg_position_tablet : 'center center';
            $bg_position_mobile = get_post_meta(get_the_ID(), 'dw_banner_bg_position_mobile', true);
            $bg_position_mobile = $bg_position_mobile ? $bg_position_mobile : 'center center';
            
            $banner_id = 'dw-banner-' . get_the_ID();
            
            echo '<div class="swiper-slide dw-banner-slide' . ($has_text ? ' dw-banner-with-text' : '') . '">';
            
            // Wrap entire slide in link if URL exists
            if ($link_url) {
                echo '<a href="' . esc_url($link_url) . '" target="' . esc_attr($link_target) . '" class="dw-banner-link" style="display:block;position:relative;text-decoration:none;color:inherit;">';
            }
            
            // Generate responsive CSS for background position (for all banners)
            echo '<style>';
            echo '.' . $banner_id . ' { background-position: ' . esc_attr($bg_position_pc) . '; }';
            echo '@media (max-width: 1919px) { .' . $banner_id . ' { background-position: ' . esc_attr($bg_position_laptop) . '; } }';
            echo '@media (max-width: 1023px) { .' . $banner_id . ' { background-position: ' . esc_attr($bg_position_tablet) . '; } }';
            echo '@media (max-width: 767px) { .' . $banner_id . ' { background-position: ' . esc_attr($bg_position_mobile) . '; } }';
            
            if ($has_text) {
                // Banner with text overlay - also need text width responsive CSS
                $text_width_pc = get_post_meta(get_the_ID(), 'dw_banner_text_width_pc', true);
                $text_width_pc = $text_width_pc ? $text_width_pc : '600';
                $text_width_laptop = get_post_meta(get_the_ID(), 'dw_banner_text_width_laptop', true);
                $text_width_laptop = $text_width_laptop ? $text_width_laptop : '600';
                $text_width_tablet = get_post_meta(get_the_ID(), 'dw_banner_text_width_tablet', true);
                $text_width_tablet = $text_width_tablet ? $text_width_tablet : '500';
                $text_width_mobile = get_post_meta(get_the_ID(), 'dw_banner_text_width_mobile', true);
                $text_width_mobile = $text_width_mobile ? $text_width_mobile : '300';
                
                $text_content_id = 'dw-banner-text-' . get_the_ID();
                
                echo '.' . $text_content_id . ' { max-width: ' . esc_attr($text_width_pc) . 'px; }';
                echo '@media (max-width: 1919px) { .' . $text_content_id . ' { max-width: ' . esc_attr($text_width_laptop) . 'px; } }';
                echo '@media (max-width: 1023px) { .' . $text_content_id . ' { max-width: ' . esc_attr($text_width_tablet) . 'px; } }';
                echo '@media (max-width: 767px) { .' . $text_content_id . ' { max-width: ' . esc_attr($text_width_mobile) . 'px; } }';
            }
            
            echo '</style>';
            
            // Always use background image
            if ($image_url) {
                if ($has_text) {
                    // Get text settings
                    $text_position = get_post_meta(get_the_ID(), 'dw_banner_text_position', true);
                    $text_position = $text_position ? $text_position : 'center-center';
                    $text_align = get_post_meta(get_the_ID(), 'dw_banner_text_align', true);
                    $text_align = $text_align ? $text_align : 'center';
                    $padding_top = get_post_meta(get_the_ID(), 'dw_banner_content_padding_top', true);
                    $padding_top = $padding_top ? $padding_top : '40';
                    $padding_right = get_post_meta(get_the_ID(), 'dw_banner_content_padding_right', true);
                    $padding_right = $padding_right ? $padding_right : '40';
                    $padding_bottom = get_post_meta(get_the_ID(), 'dw_banner_content_padding_bottom', true);
                    $padding_bottom = $padding_bottom ? $padding_bottom : '40';
                    $padding_left = get_post_meta(get_the_ID(), 'dw_banner_content_padding_left', true);
                    $padding_left = $padding_left ? $padding_left : '40';
                    
                    // Convert position to flexbox alignment
                    list($v_align, $h_align) = explode('-', $text_position);
                    $v_align_style = $v_align === 'top' ? 'flex-start' : ($v_align === 'bottom' ? 'flex-end' : 'center');
                    
                    // Calculate margin based on horizontal alignment
                    $container_margin = '';
                    $text_alignment = $text_align;
                    
                    if ($h_align === 'left') {
                        $container_margin = 'margin-right:auto;';
                        $text_alignment = 'left';
                    } elseif ($h_align === 'right') {
                        $container_margin = 'margin-left:auto;';
                        $text_alignment = 'right';
                    } else {
                        $container_margin = 'margin-left:auto;margin-right:auto;';
                        $text_alignment = 'center';
                    }
                    
                    // Background with text overlay
                    echo '<div class="dw-banner-bg ' . esc_attr($banner_id) . '" style="position:relative;width:100%;background-image:url(' . esc_url($image_url) . ');background-size:cover;display:flex;align-items:' . esc_attr($v_align_style) . ';">';
                    
                    echo '<div class="dw-banner-text-content ' . esc_attr($text_content_id) . '" style="padding:' . esc_attr($padding_top) . 'px ' . esc_attr($padding_right) . 'px ' . esc_attr($padding_bottom) . 'px ' . esc_attr($padding_left) . 'px;width:100%;' . $container_margin . 'text-align:' . esc_attr($text_alignment) . ';position:relative;z-index:2;">';
                    
                    if ($text_subtitle) {
                        echo '<div class="dw-banner-subtitle">' . esc_html($text_subtitle) . '</div>';
                    }
                    if ($text_title) {
                        echo '<h2 class="dw-banner-title">' . esc_html($text_title) . '</h2>';
                    }
                    if ($text_description) {
                        echo '<div class="dw-banner-description">' . esc_html($text_description) . '</div>';
                    }
                    
                    echo '</div>'; // text-content
                    echo '</div>'; // banner-bg
                } else {
                    // Background image only (no text overlay)
                    echo '<div class="dw-banner-bg ' . esc_attr($banner_id) . '" style="position:relative;width:100%;background-image:url(' . esc_url($image_url) . ');background-size:cover;"></div>';
                }
            }
            
            if ($link_url) {
                echo '</a>'; // banner-link
            }
            
            echo '</div>'; // swiper-slide
        }
        
        echo '</div>'; // swiper-wrapper
        
        if ($navigation) {
            echo '<div class="swiper-button-next dw-modern-nav"></div>';
            echo '<div class="swiper-button-prev dw-modern-nav"></div>';
        }
        
        if ($pagination) {
            echo '<div class="swiper-pagination"></div>';
        }
        
        echo '</div>'; // swiper
        echo '</div>'; // wrapper
        
        ?>
        <script>
        (function($) {
            $(document).ready(function() {
                new Swiper('.<?php echo esc_js($slider_id); ?>', {
                    loop: true,
                    autoplay: <?php echo $autoplay === 'true' ? '{delay: ' . $autoplay_speed . ', disableOnInteraction: false}' : 'false'; ?>,
                    <?php if ($navigation): ?>
                    navigation: {
                        nextEl: '.<?php echo esc_js($slider_id); ?> .swiper-button-next',
                        prevEl: '.<?php echo esc_js($slider_id); ?> .swiper-button-prev',
                    },
                    <?php endif; ?>
                    <?php if ($pagination): ?>
                    pagination: {
                        el: '.<?php echo esc_js($slider_id); ?> .swiper-pagination',
                        clickable: true,
                    },
                    <?php endif; ?>
                });
            });
        })(jQuery);
        </script>
        <style>
        .dw-banner-with-text {
            position: relative;
        }
        .dw-banner-with-text::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0,0,0,0.3);
            z-index: 1;
        }
        .dw-banner-subtitle {
            font-size: 18px;
            margin-bottom: 10px;
            color: #fff;
        }
        .dw-banner-title {
            font-size: 42px;
            font-weight: bold;
            margin: 0 0 15px 0;
            color: #fff;
            line-height: 1.2;
        }
        .dw-banner-description {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 20px;
            color: #fff;
        }
        .dw-banner-button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #2271b1;
            color: #fff;
            text-decoration: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s;
        }
        .dw-banner-button:hover {
            background-color: #135e96;
            transform: translateY(-2px);
        }
        @media (max-width: 768px) {
            .dw-banner-with-text {
                min-height: 350px !important;
            }
            .dw-banner-title {
                font-size: 28px !important;
            }
            .dw-banner-subtitle {
                font-size: 14px !important;
            }
            .dw-banner-description {
                font-size: 14px !important;
            }
            .dw-banner-text-content {
                padding: 20px !important;
            }
        }
        </style>
        <?php
        
        wp_reset_postdata();
    }
}

