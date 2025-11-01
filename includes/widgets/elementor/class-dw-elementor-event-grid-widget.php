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
        
        $this->add_control(
            'enable_pagination',
            [
                'label' => __('Enable Pagination', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'no',
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
        
        $this->add_control(
            'height_ratio',
            [
                'label' => __('Height Ratio', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => '16:9',
                'options' => [
                    '4:3' => __('4:3', 'dasom-church'),
                    '16:9' => __('16:9', 'dasom-church'),
                    '9:16' => __('9:16', 'dasom-church'),
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
                        'max' => 1000,
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
                    'height_ratio' => 'custom',
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
        
        // Style Tab - Overlay Style
        $this->start_controls_section(
            'overlay_style_section',
            [
                'label' => __('Overlay Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'overlay_enable',
            [
                'label' => __('Enable Overlay', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'overlay_color',
            [
                'label' => __('Overlay Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => 'rgba(0,0,0,0.3)',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-overlay' => 'background-color: {{VALUE}};',
                ],
                'condition' => [
                    'overlay_enable' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'overlay_opacity',
            [
                'label' => __('Overlay Opacity', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 1,
                        'step' => 0.1,
                    ],
                ],
                'default' => [
                    'size' => 0.3,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-overlay' => 'opacity: {{SIZE}};',
                ],
                'condition' => [
                    'overlay_enable' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'overlay_hover_color',
            [
                'label' => __('Overlay Hover Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => 'rgba(0,0,0,0.5)',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-item:hover .dw-event-grid-overlay' => 'background-color: {{VALUE}};',
                ],
                'condition' => [
                    'overlay_enable' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'overlay_hover_opacity',
            [
                'label' => __('Overlay Hover Opacity', 'dasom-church'),
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
                    '{{WRAPPER}} .dw-event-grid-item:hover .dw-event-grid-overlay' => 'opacity: {{SIZE}};',
                ],
                'condition' => [
                    'overlay_enable' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'hover_effect',
            [
                'label' => __('Hover Effect', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'overlay',
                'options' => [
                    'none' => __('None', 'dasom-church'),
                    'overlay' => __('Overlay Only', 'dasom-church'),
                    'scale' => __('Scale + Overlay', 'dasom-church'),
                    'lift' => __('Lift + Overlay', 'dasom-church'),
                    'glow' => __('Glow + Overlay', 'dasom-church'),
                ],
                'condition' => [
                    'overlay_enable' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'hover_scale',
            [
                'label' => __('Hover Scale', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'range' => [
                    'px' => [
                        'min' => 1,
                        'max' => 1.2,
                        'step' => 0.01,
                    ],
                ],
                'default' => [
                    'size' => 1.05,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-item:hover' => 'transform: scale({{SIZE}});',
                ],
                'condition' => [
                    'overlay_enable' => 'yes',
                    'hover_effect' => 'scale',
                ],
            ]
        );
        
        $this->add_control(
            'hover_lift',
            [
                'label' => __('Hover Lift (px)', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 20,
                        'step' => 1,
                    ],
                ],
                'default' => [
                    'size' => 5,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-item:hover' => 'transform: translateY(-{{SIZE}}px);',
                ],
                'condition' => [
                    'overlay_enable' => 'yes',
                    'hover_effect' => 'lift',
                ],
            ]
        );
        
        $this->add_control(
            'hover_glow_color',
            [
                'label' => __('Hover Glow Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => 'rgba(0,0,0,0.2)',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-item:hover' => 'box-shadow: 0 8px 25px {{VALUE}};',
                ],
                'condition' => [
                    'overlay_enable' => 'yes',
                    'hover_effect' => 'glow',
                ],
            ]
        );
        
        $this->add_control(
            'hover_transition',
            [
                'label' => __('Hover Transition Duration', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 1,
                        'step' => 0.1,
                    ],
                ],
                'default' => [
                    'size' => 0.3,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-item' => 'transition: all {{SIZE}}s ease;',
                ],
                'condition' => [
                    'overlay_enable' => 'yes',
                ],
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
        
        // Department Style
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'department_typography',
                'label' => __('Department Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-event-grid-department',
            ]
        );
        
        $this->add_control(
            'department_color',
            [
                'label' => __('Department Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-department' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'department_spacing',
            [
                'label' => __('Department Spacing', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
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
                    '{{WRAPPER}} .dw-event-grid-department' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'department_divider',
            [
                'type' => \Elementor\Controls_Manager::DIVIDER,
            ]
        );
        
        // Title Style
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
        
        $this->add_responsive_control(
            'title_spacing',
            [
                'label' => __('Title Spacing', 'dasom-church'),
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
                    '{{WRAPPER}} .dw-event-grid-title' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'title_divider',
            [
                'type' => \Elementor\Controls_Manager::DIVIDER,
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
        
        $this->add_responsive_control(
            'datetime_spacing',
            [
                'label' => __('Date/Time Spacing', 'dasom-church'),
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
                    '{{WRAPPER}} .dw-event-grid-datetime' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'text_position',
            [
                'label' => __('Text Position', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'center-center',
                'tablet_default' => 'center-center',
                'mobile_default' => 'top-left',
                'options' => [
                    'top-left' => __('상단 왼쪽', 'dasom-church'),
                    'top-center' => __('상단 중앙', 'dasom-church'),
                    'top-right' => __('상단 오른쪽', 'dasom-church'),
                    'center-left' => __('중앙 왼쪽', 'dasom-church'),
                    'center-center' => __('중앙', 'dasom-church'),
                    'center-right' => __('중앙 오른쪽', 'dasom-church'),
                    'bottom-left' => __('하단 왼쪽', 'dasom-church'),
                    'bottom-center' => __('하단 중앙', 'dasom-church'),
                    'bottom-right' => __('하단 오른쪽', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'text_typography',
                'label' => __('Text Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-event-grid-text-content',
            ]
        );
        
        $this->add_responsive_control(
            'text_padding',
            [
                'label' => __('Text Padding', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'default' => [
                    'top' => 20,
                    'right' => 20,
                    'bottom' => 20,
                    'left' => 20,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-text-content' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'content_padding',
            [
                'label' => __('Content Padding', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'default' => [
                    'top' => '40',
                    'right' => '40',
                    'bottom' => '40',
                    'left' => '40',
                    'unit' => 'px',
                    'isLinked' => false,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-event-grid-text' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
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
        
        $query_source = $settings['query_source'] ?? 'latest';
        $enable_pagination = $settings['enable_pagination'] ?? 'no';
        
        // Get current page
        $paged = (get_query_var('paged')) ? get_query_var('paged') : 1;
        
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
            
            // Add pagination if enabled
            if ($enable_pagination === 'yes') {
                $args['paged'] = $paged;
            }
        }
        
        $events = new WP_Query($args);
        
        if (!$events->have_posts()) {
            echo '<p>' . __('No events found.', 'dasom-church') . '</p>';
            return;
        }
        
        $button_text = $settings['button_text'] ?? __('Read More', 'dasom-church');
        
        // Get responsive text position values
        $text_position = $settings['text_position'] ?? 'center-center';
        $text_position_tablet = $settings['text_position_tablet'] ?? $text_position;
        $text_position_mobile = $settings['text_position_mobile'] ?? $text_position;
        
        // Calculate height style based on ratio
        $height_ratio = $settings['height_ratio'] ?? '16:9';
        $height_style = '';
        
        if ($height_ratio === 'custom') {
            $custom_height = $settings['custom_height']['size'] ?? 400;
            $custom_unit = $settings['custom_height']['unit'] ?? 'px';
            $height_style = 'height:' . $custom_height . $custom_unit . ';';
        } else {
            // Use padding-top for aspect ratio
            $ratio_map = [
                '4:3' => '75%',      // 3/4 * 100
                '16:9' => '56.25%',  // 9/16 * 100
                '9:16' => '177.78%', // 16/9 * 100
            ];
            $padding = $ratio_map[$height_ratio] ?? '56.25%';
            $height_style = 'padding-top:' . $padding . ';';
        }
        
        // Generate unique widget instance ID to avoid CSS conflicts
        $widget_id = 'dw-event-grid-' . $this->get_id();
        
        echo '<div class="dw-event-grid" data-widget-id="' . esc_attr($widget_id) . '">';
        
        while ($events->have_posts()) {
            $events->the_post();
            
            $bg_image_id = get_post_meta(get_the_ID(), 'dw_event_bg_image', true);
            $image_url = $bg_image_id ? wp_get_attachment_url($bg_image_id) : '';
            
            $event_department = get_post_meta(get_the_ID(), 'dw_event_department', true);
            $event_datetime = get_post_meta(get_the_ID(), 'dw_event_datetime', true);
            $event_url = get_post_meta(get_the_ID(), 'dw_event_url', true);
            $event_url_target = get_post_meta(get_the_ID(), 'dw_event_url_target', true);
            $event_url_target = $event_url_target === '_blank' ? '_blank' : '_self';
            
            echo '<div class="dw-event-grid-item">';
            
            if ($image_url) {
                echo '<div class="dw-event-grid-image" style="position:relative;background-image:url(' . esc_url($image_url) . ');background-size:cover;background-position:center center;width:100%;' . esc_attr($height_style) . '">';
                
                // Overlay rendering based on settings
                $overlay_enable = $settings['overlay_enable'] ?? 'yes';
                if ($overlay_enable === 'yes') {
                    echo '<div class="dw-event-grid-overlay"></div>';
                }
                
                // Determine text-align based on text_position (desktop default)
                // left positions: top-left, center-left, bottom-left → text-align: left
                // center positions: top-center, center-center, bottom-center → text-align: center
                // right positions: top-right, center-right, bottom-right → text-align: right
                $text_align_class = '';
                if (strpos($text_position, '-left') !== false) {
                    $text_align_class = 'dw-text-align-left';
                } elseif (strpos($text_position, '-right') !== false) {
                    $text_align_class = 'dw-text-align-right';
                } else {
                    // center or default
                    $text_align_class = 'dw-text-align-center';
                }
                
                // Use CSS class with data attributes for responsive positioning
                echo '<div class="dw-event-grid-text dw-text-position-' . esc_attr($text_position) . '" ';
                echo 'data-position-desktop="' . esc_attr($text_position) . '" ';
                echo 'data-position-tablet="' . esc_attr($text_position_tablet) . '" ';
                echo 'data-position-mobile="' . esc_attr($text_position_mobile) . '">';
                echo '<div class="dw-event-grid-text-content ' . esc_attr($text_align_class) . '">';
                
                // Allowed HTML tags for title and datetime
                $allowed_html = array(
                    'br' => array(),
                    'strong' => array(),
                    'b' => array(),
                    'em' => array(),
                    'i' => array(),
                    'span' => array('style' => array()),
                );
                
                // Department
                if ($event_department) {
                    echo '<div class="dw-event-grid-department">' . esc_html($event_department) . '</div>';
                }
                
                // Title (linked to post) - Allow simple HTML
                $title = get_the_title();
                $title_allowed = wp_kses($title, $allowed_html);
                echo '<h3 class="dw-event-grid-title"><a href="' . esc_url(get_permalink()) . '" style="color:inherit;text-decoration:none;">' . $title_allowed . '</a></h3>';
                
                // Date/Time - Allow simple HTML
                if ($event_datetime) {
                    $datetime_allowed = wp_kses($event_datetime, $allowed_html);
                    echo '<div class="dw-event-grid-datetime">' . $datetime_allowed . '</div>';
                }
                
                // Read More button
                if ($event_url) {
                    echo '<a href="' . esc_url($event_url) . '" target="' . esc_attr($event_url_target) . '" class="dw-event-grid-button" style="display:inline-block;text-decoration:none;transition:all 0.3s ease;">' . esc_html($button_text) . '</a>';
                }
                
                echo '</div>';
                echo '</div>';
                
                echo '</div>';
            }
            
            echo '</div>';
        }
        
        echo '</div>'; // .dw-event-grid
        
        wp_reset_postdata();
        
        // Add inline CSS with widget-specific selector
        ?>
        <style>
            /* DW Event Grid - Direct Grid Layout */
            [data-widget-id="<?php echo esc_attr($widget_id); ?>"] {
                display: grid;
                width: 100%;
                max-width: 100%;
                position: relative;
                z-index: 1;
                clear: both;
                overflow: hidden;
                box-sizing: border-box;
                isolation: isolate;
                contain: layout style paint;
                margin: 0;
                padding: 0;
            }
            
            .dw-event-grid {
                display: grid;
                width: 100%;
                max-width: 100%;
                position: relative;
                z-index: 1;
                clear: both;
                overflow: hidden;
                box-sizing: border-box;
                isolation: isolate;
                contain: layout style paint;
                margin: 0;
                padding: 0;
            }
            .dw-event-grid-item {
                position: relative;
                overflow: hidden !important;
                transition: all 0.3s ease;
                border-radius: 12px;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                isolation: isolate !important;
                contain: layout style paint !important;
            }
            .dw-event-grid-image {
                position: relative;
                width: 100% !important;
                max-width: 100% !important;
                overflow: hidden !important;
                display: block;
                box-sizing: border-box !important;
            }
            .dw-event-grid-item img {
                width: 100%;
                height: auto;
                display: block;
                max-width: 100%;
                box-sizing: border-box;
            }
            .dw-event-grid-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
                pointer-events: none;
                box-sizing: border-box;
            }
            .dw-event-grid-text {
                position: absolute;
                top: 0;
                left: 0;
                width: 100% !important;
                max-width: 100% !important;
                height: 100% !important;
                max-height: 100% !important;
                display: flex !important;
                z-index: 2;
                pointer-events: auto;
                overflow: hidden !important;
                box-sizing: border-box !important;
            }
            
            /* Text position classes - Apply flex alignment consistently */
            .dw-event-grid-text.dw-text-position-top-left {
                align-items: flex-start !important;
                justify-content: flex-start !important;
            }
            .dw-event-grid-text.dw-text-position-top-center {
                align-items: flex-start !important;
                justify-content: center !important;
            }
            .dw-event-grid-text.dw-text-position-top-right {
                align-items: flex-start !important;
                justify-content: flex-end !important;
            }
            .dw-event-grid-text.dw-text-position-center-left {
                align-items: center !important;
                justify-content: flex-start !important;
            }
            .dw-event-grid-text.dw-text-position-center-center {
                align-items: center !important;
                justify-content: center !important;
            }
            .dw-event-grid-text.dw-text-position-center-right {
                align-items: center !important;
                justify-content: flex-end !important;
            }
            .dw-event-grid-text.dw-text-position-bottom-left {
                align-items: flex-end !important;
                justify-content: flex-start !important;
            }
            .dw-event-grid-text.dw-text-position-bottom-center {
                align-items: flex-end !important;
                justify-content: center !important;
            }
            .dw-event-grid-text.dw-text-position-bottom-right {
                align-items: flex-end !important;
                justify-content: flex-end !important;
            }
            
            /* Text alignment based on position */
            .dw-event-grid-text-content.dw-text-align-left {
                text-align: left !important;
            }
            .dw-event-grid-text-content.dw-text-align-center {
                text-align: center !important;
            }
            .dw-event-grid-text-content.dw-text-align-right {
                text-align: right !important;
            }
            
            .dw-event-grid-text-content {
                z-index: 1;
                padding: 20px;
                box-sizing: border-box !important;
                overflow: hidden !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: break-word !important;
                hyphens: auto !important;
                max-width: 100% !important;
                width: auto !important;
                max-height: 100% !important;
                overflow-y: hidden !important;
                overflow-x: hidden !important;
                /* Ensure content stays within parent */
                position: relative !important;
                contain: layout style paint !important;
            }
            
            /* Prevent text overflow in all text elements */
            .dw-event-grid-text-content * {
                max-width: 100% !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: break-word !important;
            }
            
            .dw-event-grid-department,
            .dw-event-grid-title,
            .dw-event-grid-title a,
            .dw-event-grid-datetime,
            .dw-event-grid-button {
                max-width: 100% !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: break-word !important;
                overflow: hidden !important;
                display: block !important;
            }
            
            .dw-event-grid-title {
                line-height: 1.3 !important;
            }
            
            .dw-event-grid-title a {
                display: inline-block !important;
                width: auto !important;
                max-width: 100% !important;
            }
            
            /* Mobile: Full width for text content and apply mobile text position */
            @media (max-width: 767px) {
                .dw-event-grid-text-content {
                    width: 100% !important;
                    max-width: 100% !important;
                }
                
                /* Apply mobile text position based on data attribute */
                .dw-event-grid-text[data-position-mobile="top-left"] {
                    align-items: flex-start !important;
                    justify-content: flex-start !important;
                }
                .dw-event-grid-text[data-position-mobile="top-center"] {
                    align-items: flex-start !important;
                    justify-content: center !important;
                }
                .dw-event-grid-text[data-position-mobile="top-right"] {
                    align-items: flex-start !important;
                    justify-content: flex-end !important;
                }
                .dw-event-grid-text[data-position-mobile="center-left"] {
                    align-items: center !important;
                    justify-content: flex-start !important;
                }
                .dw-event-grid-text[data-position-mobile="center-center"] {
                    align-items: center !important;
                    justify-content: center !important;
                }
                .dw-event-grid-text[data-position-mobile="center-right"] {
                    align-items: center !important;
                    justify-content: flex-end !important;
                }
                .dw-event-grid-text[data-position-mobile="bottom-left"] {
                    align-items: flex-end !important;
                    justify-content: flex-start !important;
                }
                .dw-event-grid-text[data-position-mobile="bottom-center"] {
                    align-items: flex-end !important;
                    justify-content: center !important;
                }
                .dw-event-grid-text[data-position-mobile="bottom-right"] {
                    align-items: flex-end !important;
                    justify-content: flex-end !important;
                }
                
                /* Apply mobile text alignment */
                .dw-event-grid-text[data-position-mobile*="-left"] .dw-event-grid-text-content {
                    text-align: left !important;
                }
                .dw-event-grid-text[data-position-mobile*="-right"] .dw-event-grid-text-content {
                    text-align: right !important;
                }
                .dw-event-grid-text[data-position-mobile*="-center"] .dw-event-grid-text-content {
                    text-align: center !important;
                }
            }
            
            /* Tablet: Apply tablet text position */
            @media (min-width: 768px) and (max-width: 1024px) {
                /* Apply tablet text position based on data attribute */
                .dw-event-grid-text[data-position-tablet="top-left"] {
                    align-items: flex-start !important;
                    justify-content: flex-start !important;
                }
                .dw-event-grid-text[data-position-tablet="top-center"] {
                    align-items: flex-start !important;
                    justify-content: center !important;
                }
                .dw-event-grid-text[data-position-tablet="top-right"] {
                    align-items: flex-start !important;
                    justify-content: flex-end !important;
                }
                .dw-event-grid-text[data-position-tablet="center-left"] {
                    align-items: center !important;
                    justify-content: flex-start !important;
                }
                .dw-event-grid-text[data-position-tablet="center-center"] {
                    align-items: center !important;
                    justify-content: center !important;
                }
                .dw-event-grid-text[data-position-tablet="center-right"] {
                    align-items: center !important;
                    justify-content: flex-end !important;
                }
                .dw-event-grid-text[data-position-tablet="bottom-left"] {
                    align-items: flex-end !important;
                    justify-content: flex-start !important;
                }
                .dw-event-grid-text[data-position-tablet="bottom-center"] {
                    align-items: flex-end !important;
                    justify-content: center !important;
                }
                .dw-event-grid-text[data-position-tablet="bottom-right"] {
                    align-items: flex-end !important;
                    justify-content: flex-end !important;
                }
                
                /* Apply tablet text alignment */
                .dw-event-grid-text[data-position-tablet*="-left"] .dw-event-grid-text-content {
                    text-align: left !important;
                }
                .dw-event-grid-text[data-position-tablet*="-right"] .dw-event-grid-text-content {
                    text-align: right !important;
                }
                .dw-event-grid-text[data-position-tablet*="-center"] .dw-event-grid-text-content {
                    text-align: center !important;
                }
            }
            
            /* Desktop: Apply desktop text alignment */
            @media (min-width: 1025px) {
                .dw-event-grid-text[data-position-desktop*="-left"] .dw-event-grid-text-content {
                    text-align: left !important;
                }
                .dw-event-grid-text[data-position-desktop*="-right"] .dw-event-grid-text-content {
                    text-align: right !important;
                }
                .dw-event-grid-text[data-position-desktop*="-center"] .dw-event-grid-text-content {
                    text-align: center !important;
                }
            }
            
            /* PC/Laptop/Tablet: Auto width to allow proper flex alignment */
            /* Apply to ALL instances with maximum specificity to ensure consistency */
            @media (min-width: 768px) {
                /* Target all possible selector combinations */
                .elementor-widget-dw_event_grid .dw-event-grid .dw-event-grid-item .dw-event-grid-image .dw-event-grid-text .dw-event-grid-text-content,
                .elementor-widget-dw_event_grid .dw-event-grid-item .dw-event-grid-image .dw-event-grid-text .dw-event-grid-text-content,
                .elementor-widget-dw_event_grid .dw-event-grid-item .dw-event-grid-text .dw-event-grid-text-content,
                .elementor-widget-dw_event_grid .dw-event-grid-text .dw-event-grid-text-content,
                .elementor-widget-dw_event_grid .dw-event-grid-text-content,
                .dw-event-grid .dw-event-grid-item .dw-event-grid-image .dw-event-grid-text .dw-event-grid-text-content,
                .dw-event-grid .dw-event-grid-item .dw-event-grid-text .dw-event-grid-text-content,
                .dw-event-grid .dw-event-grid-text .dw-event-grid-text-content,
                .dw-event-grid .dw-event-grid-text-content {
                    width: auto !important;
                    max-width: calc(100% - 40px) !important; /* Account for padding to prevent overflow */
                    flex: 0 0 auto !important;
                    flex-shrink: 1 !important; /* Allow shrinking if content is too long */
                    flex-grow: 0 !important;
                    flex-basis: auto !important;
                    align-self: auto !important;
                }
                
                /* Ensure flex container properly aligns content with high specificity */
                .elementor-widget-dw_event_grid .dw-event-grid .dw-event-grid-item .dw-event-grid-image .dw-event-grid-text,
                .elementor-widget-dw_event_grid .dw-event-grid-item .dw-event-grid-image .dw-event-grid-text,
                .elementor-widget-dw_event_grid .dw-event-grid-item .dw-event-grid-text,
                .elementor-widget-dw_event_grid .dw-event-grid-text,
                .dw-event-grid .dw-event-grid-item .dw-event-grid-image .dw-event-grid-text,
                .dw-event-grid .dw-event-grid-item .dw-event-grid-text,
                .dw-event-grid .dw-event-grid-text {
                    display: flex !important;
                }
            }
            .dw-event-grid-title {
                color: #ffffff;
                text-shadow: 0 2px 4px rgba(0,0,0,0.4);
                font-weight: 700;
                line-height: 1.3;
                margin: 0;
                padding: 0;
            }
            .dw-event-grid-title a {
                color: inherit;
                text-decoration: none;
                display: block;
                width: 100%;
                height: 100%;
                cursor: pointer;
                transition: opacity 0.3s ease;
            }
            .dw-event-grid-title a:hover {
                opacity: 0.8;
            }
            .dw-event-grid-datetime {
                /* Color and typography controlled by Elementor Typography control */
                text-shadow: 0 2px 4px rgba(0,0,0,0.4);
                opacity: 0.95;
                margin: 0;
                padding: 0;
            }
            .dw-event-grid-button {
                display: inline-block;
                cursor: pointer;
                margin: 0;
                padding: 0;
            }
            
            /* Ensure no content escapes the widget boundaries */
            .elementor-widget-dw_event_grid {
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
            /* Exclude text-content and text from this rule to allow proper positioning */
            .elementor-widget-dw_event_grid *:not(.dw-event-grid-text-content):not(.dw-event-grid-text):not(.dw-event-grid-department):not(.dw-event-grid-title):not(.dw-event-grid-datetime):not(.dw-event-grid-button) {
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* Ensure text-content never exceeds its container */
            .elementor-widget-dw_event_grid .dw-event-grid-text {
                max-width: 100% !important;
                max-height: 100% !important;
            }
            
            /* Ensure text-content can size itself for flex alignment but never overflow */
            .elementor-widget-dw_event_grid .dw-event-grid-text-content,
            .dw-event-grid .dw-event-grid-text-content {
                box-sizing: border-box !important;
            }
            
            .elementor-widget-dw_event_grid .dw-event-grid-text,
            .dw-event-grid .dw-event-grid-text {
                box-sizing: border-box !important;
            }
            
            /* Force containment for all grid items */
            .elementor-widget-dw_event_grid .dw-event-grid-item {
                contain: layout style paint !important;
                isolation: isolate !important;
                overflow: hidden !important;
            }
        </style>
        <?php
        
        // Display pagination if enabled
        if ($enable_pagination === 'yes' && $query_source === 'latest') {
            $this->render_pagination($events);
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
        </style>
        <?php
    }
}


