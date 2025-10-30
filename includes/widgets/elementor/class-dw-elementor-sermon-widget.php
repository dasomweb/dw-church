<?php
/**
 * DW Elementor Recent Sermons Widget
 *
 * @package DW_Church
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
        return __('DW Recent Sermons', 'dw-church');
    }
    
    public function get_icon() {
        return 'eicon-post-list';
    }
    
    public function get_categories() {
        return ['general'];
    }
    
    public function get_keywords() {
        return ['sermon', 'church', 'preaching', 'dw', '?§Íµê'];
    }
    
    protected function register_controls() {
        
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
                'label' => __('Number of Sermons', 'dw-church'),
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
                'label' => __('?∏ÎÑ§???¨Í∏∞', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'medium',
                'options' => [
                    'thumbnail' => __('Thumbnail (150x150)', 'dw-church'),
                    'medium' => __('Medium (300x300)', 'dw-church'),
                    'medium_large' => __('Medium Large (768x768)', 'dw-church'),
                    'large' => __('Large (1024x1024)', 'dw-church'),
                    'full' => __('Full (?êÎ≥∏)', 'dw-church'),
                ],
                'condition' => [
                    'show_thumbnail' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'show_date',
            [
                'label' => __('?†Ïßú ?úÏãú', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dw-church'),
                'label_off' => __('No', 'dw-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_preacher',
            [
                'label' => __('?§Íµê???úÏãú', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dw-church'),
                'label_off' => __('No', 'dw-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_scripture',
            [
                'label' => __('?±Í≤ΩÍµ¨Ï†à ?úÏãú', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dw-church'),
                'label_off' => __('No', 'dw-church'),
                'return_value' => 'yes',
                'default' => 'yes',
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
        
        // Style Section
        $this->start_controls_section(
            'style_section',
            [
                'label' => __('?§Ì???, 'dw-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        // Thumbnail Style
        $this->add_control(
            'thumbnail_heading',
            [
                'label' => __('?∏ÎÑ§???§Ì???, 'dw-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_control(
            'thumbnail_height',
            [
                'label' => __('?∏ÎÑ§???íÏù¥', 'dw-church'),
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
                ],
                'selectors' => [
                    '{{WRAPPER}} .sermon-thumbnail img' => 'height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'thumbnail_object_fit',
            [
                'label' => __('?¥Î?ÏßÄ ÎßûÏ∂§', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'cover',
                'options' => [
                    'cover' => __('Ïª§Î≤Ñ (Cover)', 'dw-church'),
                    'contain' => __('?¨Ìï® (Contain)', 'dw-church'),
                    'fill' => __('Ï±ÑÏö∞Í∏?(Fill)', 'dw-church'),
                    'none' => __('?êÎ≥∏ (None)', 'dw-church'),
                ],
                'selectors' => [
                    '{{WRAPPER}} .sermon-thumbnail img' => 'object-fit: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'thumbnail_border_radius',
            [
                'label' => __('?∏ÎÑ§??Î™®ÏÑúÎ¶??•Í?Í∏?, 'dw-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', '%'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 50,
                    ],
                    '%' => [
                        'min' => 0,
                        'max' => 50,
                    ],
                ],
                'selectors' => [
                    '{{WRAPPER}} .sermon-thumbnail' => 'border-radius: {{SIZE}}{{UNIT}}; overflow: hidden;',
                    '{{WRAPPER}} .sermon-thumbnail img' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'title_heading',
            [
                'label' => __('?Ä?¥Ì? ?§Ì???, 'dw-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        // Title Typography
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'title_typography',
                'label' => __('?Ä?¥Ì? ?Ä?¥Ìè¨Í∑∏Îûò??, 'dw-church'),
                'selector' => '{{WRAPPER}} .dw-sermon-item h3',
            ]
        );
        
        $this->add_control(
            'title_color',
            [
                'label' => __('?Ä?¥Ì? ?âÏÉÅ', 'dw-church'),
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
                'label' => __('?Ä?¥Ì? ?∏Î≤Ñ ?âÏÉÅ', 'dw-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'selectors' => [
                    '{{WRAPPER}} .dw-sermon-item h3 a:hover' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'title_spacing',
            [
                'label' => __('?Ä?¥Ì? Í∞ÑÍ≤©', 'dw-church'),
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
                    '{{WRAPPER}} .dw-sermon-item h3' => 'margin: 0 0 {{SIZE}}{{UNIT}} 0;',
                ],
            ]
        );
        
        $this->add_control(
            'title_link_decoration',
            [
                'label' => __('ÎßÅÌÅ¨ Î∞ëÏ§Ñ ?úÍ±∞', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dw-church'),
                'label_off' => __('No', 'dw-church'),
                'return_value' => 'yes',
                'default' => 'yes',
                'selectors' => [
                    '{{WRAPPER}} .dw-sermon-item h3 a' => 'text-decoration: none;',
                ],
            ]
        );
        
        $this->add_control(
            'date_heading',
            [
                'label' => __('?†Ïßú ?§Ì???, 'dw-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        // Date Typography
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'date_typography',
                'label' => __('?†Ïßú ?Ä?¥Ìè¨Í∑∏Îûò??, 'dw-church'),
                'selector' => '{{WRAPPER}} .sermon-date',
            ]
        );
        
        $this->add_control(
            'date_color',
            [
                'label' => __('?†Ïßú ?âÏÉÅ', 'dw-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#666',
                'selectors' => [
                    '{{WRAPPER}} .sermon-date' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'date_spacing',
            [
                'label' => __('?†Ïßú Í∞ÑÍ≤©', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 30,
                    ],
                ],
                'default' => [
                    'size' => 5,
                ],
                'selectors' => [
                    '{{WRAPPER}} .sermon-date' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'preacher_heading',
            [
                'label' => __('?§Íµê???§Ì???, 'dw-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        // Preacher Typography
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'preacher_typography',
                'label' => __('?§Íµê???Ä?¥Ìè¨Í∑∏Îûò??, 'dw-church'),
                'selector' => '{{WRAPPER}} .sermon-preacher',
            ]
        );
        
        $this->add_control(
            'preacher_color',
            [
                'label' => __('?§Íµê???âÏÉÅ', 'dw-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#666',
                'selectors' => [
                    '{{WRAPPER}} .sermon-preacher' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'preacher_spacing',
            [
                'label' => __('?§Íµê??Í∞ÑÍ≤©', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 30,
                    ],
                ],
                'default' => [
                    'size' => 10,
                ],
                'selectors' => [
                    '{{WRAPPER}} .sermon-preacher' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'scripture_heading',
            [
                'label' => __('?±Í≤ΩÍµ¨Ï†à ?§Ì???, 'dw-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        // Scripture Typography
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'scripture_typography',
                'label' => __('?±Í≤ΩÍµ¨Ï†à ?Ä?¥Ìè¨Í∑∏Îûò??, 'dw-church'),
                'selector' => '{{WRAPPER}} .sermon-scripture',
            ]
        );
        
        $this->add_control(
            'scripture_color',
            [
                'label' => __('?±Í≤ΩÍµ¨Ï†à ?âÏÉÅ', 'dw-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#2271b1',
                'selectors' => [
                    '{{WRAPPER}} .sermon-scripture' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'scripture_spacing',
            [
                'label' => __('?±Í≤ΩÍµ¨Ï†à Í∞ÑÍ≤©', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 30,
                    ],
                ],
                'default' => [
                    'size' => 10,
                ],
                'selectors' => [
                    '{{WRAPPER}} .sermon-scripture' => 'margin-bottom: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'card_heading',
            [
                'label' => __('Ïπ¥Îìú ?§Ì???, 'dw-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_control(
            'card_bg_color',
            [
                'label' => __('Î∞∞Í≤Ω ?âÏÉÅ', 'dw-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-sermon-item' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'card_border_radius',
            [
                'label' => __('Î™®ÏÑúÎ¶??•Í?Í∏?, 'dw-church'),
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
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-sermon-item' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'card_padding',
            [
                'label' => __('Ïπ¥Îìú ?àÏ™Ω ?¨Î∞±', 'dw-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'default' => [
                    'top' => '20',
                    'right' => '20',
                    'bottom' => '20',
                    'left' => '20',
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .sermon-content' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Border::get_type(),
            [
                'name' => 'card_border',
                'label' => __('?åÎëêÎ¶?, 'dw-church'),
                'selector' => '{{WRAPPER}} .dw-sermon-item',
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'card_box_shadow',
                'label' => __('Í∑∏Î¶º??, 'dw-church'),
                'selector' => '{{WRAPPER}} .dw-sermon-item',
                'fields_options' => [
                    'box_shadow_type' => [
                        'default' => 'yes',
                    ],
                    'box_shadow' => [
                        'default' => [
                            'horizontal' => 0,
                            'vertical' => 2,
                            'blur' => 8,
                            'spread' => 0,
                            'color' => 'rgba(0,0,0,0.1)',
                        ],
                    ],
                ],
            ]
        );
        
        $this->add_control(
            'card_hover_transform',
            [
                'label' => __('?∏Î≤Ñ ?®Í≥º', 'dw-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('On', 'dw-church'),
                'label_off' => __('Off', 'dw-church'),
                'return_value' => 'yes',
                'default' => 'yes',
                'prefix_class' => 'sermon-hover-',
            ]
        );
        
        $this->end_controls_section();
        
        // Style Tab - Pagination Style
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
                'default' => '#ffffff',
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
            'post_type' => 'sermon',
            'posts_per_page' => $settings['posts_per_page'],
            'post_status' => 'publish',
            'orderby' => 'date',
            'order' => 'DESC',
        );
        
        // Add pagination if enabled
        if ($enable_pagination === 'yes') {
            $args['paged'] = $paged;
        }
        
        $sermons = new WP_Query($args);
        
        if (!$sermons->have_posts()) {
            echo '<p>' . __('No sermons found.', 'dw-church') . '</p>';
            return;
        }
        
        $layout = $settings['layout'] ?? 'grid';
        $columns = $layout === 'grid' ? intval($settings['columns'] ?? 3) : 1;
        $columns_tablet = $layout === 'grid' ? intval($settings['columns_tablet'] ?? 2) : 1;
        $columns_mobile = $layout === 'grid' ? intval($settings['columns_mobile'] ?? 1) : 1;
        $col_class = $layout === 'grid' ? 'dw-sermon-grid' : 'dw-sermon-list';
        
        ?>
        <style>
            .sermon-hover-yes .dw-sermon-item {
                transition: transform 0.3s ease;
            }
            .sermon-hover-yes .dw-sermon-item:hover {
                transform: translateY(-5px);
            }
            
            .dw-sermons-widget {
                display: grid;
                grid-template-columns: repeat(<?php echo esc_attr($columns); ?>, 1fr);
                gap: 20px;
            }
            
            @media (max-width: 1024px) {
                .dw-sermons-widget {
                    grid-template-columns: repeat(<?php echo esc_attr($columns_tablet); ?>, 1fr);
                }
            }
            
            @media (max-width: 767px) {
                .dw-sermons-widget {
                    grid-template-columns: repeat(<?php echo esc_attr($columns_mobile); ?>, 1fr);
                    gap: 15px;
                }
                
                .dw-sermon-item {
                    margin-bottom: 15px;
                }
                
                .sermon-content h3 {
                    font-size: 18px !important;
                    line-height: 1.4 !important;
                    margin-bottom: 8px !important;
                }
                
                .sermon-date,
                .sermon-scripture,
                .sermon-preacher {
                    font-size: 14px !important;
                    margin-bottom: 5px !important;
                }
                
                .sermon-thumbnail img {
                    height: 200px !important;
                    object-fit: cover !important;
                }
            }
        </style>
        <?php
        
        echo '<div class="dw-sermons-widget ' . esc_attr($col_class) . '">';
        
        while ($sermons->have_posts()) {
            $sermons->the_post();
            $sermon_date = get_post_meta(get_the_ID(), 'dw_sermon_date', true);
            $preachers = wp_get_post_terms(get_the_ID(), 'dw_sermon_preacher', array('fields' => 'names'));
            $scripture = get_post_meta(get_the_ID(), 'dw_sermon_scripture', true);
            
            echo '<div class="dw-sermon-item" style="overflow:hidden;">';
            
            if (($settings['show_thumbnail'] ?? 'yes') === 'yes' && has_post_thumbnail()) {
                $thumbnail_size = $settings['thumbnail_size'] ?? 'medium';
                echo '<div class="sermon-thumbnail">';
                echo '<a href="' . get_permalink() . '">';
                the_post_thumbnail($thumbnail_size, array('style' => 'width:100%;'));
                echo '</a>';
                echo '</div>';
            }
            
            echo '<div class="sermon-content">';
            
            // 1. ?§Íµê?ºÏûê
            if (($settings['show_date'] ?? 'yes') === 'yes' && $sermon_date) {
                echo '<div class="sermon-date">' . date_i18n('Y-m-d', strtotime($sermon_date)) . '</div>';
            }
            
            // 2. ?úÎ™©
            echo '<h3><a href="' . get_permalink() . '">' . get_the_title() . '</a></h3>';
            
            // 3. ?±Í≤ΩÍµ¨Ï†à
            if (($settings['show_scripture'] ?? 'yes') === 'yes' && !empty($scripture)) {
                echo '<div class="sermon-scripture">' . esc_html($scripture) . '</div>';
            }
            
            // 4. ?§Íµê??
            if (($settings['show_preacher'] ?? 'yes') === 'yes' && !empty($preachers)) {
                echo '<div class="sermon-preacher">' . esc_html(implode(', ', $preachers)) . '</div>';
            }
            
            echo '</div>';
            echo '</div>';
        }
        
        echo '</div>';
        
        wp_reset_postdata();
        
        // Display pagination if enabled
        if ($enable_pagination === 'yes') {
            $this->render_pagination($sermons);
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

