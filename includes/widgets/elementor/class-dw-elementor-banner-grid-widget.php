<?php
/**
 * DW Banner Grid Widget for Elementor
 * 
 * Displays sub banners in a grid layout
 *
 * @package DasomChurch
 * @since 1.18.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Banner_Grid_Widget extends \Elementor\Widget_Base {
    
    public function get_name() {
        return 'dw_banner_grid';
    }
    
    public function get_title() {
        return __('DW Banner Grid', 'dasom-church');
    }
    
    public function get_icon() {
        return 'eicon-gallery-grid';
    }
    
    public function get_categories() {
        return ['general'];
    }
    
    public function get_keywords() {
        return ['banner', 'grid', 'sub banner', 'dasom', 'church'];
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
        // Content Tab - Query Settings
        $this->start_controls_section(
            'query_section',
            [
                'label' => __('Query Settings', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
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
                'default' => 6,
                'min' => 1,
                'max' => 100,
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
        
        $this->end_controls_section();
        
        // Content Tab - Layout Settings
        $this->start_controls_section(
            'layout_section',
            [
                'label' => __('Layout Settings', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_responsive_control(
            'columns',
            [
                'label' => __('Columns', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => '3',
                'tablet_default' => '2',
                'mobile_default' => '1',
                'options' => [
                    '1' => '1',
                    '2' => '2',
                    '3' => '3',
                    '4' => '4',
                    '5' => '5',
                    '6' => '6',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-grid' => 'grid-template-columns: repeat({{VALUE}}, 1fr);',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'column_gap',
            [
                'label' => __('Column Gap', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', 'em'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'size' => 20,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-grid' => 'column-gap: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'row_gap',
            [
                'label' => __('Row Gap', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', 'em'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'size' => 20,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-grid' => 'row-gap: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Tab - Card Style
        $this->start_controls_section(
            'card_style_section',
            [
                'label' => __('Card Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'card_border_radius',
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
                    'size' => 8,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-grid-item' => 'border-radius: {{SIZE}}{{UNIT}};',
                    '{{WRAPPER}} .dw-banner-grid-item img' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'card_box_shadow',
                'label' => __('Box Shadow', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-banner-grid-item',
            ]
        );
        
        $this->start_controls_tabs('card_hover_tabs');
        
        $this->start_controls_tab(
            'card_normal',
            [
                'label' => __('Normal', 'dasom-church'),
            ]
        );
        
        $this->add_control(
            'card_opacity',
            [
                'label' => __('Opacity', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 1,
                        'step' => 0.1,
                    ],
                ],
                'default' => [
                    'size' => 1,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-grid-item' => 'opacity: {{SIZE}};',
                ],
            ]
        );
        
        $this->end_controls_tab();
        
        $this->start_controls_tab(
            'card_hover',
            [
                'label' => __('Hover', 'dasom-church'),
            ]
        );
        
        $this->add_control(
            'card_hover_opacity',
            [
                'label' => __('Opacity', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 1,
                        'step' => 0.1,
                    ],
                ],
                'default' => [
                    'size' => 0.8,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-grid-item:hover' => 'opacity: {{SIZE}};',
                ],
            ]
        );
        
        $this->add_control(
            'card_hover_transform',
            [
                'label' => __('Scale on Hover', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'range' => [
                    'px' => [
                        'min' => 0.8,
                        'max' => 1.2,
                        'step' => 0.01,
                    ],
                ],
                'default' => [
                    'size' => 1.05,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-banner-grid-item:hover img' => 'transform: scale({{SIZE}});',
                ],
            ]
        );
        
        $this->end_controls_tab();
        
        $this->end_controls_tabs();
        
        $this->end_controls_section();
    }
    
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        // Get current time for date filtering
        $current_time = current_time('Y-m-d H:i:s');
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
                'post_status' => 'publish',
                'posts_per_page' => $settings['posts_per_page'] ?? 6,
                'order' => $settings['order'] ?? 'DESC',
                'orderby' => $settings['orderby'] ?? 'date',
            );
            
            // Filter by category if selected
            if (!empty($settings['banner_category'])) {
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
        
        echo '<div class="dw-banner-grid-wrapper">';
        echo '<div class="dw-banner-grid">';
        
        while ($banners->have_posts()) {
            $banners->the_post();
            
            // Get appropriate image based on category
            $terms = wp_get_post_terms(get_the_ID(), 'banner_category');
            $category = !empty($terms) && !is_wp_error($terms) ? $terms[0]->name : '';
            
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
            
            // Get text overlay fields
            $text_title = get_post_meta(get_the_ID(), 'dw_banner_text_title', true);
            $text_subtitle = get_post_meta(get_the_ID(), 'dw_banner_text_subtitle', true);
            $text_description = get_post_meta(get_the_ID(), 'dw_banner_text_description', true);
            
            // Get background position (responsive)
            $bg_position_pc = get_post_meta(get_the_ID(), 'dw_banner_bg_position_pc', true);
            $bg_position_pc = $bg_position_pc ? $bg_position_pc : 'center center';
            $bg_position_laptop = get_post_meta(get_the_ID(), 'dw_banner_bg_position_laptop', true);
            $bg_position_laptop = $bg_position_laptop ? $bg_position_laptop : 'center center';
            $bg_position_tablet = get_post_meta(get_the_ID(), 'dw_banner_bg_position_tablet', true);
            $bg_position_tablet = $bg_position_tablet ? $bg_position_tablet : 'center center';
            $bg_position_mobile = get_post_meta(get_the_ID(), 'dw_banner_bg_position_mobile', true);
            $bg_position_mobile = $bg_position_mobile ? $bg_position_mobile : 'center center';
            
            $banner_grid_id = 'dw-banner-grid-' . get_the_ID();
            
            // Generate responsive CSS for background position and image - Elementor breakpoints
            echo '<style>';
            // Background image - PC image by default (for main banner)
            if ($image_url && ($category === '메인 배너' || $category === 'Main Banner')) {
                echo '.' . $banner_grid_id . ' { background-image: url(' . esc_url($image_url) . '); background-position: ' . esc_attr($bg_position_pc) . '; }';
            }
            // Sub banner image - display on tablet (768px-1024px) as main banner
            if ($image_url && ($category === '서브 배너' || $category === 'Sub Banner')) {
                echo '@media (min-width: 768px) and (max-width: 1024px) { .' . $banner_grid_id . ' { background-image: url(' . esc_url($image_url) . ') !important; background-position: ' . esc_attr($bg_position_tablet) . '; } }';
            }
            // Background position responsive - Elementor breakpoints (only for main banner)
            if ($category === '메인 배너' || $category === 'Main Banner') {
                // Desktop: 1367px+ (default, already set above)
                // Laptop: 1025px-1366px (Elementor Laptop breakpoint)
                echo '@media (min-width: 1025px) and (max-width: 1366px) { .' . $banner_grid_id . ' { background-position: ' . esc_attr($bg_position_laptop) . '; } }';
                // Tablet: max-width: 1024px (Elementor Tablet breakpoint)
                echo '@media (max-width: 1024px) { .' . $banner_grid_id . ' { background-position: ' . esc_attr($bg_position_tablet) . '; } }';
                // Mobile: max-width: 767px (Elementor Mobile breakpoint)
                echo '@media (max-width: 767px) { .' . $banner_grid_id . ' { background-position: ' . esc_attr($bg_position_mobile) . '; } }';
            }
            echo '</style>';
            
            echo '<div class="dw-banner-grid-item">';
            
            if ($link_url) {
                echo '<a href="' . esc_url($link_url) . '" target="' . esc_attr($link_target) . '" class="dw-banner-grid-link">';
            }
            
            if ($image_url) {
                echo '<div class="dw-banner-grid-image ' . esc_attr($banner_grid_id) . '" style="position:relative;background-image:url(' . esc_url($image_url) . ');background-size:cover;min-height:300px;width:100%;">';
                
                // Text overlay if exists
                if (!empty($text_title) || !empty($text_subtitle) || !empty($text_description)) {
                    $text_position = get_post_meta(get_the_ID(), 'dw_banner_text_position', true);
                    $text_position = $text_position ? $text_position : 'center-center';
                    $text_align = get_post_meta(get_the_ID(), 'dw_banner_text_align', true);
                    $text_align = $text_align ? $text_align : 'center';
                    $text_width = get_post_meta(get_the_ID(), 'dw_banner_text_width', true);
                    $text_width = $text_width ? $text_width : '600';
                    
                    list($v_align, $h_align) = explode('-', $text_position);
                    $v_align_style = $v_align === 'top' ? 'flex-start' : ($v_align === 'bottom' ? 'flex-end' : 'center');
                    
                    // Calculate margin based on horizontal alignment (center-based positioning)
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
                    
                    echo '<div class="dw-banner-grid-text" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:' . esc_attr($v_align_style) . ';padding:20px;">';
                    echo '<div class="dw-banner-grid-text-content" style="width:100%;max-width:' . esc_attr($text_width) . 'px;' . $container_margin . 'text-align:' . esc_attr($text_alignment) . ';">';
                    
                    if ($text_subtitle) {
                        echo '<div class="dw-banner-grid-subtitle">' . esc_html($text_subtitle) . '</div>';
                    }
                    if ($text_title) {
                        echo '<h3 class="dw-banner-grid-title">' . esc_html($text_title) . '</h3>';
                    }
                    if ($text_description) {
                        echo '<div class="dw-banner-grid-description">' . esc_html($text_description) . '</div>';
                    }
                    
                    echo '</div>';
                    echo '</div>';
                }
                
                echo '</div>';
            }
            
            if ($link_url) {
                echo '</a>';
            }
            
            echo '</div>';
        }
        
        echo '</div>'; // .dw-banner-grid
        echo '</div>'; // .dw-banner-grid-wrapper
        
        wp_reset_postdata();
        
        // Add inline CSS
        ?>
        <style>
            .dw-banner-grid {
                display: grid;
                width: 100%;
            }
            .dw-banner-grid-item {
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            .dw-banner-grid-link {
                display: block;
                text-decoration: none;
                color: inherit;
            }
            .dw-banner-grid-image {
                position: relative;
                width: 100%;
                overflow: hidden;
            }
            .dw-banner-grid-image img {
                width: 100%;
                height: auto;
                display: block;
                transition: transform 0.3s ease;
            }
            .dw-banner-grid-text {
                color: #ffffff;
                text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            .dw-banner-grid-subtitle {
                font-size: 0.9em;
                margin-bottom: 5px;
                opacity: 0.9;
            }
            .dw-banner-grid-title {
                font-size: 1.4em;
                font-weight: 700;
                margin: 0 0 8px 0;
                line-height: 1.3;
            }
            .dw-banner-grid-description {
                font-size: 0.95em;
                opacity: 0.95;
                line-height: 1.5;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .dw-banner-grid-title {
                    font-size: 1.2em;
                }
                .dw-banner-grid-subtitle,
                .dw-banner-grid-description {
                    font-size: 0.85em;
                }
            }
        </style>
        <?php
    }
}

