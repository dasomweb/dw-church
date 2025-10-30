<?php
/**
 * DW Elementor Bulletin Widget
 *
 * @package DW_Church
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
        return __('DW Recent Bulletin', 'dw-church');
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
                'label' => __('Bulletin Settings', 'dw-church'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'query_source',
            [
                'label' => __('Query Source', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'latest',
                'options' => [
                    'latest' => __('Latest Posts', 'dw-church'),
                    'current' => __('Current Post', 'dw-church'),
                    'manual' => __('Manual Selection', 'dw-church'),
                ],
            ]
        );
        
        $this->add_control(
            'bulletin_posts',
            [
                'label' => __('Select Bulletins', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT2,
                'multiple' => true,
                'options' => $this->get_bulletin_posts(),
                'condition' => [
                    'query_source' => 'manual',
                ],
            ]
        );
        
        
        $this->add_control(
            'display_type',
            [
                'label' => __('Display Type', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'image',
                'options' => [
                    'image' => __('Image Template', 'dw-church'),
                    'button' => __('Button Template', 'dw-church'),
                ],
            ]
        );
        
        $this->add_control(
            'show_bulletin_text',
            [
                'label' => __('Show "교회주보" Text', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Show', 'dw-church'),
                'label_off' => __('Hide', 'dw-church'),
                'return_value' => 'yes',
                'default' => 'no',
                'description' => __('Add "교회주보" text after the date', 'dw-church'),
            ]
        );
        
        $this->add_control(
            'enable_pagination',
            [
                'label' => __('Enable Pagination', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Enable', 'dw-church'),
                'label_off' => __('Disable', 'dw-church'),
                'return_value' => 'yes',
                'default' => 'no',
                'description' => __('Show pagination controls for bulletin posts', 'dw-church'),
            ]
        );
        
        $this->add_control(
            'posts_per_page',
            [
                'label' => __('Posts Per Page', 'dw-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 6,
                'min' => 1,
                'max' => 50,
                'condition' => [
                    'enable_pagination' => 'yes',
                ],
                'description' => __('Number of posts to show per page', 'dw-church'),
            ]
        );
        
        $this->add_control(
            'layout_type',
            [
                'label' => __('Layout Type', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'list',
                'options' => [
                    'list' => __('List Layout', 'dw-church'),
                    'grid' => __('Grid Layout', 'dw-church'),
                ],
            ]
        );
        
        $this->add_responsive_control(
            'grid_columns',
            [
                'label' => __('Columns', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => '3',
                'options' => [
                    '1' => __('1 Column', 'dw-church'),
                    '2' => __('2 Columns', 'dw-church'),
                    '3' => __('3 Columns', 'dw-church'),
                    '4' => __('4 Columns', 'dw-church'),
                    '5' => __('5 Columns', 'dw-church'),
                    '6' => __('6 Columns', 'dw-church'),
                ],
                'condition' => [
                    'layout_type' => 'grid',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-image-grid' => 'grid-template-columns: repeat({{VALUE}}, 1fr);',
                    '{{WRAPPER}} .dw-bulletin-button-grid' => 'grid-template-columns: repeat({{VALUE}}, 1fr);',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'grid_gap_horizontal',
            [
                'label' => __('Grid Gap (Horizontal)', 'dw-church'),
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
                    '{{WRAPPER}} .dw-bulletin-image-grid' => 'column-gap: {{SIZE}}{{UNIT}};',
                    '{{WRAPPER}} .dw-bulletin-button-grid' => 'column-gap: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'grid_gap_vertical',
            [
                'label' => __('Grid Gap (Vertical)', 'dw-church'),
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
                    '{{WRAPPER}} .dw-bulletin-image-grid' => 'row-gap: {{SIZE}}{{UNIT}};',
                    '{{WRAPPER}} .dw-bulletin-button-grid' => 'row-gap: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Image Template Style Section
        $this->start_controls_section(
            'dw_bulletin_image_style_section',
            [
                'label' => __('Image Template Style', 'dw-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'display_type' => 'image',
                ],
            ]
        );
        
        $this->add_control(
            'image_style_heading',
            [
                'label' => __('Image Settings', 'dw-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_control(
            'image_size_type',
            [
                'label' => __('Image Size Type', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'aspect_ratio',
                'options' => [
                    'aspect_ratio' => __('Aspect Ratio', 'dw-church'),
                    'custom' => __('Custom Size', 'dw-church'),
                ],
            ]
        );
        
        $this->add_control(
            'image_aspect_ratio',
            [
                'label' => __('Aspect Ratio', 'dw-church'),
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
                'label' => __('Image Width', 'dw-church'),
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
                'label' => __('Image Height', 'dw-church'),
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
                'label' => __('Image Position', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'left',
                'options' => [
                    'left' => __('Left', 'dw-church'),
                    'top' => __('Top', 'dw-church'),
                ],
            ]
        );
        
        $this->add_control(
            'image_border_radius',
            [
                'label' => __('Image Border Radius', 'dw-church'),
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
                'label' => __('Image Border', 'dw-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-image',
            ]
        );
        
        $this->add_control(
            'image_overlay',
            [
                'label' => __('Image Overlay', 'dw-church'),
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
                'label' => __('Overlay Opacity', 'dw-church'),
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
                'label' => __('Content Settings', 'dw-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'title_typography',
                'label' => __('Title Typography', 'dw-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-title',
            ]
        );
        
        $this->add_control(
            'title_color',
            [
                'label' => __('Title Color', 'dw-church'),
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
                'label' => __('Date Typography', 'dw-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-date',
            ]
        );
        
        $this->add_control(
            'date_color',
            [
                'label' => __('Date Color', 'dw-church'),
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
                'label' => __('Download Button Style', 'dw-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_control(
            'download_button_background',
            [
                'label' => __('Button Background', 'dw-church'),
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
                'label' => __('Button Text Color', 'dw-church'),
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
                'label' => __('Button Border Radius', 'dw-church'),
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
                'label' => __('Button Padding', 'dw-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em'],
                'default' => [
                    'top' => 15,
                    'right' => 20,
                    'bottom' => 15,
                    'left' => 20,
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
                'label' => __('Button Template Style', 'dw-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'display_type' => 'button',
                ],
            ]
        );
        
        $this->add_control(
            'button_item_style_heading',
            [
                'label' => __('Button Item Style', 'dw-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_control(
            'button_background_color',
            [
                'label' => __('Background Color', 'dw-church'),
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
                'label' => __('Border Color', 'dw-church'),
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
                'label' => __('Border Radius', 'dw-church'),
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
                'label' => __('Padding', 'dw-church'),
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
                'label' => __('Margin', 'dw-church'),
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
                'label' => __('Hover Effect', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'lift',
                'options' => [
                    'none' => __('None', 'dw-church'),
                    'lift' => __('Lift', 'dw-church'),
                    'shadow' => __('Shadow', 'dw-church'),
                    'scale' => __('Scale', 'dw-church'),
                ],
            ]
        );
        
        $this->add_control(
            'button_title_style_heading',
            [
                'label' => __('Title Style', 'dw-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'button_title_typography',
                'label' => __('Typography', 'dw-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-item .dw-bulletin-title',
            ]
        );
        
        $this->add_control(
            'button_title_color',
            [
                'label' => __('Color', 'dw-church'),
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
                'label' => __('Date & Download Style', 'dw-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'button_date_typography',
                'label' => __('Date Typography', 'dw-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-item .dw-bulletin-date',
            ]
        );
        
        $this->add_control(
            'button_date_color',
            [
                'label' => __('Date Color', 'dw-church'),
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
                'label' => __('Download Button Background', 'dw-church'),
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
                'label' => __('Download Button Text Color', 'dw-church'),
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
                'label' => __('Download Button Border Radius', 'dw-church'),
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
                'label' => __('Download Button Padding', 'dw-church'),
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
                'label' => __('Card Style', 'dw-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'card_background_color',
            [
                'label' => __('Card Background Color', 'dw-church'),
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
                'label' => __('Card Border', 'dw-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-image-item, {{WRAPPER}} .dw-bulletin-item',
            ]
        );
        
        $this->add_control(
            'card_border_radius',
            [
                'label' => __('Card Border Radius', 'dw-church'),
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
                'label' => __('Card Shadow', 'dw-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-image-item, {{WRAPPER}} .dw-bulletin-item',
            ]
        );
        
        $this->add_control(
            'card_padding',
            [
                'label' => __('Card Padding', 'dw-church'),
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
                'label' => __('Card Margin', 'dw-church'),
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
                'label' => __('Card Hover Effect', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'lift',
                'options' => [
                    'none' => __('None', 'dw-church'),
                    'lift' => __('Lift', 'dw-church'),
                    'shadow' => __('Shadow', 'dw-church'),
                    'scale' => __('Scale', 'dw-church'),
                    'glow' => __('Glow', 'dw-church'),
                ],
            ]
        );
        
        $this->add_control(
            'card_hover_shadow_color',
            [
                'label' => __('Hover Shadow Color', 'dw-church'),
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
                'label' => __('General Style', 'dw-church'),
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
        
        // Pagination setup
        $paged = get_query_var('paged') ? get_query_var('paged') : 1;
        $posts_per_page = isset($settings['enable_pagination']) && $settings['enable_pagination'] === 'yes' 
            ? $settings['posts_per_page'] 
            : (isset($settings['posts_per_page']) ? $settings['posts_per_page'] : 10);
        
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
            // Latest posts with pagination
            $posts = get_posts([
                'post_type' => 'bulletin',
                'posts_per_page' => $posts_per_page,
                'post_status' => 'publish',
                'orderby' => 'date',
                'order' => 'DESC',
                'paged' => $paged,
            ]);
        }
        
        if (empty($posts)) {
            echo '<p>' . __('No bulletins found.', 'dw-church') . '</p>';
            return;
        }
        
        $display_type = $settings['display_type'];
        $layout_type = isset($settings['layout_type']) ? $settings['layout_type'] : 'list';
        
        if ($display_type === 'image') {
            $this->render_image_template($posts, $layout_type);
        } else {
            $this->render_button_template($posts, $layout_type);
        }
        
        // Render pagination if enabled
        if (isset($settings['enable_pagination']) && $settings['enable_pagination'] === 'yes' && $settings['query_source'] === 'latest') {
            $this->render_pagination($posts_per_page, $paged);
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
                    // Use the same approach as gallery widget - no forced HTTPS
                $bulletin_date = get_post_meta($post->ID, 'dw_bulletin_date', true);
                $bulletin_date_formatted = get_post_meta($post->ID, 'dw_bulletin_date_formatted', true);
                
                // Use formatted date if available, otherwise format the date
                if ($bulletin_date_formatted) {
                    $post_date = $bulletin_date_formatted;
                } elseif ($bulletin_date) {
                    $post_date = date_i18n('Y??m??d??, strtotime($bulletin_date));
                } else {
                    $post_date = get_the_date('Y??m??d??, $post->ID);
                }
                
                // Add "교회주보" text if enabled
                if (isset($settings['show_bulletin_text']) && $settings['show_bulletin_text'] === 'yes') {
                    $post_date .= ' 교회주보';
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
                            <span class="dw-bulletin-separator">|</span>
                            <a href="<?php echo esc_url(get_permalink($post->ID)); ?>" class="dw-bulletin-view dw-bulletin-link" data-no-lightbox="true">
                                <?php _e('주보보기', 'dw-church'); ?>
                            </a>
                            <?php if ($pdf_url): ?>
                                <span class="dw-bulletin-separator">|</span>
                                <a href="<?php echo esc_url($pdf_url); ?>" target="_blank" class="dw-bulletin-download">
                                    <?php _e('?�운로드', 'dw-church'); ?>
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
                
                // Use formatted date if available, otherwise use raw date
                if ($bulletin_date_formatted) {
                    $display_text = $bulletin_date_formatted;
                } elseif ($bulletin_date) {
                    $display_text = $bulletin_date;
                } else {
                    $display_text = get_the_date('Y??m??d??, $post->ID);
                }
                
                // Add "교회주보" text if enabled
                if (isset($settings['show_bulletin_text']) && $settings['show_bulletin_text'] === 'yes') {
                    $display_text .= ' 교회주보';
                }
            ?>
                <div class="dw-bulletin-item" data-hover="<?php echo esc_attr($hover_effect); ?>" data-shadow-color="<?php echo esc_attr($shadow_color); ?>">
                    <div class="dw-bulletin-title"><?php echo esc_html($display_text); ?></div>
                    <div class="dw-bulletin-download-container">
                        <a href="<?php echo esc_url(get_permalink($post->ID)); ?>" class="dw-bulletin-view">
                            <?php _e('주보보기', 'dw-church'); ?>
                        </a>
                        <?php if ($pdf_url): ?>
                            <a href="<?php echo esc_url($pdf_url); ?>" target="_blank" class="dw-bulletin-download">
                                <?php _e('주보 ?�운로드', 'dw-church'); ?>
                            </a>
                        <?php endif; ?>
                    </div>
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
                    <?php _e('2025??10??26??주보', 'dw-church'); ?>
                </div>
                <div class="dw-bulletin-meta" style="font-size: 14px; color: #666;">
                    <span class="dw-bulletin-date">2025??10??26??/span>
                    <span class="dw-bulletin-separator" style="margin: 0 8px;">|</span>
                    <a href="#" class="dw-bulletin-download" style="background: #007cba; color: #fff; padding: 4px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;">
                        <?php _e('주보 ?�운로드', 'dw-church'); ?>
                    </a>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render pagination
     */
    private function render_pagination($posts_per_page, $current_page) {
        // Get total number of bulletin posts
        $total_posts = wp_count_posts('bulletin');
        $total_posts = $total_posts->publish;
        
        if ($total_posts <= $posts_per_page) {
            return; // No pagination needed
        }
        
        $total_pages = ceil($total_posts / $posts_per_page);
        
        if ($total_pages <= 1) {
            return; // No pagination needed
        }
        
        $current_url = get_permalink();
        $current_url = remove_query_arg('paged', $current_url);
        
        ?>
        <div class="dw-bulletin-pagination">
            <div class="dw-pagination-wrapper">
                <?php if ($current_page > 1): ?>
                    <a href="<?php echo esc_url(add_query_arg('paged', $current_page - 1, $current_url)); ?>" class="dw-pagination-prev">
                        <?php _e('?�전', 'dw-church'); ?>
                    </a>
                <?php endif; ?>
                
                <div class="dw-pagination-numbers">
                    <?php
                    $start_page = max(1, $current_page - 2);
                    $end_page = min($total_pages, $current_page + 2);
                    
                    if ($start_page > 1) {
                        echo '<a href="' . esc_url(add_query_arg('paged', 1, $current_url)) . '" class="dw-pagination-number">1</a>';
                        if ($start_page > 2) {
                            echo '<span class="dw-pagination-dots">...</span>';
                        }
                    }
                    
                    for ($i = $start_page; $i <= $end_page; $i++) {
                        $class = ($i == $current_page) ? 'dw-pagination-number current' : 'dw-pagination-number';
                        $url = ($i == $current_page) ? '#' : add_query_arg('paged', $i, $current_url);
                        echo '<a href="' . esc_url($url) . '" class="' . esc_attr($class) . '">' . $i . '</a>';
                    }
                    
                    if ($end_page < $total_pages) {
                        if ($end_page < $total_pages - 1) {
                            echo '<span class="dw-pagination-dots">...</span>';
                        }
                        echo '<a href="' . esc_url(add_query_arg('paged', $total_pages, $current_url)) . '" class="dw-pagination-number">' . $total_pages . '</a>';
                    }
                    ?>
                </div>
                
                <?php if ($current_page < $total_pages): ?>
                    <a href="<?php echo esc_url(add_query_arg('paged', $current_page + 1, $current_url)); ?>" class="dw-pagination-next">
                        <?php _e('?�음', 'dw-church'); ?>
                    </a>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }
}
