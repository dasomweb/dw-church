<?php
/**
 * DW Elementor Recent Gallery Widget
 *
 * @package Dasom_Church
 * @since 1.24.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Recent_Gallery_Widget extends \Elementor\Widget_Base {
    
    public function get_name() {
        return 'dw_recent_gallery';
    }
    
    public function get_title() {
        return __('DW Recent Gallery', 'dasom-church');
    }
    
    public function get_icon() {
        return 'eicon-gallery-grid';
    }
    
    public function get_categories() {
        return ['general'];
    }
    
    public function get_keywords() {
        return ['gallery', 'album', 'church', 'photo', 'dw', '갤러리', '앨범'];
    }
    
    protected function register_controls() {
        
        $this->start_controls_section(
            'content_section',
            [
                'label' => __('Settings', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        // Get album categories
        $album_categories = get_terms(array(
            'taxonomy' => 'album_category',
            'hide_empty' => false,
        ));
        
        $category_options = array('' => __('All Albums', 'dasom-church'));
        if (!is_wp_error($album_categories)) {
            foreach ($album_categories as $cat) {
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
        
        // Get albums for manual selection (cached)
        $album_options = dasom_church_get_post_options('album');
        
        $this->add_control(
            'manual_selection',
            [
                'label' => __('Select Albums', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT2,
                'multiple' => true,
                'options' => $album_options,
                'label_block' => true,
                'condition' => [
                    'query_source' => 'manual',
                ],
                'description' => __('Select specific albums to display.', 'dasom-church'),
            ]
        );
        
        $this->add_control(
            'album_category',
            [
                'label' => __('Album Category', 'dasom-church'),
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
                'label' => __('Number of Albums', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 6,
                'min' => 1,
                'max' => 50,
                'condition' => [
                    'query_source' => 'latest',
                ],
            ]
        );
        
        $this->add_control(
            'layout',
            [
                'label' => __('Layout', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'grid',
                'options' => [
                    'grid' => __('Grid', 'dasom-church'),
                    'list' => __('List', 'dasom-church'),
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
                'condition' => [
                    'layout' => 'grid',
                ],
            ]
        );
        
        $this->add_control(
            'show_thumbnail',
            [
                'label' => __('Show Thumbnail', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'thumbnail_size',
            [
                'label' => __('썸네일 크기', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'medium',
                'options' => [
                    'thumbnail' => __('Thumbnail (150x150)', 'dasom-church'),
                    'medium' => __('Medium (300x300)', 'dasom-church'),
                    'medium_large' => __('Medium Large (768x768)', 'dasom-church'),
                    'large' => __('Large (1024x1024)', 'dasom-church'),
                    'full' => __('Full (원본)', 'dasom-church'),
                ],
                'condition' => [
                    'show_thumbnail' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'image_ratio',
            [
                'label' => __('이미지 비율', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => '3-2',
                'options' => [
                    '1-1' => __('1:1 (정사각형)', 'dasom-church'),
                    '4-3' => __('4:3 (표준)', 'dasom-church'),
                    '3-2' => __('3:2 (클래식)', 'dasom-church'),
                    '16-9' => __('16:9 (와이드)', 'dasom-church'),
                    '21-9' => __('21:9 (시네마)', 'dasom-church'),
                    'custom' => __('Custom (직접 설정)', 'dasom-church'),
                ],
                'condition' => [
                    'show_thumbnail' => 'yes',
                    'layout' => 'grid',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'image_height',
            [
                'label' => __('이미지 높이', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', '%', 'vh'],
                'range' => [
                    'px' => [
                        'min' => 100,
                        'max' => 800,
                        'step' => 10,
                    ],
                    '%' => [
                        'min' => 30,
                        'max' => 200,
                        'step' => 5,
                    ],
                    'vh' => [
                        'min' => 10,
                        'max' => 100,
                        'step' => 1,
                    ],
                ],
                'default' => [
                    'unit' => '%',
                    'size' => 66.67,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-gallery-thumbnail' => 'padding-top: {{SIZE}}{{UNIT}};',
                ],
                'condition' => [
                    'show_thumbnail' => 'yes',
                    'layout' => 'grid',
                    'image_ratio' => 'custom',
                ],
            ]
        );
        
        $this->add_control(
            'image_fit',
            [
                'label' => __('이미지 맞춤', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'cover',
                'options' => [
                    'cover' => __('Cover (꽉 채움)', 'dasom-church'),
                    'contain' => __('Contain (전체 보기)', 'dasom-church'),
                    'fill' => __('Fill (늘림)', 'dasom-church'),
                    'none' => __('None (원본)', 'dasom-church'),
                    'scale-down' => __('Scale Down (축소)', 'dasom-church'),
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-gallery-image' => 'object-fit: {{VALUE}};',
                ],
                'condition' => [
                    'show_thumbnail' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'image_position',
            [
                'label' => __('이미지 위치', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'center center',
                'options' => [
                    'center center' => __('Center Center', 'dasom-church'),
                    'center top' => __('Center Top', 'dasom-church'),
                    'center bottom' => __('Center Bottom', 'dasom-church'),
                    'left center' => __('Left Center', 'dasom-church'),
                    'left top' => __('Left Top', 'dasom-church'),
                    'left bottom' => __('Left Bottom', 'dasom-church'),
                    'right center' => __('Right Center', 'dasom-church'),
                    'right top' => __('Right Top', 'dasom-church'),
                    'right bottom' => __('Right Bottom', 'dasom-church'),
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-gallery-image' => 'object-position: {{VALUE}};',
                ],
                'condition' => [
                    'show_thumbnail' => 'yes',
                    'image_fit!' => 'fill',
                ],
            ]
        );
        
        $this->add_control(
            'show_date',
            [
                'label' => __('날짜 표시', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'enable_pagination',
            [
                'label' => __('Enable Pagination', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'no',
            ]
        );
        
        $this->end_controls_section();
        
        // Style Tab - Image Style
        $this->start_controls_section(
            'style_image_section',
            [
                'label' => __('Image Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'show_thumbnail' => 'yes',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'image_border_radius',
            [
                'label' => __('Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%'],
                'selectors' => [
                    '{{WRAPPER}} .dw-gallery-thumbnail' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}; overflow: hidden;',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'image_box_shadow',
                'label' => __('Box Shadow', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-gallery-thumbnail',
            ]
        );
        
        $this->add_control(
            'image_hover_effect',
            [
                'label' => __('Hover Effect', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'zoom',
                'options' => [
                    'none' => __('None', 'dasom-church'),
                    'zoom' => __('Zoom In', 'dasom-church'),
                    'zoom-out' => __('Zoom Out', 'dasom-church'),
                    'brightness' => __('Brightness', 'dasom-church'),
                    'grayscale' => __('Grayscale to Color', 'dasom-church'),
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Tab - Card Style
        $this->start_controls_section(
            'style_card_section',
            [
                'label' => __('Card Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_responsive_control(
            'card_padding',
            [
                'label' => __('Padding', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'selectors' => [
                    '{{WRAPPER}} .dw-gallery-card' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'card_margin',
            [
                'label' => __('Margin', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'selectors' => [
                    '{{WRAPPER}} .dw-gallery-card' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'card_bg_color',
            [
                'label' => __('Background Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-gallery-card' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Border::get_type(),
            [
                'name' => 'card_border',
                'label' => __('Border', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-gallery-card',
            ]
        );
        
        $this->add_responsive_control(
            'card_border_radius',
            [
                'label' => __('Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%'],
                'selectors' => [
                    '{{WRAPPER}} .dw-gallery-card' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                    '{{WRAPPER}} .dw-gallery-card img' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} 0 0;',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'card_box_shadow',
                'label' => __('Box Shadow', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-gallery-card',
            ]
        );
        
        $this->end_controls_section();
        
        // Style Tab - Title
        $this->start_controls_section(
            'style_title_section',
            [
                'label' => __('Title', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'title_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-gallery-title',
            ]
        );
        
        $this->add_control(
            'title_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#333333',
                'selectors' => [
                    '{{WRAPPER}} .dw-gallery-title' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'title_hover_color',
            [
                'label' => __('Hover Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#0073aa',
                'selectors' => [
                    '{{WRAPPER}} .dw-gallery-title:hover' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'title_spacing',
            [
                'label' => __('Spacing', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 50,
                    ],
                ],
                'default' => [
                    'size' => 10,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-gallery-title' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Tab - Date
        $this->start_controls_section(
            'style_date_section',
            [
                'label' => __('Date', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'date_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-gallery-date',
            ]
        );
        
        $this->add_control(
            'date_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#666666',
                'selectors' => [
                    '{{WRAPPER}} .dw-gallery-date' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Tab - Pagination Style
        $this->start_controls_section(
            'pagination_style_section',
            [
                'label' => __('Pagination Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'enable_pagination' => 'yes',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'pagination_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-pagination a, {{WRAPPER}} .dw-pagination span',
            ]
        );
        
        $this->add_responsive_control(
            'pagination_spacing',
            [
                'label' => __('Spacing', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'size' => 30,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-pagination' => 'margin-top: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'pagination_color',
            [
                'label' => __('Text Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#333333',
                'selectors' => [
                    '{{WRAPPER}} .dw-pagination a' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'pagination_bg_color',
            [
                'label' => __('Background Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-pagination a' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'pagination_border_color',
            [
                'label' => __('Border Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#e0e0e0',
                'selectors' => [
                    '{{WRAPPER}} .dw-pagination a' => 'border-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'pagination_active_color',
            [
                'label' => __('Active Text Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-pagination .current' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'pagination_active_bg_color',
            [
                'label' => __('Active Background Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#000000',
                'selectors' => [
                    '{{WRAPPER}} .dw-pagination .current' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_section();
    }
    
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        $enable_pagination = $settings['enable_pagination'] ?? 'no';
        $paged = (get_query_var('paged')) ? get_query_var('paged') : 1;
        $query_source = $settings['query_source'] ?? 'latest';
        
        $args = array(
            'post_type' => 'album',
            'post_status' => 'publish',
        );
        
        // Query Source: Manual Selection
        if ($query_source === 'manual') {
            $manual_selection = $settings['manual_selection'] ?? array();
            if (!empty($manual_selection) && is_array($manual_selection)) {
                $args['post__in'] = $manual_selection;
                $args['orderby'] = 'post__in';
                $args['posts_per_page'] = -1; // Show all selected albums
            } else {
                echo '<p>' . __('No albums selected.', 'dasom-church') . '</p>';
                return;
            }
        } else {
            // Query Source: Latest Posts
            $args['posts_per_page'] = $settings['posts_per_page'] ?? 6;
            $args['orderby'] = 'date';
            $args['order'] = 'DESC';
            
            // Album Category filter
            if (!empty($settings['album_category'])) {
                $args['tax_query'] = array(
                    array(
                        'taxonomy' => 'album_category',
                        'field' => 'slug',
                        'terms' => $settings['album_category'],
                    ),
                );
            }
            
            // Add pagination if enabled
            if ($enable_pagination === 'yes') {
                $args['paged'] = $paged;
            }
        }
        
        $query = new WP_Query($args);
        
        if (!$query->have_posts()) {
            echo '<p>' . __('No albums found.', 'dasom-church') . '</p>';
            return;
        }
        
        $layout = $settings['layout'];
        $columns = $settings['columns'] ?? 3;
        $columns_tablet = $settings['columns_tablet'] ?? 2;
        $columns_mobile = $settings['columns_mobile'] ?? 1;
        $hover_effect = $settings['image_hover_effect'] ?? 'zoom';
        $image_ratio = $settings['image_ratio'] ?? '3-2';
        
        // Calculate padding-top based on ratio
        $ratio_map = array(
            '1-1' => '100',      // 1:1
            '4-3' => '75',       // 4:3
            '3-2' => '66.67',    // 3:2
            '16-9' => '56.25',   // 16:9
            '21-9' => '42.86',   // 21:9
        );
        
        $ratio_padding = isset($ratio_map[$image_ratio]) ? $ratio_map[$image_ratio] : '66.67';
        
        ?>
        <div class="dw-gallery-widget dw-gallery-<?php echo esc_attr($layout); ?> dw-hover-<?php echo esc_attr($hover_effect); ?>">
            <?php if ($layout === 'grid'): ?>
                <style>
                    .dw-gallery-grid {
                        display: grid;
                        grid-template-columns: repeat(<?php echo esc_attr($columns); ?>, 1fr);
                        gap: 20px;
                    }
                    @media (max-width: 1024px) {
                        .dw-gallery-grid {
                            grid-template-columns: repeat(<?php echo esc_attr($columns_tablet); ?>, 1fr);
                        }
                    }
                    @media (max-width: 767px) {
                        .dw-gallery-grid {
                            grid-template-columns: repeat(<?php echo esc_attr($columns_mobile); ?>, 1fr);
                        }
                    }
                </style>
            <?php endif; ?>
            
            <?php if ($layout === 'grid' && $image_ratio !== 'custom'): ?>
                <style>
                    .dw-gallery-widget .dw-gallery-thumbnail {
                        padding-top: <?php echo esc_attr($ratio_padding); ?>% !important;
                    }
                </style>
            <?php endif; ?>
            
            <?php while ($query->have_posts()): $query->the_post(); ?>
                <div class="dw-gallery-card">
                    <a href="<?php the_permalink(); ?>" class="dw-gallery-link">
                        
                        <?php if ($settings['show_thumbnail'] === 'yes' && has_post_thumbnail()): ?>
                            <div class="dw-gallery-thumbnail">
                                <?php the_post_thumbnail($settings['thumbnail_size'], ['class' => 'dw-gallery-image']); ?>
                            </div>
                        <?php endif; ?>
                        
                        <div class="dw-gallery-content">
                            <?php if ($settings['show_date'] === 'yes'): ?>
                                <div class="dw-gallery-date">
                                    <?php echo get_the_date(); ?>
                                </div>
                            <?php endif; ?>
                            
                            <h3 class="dw-gallery-title">
                                <?php the_title(); ?>
                            </h3>
                        </div>
                    </a>
                </div>
            <?php endwhile; ?>
            <?php wp_reset_postdata(); ?>
        </div>
        
        <style>
            .dw-gallery-widget {
                width: 100%;
            }
            .dw-gallery-card {
                overflow: hidden;
                transition: all 0.3s ease;
            }
            .dw-gallery-card:hover {
                transform: translateY(-5px);
            }
            .dw-gallery-link {
                display: block;
                text-decoration: none;
                color: inherit;
            }
            .dw-gallery-thumbnail {
                width: 100% !important;
                overflow: hidden !important;
                position: relative !important;
                padding-top: 66.67%; /* 3:2 aspect ratio */
            }
            .dw-gallery-image {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                object-position: center center !important;
                transition: all 0.3s ease;
            }
            /* Hover Effects */
            .dw-hover-zoom .dw-gallery-card:hover .dw-gallery-image {
                transform: scale(1.1);
            }
            .dw-hover-zoom-out .dw-gallery-image {
                transform: scale(1.1);
            }
            .dw-hover-zoom-out .dw-gallery-card:hover .dw-gallery-image {
                transform: scale(1);
            }
            .dw-hover-brightness .dw-gallery-card:hover .dw-gallery-image {
                filter: brightness(1.2);
            }
            .dw-hover-grayscale .dw-gallery-image {
                filter: grayscale(100%);
            }
            .dw-hover-grayscale .dw-gallery-card:hover .dw-gallery-image {
                filter: grayscale(0%);
            }
            .dw-gallery-content {
                padding: 15px;
            }
            .dw-gallery-date {
                font-size: 0.875em;
                margin-bottom: 8px;
            }
            .dw-gallery-title {
                margin: 0;
                font-weight: 600;
                transition: color 0.3s ease;
            }
            .dw-gallery-list .dw-gallery-card {
                margin-bottom: 20px;
            }
            .dw-gallery-list .dw-gallery-link {
                display: flex;
                gap: 20px;
            }
            .dw-gallery-list .dw-gallery-thumbnail {
                flex-shrink: 0;
                width: 200px;
                padding-top: 0;
                height: 150px;
            }
            .dw-gallery-list .dw-gallery-image {
                position: static;
                width: 100%;
                height: 100%;
            }
            .dw-gallery-list .dw-gallery-content {
                flex: 1;
                padding: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
        </style>
        <?php
        
        // Display pagination if enabled
        if ($enable_pagination === 'yes') {
            $this->render_pagination($query);
        }
    }
    
    /**
     * Render pagination HTML
     */
    private function render_pagination($query) {
        if ($query->max_num_pages <= 1) {
            return;
        }
        
        $paged = max(1, get_query_var('paged'));
        $max_pages = $query->max_num_pages;
        
        echo '<div class="dw-pagination">';
        
        // First page (text only)
        if ($paged > 1) {
            echo '<a href="' . esc_url(get_pagenum_link(1)) . '" class="dw-pagination-text">처음</a>';
        }
        
        // Previous page (circular button)
        if ($paged > 1) {
            echo '<a href="' . esc_url(get_pagenum_link($paged - 1)) . '" class="dw-pagination-link dw-pagination-prev">‹</a>';
        }
        
        // Page numbers (circular buttons)
        $range = 2;
        for ($i = 1; $i <= $max_pages; $i++) {
            if ($i == 1 || $i == $max_pages || ($i >= $paged - $range && $i <= $paged + $range)) {
                if ($i == $paged) {
                    echo '<span class="dw-pagination-link current">' . $i . '</span>';
                } else {
                    echo '<a href="' . esc_url(get_pagenum_link($i)) . '" class="dw-pagination-link">' . $i . '</a>';
                }
            } elseif ($i == $paged - $range - 1 || $i == $paged + $range + 1) {
                echo '<span class="dw-pagination-dots">...</span>';
            }
        }
        
        // Next page (circular button)
        if ($paged < $max_pages) {
            echo '<a href="' . esc_url(get_pagenum_link($paged + 1)) . '" class="dw-pagination-link dw-pagination-next">›</a>';
        }
        
        // Last page (text only)
        if ($paged < $max_pages) {
            echo '<a href="' . esc_url(get_pagenum_link($max_pages)) . '" class="dw-pagination-text">마지막</a>';
        }
        
        echo '</div>';
        
        // Pagination CSS
        ?>
        <style>
            .dw-pagination {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                flex-wrap: wrap;
            }
            .dw-pagination-text {
                display: inline-flex;
                align-items: center;
                padding: 0 8px;
                text-decoration: none;
                font-size: 14px;
                color: #666;
                transition: color 0.3s ease;
            }
            .dw-pagination-text:hover {
                color: #000;
            }
            .dw-pagination-link {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 32px;
                height: 32px;
                padding: 0;
                border: 1px solid #e0e0e0;
                border-radius: 50%;
                text-decoration: none;
                font-size: 13px;
                background-color: #f5f5f5;
                transition: all 0.3s ease;
            }
            .dw-pagination-link:hover {
                background-color: #e0e0e0;
            }
            .dw-pagination-link.current {
                background-color: #000000;
                border-color: transparent;
            }
            .dw-pagination-link.dw-pagination-prev,
            .dw-pagination-link.dw-pagination-next {
                font-size: 16px;
            }
            .dw-pagination-dots {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 32px;
                height: 32px;
                color: #999;
            }
            
            /* Ensure no content escapes the widget boundaries */
            .elementor-widget-dw_recent_gallery {
                overflow: hidden !important;
                position: relative !important;
                z-index: 1 !important;
                isolation: isolate !important;
                contain: layout style paint !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            /* Prevent any child elements from overflowing */
            .elementor-widget-dw_recent_gallery * {
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* Force containment for gallery widget container */
            .elementor-widget-dw_recent_gallery .dw-gallery-widget {
                contain: layout style paint !important;
                isolation: isolate !important;
                overflow: hidden !important;
                width: 100% !important;
                max-width: 100% !important;
            }
            
            /* Ensure gallery grid doesn't overflow */
            .elementor-widget-dw_recent_gallery .dw-gallery-grid {
                width: 100% !important;
                max-width: 100% !important;
                contain: layout style paint !important;
                overflow: hidden !important;
            }
            
            /* Ensure gallery cards don't overflow */
            .elementor-widget-dw_recent_gallery .dw-gallery-card {
                contain: layout style paint !important;
                isolation: isolate !important;
                overflow: hidden !important;
                max-width: 100% !important;
            }
        </style>
        <?php
    }
}

