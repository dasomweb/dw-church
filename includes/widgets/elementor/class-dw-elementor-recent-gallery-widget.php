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
        
        $this->add_control(
            'posts_per_page',
            [
                'label' => __('Number of Albums', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 6,
                'min' => 1,
                'max' => 50,
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
    }
    
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        $args = array(
            'post_type' => 'album',
            'posts_per_page' => $settings['posts_per_page'],
            'post_status' => 'publish',
            'orderby' => 'date',
            'order' => 'DESC',
        );
        
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
    }
}

