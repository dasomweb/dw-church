<?php
/**
 * DW Elementor Single Bulletin Widget
 *
 * @package Dasom_Church
 * @since 1.36.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Single_Bulletin_Widget extends \Elementor\Widget_Base {
    
    /**
     * Get widget name
     */
    public function get_name() {
        return 'dw_single_bulletin_widget';
    }
    
    /**
     * Get widget title
     */
    public function get_title() {
        return __('DW Single Bulletin', 'dasom-church');
    }
    
    /**
     * Get widget icon
     */
    public function get_icon() {
        return 'eicon-document-file';
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
        return ['bulletin', 'single', 'church', 'pdf', 'download', 'dw', '주보', '교회'];
    }
    
    /**
     * Get widget dependencies
     */
    public function get_script_depends() {
        return [];
    }
    
    /**
     * Get widget style dependencies
     */
    public function get_style_depends() {
        return ['dw-bulletin-widget'];
    }
    
    /**
     * Register widget controls
     */
    protected function register_controls() {
        
        // Content Section
        $this->start_controls_section(
            'dw_single_bulletin_section',
            [
                'label' => __('Single Bulletin Settings', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'query_source',
            [
                'label' => __('Query Source', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'current',
                'options' => [
                    'current' => __('Current Post', 'dasom-church'),
                    'manual' => __('Manual Selection', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_control(
            'bulletin_post',
            [
                'label' => __('Select Bulletin', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT2,
                'options' => $this->get_bulletin_posts(),
                'description' => __('Choose a specific bulletin to display', 'dasom-church'),
                'condition' => [
                    'query_source' => 'manual',
                ],
            ]
        );
        
        $this->add_control(
            'show_date',
            [
                'label' => __('Show Date', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Show', 'dasom-church'),
                'label_off' => __('Hide', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_pdf_download',
            [
                'label' => __('Show PDF Download', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Show', 'dasom-church'),
                'label_off' => __('Hide', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_images',
            [
                'label' => __('Show Images', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Show', 'dasom-church'),
                'label_off' => __('Hide', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section
        $this->start_controls_section(
            'dw_single_bulletin_style_section',
            [
                'label' => __('Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'date_color',
            [
                'label' => __('Date Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#333333',
                'selectors' => [
                    '{{WRAPPER}} .dw-single-bulletin-date' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'date_typography',
                'label' => __('Date Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-single-bulletin-date',
            ]
        );
        
        $this->add_control(
            'pdf_button_color',
            [
                'label' => __('PDF Button Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#007cba',
                'selectors' => [
                    '{{WRAPPER}} .dw-single-bulletin-pdf' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'pdf_button_text_color',
            [
                'label' => __('PDF Button Text Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .dw-single-bulletin-pdf' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'image_border_radius',
            [
                'label' => __('Image Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', '%'],
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
                    '{{WRAPPER}} .dw-single-bulletin-image' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'card_border_radius',
            [
                'label' => __('Card Border Radius', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', '%'],
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 50,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 12,
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-single-bulletin-image-item' => 'border-radius: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'card_padding',
            [
                'label' => __('Card Padding', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', 'em', '%'],
                'default' => [
                    'top' => '15',
                    'right' => '15',
                    'bottom' => '15',
                    'left' => '15',
                    'unit' => 'px',
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-single-bulletin-image-item' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Border::get_type(),
            [
                'name' => 'card_border',
                'label' => __('Card Border', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-single-bulletin-image-item',
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'card_shadow',
                'label' => __('Card Shadow', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-single-bulletin-image-item',
            ]
        );
        
        $this->end_controls_section();
        
        // Style Tab - Card Hover Style
        $this->start_controls_section(
            'card_hover_section',
            [
                'label' => __('Card Hover', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->start_controls_tabs('card_hover_tabs');
        
        $this->start_controls_tab(
            'card_normal',
            [
                'label' => __('Normal', 'dasom-church'),
            ]
        );
        
        // Normal state controls can be added here if needed
        
        $this->end_controls_tab();
        
        $this->start_controls_tab(
            'card_hover',
            [
                'label' => __('Hover', 'dasom-church'),
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'card_hover_shadow',
                'label' => __('Hover Shadow', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-single-bulletin-image-item:hover',
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Border::get_type(),
            [
                'name' => 'card_hover_border',
                'label' => __('Hover Border', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-single-bulletin-image-item:hover',
            ]
        );
        
        $this->add_control(
            'card_hover_transform',
            [
                'label' => __('Transform', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => '',
                'options' => [
                    '' => __('None', 'dasom-church'),
                    'translateY(-5px)' => __('Lift Up', 'dasom-church'),
                    'translateY(5px)' => __('Push Down', 'dasom-church'),
                    'scale(1.05)' => __('Scale Up', 'dasom-church'),
                    'scale(0.95)' => __('Scale Down', 'dasom-church'),
                ],
                'selectors' => [
                    '{{WRAPPER}} .dw-single-bulletin-image-item:hover' => 'transform: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'card_hover_transition',
            [
                'label' => __('Transition Duration', 'dasom-church'),
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
                    '{{WRAPPER}} .dw-single-bulletin-image-item' => 'transition: all {{SIZE}}s ease;',
                ],
            ]
        );
        
        $this->end_controls_tab();
        
        $this->end_controls_tabs();
        
        $this->end_controls_section();
    }
    
    /**
     * Get bulletin posts for select options
     */
    private function get_bulletin_posts() {
        $posts = get_posts([
            'post_type' => 'bulletin',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'meta_key' => 'dw_bulletin_date',
            'orderby' => 'meta_value',
            'order' => 'DESC',
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
        
        // Debug: Log widget rendering
        error_log('DW Single Bulletin Widget: Starting render');
        error_log('DW Single Bulletin Widget Settings: ' . print_r($settings, true));
        
        // Get post based on query source
        if ($settings['query_source'] === 'current') {
            $post = get_post();
            if (!$post || $post->post_type !== 'bulletin') {
                echo '<p>' . __('Current post is not a bulletin.', 'dasom-church') . '</p>';
                error_log('DW Single Bulletin Widget: Current post is not a bulletin');
                return;
            }
            $post_id = $post->ID;
            error_log('DW Single Bulletin Widget: Using current post ID: ' . $post_id);
        } else {
            if (empty($settings['bulletin_post'])) {
                echo '<p>' . __('Please select a bulletin to display.', 'dasom-church') . '</p>';
                error_log('DW Single Bulletin Widget: No bulletin selected');
                return;
            }
            $post_id = $settings['bulletin_post'];
            $post = get_post($post_id);
            
            if (!$post || $post->post_type !== 'bulletin') {
                echo '<p>' . __('Selected bulletin not found.', 'dasom-church') . '</p>';
                error_log('DW Single Bulletin Widget: Selected bulletin not found');
                return;
            }
            error_log('DW Single Bulletin Widget: Using selected post ID: ' . $post_id);
        }
        
        // Get bulletin data
        $bulletin_date = get_post_meta($post_id, 'dw_bulletin_date', true);
        $bulletin_date_formatted = get_post_meta($post_id, 'dw_bulletin_date_formatted', true);
        $pdf_url = get_post_meta($post_id, 'dw_bulletin_pdf', true);
        $bulletin_images = get_post_meta($post_id, 'dw_bulletin_images', true);
        
        // DEBUG: Log everything to find the issue
        error_log('=== DW SINGLE BULLETIN DEBUG START ===');
        error_log('Post ID: ' . $post_id);
        error_log('Settings: ' . print_r($settings, true));
        error_log('Bulletin Images Raw: ' . $bulletin_images);
        error_log('Show Images Setting: ' . ($settings['show_images'] ?? 'NOT SET'));
        
        // Hover effect now controlled by Elementor hover controls
        
        ?>
        <div class="dw-single-bulletin-container">
            <?php if ($settings['show_date'] === 'yes'): ?>
                <div class="dw-single-bulletin-date">
                    <?php 
                    if ($bulletin_date_formatted) {
                        echo esc_html($bulletin_date_formatted);
                    } elseif ($bulletin_date) {
                        // Format the date to Korean format
                        $formatted_date = date_i18n('Y년 m월 d일', strtotime($bulletin_date));
                        echo esc_html($formatted_date);
                    } else {
                        echo get_the_date('Y년 m월 d일', $post_id);
                    }
                    ?>
                </div>
            <?php endif; ?>
            
            <?php if ($settings['show_pdf_download'] === 'yes' && $pdf_url): ?>
                <div class="dw-single-bulletin-pdf-container">
                    <a href="<?php echo esc_url($pdf_url); ?>" target="_blank" class="dw-single-bulletin-pdf">
                        <?php _e('주보 PDF 다운로드', 'dasom-church'); ?>
                    </a>
                </div>
            <?php endif; ?>
            
            <?php 
            // DEBUG: Check conditions
            error_log('=== IMAGE DISPLAY CONDITIONS ===');
            error_log('Show Images Setting: ' . ($settings['show_images'] ?? 'NOT SET'));
            error_log('Bulletin Images: ' . ($bulletin_images ? 'EXISTS' : 'EMPTY'));
            error_log('Show Images === yes: ' . ($settings['show_images'] === 'yes' ? 'TRUE' : 'FALSE'));
            error_log('Bulletin Images exists: ' . ($bulletin_images ? 'TRUE' : 'FALSE'));
            error_log('Combined condition: ' . (($settings['show_images'] === 'yes' && $bulletin_images) ? 'TRUE' : 'FALSE'));
            ?>
            
            <?php if ($settings['show_images'] === 'yes' && $bulletin_images): ?>
                <div class="dw-single-bulletin-images">
                    <?php
                    // Handle both JSON array and comma-separated string formats
                    if (strpos($bulletin_images, '[') === 0) {
                        // JSON array format: [2526,2527]
                        $images = json_decode($bulletin_images, true);
                    } else {
                        // Comma-separated string format: 2526,2527
                        $images = array_filter(array_map('intval', explode(',', $bulletin_images)));
                    }
                    error_log('Decoded images: ' . print_r($images, true));
                    error_log('Is array: ' . (is_array($images) ? 'TRUE' : 'FALSE'));
                    error_log('Is empty: ' . (empty($images) ? 'TRUE' : 'FALSE'));
                    
                    if (is_array($images) && !empty($images)) {
                        error_log('Processing ' . count($images) . ' images');
                        foreach ($images as $index => $image_id) {
                            error_log("Image $index: ID = $image_id");
                            $image_url = wp_get_attachment_url($image_id);
                            error_log("Image $index: URL = $image_url");
                            
                            if ($image_url) {
                                error_log("Rendering image $index");
                                ?>
                                <div class="dw-single-bulletin-image-item">
                                    <img src="<?php echo esc_url($image_url); ?>" alt="<?php echo esc_attr(get_the_title($post_id)); ?>" class="dw-single-bulletin-image" />
                                </div>
                                <?php
                            } else {
                                error_log("No URL for image $index (ID: $image_id)");
                            }
                        }
                    } else {
                        error_log('No valid images array or empty array');
                    }
                    ?>
                </div>
            <?php else: ?>
                <?php 
                error_log('=== IMAGES NOT SHOWN ===');
                error_log('Show images setting: ' . ($settings['show_images'] ?? 'NOT SET'));
                error_log('Bulletin images: ' . ($bulletin_images ? 'EXISTS' : 'EMPTY'));
                ?>
            <?php endif; ?>
        </div>
        <?php
    }
}
