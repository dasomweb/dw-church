<?php
/**
 * DW Single Sermon Widget for Elementor
 *
 * @package Dasom_Church
 * @since 1.12.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Single_Sermon_Widget extends \Elementor\Widget_Base {

    public function get_name() {
        return 'dw_single_sermon';
    }

    public function get_title() {
        return __('DW Sermon', 'dasom-church');
    }

    public function get_icon() {
        return 'eicon-youtube';
    }

    public function get_categories() {
        return ['general'];
    }

    protected function register_controls() {
        
        // Content Section
        $this->start_controls_section(
            'content_section',
            [
                'label' => __('설교 선택', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'widget_layout',
            [
                'label' => __('위젯 레이아웃', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'classic',
                'options' => [
                    'classic' => __('Classic (제목 → 메타 → 비디오)', 'dasom-church'),
                    'video_first' => __('Video First (비디오 → 메타/제목)', 'dasom-church'),
                ],
                'description' => __('위젯의 전체 레이아웃을 선택하세요.', 'dasom-church'),
            ]
        );
        
        $this->add_control(
            'query_source',
            [
                'label' => __('Query Source', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'latest',
                'options' => [
                    'current' => __('Current Post (현재 포스트)', 'dasom-church'),
                    'latest' => __('Latest Post (최신 설교)', 'dasom-church'),
                    'manual' => __('Manual Selection (수동 선택)', 'dasom-church'),
                ],
                'description' => __('설교 데이터를 불러올 소스를 선택하세요.', 'dasom-church'),
            ]
        );
        
        // Get sermon categories
        $categories = get_terms(array(
            'taxonomy' => 'sermon_category',
            'hide_empty' => false,
        ));
        
        $category_options = array();
        if (!is_wp_error($categories)) {
            foreach ($categories as $cat) {
                $category_options[$cat->term_id] = $cat->name;
            }
        }
        
        $this->add_control(
            'sermon_categories',
            [
                'label' => __('Sermon Categories', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT2,
                'multiple' => true,
                'options' => $category_options,
                'label_block' => true,
                'condition' => [
                    'query_source' => 'latest',
                ],
                'description' => __('카테고리를 선택하면 해당 카테고리의 최신 설교를 표시합니다. 비워두면 모든 카테고리에서 최신 설교를 표시합니다.', 'dasom-church'),
            ]
        );
        
        // Get sermons for dropdown (cached)
        $sermon_options = dasom_church_get_post_options('sermon');
        
        $this->add_control(
            'sermon_id',
            [
                'label' => __('설교 선택', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => $sermon_options,
                'condition' => [
                    'query_source' => 'manual',
                ],
                'description' => __('표시할 설교를 선택하세요.', 'dasom-church'),
            ]
        );
        
        $this->add_control(
            'fallback_to_latest',
            [
                'label' => __('Fallback to Latest', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
                'condition' => [
                    'query_source' => 'current',
                ],
                'description' => __('현재 포스트가 설교가 아닐 경우 최신 설교를 표시합니다.', 'dasom-church'),
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
            'show_scripture',
            [
                'label' => __('성경구절 표시', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_preacher',
            [
                'label' => __('설교자 표시', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_video',
            [
                'label' => __('비디오 표시', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'video_aspect_ratio',
            [
                'label' => __('비디오 비율', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => '16-9',
                'options' => [
                    '16-9' => '16:9',
                    '4-3' => '4:3',
                    '21-9' => '21:9',
                ],
                'condition' => [
                    'show_video' => 'yes',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section - Title
        $this->start_controls_section(
            'style_title',
            [
                'label' => __('제목 스타일', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'title_alignment',
            [
                'label' => __('정렬', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::CHOOSE,
                'options' => [
                    'left' => [
                        'title' => __('Left', 'dasom-church'),
                        'icon' => 'eicon-text-align-left',
                    ],
                    'center' => [
                        'title' => __('Center', 'dasom-church'),
                        'icon' => 'eicon-text-align-center',
                    ],
                    'right' => [
                        'title' => __('Right', 'dasom-church'),
                        'icon' => 'eicon-text-align-right',
                    ],
                ],
                'default' => 'center',
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-title' => 'text-align: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'title_typography',
                'label' => __('타이포그래피', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-single-sermon-title',
            ]
        );
        
        $this->add_control(
            'title_color',
            [
                'label' => __('색상', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#333',
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-title' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'title_spacing',
            [
                'label' => __('하단 간격', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'size' => 20,
                ],
                'tablet_default' => [
                    'size' => 20,
                ],
                'mobile_default' => [
                    'size' => 8,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-title' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'title_padding',
            [
                'label' => __('패딩', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'default' => [
                    'top' => '0',
                    'right' => '0',
                    'bottom' => '0',
                    'left' => '0',
                    'unit' => 'px',
                ],
                'mobile_default' => [
                    'top' => '0',
                    'right' => '0',
                    'bottom' => '0',
                    'left' => '0',
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-title' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}} !important;',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section - Meta
        $this->start_controls_section(
            'style_meta',
            [
                'label' => __('메타 정보 스타일', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'meta_layout',
            [
                'label' => __('레이아웃', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'inline',
                'options' => [
                    'inline' => __('Inline (한 줄)', 'dasom-church'),
                    'stack' => __('Stack (세로 정렬)', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_responsive_control(
            'meta_alignment',
            [
                'label' => __('정렬', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::CHOOSE,
                'options' => [
                    'left' => [
                        'title' => __('Left', 'dasom-church'),
                        'icon' => 'eicon-text-align-left',
                    ],
                    'center' => [
                        'title' => __('Center', 'dasom-church'),
                        'icon' => 'eicon-text-align-center',
                    ],
                    'right' => [
                        'title' => __('Right', 'dasom-church'),
                        'icon' => 'eicon-text-align-right',
                    ],
                ],
                'default' => 'center',
                'mobile_default' => 'right',
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-meta' => 'text-align: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'meta_item_spacing',
            [
                'label' => __('항목 간격', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 30,
                    ],
                ],
                'default' => [
                    'size' => 8,
                ],
                'condition' => [
                    'meta_layout' => 'stack',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-meta.meta-stack .meta-item:not(:last-child)' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'meta_typography',
                'label' => __('타이포그래피', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-single-sermon-meta span, {{WRAPPER}} .dw-single-sermon-meta .meta-separator',
            ]
        );
        
        $this->add_control(
            'meta_color',
            [
                'label' => __('색상', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#666',
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-meta span' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'meta_separator',
            [
                'label' => __('구분자', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => '||',
            ]
        );
        
        $this->add_control(
            'separator_size',
            [
                'label' => __('구분자 크기', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', 'em', 'rem'],
                'range' => [
                    'px' => [
                        'min' => 8,
                        'max' => 48,
                    ],
                    'em' => [
                        'min' => 0.5,
                        'max' => 3,
                        'step' => 0.1,
                    ],
                    'rem' => [
                        'min' => 0.5,
                        'max' => 3,
                        'step' => 0.1,
                    ],
                ],
                'default' => [
                    'size' => 16,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-meta .meta-separator' => 'font-size: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'separator_color',
            [
                'label' => __('구분자 색상', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#999',
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-meta .meta-separator' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'separator_spacing',
            [
                'label' => __('구분자 좌우 간격', 'dasom-church'),
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
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-meta .meta-separator' => 'margin: 0 {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'separator_opacity',
            [
                'label' => __('구분자 투명도', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 1,
                        'step' => 0.1,
                    ],
                ],
                'default' => [
                    'size' => 0.5,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-meta .meta-separator' => 'opacity: {{SIZE}};',
                ],
            ]
        );
        
        $this->add_control(
            'separator_valign',
            [
                'label' => __('구분자 수직 정렬', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'middle',
                'options' => [
                    'top' => __('Top (상단)', 'dasom-church'),
                    'middle' => __('Middle (중간)', 'dasom-church'),
                    'bottom' => __('Bottom (하단)', 'dasom-church'),
                    'baseline' => __('Baseline (기준선)', 'dasom-church'),
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-meta span' => 'vertical-align: {{VALUE}};',
                    '{{WRAPPER}} .dw-single-sermon-meta .meta-separator' => 'vertical-align: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'meta_spacing',
            [
                'label' => __('하단 간격', 'dasom-church'),
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
                ],
                'tablet_default' => [
                    'size' => 30,
                ],
                'mobile_default' => [
                    'size' => 15,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-meta' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'meta_padding',
            [
                'label' => __('패딩', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'default' => [
                    'top' => '0',
                    'right' => '0',
                    'bottom' => '0',
                    'left' => '0',
                    'unit' => 'px',
                ],
                'mobile_default' => [
                    'top' => '0',
                    'right' => '0',
                    'bottom' => '0',
                    'left' => '0',
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-meta' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section - Video
        $this->start_controls_section(
            'style_video',
            [
                'label' => __('비디오 스타일', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'video_border_radius',
            [
                'label' => __('모서리 둥글기', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 50,
                    ],
                ],
                'default' => [
                    'size' => 0,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-single-sermon-video iframe' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'video_box_shadow',
                'label' => __('그림자', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-single-sermon-video iframe',
            ]
        );
        
        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        
        $sermon_id = null;
        $query_source = $settings['query_source'] ?? 'latest';
        
        // Query Source: Current Post
        if ($query_source === 'current') {
            global $post;
            
            // Check if we're in a sermon post
            if ($post && get_post_type($post->ID) === 'sermon') {
                $sermon_id = $post->ID;
            } 
            // Fallback to latest if enabled
            else if (($settings['fallback_to_latest'] ?? 'yes') === 'yes') {
                $query_source = 'latest'; // Fall through to latest logic
            } else {
                echo '<div class="dw-sermon-notice" style="padding:20px;background:#f0f0f0;border-left:4px solid #2271b1;color:#333;">';
                echo '<p style="margin:0;">' . __('⚠️ 현재 페이지는 설교 포스트가 아닙니다. 설교 상세 페이지에서 이 위젯을 사용하세요.', 'dasom-church') . '</p>';
                echo '</div>';
                return;
            }
        }
        
        // Query Source: Manual Selection
        if ($query_source === 'manual' && !empty($settings['sermon_id'])) {
            $sermon_id = intval($settings['sermon_id']);
        }
        
        // Query Source: Latest Post (or fallback)
        if ($query_source === 'latest' || !$sermon_id) {
            $latest_args = [
                'post_type' => 'sermon',
                'posts_per_page' => 1,
                'post_status' => 'publish',
                'orderby' => 'date',
                'order' => 'DESC',
            ];
            
            // Add category filter if selected
            if (!empty($settings['sermon_categories']) && is_array($settings['sermon_categories'])) {
                $latest_args['tax_query'] = array(
                    array(
                        'taxonomy' => 'sermon_category',
                        'field' => 'term_id',
                        'terms' => $settings['sermon_categories'],
                    ),
                );
            }
            
            $latest_sermon = new \WP_Query($latest_args);
            
            if (!$latest_sermon->have_posts()) {
                echo '<div class="dw-sermon-notice" style="padding:20px;background:#fff3cd;border-left:4px solid #ffc107;color:#856404;">';
                echo '<p style="margin:0;">' . __('⚠️ 설교가 없습니다.', 'dasom-church') . '</p>';
                echo '</div>';
                return;
            }
            
            $latest_sermon->the_post();
            $sermon_id = get_the_ID();
            wp_reset_postdata();
        }
        
        // Validate sermon_id
        if (!$sermon_id || get_post_type($sermon_id) !== 'sermon') {
            echo '<div class="dw-sermon-notice" style="padding:20px;background:#f8d7da;border-left:4px solid #dc3545;color:#721c24;">';
            echo '<p style="margin:0;">' . __('⚠️ 유효한 설교를 찾을 수 없습니다.', 'dasom-church') . '</p>';
            echo '</div>';
            return;
        }
        
        // Get sermon data
        $title = get_the_title($sermon_id);
        $sermon_date = get_post_meta($sermon_id, 'dw_sermon_date', true);
        $scripture = get_post_meta($sermon_id, 'dw_sermon_scripture', true);
        $youtube_url = get_post_meta($sermon_id, 'dw_sermon_youtube', true);
        $preachers = wp_get_post_terms($sermon_id, 'dw_sermon_preacher', ['fields' => 'names']);
        
        // Get YouTube video ID
        $youtube_id = '';
        if ($youtube_url && preg_match('/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^\&\?\/]+)/', $youtube_url, $matches)) {
            $youtube_id = $matches[1];
        }
        
        // Aspect ratio class
        $aspect_class = 'aspect-' . ($settings['video_aspect_ratio'] ?? '16-9');
        
        // Widget layout
        $widget_layout = $settings['widget_layout'] ?? 'classic';
        $widget_class = 'dw-single-sermon-widget layout-' . $widget_layout;
        
        ?>
        <div class="<?php echo esc_attr($widget_class); ?>">
            
            <?php if ($widget_layout === 'video_first'): ?>
                <!-- Video First Layout -->
                
                <!-- Thumbnail (for mobile layout) -->
                <?php if (has_post_thumbnail($sermon_id)): ?>
                    <div class="dw-single-sermon-thumbnail">
                        <?php echo get_the_post_thumbnail($sermon_id, 'medium', array('style' => 'width:100%;')); ?>
                    </div>
                <?php endif; ?>
                
                <!-- YouTube Video -->
                <?php if (($settings['show_video'] ?? 'yes') === 'yes' && $youtube_id): ?>
                    <div class="dw-single-sermon-video <?php echo esc_attr($aspect_class); ?>">
                        <iframe 
                            src="https://www.youtube.com/embed/<?php echo esc_attr($youtube_id); ?>" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                        </iframe>
                    </div>
                <?php endif; ?>
                
                <!-- Content Below Video -->
                <div class="sermon-content-wrapper">
                    <!-- Meta Info (Left Side) -->
                    <?php
                    $meta_layout = $settings['meta_layout'] ?? 'inline';
                    $meta_class = $meta_layout === 'stack' ? 'dw-single-sermon-meta meta-stack' : 'dw-single-sermon-meta meta-inline';
                    ?>
                    <div class="<?php echo esc_attr($meta_class); ?>">
                        <?php
                        $meta_items = [];
                        
                        if (($settings['show_date'] ?? 'yes') === 'yes' && $sermon_date) {
                            $meta_items[] = '<span class="meta-date">' . date_i18n('Y년 n월 j일', strtotime($sermon_date)) . '</span>';
                        }
                        
                        if (($settings['show_scripture'] ?? 'yes') === 'yes' && $scripture) {
                            $meta_items[] = '<span class="meta-scripture">' . esc_html($scripture) . '</span>';
                        }
                        
                        if (($settings['show_preacher'] ?? 'yes') === 'yes' && !empty($preachers)) {
                            $meta_items[] = '<span class="meta-preacher">' . esc_html(implode(', ', $preachers)) . '</span>';
                        }
                        
                        if ($meta_layout === 'stack') {
                            foreach ($meta_items as $item) {
                                echo '<div class="meta-item">' . $item . '</div>';
                            }
                        } else {
                            $separator = $settings['meta_separator'] ?? '||';
                            echo implode(' <span class="meta-separator">' . esc_html($separator) . '</span> ', $meta_items);
                        }
                        ?>
                    </div>
                    
                    <!-- Title (Right Side) -->
                    <h1 class="dw-single-sermon-title"><?php echo esc_html($title); ?></h1>
                </div>
                
            <?php else: ?>
                <!-- Classic Layout -->
                
                <!-- Thumbnail (for mobile layout) -->
                <?php if (has_post_thumbnail($sermon_id)): ?>
                    <div class="dw-single-sermon-thumbnail">
                        <?php echo get_the_post_thumbnail($sermon_id, 'medium', array('style' => 'width:100%;')); ?>
                    </div>
                <?php endif; ?>
                
                <!-- Title -->
                <h1 class="dw-single-sermon-title"><?php echo esc_html($title); ?></h1>
                
                <!-- Meta Info -->
                <?php
                $meta_layout = $settings['meta_layout'] ?? 'inline';
                $meta_class = $meta_layout === 'stack' ? 'dw-single-sermon-meta meta-stack' : 'dw-single-sermon-meta meta-inline';
                ?>
                <div class="<?php echo esc_attr($meta_class); ?>">
                    <?php
                    $meta_items = [];
                    
                    if (($settings['show_date'] ?? 'yes') === 'yes' && $sermon_date) {
                        $meta_items[] = '<span class="meta-date">' . date_i18n('Y년 n월 j일', strtotime($sermon_date)) . '</span>';
                    }
                    
                    if (($settings['show_scripture'] ?? 'yes') === 'yes' && $scripture) {
                        $meta_items[] = '<span class="meta-scripture">' . esc_html($scripture) . '</span>';
                    }
                    
                    if (($settings['show_preacher'] ?? 'yes') === 'yes' && !empty($preachers)) {
                        $meta_items[] = '<span class="meta-preacher">' . esc_html(implode(', ', $preachers)) . '</span>';
                    }
                    
                    if ($meta_layout === 'stack') {
                        foreach ($meta_items as $item) {
                            echo '<div class="meta-item">' . $item . '</div>';
                        }
                    } else {
                        $separator = $settings['meta_separator'] ?? '||';
                        echo implode(' <span class="meta-separator">' . esc_html($separator) . '</span> ', $meta_items);
                    }
                    ?>
                </div>
                
                <!-- YouTube Video -->
                <?php if (($settings['show_video'] ?? 'yes') === 'yes' && $youtube_id): ?>
                    <div class="dw-single-sermon-video <?php echo esc_attr($aspect_class); ?>">
                        <iframe 
                            src="https://www.youtube.com/embed/<?php echo esc_attr($youtube_id); ?>" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                        </iframe>
                    </div>
                <?php endif; ?>
                
            <?php endif; ?>
            
        </div>
        
        <style>
            .dw-single-sermon-widget {
                max-width: 100%;
            }
            
            /* Classic Layout */
            .dw-single-sermon-widget.layout-classic .dw-single-sermon-title {
                margin-top: 0;
                margin-left: 0;
                margin-right: 0;
                /* margin-bottom controlled by Elementor spacing control */
                /* padding controlled by Elementor padding control */
            }
            
            /* Video First Layout */
            .dw-single-sermon-widget.layout-video_first {
                display: flex;
                flex-direction: column;
            }
            
            .dw-single-sermon-widget.layout-video_first .dw-single-sermon-video {
                order: 1;
                margin-bottom: 30px;
            }
            
            .dw-single-sermon-widget.layout-video_first .sermon-content-wrapper {
                order: 2;
                display: grid;
                grid-template-columns: 3fr 2fr;
                gap: 30px;
                align-items: start;
            }
            
            .dw-single-sermon-widget.layout-video_first .dw-single-sermon-meta {
                grid-column: 1;
                text-align: left !important;
                min-width: 0;
            }
            
            .dw-single-sermon-widget.layout-video_first .dw-single-sermon-meta.meta-inline {
                text-align: left !important;
                white-space: nowrap;
                overflow: visible;
            }
            
            .dw-single-sermon-widget.layout-video_first .dw-single-sermon-title {
                grid-column: 2;
                margin-top: 0 !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                /* margin-bottom controlled by Elementor spacing control */
                /* padding controlled by Elementor padding control */
                text-align: right !important;
            }
            
            .dw-single-sermon-meta {
                line-height: 1.8;
            }
            
            .dw-single-sermon-meta.meta-inline span,
            .dw-single-sermon-meta.meta-inline .meta-separator {
                display: inline-block;
            }
            
            .dw-single-sermon-meta.meta-stack {
                display: flex;
                flex-direction: column;
            }
            
            .dw-single-sermon-meta.meta-stack .meta-item {
                display: block;
            }
            
            /* Hide thumbnail on desktop */
            .dw-single-sermon-thumbnail {
                display: none;
            }
            
            /* Mobile Optimization - DW Recent Sermons Style */
            @media (max-width: 767px) {
                /* Force flexbox layout for ordering and prevent overflow */
                .dw-single-sermon-widget {
                    display: flex !important;
                    flex-direction: column !important;
                    overflow: hidden !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                    /* padding removed - use Elementor responsive padding control instead */
                }
                
                /* Ensure all child elements respect container width */
                .dw-single-sermon-widget * {
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                }
                
                /* Show video on mobile (like PC) - order 1 for both layouts */
                .dw-single-sermon-widget.layout-classic .dw-single-sermon-video,
                .dw-single-sermon-video {
                    order: 1 !important;
                    margin-bottom: 20px !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    overflow: hidden !important;
                }
                
                /* Show thumbnail on mobile only if video doesn't exist */
                .dw-single-sermon-thumbnail {
                    display: none !important;
                }
                .dw-single-sermon-widget:not(:has(.dw-single-sermon-video)) .dw-single-sermon-thumbnail {
                    display: block !important;
                    margin-bottom: 15px !important;
                    order: 1 !important;
                }
                .dw-single-sermon-thumbnail img {
                    width: 100% !important;
                    height: 200px !important;
                    object-fit: cover !important;
                }
                
                /* Video First Layout - reorder content wrapper */
                .dw-single-sermon-widget.layout-video_first .sermon-content-wrapper {
                    order: 2 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    width: 100% !important;
                    gap: 0 !important;
                }
                
                /* Title: order varies by layout */
                /* Video First: order 1 in content wrapper | Classic: order 2 in widget */
                .dw-single-sermon-widget.layout-video_first .sermon-content-wrapper .dw-single-sermon-title {
                    order: 1 !important;
                }
                .dw-single-sermon-widget.layout-classic .dw-single-sermon-title,
                .dw-single-sermon-title {
                    order: 2 !important;
                }
                .dw-single-sermon-title {
                    /* font-size removed - use Elementor responsive typography control */
                    line-height: 1.4 !important;
                    /* margin-bottom removed - use Elementor responsive spacing control */
                    display: block !important;
                    text-align: right !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    overflow: hidden !important;
                    word-wrap: break-word !important;
                }
                
                /* Meta container: order varies by layout */
                /* Video First: order 2 in content wrapper | Classic: order 3 in widget */
                .dw-single-sermon-widget.layout-video_first .sermon-content-wrapper .dw-single-sermon-meta {
                    order: 2 !important;
                }
                .dw-single-sermon-widget.layout-classic .dw-single-sermon-meta,
                .dw-single-sermon-meta {
                    display: flex !important;
                    flex-direction: column !important;
                    order: 3 !important;
                    width: 100% !important;
                    margin-top: 0 !important;
                    gap: 0 !important;
                }
                
                .dw-single-sermon-meta * {
                    display: block !important;
                }
                
                /* Scripture: order 1 in meta container, right align */
                .dw-single-sermon-meta .meta-scripture,
                .meta-scripture,
                .dw-single-sermon-meta span.meta-scripture,
                .dw-single-sermon-meta .meta-item .meta-scripture {
                    order: 1 !important;
                    /* font-size removed - use Elementor responsive typography control */
                    margin-top: 0 !important;
                    margin-bottom: 5px !important;
                    display: block !important;
                    text-align: right !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    overflow: hidden !important;
                    word-wrap: break-word !important;
                }
                
                /* Date: order 2 in meta container, right align */
                .dw-single-sermon-meta .meta-date,
                .meta-date,
                .dw-single-sermon-meta span.meta-date,
                .dw-single-sermon-meta .meta-item .meta-date {
                    order: 2 !important;
                    /* font-size removed - use Elementor responsive typography control */
                    margin-bottom: 5px !important;
                    display: block !important;
                    text-align: right !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    overflow: hidden !important;
                    word-wrap: break-word !important;
                }
                
                /* Preacher: order 3 in meta container, right align */
                .dw-single-sermon-meta .meta-preacher,
                .meta-preacher,
                .dw-single-sermon-meta span.meta-preacher,
                .dw-single-sermon-meta .meta-item .meta-preacher {
                    order: 3 !important;
                    /* font-size removed - use Elementor responsive typography control */
                    margin-bottom: 0 !important;
                    display: block !important;
                    text-align: right !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    overflow: hidden !important;
                    word-wrap: break-word !important;
                }
                
                /* Last meta item should not have margin-bottom to avoid extra space */
                .dw-single-sermon-meta > *:last-child,
                .dw-single-sermon-meta .meta-preacher:last-child,
                .dw-single-sermon-meta span:last-of-type {
                    margin-bottom: 0 !important;
                }
                
                /* Hide ALL separators on mobile */
                .dw-single-sermon-meta .meta-separator,
                .meta-separator,
                .dw-single-sermon-meta span::after,
                .dw-single-sermon-meta::before,
                .dw-single-sermon-meta::after {
                    display: none !important;
                    content: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    width: 0 !important;
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                /* Force all meta spans to block */
                .dw-single-sermon-meta.meta-inline span,
                .dw-single-sermon-meta.meta-stack span,
                .dw-single-sermon-meta span {
                    display: block !important;
                    margin-bottom: 5px !important;
                }
                
            }
            
            @media (max-width: 480px) {
                .dw-single-sermon-title {
                    /* font-size removed - use Elementor responsive typography control */
                    line-height: 1.3 !important;
                }
                
                .dw-single-sermon-meta span {
                    /* font-size removed - use Elementor responsive typography control */
                }
                
                .dw-single-sermon-meta .meta-separator {
                    margin: 0 4px !important;
                    /* font-size removed - separator is hidden on mobile anyway */
                }
            }
            
            .dw-single-sermon-video {
                position: relative;
                width: 100%;
                overflow: hidden;
            }
            
            .dw-single-sermon-video.aspect-16-9 {
                padding-bottom: 56.25%; /* 16:9 */
            }
            
            .dw-single-sermon-video.aspect-4-3 {
                padding-bottom: 75%; /* 4:3 */
            }
            
            .dw-single-sermon-video.aspect-21-9 {
                padding-bottom: 42.857%; /* 21:9 */
            }
            
            .dw-single-sermon-video iframe {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
        </style>
        <?php
    }
}

