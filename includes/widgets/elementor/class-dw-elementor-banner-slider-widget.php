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
            
            echo '<div class="swiper-slide">';
            
            if ($link_url) {
                echo '<a href="' . esc_url($link_url) . '" target="' . esc_attr($link_target) . '" style="display:block;">';
            }
            
            if ($image_url) {
                echo '<img src="' . esc_url($image_url) . '" alt="' . esc_attr(get_the_title()) . '" style="width:100%;height:auto;display:block;">';
            }
            
            if ($link_url) {
                echo '</a>';
            }
            
            echo '</div>';
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
        <?php
        
        wp_reset_postdata();
    }
}

