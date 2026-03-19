<?php
/**
 * DW Elementor Pastoral Column Widget
 *
 * @package Dasom_Church
 * @since 1.32.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Pastoral_Column_Widget extends \Elementor\Widget_Base {

    public function get_name() {
        return 'dw_pastoral_column';
    }

    public function get_title() {
        return __('DW Pastoral Column', 'dasom-church');
    }

    public function get_icon() {
        return 'eicon-post-content';
    }

    public function get_categories() {
        return ['general'];
    }

    public function get_keywords() {
        return ['column', 'pastoral', 'post', 'content'];
    }

    protected function register_controls() {
        
        // Content Tab - Query Section
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
                'label' => __('Source', 'dasom-church'),
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
                'label' => __('Select Column', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT2,
                'options' => $this->get_column_posts(),
                'condition' => [
                    'query_source' => 'manual',
                ],
            ]
        );

        $this->end_controls_section();

        // Content Tab - Layout Section
        $this->start_controls_section(
            'layout_section',
            [
                'label' => __('Layout', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );

        $this->add_control(
            'show_top_image',
            [
                'label' => __('Show Top Image', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );

        $this->add_control(
            'show_title',
            [
                'label' => __('Show Title', 'dasom-church'),
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
                'label' => __('Show Published Date', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );

        $this->add_control(
            'show_content',
            [
                'label' => __('Show Content', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );

        $this->add_control(
            'show_bottom_image',
            [
                'label' => __('Show Bottom Image', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );

        $this->add_control(
            'show_youtube',
            [
                'label' => __('Show YouTube', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );

        $this->add_control(
            'title_date_order',
            [
                'label' => __('Title & Date Order', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'title_first',
                'options' => [
                    'title_first' => __('Title → Date', 'dasom-church'),
                    'date_first' => __('Date → Title', 'dasom-church'),
                ],
            ]
        );

        $this->end_controls_section();

        // Style Tab - Container
        $this->start_controls_section(
            'container_style_section',
            [
                'label' => __('Container', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_responsive_control(
            'container_padding',
            [
                'label' => __('Padding', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-container' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_control(
            'container_bg_color',
            [
                'label' => __('Background Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-container' => 'background-color: {{VALUE}};',
                ],
            ]
        );

        $this->end_controls_section();

        // Style Tab - Top Image
        $this->start_controls_section(
            'top_image_style_section',
            [
                'label' => __('Top Image', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'show_top_image' => 'yes',
                ],
            ]
        );

        $this->add_control(
            'top_image_width_type',
            [
                'label' => __('Width', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'full',
                'options' => [
                    'full' => __('Full Size', 'dasom-church'),
                    'box' => __('Box Size', 'dasom-church'),
                    'custom' => __('Custom', 'dasom-church'),
                ],
            ]
        );

        $this->add_responsive_control(
            'top_image_width_custom',
            [
                'label' => __('Custom Width', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', '%', 'vw'],
                'range' => [
                    'px' => [
                        'min' => 100,
                        'max' => 2000,
                    ],
                    '%' => [
                        'min' => 10,
                        'max' => 100,
                    ],
                    'vw' => [
                        'min' => 10,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'size' => 100,
                    'unit' => '%',
                ],
                'condition' => [
                    'top_image_width_type' => 'custom',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-top-image img' => 'width: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->add_responsive_control(
            'top_image_height',
            [
                'label' => __('Height', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', 'vh'],
                'range' => [
                    'px' => [
                        'min' => 100,
                        'max' => 1000,
                    ],
                    'vh' => [
                        'min' => 10,
                        'max' => 100,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-top-image img' => 'height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->add_control(
            'top_image_object_fit',
            [
                'label' => __('Object Fit', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'cover',
                'options' => [
                    'cover' => __('Cover', 'dasom-church'),
                    'contain' => __('Contain', 'dasom-church'),
                    'fill' => __('Fill', 'dasom-church'),
                    'none' => __('None', 'dasom-church'),
                    'scale-down' => __('Scale Down', 'dasom-church'),
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-top-image img' => 'object-fit: {{VALUE}};',
                ],
            ]
        );

        $this->add_control(
            'top_image_object_position',
            [
                'label' => __('Object Position', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'center center',
                'options' => [
                    'center center' => __('Center Center', 'dasom-church'),
                    'center top' => __('Center Top', 'dasom-church'),
                    'center bottom' => __('Center Bottom', 'dasom-church'),
                    'left top' => __('Left Top', 'dasom-church'),
                    'left center' => __('Left Center', 'dasom-church'),
                    'left bottom' => __('Left Bottom', 'dasom-church'),
                    'right top' => __('Right Top', 'dasom-church'),
                    'right center' => __('Right Center', 'dasom-church'),
                    'right bottom' => __('Right Bottom', 'dasom-church'),
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-top-image img' => 'object-position: {{VALUE}};',
                ],
                'condition' => [
                    'top_image_object_fit!' => 'fill',
                ],
            ]
        );

        $this->add_responsive_control(
            'top_image_spacing',
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
                    'size' => 20,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-top-image' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Border::get_type(),
            [
                'name' => 'top_image_border',
                'selector' => '{{WRAPPER}} .dw-pastoral-column-top-image img',
            ]
        );

        $this->add_responsive_control(
            'top_image_border_radius',
            [
                'label' => __('Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%'],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-top-image img' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->end_controls_section();

        // Style Tab - Title
        $this->start_controls_section(
            'title_style_section',
            [
                'label' => __('Title', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'show_title' => 'yes',
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'title_typography',
                'selector' => '{{WRAPPER}} .dw-pastoral-column-title',
            ]
        );

        $this->add_control(
            'title_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#000000',
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-title' => 'color: {{VALUE}};',
                ],
            ]
        );

        $this->add_responsive_control(
            'title_align',
            [
                'label' => __('Alignment', 'dasom-church'),
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
                'default' => 'left',
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-title' => 'text-align: {{VALUE}};',
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
                    '{{WRAPPER}} .dw-pastoral-column-title' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->end_controls_section();

        // Style Tab - Date
        $this->start_controls_section(
            'date_style_section',
            [
                'label' => __('Published Date', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'show_date' => 'yes',
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'date_typography',
                'selector' => '{{WRAPPER}} .dw-pastoral-column-date',
            ]
        );

        $this->add_control(
            'date_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#888888',
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-date' => 'color: {{VALUE}};',
                ],
            ]
        );

        $this->add_responsive_control(
            'date_align',
            [
                'label' => __('Alignment', 'dasom-church'),
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
                'default' => 'left',
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-date' => 'text-align: {{VALUE}};',
                ],
            ]
        );

        $this->add_responsive_control(
            'date_spacing',
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
                    '{{WRAPPER}} .dw-pastoral-column-date' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->end_controls_section();

        // Style Tab - Content
        $this->start_controls_section(
            'content_style_section',
            [
                'label' => __('Content', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'show_content' => 'yes',
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'content_typography',
                'selector' => '{{WRAPPER}} .dw-pastoral-column-content',
            ]
        );

        $this->add_control(
            'content_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#666666',
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-content' => 'color: {{VALUE}};',
                ],
            ]
        );

        $this->add_responsive_control(
            'content_spacing',
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
                    'size' => 20,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-content' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->end_controls_section();

        // Style Tab - Bottom Image
        $this->start_controls_section(
            'bottom_image_style_section',
            [
                'label' => __('Bottom Image', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'show_bottom_image' => 'yes',
                ],
            ]
        );

        $this->add_control(
            'bottom_image_width_type',
            [
                'label' => __('Width', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'full',
                'options' => [
                    'full' => __('Full Size', 'dasom-church'),
                    'box' => __('Box Size', 'dasom-church'),
                    'custom' => __('Custom', 'dasom-church'),
                ],
            ]
        );

        $this->add_responsive_control(
            'bottom_image_width_custom',
            [
                'label' => __('Custom Width', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', '%', 'vw'],
                'range' => [
                    'px' => [
                        'min' => 100,
                        'max' => 2000,
                    ],
                    '%' => [
                        'min' => 10,
                        'max' => 100,
                    ],
                    'vw' => [
                        'min' => 10,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'size' => 100,
                    'unit' => '%',
                ],
                'condition' => [
                    'bottom_image_width_type' => 'custom',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-bottom-image img' => 'width: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->add_responsive_control(
            'bottom_image_height',
            [
                'label' => __('Height', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', 'vh'],
                'range' => [
                    'px' => [
                        'min' => 100,
                        'max' => 1000,
                    ],
                    'vh' => [
                        'min' => 10,
                        'max' => 100,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-bottom-image img' => 'height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->add_control(
            'bottom_image_object_fit',
            [
                'label' => __('Object Fit', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'cover',
                'options' => [
                    'cover' => __('Cover', 'dasom-church'),
                    'contain' => __('Contain', 'dasom-church'),
                    'fill' => __('Fill', 'dasom-church'),
                    'none' => __('None', 'dasom-church'),
                    'scale-down' => __('Scale Down', 'dasom-church'),
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-bottom-image img' => 'object-fit: {{VALUE}};',
                ],
            ]
        );

        $this->add_control(
            'bottom_image_object_position',
            [
                'label' => __('Object Position', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'center center',
                'options' => [
                    'center center' => __('Center Center', 'dasom-church'),
                    'center top' => __('Center Top', 'dasom-church'),
                    'center bottom' => __('Center Bottom', 'dasom-church'),
                    'left top' => __('Left Top', 'dasom-church'),
                    'left center' => __('Left Center', 'dasom-church'),
                    'left bottom' => __('Left Bottom', 'dasom-church'),
                    'right top' => __('Right Top', 'dasom-church'),
                    'right center' => __('Right Center', 'dasom-church'),
                    'right bottom' => __('Right Bottom', 'dasom-church'),
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-bottom-image img' => 'object-position: {{VALUE}};',
                ],
                'condition' => [
                    'bottom_image_object_fit!' => 'fill',
                ],
            ]
        );

        $this->add_responsive_control(
            'bottom_image_spacing',
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
                    'size' => 20,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-bottom-image' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Border::get_type(),
            [
                'name' => 'bottom_image_border',
                'selector' => '{{WRAPPER}} .dw-pastoral-column-bottom-image img',
            ]
        );

        $this->add_responsive_control(
            'bottom_image_border_radius',
            [
                'label' => __('Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%'],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-bottom-image img' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->end_controls_section();

        // Style Tab - YouTube
        $this->start_controls_section(
            'youtube_style_section',
            [
                'label' => __('YouTube', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'show_youtube' => 'yes',
                ],
            ]
        );

        $this->add_responsive_control(
            'youtube_aspect_ratio',
            [
                'label' => __('Aspect Ratio', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => '16:9',
                'options' => [
                    '16:9' => __('16:9', 'dasom-church'),
                    '4:3' => __('4:3', 'dasom-church'),
                    '1:1' => __('1:1', 'dasom-church'),
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Border::get_type(),
            [
                'name' => 'youtube_border',
                'selector' => '{{WRAPPER}} .dw-pastoral-column-youtube',
            ]
        );

        $this->add_responsive_control(
            'youtube_border_radius',
            [
                'label' => __('Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%'],
                'selectors' => [
                    '{{WRAPPER}} .dw-pastoral-column-youtube' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};overflow:hidden;',
                ],
            ]
        );

        $this->end_controls_section();
    }

    private function get_column_posts() {
        return dasom_church_get_post_options('column');
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
                'post_type' => 'column',
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
            echo '<p>' . __('No column found.', 'dasom-church') . '</p>';
            return;
        }

        // Get column data
        $title = get_the_title($post_id);
        $content = get_post_field('post_content', $post_id);
        $date = get_the_date('Y년 n월 j일', $post_id);
        $top_image_id = get_post_meta($post_id, 'dw_column_top_image', true);
        $bottom_image_id = get_post_meta($post_id, 'dw_column_bottom_image', true);
        $youtube_url = get_post_meta($post_id, 'dw_column_youtube', true);

        $top_image_url = $top_image_id ? wp_get_attachment_url($top_image_id) : '';
        $bottom_image_url = $bottom_image_id ? wp_get_attachment_url($bottom_image_id) : '';

        // Extract YouTube video ID
        $youtube_id = '';
        if ($youtube_url) {
            preg_match('/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/', $youtube_url, $matches);
            $youtube_id = $matches[1] ?? '';
        }

        $aspect_ratio = $settings['youtube_aspect_ratio'] ?? '16:9';
        $aspect_map = [
            '16:9' => '56.25%',
            '4:3' => '75%',
            '1:1' => '100%',
        ];
        $padding_top = $aspect_map[$aspect_ratio] ?? '56.25%';

        // Image width styles
        $top_width_type = $settings['top_image_width_type'] ?? 'full';
        $top_width_style = '';
        if ($top_width_type === 'full') {
            $top_width_style = 'width:100%;';
        } elseif ($top_width_type === 'box') {
            $top_width_style = 'max-width:1140px;margin-left:auto;margin-right:auto;width:100%;';
        }
        // Custom width is handled by Elementor controls

        $bottom_width_type = $settings['bottom_image_width_type'] ?? 'full';
        $bottom_width_style = '';
        if ($bottom_width_type === 'full') {
            $bottom_width_style = 'width:100%;';
        } elseif ($bottom_width_type === 'box') {
            $bottom_width_style = 'max-width:1140px;margin-left:auto;margin-right:auto;width:100%;';
        }

        ?>
        <div class="dw-pastoral-column-wrapper">
            <div class="dw-pastoral-column-container">
                <?php if (($settings['show_top_image'] ?? 'yes') === 'yes' && $top_image_url): ?>
                <div class="dw-pastoral-column-top-image">
                    <img src="<?php echo esc_url($top_image_url); ?>" alt="<?php echo esc_attr($title); ?>" style="<?php echo esc_attr($top_width_style); ?>display:block;" />
                </div>
                <?php endif; ?>

                <?php 
                $title_date_order = $settings['title_date_order'] ?? 'title_first';
                if ($title_date_order === 'date_first'): 
                ?>
                    <?php if (($settings['show_date'] ?? 'yes') === 'yes'): ?>
                    <div class="dw-pastoral-column-date"><?php echo esc_html($date); ?></div>
                    <?php endif; ?>
                    
                    <?php if (($settings['show_title'] ?? 'yes') === 'yes'): ?>
                    <h2 class="dw-pastoral-column-title"><?php echo esc_html($title); ?></h2>
                    <?php endif; ?>
                <?php else: ?>
                    <?php if (($settings['show_title'] ?? 'yes') === 'yes'): ?>
                    <h2 class="dw-pastoral-column-title"><?php echo esc_html($title); ?></h2>
                    <?php endif; ?>
                    
                    <?php if (($settings['show_date'] ?? 'yes') === 'yes'): ?>
                    <div class="dw-pastoral-column-date"><?php echo esc_html($date); ?></div>
                    <?php endif; ?>
                <?php endif; ?>

                <?php if (($settings['show_content'] ?? 'yes') === 'yes' && $content): ?>
                <div class="dw-pastoral-column-content"><?php echo wp_kses_post(wpautop($content)); ?></div>
                <?php endif; ?>

                <?php if (($settings['show_bottom_image'] ?? 'yes') === 'yes' && $bottom_image_url): ?>
                <div class="dw-pastoral-column-bottom-image">
                    <img src="<?php echo esc_url($bottom_image_url); ?>" alt="" style="<?php echo esc_attr($bottom_width_style); ?>display:block;" />
                </div>
                <?php endif; ?>

                <?php if (($settings['show_youtube'] ?? 'yes') === 'yes' && $youtube_id): ?>
                <div class="dw-pastoral-column-youtube" style="position:relative;padding-top:<?php echo esc_attr($padding_top); ?>;height:0;overflow:hidden;">
                    <iframe 
                        src="https://www.youtube.com/embed/<?php echo esc_attr($youtube_id); ?>" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen
                        style="position:absolute;top:0;left:0;width:100%;height:100%;">
                    </iframe>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }
}

