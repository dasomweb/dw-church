<?php
/**
 * DW Elementor Recent Sermons Widget
 *
 * @package Dasom_Church
 * @since 1.10.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Sermon_Widget extends \Elementor\Widget_Base {
    
    public function get_name() {
        return 'dw_recent_sermons';
    }
    
    public function get_title() {
        return __('DW Recent Sermons', 'dasom-church');
    }
    
    public function get_icon() {
        return 'eicon-post-list';
    }
    
    public function get_categories() {
        return ['general'];
    }
    
    public function get_keywords() {
        return ['sermon', 'church', 'preaching', 'dw', '설교'];
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
                'label' => __('Number of Sermons', 'dasom-church'),
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
            'show_date',
            [
                'label' => __('Show Date', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_date_icon',
            [
                'label' => __('날짜 아이콘 표시', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
                'condition' => [
                    'show_date' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'date_icon',
            [
                'label' => __('날짜 아이콘', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::ICONS,
                'default' => [
                    'value' => 'fas fa-calendar-alt',
                    'library' => 'fa-solid',
                ],
                'condition' => [
                    'show_date' => 'yes',
                    'show_date_icon' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'show_preacher',
            [
                'label' => __('Show Preacher', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_preacher_icon',
            [
                'label' => __('설교자 아이콘 표시', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
                'condition' => [
                    'show_preacher' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'preacher_icon',
            [
                'label' => __('설교자 아이콘', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::ICONS,
                'default' => [
                    'value' => 'fas fa-user',
                    'library' => 'fa-solid',
                ],
                'condition' => [
                    'show_preacher' => 'yes',
                    'show_preacher_icon' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'show_excerpt',
            [
                'label' => __('Show Excerpt', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'no',
            ]
        );
        
        $this->add_control(
            'excerpt_length',
            [
                'label' => __('Excerpt Length', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 20,
                'condition' => [
                    'show_excerpt' => 'yes',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section
        $this->start_controls_section(
            'style_section',
            [
                'label' => __('스타일', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        // Title Typography
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'title_typography',
                'label' => __('타이틀 타이포그래피', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-sermon-item h3',
            ]
        );
        
        $this->add_control(
            'title_color',
            [
                'label' => __('타이틀 색상', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .dw-sermon-item h3' => 'color: {{VALUE}};',
                    '{{WRAPPER}} .dw-sermon-item h3 a' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'title_hover_color',
            [
                'label' => __('타이틀 호버 색상', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .dw-sermon-item h3 a:hover' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'title_spacing',
            [
                'label' => __('타이틀 간격', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 50,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-sermon-item h3' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'date_heading',
            [
                'label' => __('날짜 스타일', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        // Date Typography
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'date_typography',
                'label' => __('날짜 타이포그래피', 'dasom-church'),
                'selector' => '{{WRAPPER}} .sermon-date',
            ]
        );
        
        $this->add_control(
            'date_color',
            [
                'label' => __('날짜 색상', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .sermon-date' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'date_icon_color',
            [
                'label' => __('날짜 아이콘 색상', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .sermon-date i' => 'color: {{VALUE}};',
                    '{{WRAPPER}} .sermon-date svg' => 'fill: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'date_icon_size',
            [
                'label' => __('날짜 아이콘 크기', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 8,
                        'max' => 50,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} .sermon-date i' => 'font-size: {{SIZE}}{{UNIT}};',
                    '{{WRAPPER}} .sermon-date svg' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'preacher_heading',
            [
                'label' => __('설교자 스타일', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        // Preacher Typography
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'preacher_typography',
                'label' => __('설교자 타이포그래피', 'dasom-church'),
                'selector' => '{{WRAPPER}} .sermon-preacher',
            ]
        );
        
        $this->add_control(
            'preacher_color',
            [
                'label' => __('설교자 색상', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .sermon-preacher' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'preacher_icon_color',
            [
                'label' => __('설교자 아이콘 색상', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .sermon-preacher i' => 'color: {{VALUE}};',
                    '{{WRAPPER}} .sermon-preacher svg' => 'fill: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'preacher_icon_size',
            [
                'label' => __('설교자 아이콘 크기', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 8,
                        'max' => 50,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} .sermon-preacher i' => 'font-size: {{SIZE}}{{UNIT}};',
                    '{{WRAPPER}} .sermon-preacher svg' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'excerpt_heading',
            [
                'label' => __('발췌문 스타일', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        // Excerpt Typography
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'excerpt_typography',
                'label' => __('발췌문 타이포그래피', 'dasom-church'),
                'selector' => '{{WRAPPER}} .sermon-excerpt',
            ]
        );
        
        $this->add_control(
            'excerpt_color',
            [
                'label' => __('발췌문 색상', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .sermon-excerpt' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'card_heading',
            [
                'label' => __('카드 스타일', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_control(
            'card_bg_color',
            [
                'label' => __('배경 색상', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .dw-sermon-item' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'card_border_radius',
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
                'selectors' => [
                    '{{WRAPPER}} .dw-sermon-item' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'card_box_shadow',
                'label' => __('그림자', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-sermon-item',
            ]
        );
        
        $this->end_controls_section();
    }
    
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        $args = array(
            'post_type' => 'sermon',
            'posts_per_page' => $settings['posts_per_page'],
            'post_status' => 'publish',
            'orderby' => 'date',
            'order' => 'DESC',
        );
        
        $sermons = new WP_Query($args);
        
        if (!$sermons->have_posts()) {
            echo '<p>' . __('No sermons found.', 'dasom-church') . '</p>';
            return;
        }
        
        $layout = $settings['layout'] ?? 'grid';
        $columns = $layout === 'grid' ? intval($settings['columns'] ?? 3) : 1;
        $col_class = $layout === 'grid' ? 'dw-sermon-grid' : 'dw-sermon-list';
        
        echo '<div class="dw-sermons-widget ' . esc_attr($col_class) . '" style="display:grid;grid-template-columns:repeat(' . $columns . ',1fr);gap:20px;">';
        
        while ($sermons->have_posts()) {
            $sermons->the_post();
            $sermon_date = get_post_meta(get_the_ID(), 'dw_sermon_date', true);
            $preachers = wp_get_post_terms(get_the_ID(), 'dw_sermon_preacher', array('fields' => 'names'));
            
            echo '<div class="dw-sermon-item" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);transition:transform 0.3s;" onmouseover="this.style.transform=\'translateY(-5px)\'" onmouseout="this.style.transform=\'translateY(0)\'">';
            
            if (($settings['show_thumbnail'] ?? 'yes') === 'yes' && has_post_thumbnail()) {
                echo '<div class="sermon-thumbnail">';
                echo '<a href="' . get_permalink() . '">';
                the_post_thumbnail('medium', array('style' => 'width:100%;height:200px;object-fit:cover;'));
                echo '</a>';
                echo '</div>';
            }
            
            echo '<div class="sermon-content" style="padding:20px;">';
            
            echo '<h3 style="margin:0 0 10px 0;font-size:18px;"><a href="' . get_permalink() . '" style="text-decoration:none;color:#333;">' . get_the_title() . '</a></h3>';
            
            if (($settings['show_date'] ?? 'yes') === 'yes' && $sermon_date) {
                $date_icon = '';
                if (($settings['show_date_icon'] ?? 'yes') === 'yes') {
                    if (!empty($settings['date_icon']['value'])) {
                        ob_start();
                        \Elementor\Icons_Manager::render_icon($settings['date_icon'], ['aria-hidden' => 'true']);
                        $date_icon = ob_get_clean() . ' ';
                    } else {
                        $date_icon = '📅 ';
                    }
                }
                echo '<div class="sermon-date" style="font-size:13px;color:#666;margin-bottom:5px;">' . $date_icon . date_i18n('Y-m-d', strtotime($sermon_date)) . '</div>';
            }
            
            if (($settings['show_preacher'] ?? 'yes') === 'yes' && !empty($preachers)) {
                $preacher_icon = '';
                if (($settings['show_preacher_icon'] ?? 'yes') === 'yes') {
                    if (!empty($settings['preacher_icon']['value'])) {
                        ob_start();
                        \Elementor\Icons_Manager::render_icon($settings['preacher_icon'], ['aria-hidden' => 'true']);
                        $preacher_icon = ob_get_clean() . ' ';
                    } else {
                        $preacher_icon = '👤 ';
                    }
                }
                echo '<div class="sermon-preacher" style="font-size:13px;color:#666;margin-bottom:10px;">' . $preacher_icon . esc_html(implode(', ', $preachers)) . '</div>';
            }
            
            if (($settings['show_excerpt'] ?? 'no') === 'yes') {
                $excerpt = wp_trim_words(get_the_excerpt(), $settings['excerpt_length'] ?? 20);
                echo '<div class="sermon-excerpt" style="font-size:14px;color:#555;line-height:1.6;">' . esc_html($excerpt) . '</div>';
            }
            
            echo '</div>';
            echo '</div>';
        }
        
        echo '</div>';
        
        wp_reset_postdata();
    }
}

