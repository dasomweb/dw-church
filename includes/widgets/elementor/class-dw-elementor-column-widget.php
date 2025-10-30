<?php
/**
 * DW Elementor Columns Widget
 *
 * @package DW_Church
 * @since 1.10.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Column_Widget extends \Elementor\Widget_Base {
    
    public function get_name() {
        return 'dw_columns';
    }
    
    public function get_title() {
        return __('DW Pastoral Columns', 'dw-church');
    }
    
    public function get_icon() {
        return 'eicon-post';
    }
    
    public function get_categories() {
        return ['general'];
    }
    
    public function get_keywords() {
        return ['column', 'church', 'pastoral', 'dw', '컬럼', '목회'];
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
                'label' => __('Number of Columns', 'dw-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 6,
                'min' => 1,
                'max' => 50,
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
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'excerpt_length',
            [
                'label' => __('Excerpt Length', 'dw-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 25,
                'condition' => [
                    'show_excerpt' => 'yes',
                ],
            ]
        );
        
        $this->end_controls_section();
    }
    
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        $args = array(
            'post_type' => 'column',
            'posts_per_page' => $settings['posts_per_page'] ?? 6,
            'post_status' => 'publish',
            'orderby' => 'date',
            'order' => 'DESC',
        );
        
        $columns_query = new WP_Query($args);
        
        if (!$columns_query->have_posts()) {
            echo '<p>' . __('No columns found.', 'dw-church') . '</p>';
            return;
        }
        
        $columns = intval($settings['columns'] ?? 3);
        
        echo '<div class="dw-columns-widget" style="display:grid;grid-template-columns:repeat(' . $columns . ',1fr);gap:20px;">';
        
        while ($columns_query->have_posts()) {
            $columns_query->the_post();
            
            echo '<div class="dw-column-item" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);transition:transform 0.3s;" onmouseover="this.style.transform=\'translateY(-5px)\'" onmouseout="this.style.transform=\'translateY(0)\'">';
            
            if (($settings['show_thumbnail'] ?? 'yes') === 'yes' && has_post_thumbnail()) {
                echo '<div class="column-thumbnail">';
                echo '<a href="' . get_permalink() . '">';
                the_post_thumbnail('medium', array('style' => 'width:100%;height:200px;object-fit:cover;'));
                echo '</a>';
                echo '</div>';
            }
            
            echo '<div class="column-content" style="padding:20px;">';
            
            echo '<h3 style="margin:0 0 10px 0;font-size:18px;"><a href="' . get_permalink() . '" style="text-decoration:none;color:#333;">' . get_the_title() . '</a></h3>';
            
            if (($settings['show_date'] ?? 'yes') === 'yes') {
                echo '<div class="column-date" style="font-size:13px;color:#666;margin-bottom:10px;">?�� ' . get_the_date() . '</div>';
            }
            
            if (($settings['show_excerpt'] ?? 'yes') === 'yes') {
                $excerpt = wp_trim_words(get_the_excerpt(), $settings['excerpt_length'] ?? 25);
                echo '<div class="column-excerpt" style="font-size:14px;color:#555;line-height:1.6;">' . esc_html($excerpt) . '</div>';
            }
            
            echo '</div>';
            echo '</div>';
        }
        
        echo '</div>';
        
        wp_reset_postdata();
    }
}

