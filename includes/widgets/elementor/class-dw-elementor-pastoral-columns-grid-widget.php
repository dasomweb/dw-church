<?php
/**
 * DW Elementor Pastoral Columns Recent Grid Widget
 *
 * @package DW_Church
 * @since 1.32.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Pastoral_Columns_Grid_Widget extends \Elementor\Widget_Base {

    public function get_name() {
        return 'dw_pastoral_columns_grid';
    }

    public function get_title() {
        return __('DW Pastoral Columns Recent Grid', 'dw-church');
    }

    public function get_icon() {
        return 'eicon-posts-grid';
    }

    public function get_categories() {
        return ['general'];
    }

    public function get_keywords() {
        return ['column', 'pastoral', 'grid', 'posts'];
    }

    protected function register_controls() {

        // Content Tab - Settings
        $this->start_controls_section(
            'content_section',
            [
                'label' => __('Settings', 'dw-church'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );

        $this->add_control(
            'posts_per_page',
            [
                'label' => __('Number of Columns', 'dw-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 6,
                'min' => 1,
                'max' => 50,
            ]
        );

        $this->add_control(
            'layout',
            [
                'label' => __('Layout', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'grid',
                'options' => [
                    'grid' => __('Grid', 'dw-church'),
                    'list' => __('List', 'dw-church'),
                ],
            ]
        );

        $this->add_responsive_control(
            'columns',
            [
                'label' => __('Columns', 'dw-church'),
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
                'label' => __('Show Thumbnail', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dw-church'),
                'label_off' => __('No', 'dw-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );

        $this->add_control(
            'thumbnail_size',
            [
                'label' => __('Thumbnail Size', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'medium',
                'options' => [
                    'thumbnail' => __('Thumbnail (150x150)', 'dw-church'),
                    'medium' => __('Medium (300x300)', 'dw-church'),
                    'medium_large' => __('Medium Large (768x768)', 'dw-church'),
                    'large' => __('Large (1024x1024)', 'dw-church'),
                    'full' => __('Full', 'dw-church'),
                ],
                'condition' => [
                    'show_thumbnail' => 'yes',
                ],
            ]
        );

        $this->add_control(
            'show_date',
            [
                'label' => __('Show Date', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dw-church'),
                'label_off' => __('No', 'dw-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );

        $this->add_control(
            'show_excerpt',
            [
                'label' => __('Show Excerpt', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dw-church'),
                'label_off' => __('No', 'dw-church'),
                'return_value' => 'yes',
                'default' => 'no',
            ]
        );

        $this->add_control(
            'excerpt_length',
            [
                'label' => __('Excerpt Length', 'dw-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 20,
                'min' => 5,
                'max' => 100,
                'condition' => [
                    'show_excerpt' => 'yes',
                ],
            ]
        );

        $this->add_control(
            'enable_pagination',
            [
                'label' => __('Enable Pagination', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dw-church'),
                'label_off' => __('No', 'dw-church'),
                'return_value' => 'yes',
                'default' => 'no',
            ]
        );

        $this->end_controls_section();

        // Style Tab - Card Style
        $this->start_controls_section(
            'card_style_section',
            [
                'label' => __('Card Style', 'dw-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_responsive_control(
            'card_padding',
            [
                'label' => __('Padding', 'dw-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'default' => [
                    'top' => 20,
                    'right' => 20,
                    'bottom' => 20,
                    'left' => 20,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .pastoral-column-card' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_control(
            'card_bg_color',
            [
                'label' => __('Background Color', 'dw-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .pastoral-column-card' => 'background-color: {{VALUE}};',
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Border::get_type(),
            [
                'name' => 'card_border',
                'selector' => '{{WRAPPER}} .pastoral-column-card',
            ]
        );

        $this->add_responsive_control(
            'card_border_radius',
            [
                'label' => __('Border Radius', 'dw-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%'],
                'selectors' => [
                    '{{WRAPPER}} .pastoral-column-card' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'card_box_shadow',
                'selector' => '{{WRAPPER}} .pastoral-column-card',
            ]
        );

        $this->end_controls_section();

        // Style Tab - Thumbnail
        $this->start_controls_section(
            'thumbnail_style_section',
            [
                'label' => __('Thumbnail', 'dw-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'show_thumbnail' => 'yes',
                ],
            ]
        );

        $this->add_responsive_control(
            'thumbnail_height',
            [
                'label' => __('Height', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 100,
                        'max' => 500,
                    ],
                ],
                'default' => [
                    'size' => 200,
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .pastoral-column-thumbnail img' => 'height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->add_control(
            'thumbnail_object_fit',
            [
                'label' => __('Object Fit', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'cover',
                'options' => [
                    'cover' => __('Cover', 'dw-church'),
                    'contain' => __('Contain', 'dw-church'),
                    'fill' => __('Fill', 'dw-church'),
                    'none' => __('None', 'dw-church'),
                ],
                'selectors' => [
                    '{{WRAPPER}} .pastoral-column-thumbnail img' => 'object-fit: {{VALUE}};',
                ],
            ]
        );

        $this->add_responsive_control(
            'thumbnail_border_radius',
            [
                'label' => __('Border Radius', 'dw-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%'],
                'selectors' => [
                    '{{WRAPPER}} .pastoral-column-thumbnail img' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_responsive_control(
            'thumbnail_spacing',
            [
                'label' => __('Spacing', 'dw-church'),
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
                    '{{WRAPPER}} .pastoral-column-thumbnail' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->end_controls_section();

        // Style Tab - Title
        $this->start_controls_section(
            'title_style_section',
            [
                'label' => __('Title', 'dw-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'title_typography',
                'selector' => '{{WRAPPER}} .pastoral-column-title',
            ]
        );

        $this->add_control(
            'title_color',
            [
                'label' => __('Color', 'dw-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#000000',
                'selectors' => [
                    '{{WRAPPER}} .pastoral-column-title' => 'color: {{VALUE}};',
                    '{{WRAPPER}} .pastoral-column-title a' => 'color: {{VALUE}};',
                ],
            ]
        );

        $this->add_control(
            'title_hover_color',
            [
                'label' => __('Hover Color', 'dw-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .pastoral-column-title a:hover' => 'color: {{VALUE}};',
                ],
            ]
        );

        $this->add_responsive_control(
            'title_spacing',
            [
                'label' => __('Spacing', 'dw-church'),
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
                    '{{WRAPPER}} .pastoral-column-title' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->end_controls_section();

        // Style Tab - Date
        $this->start_controls_section(
            'date_style_section',
            [
                'label' => __('Date', 'dw-church'),
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
                'selector' => '{{WRAPPER}} .pastoral-column-date',
            ]
        );

        $this->add_control(
            'date_color',
            [
                'label' => __('Color', 'dw-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#888888',
                'selectors' => [
                    '{{WRAPPER}} .pastoral-column-date' => 'color: {{VALUE}};',
                ],
            ]
        );

        $this->add_responsive_control(
            'date_spacing',
            [
                'label' => __('Spacing', 'dw-church'),
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
                    '{{WRAPPER}} .pastoral-column-date' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->end_controls_section();

        // Style Tab - Excerpt
        $this->start_controls_section(
            'excerpt_style_section',
            [
                'label' => __('Excerpt', 'dw-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'show_excerpt' => 'yes',
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'excerpt_typography',
                'selector' => '{{WRAPPER}} .pastoral-column-excerpt',
            ]
        );

        $this->add_control(
            'excerpt_color',
            [
                'label' => __('Color', 'dw-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#666666',
                'selectors' => [
                    '{{WRAPPER}} .pastoral-column-excerpt' => 'color: {{VALUE}};',
                ],
            ]
        );

        $this->end_controls_section();

        // Style Tab - Pagination
        $this->start_controls_section(
            'pagination_style_section',
            [
                'label' => __('Pagination Style', 'dw-church'),
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
                'label' => __('Typography', 'dw-church'),
                'selector' => '{{WRAPPER}} .dw-pagination a, {{WRAPPER}} .dw-pagination span',
            ]
        );

        $this->add_responsive_control(
            'pagination_spacing',
            [
                'label' => __('Spacing', 'dw-church'),
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
                'label' => __('Text Color', 'dw-church'),
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
                'label' => __('Background Color', 'dw-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#f5f5f5',
                'selectors' => [
                    '{{WRAPPER}} .dw-pagination a' => 'background-color: {{VALUE}};',
                ],
            ]
        );

        $this->add_control(
            'pagination_border_color',
            [
                'label' => __('Border Color', 'dw-church'),
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
                'label' => __('Active Text Color', 'dw-church'),
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
                'label' => __('Active Background Color', 'dw-church'),
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

        $args = array(
            'post_type' => 'column',
            'posts_per_page' => $settings['posts_per_page'],
            'post_status' => 'publish',
            'orderby' => 'date',
            'order' => 'DESC',
        );

        // Add pagination if enabled
        if ($enable_pagination === 'yes') {
            $args['paged'] = $paged;
        }

        $columns = new WP_Query($args);

        if (!$columns->have_posts()) {
            echo '<p>' . __('No columns found.', 'dw-church') . '</p>';
            return;
        }

        $layout = $settings['layout'];
        $columns_count = $settings['columns'] ?? 3;
        $columns_tablet = $settings['columns_tablet'] ?? 2;
        $columns_mobile = $settings['columns_mobile'] ?? 1;

        ?>
        <div class="pastoral-columns-wrapper pastoral-columns-<?php echo esc_attr($layout); ?>">
            <?php
            while ($columns->have_posts()) {
                $columns->the_post();

                $thumbnail_url = '';
                if (($settings['show_thumbnail'] ?? 'yes') === 'yes') {
                    $thumbnail_size = $settings['thumbnail_size'] ?? 'medium';
                    $thumbnail_id = get_post_thumbnail_id();
                    if (!$thumbnail_id) {
                        $thumbnail_id = get_post_meta(get_the_ID(), 'dw_column_top_image', true);
                    }
                    if ($thumbnail_id) {
                        $thumbnail_url = wp_get_attachment_image_url($thumbnail_id, $thumbnail_size);
                    }
                }

                ?>
                <div class="pastoral-column-card">
                    <?php if ($thumbnail_url): ?>
                    <div class="pastoral-column-thumbnail">
                        <a href="<?php the_permalink(); ?>">
                            <img src="<?php echo esc_url($thumbnail_url); ?>" alt="<?php the_title_attribute(); ?>" style="width:100%;display:block;" />
                        </a>
                    </div>
                    <?php endif; ?>

                    <h3 class="pastoral-column-title">
                        <a href="<?php the_permalink(); ?>" style="text-decoration:none;">
                            <?php the_title(); ?>
                        </a>
                    </h3>

                    <?php if (($settings['show_date'] ?? 'yes') === 'yes'): ?>
                    <div class="pastoral-column-date">
                        <?php echo get_the_date('Y??n??j??); ?>
                    </div>
                    <?php endif; ?>

                    <?php if (($settings['show_excerpt'] ?? 'no') === 'yes'): ?>
                    <div class="pastoral-column-excerpt">
                        <?php
                        $excerpt_length = $settings['excerpt_length'] ?? 20;
                        echo wp_trim_words(get_the_excerpt(), $excerpt_length, '...');
                        ?>
                    </div>
                    <?php endif; ?>
                </div>
                <?php
            }
            ?>
        </div>

        <style>
            .pastoral-columns-wrapper {
                width: 100%;
            }
            .pastoral-columns-grid {
                display: grid;
                grid-template-columns: repeat(<?php echo esc_attr($columns_count); ?>, 1fr);
                gap: 30px;
            }
            .pastoral-columns-list {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .pastoral-column-card {
                transition: transform 0.3s ease;
            }
            .pastoral-column-card:hover {
                transform: translateY(-5px);
            }
            .pastoral-column-title a {
                text-decoration: none;
            }

            /* Tablet */
            @media (max-width: 1024px) {
                .pastoral-columns-grid {
                    grid-template-columns: repeat(<?php echo esc_attr($columns_tablet); ?>, 1fr);
                }
            }

            /* Mobile */
            @media (max-width: 767px) {
                .pastoral-columns-grid {
                    grid-template-columns: repeat(<?php echo esc_attr($columns_mobile); ?>, 1fr);
                }
            }
        </style>
        <?php

        wp_reset_postdata();

        // Display pagination if enabled
        if ($enable_pagination === 'yes') {
            $this->render_pagination($columns);
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
            echo '<a href="' . esc_url(get_pagenum_link(1)) . '" class="dw-pagination-text">Ï≤òÏùå</a>';
        }

        // Previous page (circular button)
        if ($paged > 1) {
            echo '<a href="' . esc_url(get_pagenum_link($paged - 1)) . '" class="dw-pagination-link dw-pagination-prev">??/a>';
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
            echo '<a href="' . esc_url(get_pagenum_link($paged + 1)) . '" class="dw-pagination-link dw-pagination-next">??/a>';
        }

        // Last page (text only)
        if ($paged < $max_pages) {
            echo '<a href="' . esc_url(get_pagenum_link($max_pages)) . '" class="dw-pagination-text">ÎßàÏ?Îß?/a>';
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
                transition: all 0.3s ease;
            }
            .dw-pagination-link:hover {
                background-color: #e0e0e0;
            }
            .dw-pagination-link.current {
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

