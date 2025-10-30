<?php
/**
 * Public functionality for Dasom Church Management
 *
 * @package DW_Church
 * @since 1.0.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Public class
 */
class DW_Church_Public {
    
    /**
     * Single instance of the class
     */
    private static $instance = null;
    
    /**
     * Get single instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        $this->dasom_church_init_hooks();
    }
    
    /**
     * Initialize hooks
     */
    private function dasom_church_init_hooks() {
        add_action('wp_enqueue_scripts', array($this, 'dasom_church_enqueue_scripts'));
        add_action('wp_enqueue_scripts', array($this, 'dasom_church_enqueue_styles'));
        
        // Add shortcodes
        add_shortcode('dasom_bulletins', array($this, 'dasom_church_bulletins_shortcode'));
        add_shortcode('dasom_sermons', array($this, 'dasom_church_sermons_shortcode'));
        add_shortcode('dasom_columns', array($this, 'dasom_church_columns_shortcode'));
        add_shortcode('dasom_albums', array($this, 'dasom_church_albums_shortcode'));
    }
    
    /**
     * Enqueue public scripts
     */
    public function dasom_church_enqueue_scripts() {
        wp_enqueue_script('dw-church-public', DASOM_CHURCH_PLUGIN_URL . 'assets/js/public.js', array('jquery'), DASOM_CHURCH_VERSION, true);
        
        // Localize script
        wp_localize_script('dw-church-public', 'dwChurchPublic', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('dasom_church_public_nonce')
        ));
    }
    
    /**
     * Enqueue public styles
     */
    public function dasom_church_enqueue_styles() {
        wp_enqueue_style('dw-church-public', DASOM_CHURCH_PLUGIN_URL . 'assets/css/public.css', array(), DASOM_CHURCH_VERSION);
    }
    
    /**
     * Bulletins shortcode
     */
    public function dasom_church_bulletins_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit' => 5,
            'show_date' => 'true',
            'show_pdf' => 'true'
        ), $atts);
        
        $bulletins = get_posts(array(
            'post_type' => 'dasom_bulletin',
            'posts_per_page' => intval($atts['limit']),
            'orderby' => 'date',
            'order' => 'DESC'
        ));
        
        if (empty($bulletins)) {
            return '<p>' . esc_html__('No bulletins found.', 'dw-church') . '</p>';
        }
        
        $output = '<div class="dasom-bulletins-list">';
        
        foreach ($bulletins as $bulletin) {
            $output .= '<div class="dasom-bulletin-item">';
            $output .= '<h3><a href="' . esc_url(get_permalink($bulletin->ID)) . '">' . esc_html(get_the_title($bulletin)) . '</a></h3>';
            
            if ($atts['show_date'] === 'true') {
                $date = get_post_meta($bulletin->ID, 'dasom_bulletin_date', true);
                if ($date) {
                    $output .= '<p class="dasom-bulletin-date">' . esc_html($date) . '</p>';
                }
            }
            
            if ($atts['show_pdf'] === 'true') {
                $pdf = get_post_meta($bulletin->ID, 'dasom_bulletin_pdf', true);
                if ($pdf) {
                    $output .= '<p><a href="' . esc_url(wp_get_attachment_url($pdf)) . '" target="_blank" class="dasom-pdf-link">' . esc_html__('Download PDF', 'dw-church') . '</a></p>';
                }
            }
            
            $output .= '</div>';
        }
        
        $output .= '</div>';
        
        return $output;
    }
    
    /**
     * Sermons shortcode
     */
    public function dasom_church_sermons_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit' => 5,
            'category' => '',
            'show_scripture' => 'true',
            'show_youtube' => 'true'
        ), $atts);
        
        $args = array(
            'post_type' => 'dasom_sermon',
            'posts_per_page' => intval($atts['limit']),
            'orderby' => 'date',
            'order' => 'DESC'
        );
        
        if (!empty($atts['category'])) {
            $args['tax_query'] = array(
                array(
                    'taxonomy' => 'dasom_sermon_category',
                    'field' => 'slug',
                    'terms' => $atts['category']
                )
            );
        }
        
        $sermons = get_posts($args);
        
        if (empty($sermons)) {
            return '<p>' . esc_html__('No sermons found.', 'dw-church') . '</p>';
        }
        
        $output = '<div class="dasom-sermons-list">';
        
        foreach ($sermons as $sermon) {
            $output .= '<div class="dasom-sermon-item">';
            $output .= '<h3><a href="' . esc_url(get_permalink($sermon->ID)) . '">' . esc_html(get_the_title($sermon)) . '</a></h3>';
            
            if ($atts['show_scripture'] === 'true') {
                $scripture = get_post_meta($sermon->ID, 'dasom_sermon_scripture', true);
                if ($scripture) {
                    $output .= '<p class="dasom-sermon-scripture">' . esc_html($scripture) . '</p>';
                }
            }
            
            if ($atts['show_youtube'] === 'true') {
                $youtube = get_post_meta($sermon->ID, 'dasom_sermon_youtube', true);
                if ($youtube) {
                    $output .= '<p><a href="' . esc_url($youtube) . '" target="_blank" class="dasom-youtube-link">' . esc_html__('Watch on YouTube', 'dw-church') . '</a></p>';
                }
            }
            
            $output .= '</div>';
        }
        
        $output .= '</div>';
        
        return $output;
    }
    
    /**
     * Columns shortcode
     */
    public function dasom_church_columns_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit' => 5,
            'show_author' => 'true',
            'show_excerpt' => 'true'
        ), $atts);
        
        $columns = get_posts(array(
            'post_type' => 'dasom_column',
            'posts_per_page' => intval($atts['limit']),
            'orderby' => 'date',
            'order' => 'DESC'
        ));
        
        if (empty($columns)) {
            return '<p>' . esc_html__('No columns found.', 'dw-church') . '</p>';
        }
        
        $output = '<div class="dasom-columns-list">';
        
        foreach ($columns as $column) {
            $output .= '<div class="dasom-column-item">';
            $output .= '<h3><a href="' . esc_url(get_permalink($column->ID)) . '">' . esc_html(get_the_title($column)) . '</a></h3>';
            
            if ($atts['show_author'] === 'true') {
                $author = get_post_meta($column->ID, 'dasom_column_author', true);
                if ($author) {
                    $output .= '<p class="dasom-column-author">' . esc_html__('By ', 'dw-church') . esc_html($author) . '</p>';
                }
            }
            
            if ($atts['show_excerpt'] === 'true') {
                $excerpt = wp_trim_words(strip_tags($column->post_content), 20, '...');
                if ($excerpt) {
                    $output .= '<p class="dasom-column-excerpt">' . esc_html($excerpt) . '</p>';
                }
            }
            
            $output .= '</div>';
        }
        
        $output .= '</div>';
        
        return $output;
    }
    
    /**
     * Albums shortcode
     */
    public function dasom_church_albums_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit' => 5,
            'show_images' => 'true',
            'show_youtube' => 'true'
        ), $atts);
        
        $albums = get_posts(array(
            'post_type' => 'dasom_album',
            'posts_per_page' => intval($atts['limit']),
            'orderby' => 'date',
            'order' => 'DESC'
        ));
        
        if (empty($albums)) {
            return '<p>' . esc_html__('No albums found.', 'dw-church') . '</p>';
        }
        
        $output = '<div class="dasom-albums-list">';
        
        foreach ($albums as $album) {
            $output .= '<div class="dasom-album-item">';
            $output .= '<h3><a href="' . esc_url(get_permalink($album->ID)) . '">' . esc_html(get_the_title($album)) . '</a></h3>';
            
            if ($atts['show_images'] === 'true') {
                $images = get_post_meta($album->ID, 'dasom_album_images', true);
                $images = $images ? json_decode($images, true) : array();
                if (!empty($images)) {
                    $output .= '<div class="dasom-album-images">';
                    foreach (array_slice($images, 0, 3) as $id) {
                        $url = wp_get_attachment_url($id);
                        if ($url) {
                            $output .= '<img src="' . esc_url($url) . '" alt="" style="width:100px;height:100px;object-fit:cover;margin:5px;" />';
                        }
                    }
                    $output .= '</div>';
                }
            }
            
            if ($atts['show_youtube'] === 'true') {
                $youtube = get_post_meta($album->ID, 'dasom_album_youtube', true);
                if ($youtube) {
                    $output .= '<p><a href="' . esc_url($youtube) . '" target="_blank" class="dasom-youtube-link">' . esc_html__('Watch on YouTube', 'dw-church') . '</a></p>';
                }
            }
            
            $output .= '</div>';
        }
        
        $output .= '</div>';
        
        return $output;
    }
}

