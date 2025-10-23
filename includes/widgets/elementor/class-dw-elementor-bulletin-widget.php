<?php
/**
 * DW Elementor Bulletin Widget
 *
 * @package Dasom_Church
 * @since 1.34.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Bulletin_Widget extends \Elementor\Widget_Base {
    
    /**
     * Get widget name
     */
    public function get_name() {
        return 'dw_bulletin_widget';
    }
    
    /**
     * Get widget title
     */
    public function get_title() {
        return __('DW Bulletin', 'dasom-church');
    }
    
    /**
     * Get widget icon
     */
    public function get_icon() {
        return 'eicon-announcement';
    }
    
    /**
     * Get widget categories
     */
    public function get_categories() {
        return ['general'];
    }
    
    /**
     * Get widget keywords
     */
    public function get_keywords() {
        return ['bulletin', 'church', 'pdf', 'download', 'dw', '주보', '교회'];
    }
    
    /**
     * Register widget controls
     */
    protected function register_controls() {
        
        // Content Section
        $this->start_controls_section(
            'dw_bulletin_section',
            [
                'label' => __('Bulletin Settings', 'dasom-church'),
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
                    'current' => __('Current Post', 'dasom-church'),
                    'manual' => __('Manual Selection', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_control(
            'bulletin_posts',
            [
                'label' => __('Select Bulletins', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT2,
                'multiple' => true,
                'options' => $this->get_bulletin_posts(),
                'condition' => [
                    'query_source' => 'manual',
                ],
            ]
        );
        
        $this->add_control(
            'posts_per_page',
            [
                'label' => __('Number of Posts', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 10,
                'min' => 1,
                'max' => 50,
                'condition' => [
                    'query_source' => 'latest',
                ],
            ]
        );
        
        $this->add_control(
            'display_type',
            [
                'label' => __('Display Type', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'image',
                'options' => [
                    'image' => __('Image Template', 'dasom-church'),
                    'button' => __('Button Template', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_control(
            'layout_type',
            [
                'label' => __('Layout Type', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'list',
                'options' => [
                    'list' => __('List Layout', 'dasom-church'),
                    'grid' => __('Grid Layout', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_responsive_control(
            'grid_columns',
            [
                'label' => __('Columns', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => '3',
                'options' => [
                    '1' => __('1 Column', 'dasom-church'),
                    '2' => __('2 Columns', 'dasom-church'),
                    '3' => __('3 Columns', 'dasom-church'),
                    '4' => __('4 Columns', 'dasom-church'),
                    '5' => __('5 Columns', 'dasom-church'),
                    '6' => __('6 Columns', 'dasom-church'),
                ],
                'condition' => [
                    'layout_type' => 'grid',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-grid' => 'grid-template-columns: repeat({{VALUE}}, 1fr);',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'grid_gap',
            [
                'label' => __('Grid Gap', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', 'em'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 20,
                ],
                'condition' => [
                    'layout_type' => 'grid',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-grid' => 'gap: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Image Template Style Section
        $this->start_controls_section(
            'dw_bulletin_image_style_section',
            [
                'label' => __('Image Template Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'display_type' => 'image',
                ],
            ]
        );
        
        $this->add_control(
            'image_style_heading',
            [
                'label' => __('Image Settings', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_control(
            'image_size_type',
            [
                'label' => __('Image Size Type', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'aspect_ratio',
                'options' => [
                    'aspect_ratio' => __('Aspect Ratio', 'dasom-church'),
                    'custom' => __('Custom Size', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_control(
            'image_aspect_ratio',
            [
                'label' => __('Aspect Ratio', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => '16-9',
                'options' => [
                    '16-9' => '16:9',
                    '4-3' => '4:3',
                    '3-2' => '3:2',
                    '1-1' => '1:1',
                    '2-3' => '2:3',
                    '3-4' => '3:4',
                    '9-16' => '9:16',
                ],
                'condition' => [
                    'image_size_type' => 'aspect_ratio',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'image_width',
            [
                'label' => __('Image Width', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', '%'],
                'range' => [
                    'px' => [
                        'min' => 100,
                        'max' => 800,
                    ],
                    '%' => [
                        'min' => 10,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 300,
                ],
                'condition' => [
                    'image_size_type' => 'custom',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-image' => 'width: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'image_height',
            [
                'label' => __('Image Height', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', 'vh', '%'],
                'range' => [
                    'px' => [
                        'min' => 100,
                        'max' => 500,
                    ],
                    'vh' => [
                        'min' => 10,
                        'max' => 50,
                    ],
                    '%' => [
                        'min' => 10,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 200,
                ],
                'condition' => [
                    'image_size_type' => 'custom',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-image' => 'height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'image_position',
            [
                'label' => __('Image Position', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'left',
                'options' => [
                    'left' => __('Left', 'dasom-church'),
                    'top' => __('Top', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_control(
            'image_border_radius',
            [
                'label' => __('Image Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 50,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 8,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-image' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Border::get_type(),
            [
                'name' => 'image_border',
                'label' => __('Image Border', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-image',
            ]
        );
        
        $this->add_control(
            'image_overlay',
            [
                'label' => __('Image Overlay', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '',
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-image::after' => 'content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: {{VALUE}}; z-index: 1;',
                ],
            ]
        );
        
        $this->add_control(
            'image_overlay_opacity',
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
                    '{{WRAPPER}} .dw-bulletin-image::after' => 'opacity: {{SIZE}};',
                ],
                'condition' => [
                    'image_overlay!' => '',
                ],
            ]
        );
        
        $this->add_control(
            'content_style_heading',
            [
                'label' => __('Content Settings', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'title_typography',
                'label' => __('Title Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-title',
            ]
        );
        
        $this->add_control(
            'title_color',
            [
                'label' => __('Title Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#333333',
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-title' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'date_typography',
                'label' => __('Date Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-date',
            ]
        );
        
        $this->add_control(
            'date_color',
            [
                'label' => __('Date Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#666666',
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-date' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'download_button_style_heading',
            [
                'label' => __('Download Button Style', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_control(
            'download_button_background',
            [
                'label' => __('Button Background', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#007cba',
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-download' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'download_button_text_color',
            [
                'label' => __('Button Text Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-download' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'download_button_border_radius',
            [
                'label' => __('Button Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 50,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 4,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-download' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'download_button_padding',
            [
                'label' => __('Button Padding', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em'],
                'default' => [
                    'top' => 8,
                    'right' => 16,
                    'bottom' => 8,
                    'left' => 16,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-download' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Button Template Style Section
        $this->start_controls_section(
            'dw_bulletin_button_style_section',
            [
                'label' => __('Button Template Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'display_type' => 'button',
                ],
            ]
        );
        
        $this->add_control(
            'button_item_style_heading',
            [
                'label' => __('Button Item Style', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_control(
            'button_background_color',
            [
                'label' => __('Background Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-item' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_border_color',
            [
                'label' => __('Border Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#e0e0e0',
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-item' => 'border-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_border_radius',
            [
                'label' => __('Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 50,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 8,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-item' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_padding',
            [
                'label' => __('Padding', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'default' => [
                    'top' => 15,
                    'right' => 20,
                    'bottom' => 15,
                    'left' => 20,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-item' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_margin',
            [
                'label' => __('Margin', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'default' => [
                    'top' => 0,
                    'right' => 0,
                    'bottom' => 10,
                    'left' => 0,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-item' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_hover_effect',
            [
                'label' => __('Hover Effect', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'lift',
                'options' => [
                    'none' => __('None', 'dasom-church'),
                    'lift' => __('Lift', 'dasom-church'),
                    'shadow' => __('Shadow', 'dasom-church'),
                    'scale' => __('Scale', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_control(
            'button_title_style_heading',
            [
                'label' => __('Title Style', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'button_title_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-item .dw-bulletin-title',
            ]
        );
        
        $this->add_control(
            'button_title_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#333333',
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-item .dw-bulletin-title' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_meta_style_heading',
            [
                'label' => __('Date & Download Style', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'button_date_typography',
                'label' => __('Date Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-item .dw-bulletin-date',
            ]
        );
        
        $this->add_control(
            'button_date_color',
            [
                'label' => __('Date Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#666666',
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-item .dw-bulletin-date' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_download_background',
            [
                'label' => __('Download Button Background', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#007cba',
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-item .dw-bulletin-download' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_download_text_color',
            [
                'label' => __('Download Button Text Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-item .dw-bulletin-download' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_download_border_radius',
            [
                'label' => __('Download Button Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 50,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 4,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-item .dw-bulletin-download' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_download_padding',
            [
                'label' => __('Download Button Padding', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em'],
                'default' => [
                    'top' => 4,
                    'right' => 12,
                    'bottom' => 4,
                    'left' => 12,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-item .dw-bulletin-download' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Card Style Section
        $this->start_controls_section(
            'dw_bulletin_card_style_section',
            [
                'label' => __('Card Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'card_background_color',
            [
                'label' => __('Card Background Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-image-item' => 'background-color: {{VALUE}};',
                    '{{WRAPPER}} .dw-bulletin-item' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Border::get_type(),
            [
                'name' => 'card_border',
                'label' => __('Card Border', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-image-item, {{WRAPPER}} .dw-bulletin-item',
            ]
        );
        
        $this->add_control(
            'card_border_radius',
            [
                'label' => __('Card Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 50,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 8,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-image-item' => 'border-radius: {{SIZE}}{{UNIT}};',
                    '{{WRAPPER}} .dw-bulletin-item' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'card_shadow',
                'label' => __('Card Shadow', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-image-item, {{WRAPPER}} .dw-bulletin-item',
            ]
        );
        
        $this->add_control(
            'card_padding',
            [
                'label' => __('Card Padding', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'default' => [
                    'top' => 0,
                    'right' => 0,
                    'bottom' => 0,
                    'left' => 0,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-image-item' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                    '{{WRAPPER}} .dw-bulletin-item' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'card_margin',
            [
                'label' => __('Card Margin', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'default' => [
                    'top' => 0,
                    'right' => 0,
                    'bottom' => 20,
                    'left' => 0,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-image-item' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                    '{{WRAPPER}} .dw-bulletin-item' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'card_hover_effect',
            [
                'label' => __('Card Hover Effect', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'lift',
                'options' => [
                    'none' => __('None', 'dasom-church'),
                    'lift' => __('Lift', 'dasom-church'),
                    'shadow' => __('Shadow', 'dasom-church'),
                    'scale' => __('Scale', 'dasom-church'),
                    'glow' => __('Glow', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_control(
            'card_hover_shadow_color',
            [
                'label' => __('Hover Shadow Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => 'rgba(0, 0, 0, 0.2)',
                'condition' => [
                    'card_hover_effect' => ['lift', 'shadow', 'glow'],
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // General Style Section
        $this->start_controls_section(
            'dw_bulletin_general_style_section',
            [
                'label' => __('General Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->end_controls_section();
    }
    
    /**
     * Get bulletin posts for manual selection
     */
    private function get_bulletin_posts() {
        $posts = get_posts([
            'post_type' => 'bulletin',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ]);
        
        $options = [];
        foreach ($posts as $post) {
            $options[$post->ID] = $post->post_title;
        }
        
        return $options;
    }
    
    /**
     * Render widget
     */
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        // Get posts based on query source
        if ($settings['query_source'] === 'current') {
            // Current post
            $current_post = get_post();
            if ($current_post && $current_post->post_type === 'bulletin') {
                $posts = [$current_post];
            } else {
                $posts = [];
            }
        } elseif ($settings['query_source'] === 'manual' && !empty($settings['bulletin_posts'])) {
            // Manual selection
            $posts = get_posts([
                'post_type' => 'bulletin',
                'post__in' => $settings['bulletin_posts'],
                'posts_per_page' => -1,
                'post_status' => 'publish',
                'orderby' => 'post__in',
            ]);
        } else {
            // Latest posts
            $posts = get_posts([
            'post_type' => 'bulletin',
                'posts_per_page' => $settings['posts_per_page'],
            'post_status' => 'publish',
                'orderby' => 'date',
            'order' => 'DESC',
            ]);
        }
        
        if (empty($posts)) {
            echo '<p>' . __('No bulletins found.', 'dasom-church') . '</p>';
            return;
        }
        
        $display_type = $settings['display_type'];
        $layout_type = isset($settings['layout_type']) ? $settings['layout_type'] : 'list';
        
        if ($display_type === 'image') {
            $this->render_image_template($posts, $layout_type);
        } else {
            $this->render_button_template($posts, $layout_type);
        }
    }
    
    /**
     * Render image template
     */
    private function render_image_template($posts, $layout_type = 'list') {
        $settings = $this->get_settings_for_display();
        $hover_effect = isset($settings['card_hover_effect']) ? $settings['card_hover_effect'] : 'lift';
        $shadow_color = isset($settings['card_hover_shadow_color']) ? $settings['card_hover_shadow_color'] : 'rgba(0, 0, 0, 0.2)';
        $image_position = isset($settings['image_position']) ? $settings['image_position'] : 'left';
        $image_size_type = isset($settings['image_size_type']) ? $settings['image_size_type'] : 'aspect_ratio';
        $image_aspect_ratio = isset($settings['image_aspect_ratio']) ? $settings['image_aspect_ratio'] : '16-9';
        
        $container_class = $layout_type === 'grid' ? 'dw-bulletin-image-grid' : 'dw-bulletin-image-list';
        $item_class = 'dw-bulletin-image-item';
        
        if ($image_position === 'top') {
            $item_class .= ' image-top';
        } else {
            $item_class .= ' image-left';
        }
        
        if ($image_size_type === 'aspect_ratio') {
            $item_class .= ' aspect-' . $image_aspect_ratio;
        }
        ?>
        <div class="<?php echo esc_attr($container_class); ?>">
            <?php foreach ($posts as $post): 
                $pdf_url = get_post_meta($post->ID, 'dw_bulletin_pdf', true);
                $featured_image = get_the_post_thumbnail_url($post->ID, 'medium');
                $bulletin_date = get_post_meta($post->ID, 'dw_bulletin_date', true);
                $bulletin_date_formatted = get_post_meta($post->ID, 'dw_bulletin_date_formatted', true);
                
                // Use formatted date if available, otherwise format the date
                if ($bulletin_date_formatted) {
                    $post_date = $bulletin_date_formatted;
                } elseif ($bulletin_date) {
                    $post_date = date_i18n('Y년 m월 d일', strtotime($bulletin_date));
                } else {
                    $post_date = get_the_date('Y년 m월 d일', $post->ID);
                }
            ?>
                <div class="<?php echo esc_attr($item_class); ?>" data-hover="<?php echo esc_attr($hover_effect); ?>" data-shadow-color="<?php echo esc_attr($shadow_color); ?>">
                    <?php if ($featured_image): ?>
                        <div class="dw-bulletin-image">
                            <img src="<?php echo esc_url($featured_image); ?>" alt="<?php echo esc_attr($post->post_title); ?>" />
                        </div>
                    <?php endif; ?>
                    
                    <div class="dw-bulletin-content">
                        <div class="dw-bulletin-meta">
                            <span class="dw-bulletin-date"><?php echo esc_html($post_date); ?></span>
                            <?php if ($pdf_url): ?>
                                <span class="dw-bulletin-separator">|</span>
                                <a href="<?php echo esc_url($pdf_url); ?>" target="_blank" class="dw-bulletin-download">
                                    <?php _e('다운로드', 'dasom-church'); ?>
                                </a>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
    }
    
    /**
     * Render button template
     */
    private function render_button_template($posts, $layout_type = 'list') {
        $settings = $this->get_settings_for_display();
        $hover_effect = isset($settings['card_hover_effect']) ? $settings['card_hover_effect'] : 'lift';
        $shadow_color = isset($settings['card_hover_shadow_color']) ? $settings['card_hover_shadow_color'] : 'rgba(0, 0, 0, 0.2)';
        
        $container_class = $layout_type === 'grid' ? 'dw-bulletin-button-grid' : 'dw-bulletin-button-list';
        ?>
        <div class="<?php echo esc_attr($container_class); ?>">
            <?php foreach ($posts as $post): 
                $pdf_url = get_post_meta($post->ID, 'dw_bulletin_pdf', true);
                $bulletin_date = get_post_meta($post->ID, 'dw_bulletin_date', true);
                $bulletin_date_formatted = get_post_meta($post->ID, 'dw_bulletin_date_formatted', true);
                
                // Use formatted date if available, otherwise format the date
                if ($bulletin_date_formatted) {
                    $post_date = $bulletin_date_formatted;
                } elseif ($bulletin_date) {
                    $post_date = date_i18n('Y년 m월 d일', strtotime($bulletin_date));
                } else {
                    $post_date = get_the_date('Y년 m월 d일', $post->ID);
                }
                
                // Create title with date
                $title_with_date = $post_date . ' ' . $post->post_title;
            ?>
                <div class="dw-bulletin-item" data-hover="<?php echo esc_attr($hover_effect); ?>" data-shadow-color="<?php echo esc_attr($shadow_color); ?>">
                    <div class="dw-bulletin-title"><?php echo esc_html($title_with_date); ?></div>
                    <?php if ($pdf_url): ?>
                        <div class="dw-bulletin-download-container">
                            <a href="<?php echo esc_url($pdf_url); ?>" target="_blank" class="dw-bulletin-download">
                                <?php _e('주보 다운로드', 'dasom-church'); ?>
                            </a>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
    }
    
    /**
     * Render widget preview
     */
    protected function content_template() {
        ?>
        <div class="dw-bulletin-preview">
            <div class="dw-bulletin-item" style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px 20px; margin-bottom: 10px; background: #fff;">
                <div class="dw-bulletin-title" style="font-weight: 500; color: #333; margin-bottom: 5px;">
                    <?php _e('2025년 10월 26일 주보', 'dasom-church'); ?>
                </div>
                <div class="dw-bulletin-meta" style="font-size: 14px; color: #666;">
                    <span class="dw-bulletin-date">2025년 10월 26일</span>
                    <span class="dw-bulletin-separator" style="margin: 0 8px;">|</span>
                    <a href="#" class="dw-bulletin-download" style="background: #007cba; color: #fff; padding: 4px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;">
                        <?php _e('주보 다운로드', 'dasom-church'); ?>
                    </a>
                </div>
            </div>
        </div>
        <?php
    }
}