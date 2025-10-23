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
        return 'eicon-document';
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
        
        $this->end_controls_section();
        
        // Style Section
        $this->start_controls_section(
            'dw_bulletin_style_section',
            [
                'label' => __('Style', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'button_style',
            [
                'label' => __('Button Style', 'dasom-church'),
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
            'title_style',
            [
                'label' => __('Title Style', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Typography::get_type(),
            [
                'name' => 'title_typography',
                'label' => __('Typography', 'dasom-church'),
                'selector' => '{{WRAPPER}} .dw-bulletin-title',
            ]
        );
        
        $this->add_control(
            'title_color',
            [
                'label' => __('Color', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#333333',
                'selectors' => [
                    '{{WRAPPER}} .dw-bulletin-title' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'download_button_style',
            [
                'label' => __('Download Button Style', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::HEADING,
                'separator' => 'before',
            ]
        );
        
        $this->add_control(
            'download_button_background',
            [
                'label' => __('Background Color', 'dasom-church'),
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
                'label' => __('Text Color', 'dasom-church'),
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
                'label' => __('Padding', 'dasom-church'),
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
        if ($settings['query_source'] === 'manual' && !empty($settings['bulletin_posts'])) {
            $posts = get_posts([
                'post_type' => 'bulletin',
                'post__in' => $settings['bulletin_posts'],
                'posts_per_page' => -1,
                'post_status' => 'publish',
                'orderby' => 'post__in',
            ]);
        } else {
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
        
        if ($display_type === 'image') {
            $this->render_image_template($posts);
        } else {
            $this->render_button_template($posts);
        }
    }
    
    /**
     * Render image template
     */
    private function render_image_template($posts) {
        ?>
        <div class="dw-bulletin-image-list">
            <?php foreach ($posts as $post): 
                $pdf_url = get_post_meta($post->ID, 'dw_bulletin_pdf', true);
                $featured_image = get_the_post_thumbnail_url($post->ID, 'medium');
                $post_date = get_the_date('Y년 m월 d일', $post->ID);
            ?>
                <div class="dw-bulletin-image-item">
                    <?php if ($featured_image): ?>
                        <div class="dw-bulletin-image">
                            <img src="<?php echo esc_url($featured_image); ?>" alt="<?php echo esc_attr($post->post_title); ?>" />
                        </div>
                    <?php endif; ?>
                    
                    <div class="dw-bulletin-content">
                        <div class="dw-bulletin-title"><?php echo esc_html($post->post_title); ?></div>
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
    private function render_button_template($posts) {
        ?>
        <div class="dw-bulletin-button-list">
            <?php foreach ($posts as $post): 
                $pdf_url = get_post_meta($post->ID, 'dw_bulletin_pdf', true);
                $post_date = get_the_date('Y년 m월 d일', $post->ID);
            ?>
                <div class="dw-bulletin-item">
                    <div class="dw-bulletin-title"><?php echo esc_html($post->post_title); ?></div>
                    <div class="dw-bulletin-meta">
                        <span class="dw-bulletin-date"><?php echo esc_html($post_date); ?></span>
                        <?php if ($pdf_url): ?>
                            <span class="dw-bulletin-separator">|</span>
                            <a href="<?php echo esc_url($pdf_url); ?>" target="_blank" class="dw-bulletin-download">
                                <?php _e('주보 다운로드', 'dasom-church'); ?>
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