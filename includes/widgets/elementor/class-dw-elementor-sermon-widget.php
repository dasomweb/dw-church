<?php
/**
 * DW Elementor Recent Sermons Widget
 *
 * @package Dasom_Church
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
        return __('DW Recent Sermons', 'dasom-church');
    }
    
    public function get_icon() {
        return 'eicon-post-list';
    }
    
    public function get_categories() {
        return ['general'];
    }
    
    public function get_keywords() {
        return ['sermon', 'church', 'preaching', 'dw', '설교'];
    }
    
    protected function register_controls() {
        
        $this->start_controls_section(
            'content_section',
            [
                'label' => __('Settings', 'dasom-church'),
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'posts_per_page',
            [
                'label' => __('Number of Sermons', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 6,
                'min' => 1,
                'max' => 50,
            ]
        );
        
        $this->add_control(
            'layout',
            [
                'label' => __('Layout', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'grid',
                'options' => [
                    'grid' => __('Grid', 'dasom-church'),
                    'list' => __('List', 'dasom-church'),
                ],
            ]
        );
        
        $this->add_responsive_control(
            'columns',
            [
                'label' => __('Columns', 'dasom-church'),
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
                'label' => __('Show Thumbnail', 'dasom-church'),
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
                'label' => __('Show Date', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_preacher',
            [
                'label' => __('Show Preacher', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_excerpt',
            [
                'label' => __('Show Excerpt', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'no',
            ]
        );
        
        $this->add_control(
            'excerpt_length',
            [
                'label' => __('Excerpt Length', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 20,
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
            'post_type' => 'sermon',
            'posts_per_page' => $settings['posts_per_page'],
            'post_status' => 'publish',
            'orderby' => 'date',
            'order' => 'DESC',
        );
        
        $sermons = new WP_Query($args);
        
        if (!$sermons->have_posts()) {
            echo '<p>' . __('No sermons found.', 'dasom-church') . '</p>';
            return;
        }
        
        $layout = $settings['layout'];
        $columns = $layout === 'grid' ? intval($settings['columns']) : 1;
        $col_class = $layout === 'grid' ? 'dw-sermon-grid' : 'dw-sermon-list';
        
        echo '<div class="dw-sermons-widget ' . esc_attr($col_class) . '" style="display:grid;grid-template-columns:repeat(' . $columns . ',1fr);gap:20px;">';
        
        while ($sermons->have_posts()) {
            $sermons->the_post();
            $sermon_date = get_post_meta(get_the_ID(), 'dw_sermon_date', true);
            $preachers = wp_get_post_terms(get_the_ID(), 'dw_sermon_preacher', array('fields' => 'names'));
            
            echo '<div class="dw-sermon-item" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);transition:transform 0.3s;" onmouseover="this.style.transform=\'translateY(-5px)\'" onmouseout="this.style.transform=\'translateY(0)\'">';
            
            if ($settings['show_thumbnail'] === 'yes' && has_post_thumbnail()) {
                echo '<div class="sermon-thumbnail">';
                echo '<a href="' . get_permalink() . '">';
                the_post_thumbnail('medium', array('style' => 'width:100%;height:200px;object-fit:cover;'));
                echo '</a>';
                echo '</div>';
            }
            
            echo '<div class="sermon-content" style="padding:20px;">';
            
            echo '<h3 style="margin:0 0 10px 0;font-size:18px;"><a href="' . get_permalink() . '" style="text-decoration:none;color:#333;">' . get_the_title() . '</a></h3>';
            
            if ($settings['show_date'] === 'yes' && $sermon_date) {
                echo '<div class="sermon-date" style="font-size:13px;color:#666;margin-bottom:5px;">📅 ' . date_i18n('Y-m-d', strtotime($sermon_date)) . '</div>';
            }
            
            if ($settings['show_preacher'] === 'yes' && !empty($preachers)) {
                echo '<div class="sermon-preacher" style="font-size:13px;color:#666;margin-bottom:10px;">👤 ' . esc_html(implode(', ', $preachers)) . '</div>';
            }
            
            if ($settings['show_excerpt'] === 'yes') {
                $excerpt = wp_trim_words(get_the_excerpt(), $settings['excerpt_length']);
                echo '<div class="sermon-excerpt" style="font-size:14px;color:#555;line-height:1.6;">' . esc_html($excerpt) . '</div>';
            }
            
            echo '</div>';
            echo '</div>';
        }
        
        echo '</div>';
        
        wp_reset_postdata();
    }
}

