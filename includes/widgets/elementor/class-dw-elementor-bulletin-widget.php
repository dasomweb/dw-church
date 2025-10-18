<?php
/**
 * DW Elementor Bulletins Widget
 *
 * @package Dasom_Church
 * @since 1.10.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class DW_Elementor_Bulletin_Widget extends \Elementor\Widget_Base {
    
    public function get_name() {
        return 'dw_bulletins';
    }
    
    public function get_title() {
        return __('DW Bulletins', 'dasom-church');
    }
    
    public function get_icon() {
        return 'eicon-document-file';
    }
    
    public function get_categories() {
        return ['general'];
    }
    
    public function get_keywords() {
        return ['bulletin', 'church', 'weekly', 'dw', '주보'];
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
                'label' => __('Number of Bulletins', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::NUMBER,
                'default' => 6,
                'min' => 1,
                'max' => 50,
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
            ]
        );
        
        $this->add_control(
            'show_pdf_link',
            [
                'label' => __('Show PDF Download Link', 'dasom-church'),
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'label_on' => __('Yes', 'dasom-church'),
                'label_off' => __('No', 'dasom-church'),
                'return_value' => 'yes',
                'default' => 'yes',
            ]
        );
        
        $this->end_controls_section();
    }
    
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        $args = array(
            'post_type' => 'bulletin',
            'posts_per_page' => $settings['posts_per_page'] ?? 6,
            'post_status' => 'publish',
            'orderby' => 'meta_value',
            'meta_key' => 'dw_bulletin_date',
            'order' => 'DESC',
        );
        
        $bulletins = new WP_Query($args);
        
        if (!$bulletins->have_posts()) {
            echo '<p>' . __('No bulletins found.', 'dasom-church') . '</p>';
            return;
        }
        
        $columns = intval($settings['columns'] ?? 3);
        
        echo '<div class="dw-bulletins-widget" style="display:grid;grid-template-columns:repeat(' . $columns . ',1fr);gap:20px;">';
        
        while ($bulletins->have_posts()) {
            $bulletins->the_post();
            $bulletin_date = get_post_meta(get_the_ID(), 'dw_bulletin_date', true);
            $pdf = get_post_meta(get_the_ID(), 'dw_bulletin_pdf', true);
            
            echo '<div class="dw-bulletin-item" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);transition:transform 0.3s;" onmouseover="this.style.transform=\'translateY(-5px)\'" onmouseout="this.style.transform=\'translateY(0)\'">';
            
            if (has_post_thumbnail()) {
                echo '<div class="bulletin-thumbnail">';
                echo '<a href="' . get_permalink() . '">';
                the_post_thumbnail('medium', array('style' => 'width:100%;height:250px;object-fit:cover;'));
                echo '</a>';
                echo '</div>';
            }
            
            echo '<div class="bulletin-content" style="padding:20px;">';
            echo '<h3 style="margin:0 0 10px 0;font-size:18px;"><a href="' . get_permalink() . '" style="text-decoration:none;color:#333;">' . get_the_title() . '</a></h3>';
            
            if ($bulletin_date) {
                echo '<div class="bulletin-date" style="font-size:14px;color:#666;margin-bottom:15px;">📅 ' . date_i18n('Y년 n월 j일', strtotime($bulletin_date)) . '</div>';
            }
            
            if (($settings['show_pdf_link'] ?? 'yes') === 'yes' && $pdf) {
                $pdf_url = wp_get_attachment_url($pdf);
                if ($pdf_url) {
                    echo '<a href="' . esc_url($pdf_url) . '" target="_blank" class="bulletin-pdf-link" style="display:inline-block;padding:8px 16px;background:#2271b1;color:#fff;text-decoration:none;border-radius:4px;font-size:13px;">📄 PDF 다운로드</a>';
                }
            }
            
            echo '</div>';
            echo '</div>';
        }
        
        echo '</div>';
        
        wp_reset_postdata();
    }
}

