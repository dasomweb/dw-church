<?php
/**
 * DW Event Grid Widget for Elementor
 * 
 * Displays events in a grid layout
 *
 * @package DasomChurch
 * @since 1.25.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Event_Grid_Widget extends \Elementor\Widget_Base {
    
    public function get_name() {
        return 'dw_event_grid';
    }
    
    public function get_title() {
        return __('DW Event Grid', 'dasom-church');
    }
    
    public function get_icon() {
        return 'eicon-posts-grid';
    }
    
    public function get_categories() {
        return ['general'];
    }
    
    public function get_keywords() {
        return ['event', 'grid', 'dasom', 'church'];
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
        
        // Get all events for manual selection
        $event_options = array();
        $all_events = get_posts(array(
            'post_type' => 'event',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'orderby' => 'title',
            'order' => 'ASC',
        ));
        foreach ($all_events as $event) {
            $event_options[$event->ID] = $event->post_title;
        }
        
        $this->add_control(
            'manual_selection',
            [
                'label' => __('Select Events', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT2,
                'multiple' => true,
                'options' => $event_options,
                'label_block' => true,
                'condition' => [
                    'query_source' => 'manual',
                ],
                'description' => __('Select specific events to display.', 'dasom-church'),
            ]
        );
        
        $this->add_control(
            'posts_per_page',
            [
                'label' => __('Number of Events', 'dasom-church'),
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
                    '{{WRAPPER}} .dw-event-grid' => 'grid-template-columns: repeat({{VALUE}}, 1fr);',
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
                    '{{WRAPPER}} .dw-event-grid' => 'column-gap: {{SIZE}}{{UNIT}};',
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
                    '{{WRAPPER}} .dw-event-grid' => 'row-gap: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'min_height',
            [
                'label' => __('Minimum Height', 'dasom-church'),
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
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-image' => 'min-height: {{SIZE}}{{UNIT}};',
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
                    '{{WRAPPER}} .dw-event-grid-item' => 'border-radius: {{SIZE}}{{UNIT}};',
                    '{{WRAPPER}} .dw-event-grid-image' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'card_box_shadow',
                'label' => __('Box Shadow', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-event-grid-item',
            ]
        );
        
        $this->end_controls_section();
        
        // Style Tab - Text Style
        $this->start_controls_section(
            'text_style_section',
            [
                'label' => __('Text Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'title_typography',
                'label' => __('Title Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-event-grid-title',
            ]
        );
        
        $this->add_control(
            'title_color',
            [
                'label' => __('Title Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-title' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'datetime_typography',
                'label' => __('Date/Time Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-event-grid-datetime',
            ]
        );
        
        $this->add_control(
            'datetime_color',
            [
                'label' => __('Date/Time Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-datetime' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Style Tab - Button Style
        $this->start_controls_section(
            'button_style_section',
            [
                'label' => __('Button Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'button_text',
            [
                'label' => __('Button Text', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => __('Read More', 'dasom-church'),
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'button_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-event-grid-button',
            ]
        );
        
        $this->start_controls_tabs('button_tabs');
        
        $this->start_controls_tab(
            'button_normal',
            [
                'label' => __('Normal', 'dasom-church'),
            ]
        );
        
        $this->add_control(
            'button_color',
            [
                'label' => __('Text Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-button' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_bg_color',
            [
                'label' => __('Background Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => 'rgba(255, 255, 255, 0)',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-button' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Border::get_type(),
            [
                'name' => 'button_border',
                'label' => __('Border', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-event-grid-button',
                'fields_options' => [
                    'border' => [
                        'default' => 'solid',
                    ],
                    'width' => [
                        'default' => [
                            'top' => '2',
                            'right' => '2',
                            'bottom' => '2',
                            'left' => '2',
                            'isLinked' => true,
                        ],
                    ],
                    'color' => [
                        'default' => '#ffffff',
                    ],
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
            'button_hover_color',
            [
                'label' => __('Text Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#333333',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-button:hover' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_hover_bg_color',
            [
                'label' => __('Background Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-button:hover' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_hover_border_color',
            [
                'label' => __('Border Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-button:hover' => 'border-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_tab();
        
        $this->end_controls_tabs();
        
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
                    '{{WRAPPER}} .dw-event-grid-button' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
                'separator' => 'before',
            ]
        );
        
        $this->add_responsive_control(
            'button_padding',
            [
                'label' => __('Padding', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'default' => [
                    'top' => '12',
                    'right' => '30',
                    'bottom' => '12',
                    'left' => '30',
                    'unit' => 'px',
                    'isLinked' => false,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-button' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
    }
    
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        $query_source = $settings['query_source'] ?? 'latest';
        
        // Build query args based on source
        if ($query_source === 'manual' && !empty($settings['manual_selection'])) {
            // Manual selection
            $args = array(
                'post_type' => 'event',
                'post__in' => $settings['manual_selection'],
                'post_status' => 'publish',
                'orderby' => 'post__in',
            );
        } else {
            // Latest posts
            $args = array(
                'post_type' => 'event',
                'post_status' => 'publish',
                'posts_per_page' => $settings['posts_per_page'] ?? 6,
                'order' => $settings['order'] ?? 'DESC',
                'orderby' => $settings['orderby'] ?? 'date',
            );
        }
        
        $events = new WP_Query($args);
        
        if (!$events->have_posts()) {
            echo '<p>' . __('No events found.', 'dasom-church') . '</p>';
            return;
        }
        
        $button_text = $settings['button_text'] ?? __('Read More', 'dasom-church');
        
        echo '<div class="dw-event-grid-wrapper">';
        echo '<div class="dw-event-grid">';
        
        while ($events->have_posts()) {
            $events->the_post();
            
            $bg_image_id = get_post_meta(get_the_ID(), 'dw_event_bg_image', true);
            $image_url = $bg_image_id ? wp_get_attachment_url($bg_image_id) : '';
            
            $event_datetime = get_post_meta(get_the_ID(), 'dw_event_datetime', true);
            $event_url = get_post_meta(get_the_ID(), 'dw_event_url', true);
            
            // Get text position and alignment
            $text_position = get_post_meta(get_the_ID(), 'dw_event_text_position', true);
            $text_position = $text_position ? $text_position : 'center-center';
            $text_align = get_post_meta(get_the_ID(), 'dw_event_text_align', true);
            $text_align = $text_align ? $text_align : 'center';
            
            // Get content padding
            $padding_top = get_post_meta(get_the_ID(), 'dw_event_content_padding_top', true);
            $padding_top = $padding_top ? $padding_top : '40';
            $padding_right = get_post_meta(get_the_ID(), 'dw_event_content_padding_right', true);
            $padding_right = $padding_right ? $padding_right : '40';
            $padding_bottom = get_post_meta(get_the_ID(), 'dw_event_content_padding_bottom', true);
            $padding_bottom = $padding_bottom ? $padding_bottom : '40';
            $padding_left = get_post_meta(get_the_ID(), 'dw_event_content_padding_left', true);
            $padding_left = $padding_left ? $padding_left : '40';
            
            list($v_align, $h_align) = explode('-', $text_position);
            $v_align_style = $v_align === 'top' ? 'flex-start' : ($v_align === 'bottom' ? 'flex-end' : 'center');
            $h_align_style = $h_align === 'left' ? 'flex-start' : ($h_align === 'right' ? 'flex-end' : 'center');
            
            echo '<div class="dw-event-grid-item">';
            
            if ($image_url) {
                echo '<div class="dw-event-grid-image" style="position:relative;background-image:url(' . esc_url($image_url) . ');background-size:cover;background-position:center center;width:100%;">';
                
                echo '<div class="dw-event-grid-overlay" style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);"></div>';
                
                echo '<div class="dw-event-grid-text" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:' . esc_attr($v_align_style) . ';justify-content:' . esc_attr($h_align_style) . ';padding:' . esc_attr($padding_top) . 'px ' . esc_attr($padding_right) . 'px ' . esc_attr($padding_bottom) . 'px ' . esc_attr($padding_left) . 'px;">';
                echo '<div class="dw-event-grid-text-content" style="text-align:' . esc_attr($text_align) . ';z-index:1;">';
                
                if ($event_datetime) {
                    echo '<div class="dw-event-grid-datetime" style="margin-bottom:10px;">' . esc_html($event_datetime) . '</div>';
                }
                
                echo '<h3 class="dw-event-grid-title" style="margin:0 0 15px 0;">' . esc_html(get_the_title()) . '</h3>';
                
                if ($event_url) {
                    echo '<a href="' . esc_url($event_url) . '" class="dw-event-grid-button" style="display:inline-block;text-decoration:none;transition:all 0.3s ease;">' . esc_html($button_text) . '</a>';
                }
                
                echo '</div>';
                echo '</div>';
                
                echo '</div>';
            }
            
            echo '</div>';
        }
        
        echo '</div>'; // .dw-event-grid
        echo '</div>'; // .dw-event-grid-wrapper
        
        wp_reset_postdata();
        
        // Add inline CSS
        ?>
        <style>
            .dw-event-grid {
                display: grid;
                width: 100%;
            }
            .dw-event-grid-item {
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            .dw-event-grid-image {
                position: relative;
                width: 100%;
                overflow: hidden;
            }
            .dw-event-grid-title {
                color: #ffffff;
                text-shadow: 0 2px 4px rgba(0,0,0,0.4);
                font-weight: 700;
                line-height: 1.3;
            }
            .dw-event-grid-datetime {
                color: #ffffff;
                text-shadow: 0 2px 4px rgba(0,0,0,0.4);
                opacity: 0.95;
            }
            .dw-event-grid-button {
                display: inline-block;
                cursor: pointer;
            }
            .dw-event-grid-item:hover {
                transform: translateY(-4px);
            }
            .dw-event-grid-item:hover .dw-event-grid-overlay {
                background: rgba(0,0,0,0.5);
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .dw-event-grid-title {
                    font-size: 1.2em;
                }
                .dw-event-grid-datetime {
                    font-size: 0.9em;
                }
            }
        </style>
        <?php
    }
}

