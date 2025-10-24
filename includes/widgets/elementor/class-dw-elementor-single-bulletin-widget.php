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
            'orderby' => 'date',
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
        
        // Get post based on query source
        if ($settings['query_source'] === 'current') {
            $post = get_post();
            if (!$post || $post->post_type !== 'bulletin') {
                echo '<p>' . __('Current post is not a bulletin.', 'dasom-church') . '</p>';
                return;
            }
            $post_id = $post->ID;
        } else {
            if (empty($settings['bulletin_post'])) {
                echo '<p>' . __('Please select a bulletin to display.', 'dasom-church') . '</p>';
                return;
            }
            $post_id = $settings['bulletin_post'];
            $post = get_post($post_id);
            
            if (!$post || $post->post_type !== 'bulletin') {
                echo '<p>' . __('Selected bulletin not found.', 'dasom-church') . '</p>';
                return;
            }
        }
        
        // Get bulletin data
        $bulletin_date = get_post_meta($post_id, 'dw_bulletin_date', true);
        $bulletin_date_formatted = get_post_meta($post_id, 'dw_bulletin_date_formatted', true);
        $pdf_url = get_post_meta($post_id, 'dw_bulletin_pdf', true);
        $bulletin_images = get_post_meta($post_id, 'dw_bulletin_images', true);
        
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
            
            <?php if ($settings['show_images'] === 'yes' && $bulletin_images): ?>
                <div class="dw-single-bulletin-images">
                    <?php
                    $images = json_decode($bulletin_images, true);
                    if (is_array($images) && !empty($images)) {
                        foreach ($images as $image_id) {
                            $image_url = wp_get_attachment_image_url($image_id, 'full');
                            if ($image_url) {
                                ?>
                                <div class="dw-single-bulletin-image-item">
                                    <img src="<?php echo esc_url($image_url); ?>" alt="<?php echo esc_attr(get_the_title($post_id)); ?>" class="dw-single-bulletin-image" />
                                </div>
                                <?php
                            }
                        }
                    }
                    ?>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }
}
