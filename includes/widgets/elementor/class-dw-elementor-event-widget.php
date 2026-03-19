<?php
/**
 * DW Event Widget
 */

if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Event_Widget extends \Elementor\Widget_Base {
    
    public function get_name() {
        return 'dw-event';
    }
    
    public function get_title() {
        return __('DW Event', 'dasom-church');
    }
    
    public function get_icon() {
        return 'eicon-calendar';
    }
    
    public function get_categories() {
        return ['general'];
    }
    
    protected function register_controls() {
        
        // Content Section - Query
        $this->start_controls_section(
            'query_section',
            [
                'label' => __('Query', 'dasom-church'),
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
                    'current' => __('Current Post', 'dasom-church'),
                    'latest' => __('Latest Post', 'dasom-church'),
                    'manual' => __('Manual Selection', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_control(
            'manual_selection',
            [
                'label' => __('Select Event', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT2,
                'options' => $this->get_event_posts(),
                'condition' => [
                    'query_source' => 'manual',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Content Section - Layout
        $this->start_controls_section(
            'layout_section',
            [
                'label' => __('Layout', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_responsive_control(
            'image_width',
            [
                'label' => __('Image Width (%)', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['%'],
                'range' => [
                    '%' => [
                        'min' => 20,
                        'max' => 60,
                    ],
                ],
                'default' => [
                    'size' => 40,
                    'unit' => '%',
                ],
                'tablet_default' => [
                    'size' => 100,
                    'unit' => '%',
                ],
                'mobile_default' => [
                    'size' => 100,
                    'unit' => '%',
                ],
            ]
        );
        
        $this->add_control(
            'image_ratio',
            [
                'label' => __('Image Ratio', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => '16:9',
                'options' => [
                    '1:1' => __('1:1', 'dasom-church'),
                    '4:3' => __('4:3', 'dasom-church'),
                    '16:9' => __('16:9', 'dasom-church'),
                    '21:9' => __('21:9', 'dasom-church'),
                    'custom' => __('Custom', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_responsive_control(
            'custom_height',
            [
                'label' => __('Custom Height', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', 'vh'],
                'range' => [
                    'px' => [
                        'min' => 200,
                        'max' => 800,
                    ],
                    'vh' => [
                        'min' => 20,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'size' => 400,
                    'unit' => 'px',
                ],
                'condition' => [
                    'image_ratio' => 'custom',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section - Container
        $this->start_controls_section(
            'container_style_section',
            [
                'label' => __('Container', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_responsive_control(
            'content_padding',
            [
                'label' => __('Content Padding', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'default' => [
                    'top' => '30',
                    'right' => '30',
                    'bottom' => '30',
                    'left' => '30',
                    'unit' => 'px',
                    'isLinked' => true,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-event-content' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'background_color',
            [
                'label' => __('Background Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#f5f5f5',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-content' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section - Image
        $this->start_controls_section(
            'image_style_section',
            [
                'label' => __('Image', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Border::get_type(),
            [
                'name' => 'image_border',
                'label' => __('Border', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-event-image',
            ]
        );
        
        $this->add_responsive_control(
            'image_border_radius',
            [
                'label' => __('Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%', 'em'],
                'selectors' => [
                    '{{WRAPPER}} .dw-event-image' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};overflow:hidden;',
                ],
            ]
        );
        
        $this->add_control(
            'image_object_fit',
            [
                'label' => __('Object Fit', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'cover',
                'options' => [
                    'fill' => __('Fill', 'dasom-church'),
                    'contain' => __('Contain', 'dasom-church'),
                    'cover' => __('Cover', 'dasom-church'),
                    'none' => __('None', 'dasom-church'),
                    'scale-down' => __('Scale Down', 'dasom-church'),
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-event-image' => 'background-size: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'image_object_position',
            [
                'label' => __('Object Position', 'dasom-church'),
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
                    '{{WRAPPER}} .dw-event-image' => 'background-position: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section - Department
        $this->start_controls_section(
            'department_style_section',
            [
                'label' => __('Department', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'department_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-event-department',
            ]
        );
        
        $this->add_control(
            'department_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#666666',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-department' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section - Title
        $this->start_controls_section(
            'title_style_section',
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
                'selector' => '{{WRAPPER}} .dw-event-title',
            ]
        );
        
        $this->add_control(
            'title_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#333333',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-title' => 'color: {{VALUE}};',
                    '{{WRAPPER}} .dw-event-title a' => 'color: {{VALUE}};',
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
                    'size' => 15,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-event-title' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section - Department
        $this->start_controls_section(
            'event_single_department_style_section',
            [
                'label' => __('Department', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'event_single_department_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-event-department',
            ]
        );
        
        $this->add_control(
            'event_single_department_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#666666',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-department' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'event_single_department_spacing',
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
                    '{{WRAPPER}} .dw-event-department' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section - DateTime
        $this->start_controls_section(
            'event_single_datetime_style_section',
            [
                'label' => __('Date/Time', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'event_single_datetime_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-event-datetime',
            ]
        );
        
        $this->add_control(
            'event_single_datetime_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#888888',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-datetime' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'event_single_datetime_spacing',
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
                    'size' => 15,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-event-datetime' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section - Description
        $this->start_controls_section(
            'event_single_description_style_section',
            [
                'label' => __('Description', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'event_single_description_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-event-description',
            ]
        );
        
        $this->add_control(
            'event_single_description_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#666666',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-description' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section - Button
        $this->start_controls_section(
            'event_single_button_style_section',
            [
                'label' => __('Button', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'event_single_button_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-event-button',
            ]
        );
        
        $this->start_controls_tabs('event_single_button_tabs');
        
        // Normal tab
        $this->start_controls_tab(
            'event_single_button_normal_tab',
            [
                'label' => __('Normal', 'dasom-church'),
            ]
        );
        
        $this->add_control(
            'event_single_button_text_color',
            [
                'label' => __('Text Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-button' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'event_single_button_bg_color',
            [
                'label' => __('Background Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#000000',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-button' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_tab();
        
        // Hover tab
        $this->start_controls_tab(
            'event_single_button_hover_tab',
            [
                'label' => __('Hover', 'dasom-church'),
            ]
        );
        
        $this->add_control(
            'event_single_button_hover_text_color',
            [
                'label' => __('Text Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-button:hover' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'event_single_button_hover_bg_color',
            [
                'label' => __('Background Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#333333',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-button:hover' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_tab();
        
        $this->end_controls_tabs();
        
        $this->add_responsive_control(
            'event_single_button_padding',
            [
                'label' => __('Padding', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em'],
                'default' => [
                    'top' => 12,
                    'right' => 30,
                    'bottom' => 12,
                    'left' => 30,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-event-button' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
                'separator' => 'before',
            ]
        );
        
        $this->add_control(
            'event_single_button_border_radius',
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
                    '{{WRAPPER}} .dw-event-button' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
    }
    
    private function get_event_posts() {
        return dasom_church_get_post_options('event');
    }
    
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        $query_source = $settings['query_source'] ?? 'latest';
        $post_id = null;
        
        // Determine which post to display
        if ($query_source === 'current') {
            $post_id = get_the_ID();
        } elseif ($query_source === 'manual' && !empty($settings['manual_selection'])) {
            $post_id = $settings['manual_selection'];
        } else {
            // Latest post
            $latest = get_posts([
                'post_type' => 'event',
                'post_status' => 'publish',
                'posts_per_page' => 1,
                'orderby' => 'date',
                'order' => 'DESC',
            ]);
            if (!empty($latest)) {
                $post_id = $latest[0]->ID;
            }
        }
        
        if (!$post_id) {
            echo '<p>' . __('No event found.', 'dasom-church') . '</p>';
            return;
        }
        
        // Get event data
        $title = get_the_title($post_id);
        $bg_image_id = get_post_meta($post_id, 'dw_event_bg_image', true);
        $image_url = $bg_image_id ? wp_get_attachment_url($bg_image_id) : '';
        $department = get_post_meta($post_id, 'dw_event_department', true);
        $datetime = get_post_meta($post_id, 'dw_event_datetime', true);
        $description = get_post_meta($post_id, 'dw_event_description', true);
        $event_url = get_post_meta($post_id, 'dw_event_url', true);
        $event_url_target = get_post_meta($post_id, 'dw_event_url_target', true);
        $event_url_target = $event_url_target === '_blank' ? '_blank' : '_self';
        
        // Calculate image ratio style
        $image_ratio = $settings['image_ratio'] ?? '16:9';
        $ratio_style = '';
        
        if ($image_ratio === 'custom') {
            $custom_height = $settings['custom_height']['size'] ?? 400;
            $custom_unit = $settings['custom_height']['unit'] ?? 'px';
            $ratio_style = 'height:' . $custom_height . $custom_unit . ';';
        } else {
            $ratio_map = [
                '1:1' => '100%',
                '4:3' => '75%',
                '16:9' => '56.25%',
                '21:9' => '42.86%',
            ];
            $padding = $ratio_map[$image_ratio] ?? '56.25%';
            $ratio_style = 'padding-top:' . $padding . ';';
        }
        
        ?>
        <div class="dw-event-wrapper">
            <div class="dw-event-container">
                <?php if ($image_url): ?>
                <div class="dw-event-image" style="background-image:url(<?php echo esc_url($image_url); ?>);background-size:cover;background-position:center;<?php echo esc_attr($ratio_style); ?>"></div>
                <?php endif; ?>
                
                <div class="dw-event-content">
                    <?php if ($department): ?>
                    <div class="dw-event-department"><?php echo esc_html($department); ?></div>
                    <?php endif; ?>
                    
                    <h2 class="dw-event-title"><?php echo esc_html($title); ?></h2>
                    
                    <?php if ($datetime): ?>
                    <div class="dw-event-datetime"><?php echo esc_html($datetime); ?></div>
                    <?php endif; ?>
                    
                    <?php if ($description): ?>
                    <div class="dw-event-description"><?php echo nl2br(esc_html($description)); ?></div>
                    <?php endif; ?>
                    
                    <?php if ($event_url): ?>
                    <div class="dw-event-button-wrapper">
                        <a href="<?php echo esc_url($event_url); ?>" target="<?php echo esc_attr($event_url_target); ?>" class="dw-event-button">자세히 보기</a>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        
        <style>
            .dw-event-wrapper {
                width: 100%;
            }
            
            .dw-event-container {
                display: flex;
                flex-wrap: wrap;
                align-items: stretch;
            }
            
            .dw-event-image {
                flex: 0 0 <?php echo esc_attr($settings['image_width']['size'] ?? 40); ?>%;
                position: relative;
            }
            
            .dw-event-content {
                flex: 1;
                min-width: 0;
            }
            
            .dw-event-department {
                margin-bottom: 10px;
                font-size: 14px;
                color: #666;
            }
            
            .dw-event-title {
                margin: 0 0 10px 0;
            }
            
            .dw-event-datetime {
                margin-bottom: 15px;
                font-size: 14px;
                color: #888;
            }
            
            .dw-event-description {
                margin-bottom: 20px;
                line-height: 1.6;
            }
            
            .dw-event-button-wrapper {
                margin-top: 20px;
            }
            
            .dw-event-button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #000;
                color: #fff;
                text-decoration: none;
                border-radius: 4px;
                transition: all 0.3s ease;
            }
            
            .dw-event-button:hover {
                background-color: #333;
                transform: translateY(-2px);
            }
            
            /* Tablet */
            @media (max-width: 1024px) {
                .dw-event-image {
                    flex: 0 0 <?php echo esc_attr($settings['image_width_tablet']['size'] ?? 100); ?>%;
                }
            }
            
            /* Mobile */
            @media (max-width: 767px) {
                .dw-event-image {
                    flex: 0 0 <?php echo esc_attr($settings['image_width_mobile']['size'] ?? 100); ?>%;
                }
                
                .dw-event-wrapper {
                    position: relative;
                    z-index: 10;
                    margin-bottom: 30px;
                    background: #fff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .dw-event-container {
                    position: relative;
                    z-index: 10;
                    background: #fff;
                }
                
                .dw-event-content {
                    position: relative;
                    z-index: 10;
                    background: #fff;
                    padding: 15px;
                }
                
                .dw-event-button-wrapper {
                    position: relative;
                    z-index: 10;
                    background: #fff;
                    padding: 0 15px 15px 15px;
                }
            }
        </style>
        <?php
    }
}

