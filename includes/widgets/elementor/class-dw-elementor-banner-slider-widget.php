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
            'banner_category',
            [
                'label' => __('Banner Category', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => $category_options,
                'default' => '',
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
        
        // Style Tab - Button Settings
        $this->start_controls_section(
            'style_button_section',
            [
                'label' => __('Button', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'button_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-banner-button',
            ]
        );
        
        $this->start_controls_tabs('button_styles');
        
        $this->start_controls_tab(
            'button_normal',
            [
                'label' => __('Normal', 'dasom-church'),
            ]
        );
        
        $this->add_control(
            'button_text_color',
            [
                'label' => __('Text Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-button' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_bg_color',
            [
                'label' => __('Background Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#2271b1',
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-button' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_tab();
        
        $this->start_controls_tab(
            'button_hover',
            [
                'label' => __('Hover', 'dasom-church'),
            ]
        );
        
        $this->add_control(
            'button_hover_text_color',
            [
                'label' => __('Text Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-button:hover' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_hover_bg_color',
            [
                'label' => __('Background Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#135e96',
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-button:hover' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_tab();
        
        $this->end_controls_tabs();
        
        $this->add_responsive_control(
            'button_padding',
            [
                'label' => __('Padding', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'separator' => 'before',
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-button' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_border_radius',
            [
                'label' => __('Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', '%'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 50,
                    ],
                ],
                'default' => [
                    'size' => 4,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-button' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'button_box_shadow',
                'label' => __('Box Shadow', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-banner-button',
            ]
        );
        
        $this->end_controls_section();
    }
    
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        $current_time = current_time('mysql');
        
        $args = array(
            'post_type' => 'banner',
            'posts_per_page' => $settings['posts_per_page'] ?? 5,
            'post_status' => 'publish',
            'orderby' => 'date',
            'order' => 'DESC',
            'meta_query' => array(
                'relation' => 'AND',
                array(
                    'relation' => 'OR',
                    array(
                        'key' => 'dw_banner_start_date',
                        'value' => $current_time,
                        'compare' => '<=',
                        'type' => 'DATETIME',
                    ),
                    array(
                        'key' => 'dw_banner_start_date',
                        'compare' => 'NOT EXISTS',
                    ),
                ),
                array(
                    'relation' => 'OR',
                    array(
                        'key' => 'dw_banner_end_date',
                        'value' => $current_time,
                        'compare' => '>',
                        'type' => 'DATETIME',
                    ),
                    array(
                        'key' => 'dw_banner_end_date',
                        'compare' => 'NOT EXISTS',
                    ),
                ),
            ),
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
        
        $banners = new WP_Query($args);
        
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
            
            // Get display type
            $display_type = get_post_meta(get_the_ID(), 'dw_banner_display_type', true);
            $display_type = $display_type ? $display_type : 'image_only';
            
            // Get appropriate image based on category
            $image_url = '';
            if ($category === '메인 배너' || $category === 'Main Banner') {
                $pc_image = get_post_meta(get_the_ID(), 'dw_banner_pc_image', true);
                $image_url = $pc_image ? wp_get_attachment_url($pc_image) : '';
            } else {
                $sub_image = get_post_meta(get_the_ID(), 'dw_banner_sub_image', true);
                $image_url = $sub_image ? wp_get_attachment_url($sub_image) : '';
            }
            
            $link_url = get_post_meta(get_the_ID(), 'dw_banner_link_url', true);
            $link_target = get_post_meta(get_the_ID(), 'dw_banner_link_target', true);
            $link_target = $link_target === '_blank' ? '_blank' : '_self';
            
            echo '<div class="swiper-slide dw-banner-slide-' . esc_attr($display_type) . '">';
            
            if ($display_type === 'image_only') {
                // Image only mode: image with link
                if ($link_url) {
                    echo '<a href="' . esc_url($link_url) . '" target="' . esc_attr($link_target) . '" style="display:block;">';
                }
                
                if ($image_url) {
                    echo '<img src="' . esc_url($image_url) . '" alt="' . esc_attr(get_the_title()) . '" style="width:100%;height:auto;display:block;">';
                }
                
                if ($link_url) {
                    echo '</a>';
                }
            } else {
                // Image with text mode: background image + text overlay + button
                $bg_image_id = get_post_meta(get_the_ID(), 'dw_banner_bg_image', true);
                $bg_image_url = $bg_image_id ? wp_get_attachment_url($bg_image_id) : $image_url;
                
                $text_title = get_post_meta(get_the_ID(), 'dw_banner_text_title', true);
                $text_subtitle = get_post_meta(get_the_ID(), 'dw_banner_text_subtitle', true);
                $text_description = get_post_meta(get_the_ID(), 'dw_banner_text_description', true);
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
                $button_text = get_post_meta(get_the_ID(), 'dw_banner_button_text', true);
                
                // Convert position to CSS classes
                list($v_align, $h_align) = explode('-', $text_position);
                
                $v_align_style = $v_align === 'top' ? 'flex-start' : ($v_align === 'bottom' ? 'flex-end' : 'center');
                $h_align_style = $h_align === 'left' ? 'flex-start' : ($h_align === 'right' ? 'flex-end' : 'center');
                
                echo '<div class="dw-banner-with-text dw-banner-align-' . esc_attr($text_position) . '" style="position:relative;width:100%;background-image:url(' . esc_url($bg_image_url) . ');background-size:cover;background-position:center;min-height:500px;display:flex;align-items:' . esc_attr($v_align_style) . ';justify-content:' . esc_attr($h_align_style) . ';">';
                
                echo '<div class="dw-banner-text-content" style="padding:' . esc_attr($padding_top) . 'px ' . esc_attr($padding_right) . 'px ' . esc_attr($padding_bottom) . 'px ' . esc_attr($padding_left) . 'px;max-width:600px;text-align:' . esc_attr($text_align) . ';position:relative;z-index:2;">';
                
                if ($text_subtitle) {
                    echo '<div class="dw-banner-subtitle">' . esc_html($text_subtitle) . '</div>';
                }
                
                if ($text_title) {
                    echo '<h2 class="dw-banner-title">' . esc_html($text_title) . '</h2>';
                }
                
                if ($text_description) {
                    echo '<div class="dw-banner-description">' . esc_html($text_description) . '</div>';
                }
                
                if ($button_text && $link_url) {
                    echo '<a href="' . esc_url($link_url) . '" target="' . esc_attr($link_target) . '" class="dw-banner-button">' . esc_html($button_text) . '</a>';
                }
                
                echo '</div>'; // text-content
                echo '</div>'; // banner-with-text
            }
            
            echo '</div>'; // swiper-slide
        }
        
        echo '</div>'; // swiper-wrapper
        
        if ($navigation) {
            echo '<div class="swiper-button-next"></div>';
            echo '<div class="swiper-button-prev"></div>';
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

