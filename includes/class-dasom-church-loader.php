<?php
/**
 * Plugin loader class
 *
 * @package Dasom_Church
 * @since 1.0.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Plugin loader class
 */
class Dasom_Church_Loader {
    
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
        add_action('init', array($this, 'dasom_church_register_post_types'));
        add_action('init', array($this, 'dasom_church_register_taxonomies'));
        add_action('add_meta_boxes', array($this, 'dasom_church_add_meta_boxes'));
        add_action('save_post', array($this, 'dasom_church_save_post_meta'));
        add_action('admin_enqueue_scripts', array($this, 'dasom_church_admin_scripts'));
        
        // Custom columns
        add_filter('manage_dasom_bulletin_posts_columns', array($this, 'dasom_church_bulletin_columns'));
        add_action('manage_dasom_bulletin_posts_custom_column', array($this, 'dasom_church_bulletin_column_content'), 10, 2);
        add_filter('manage_dasom_sermon_posts_columns', array($this, 'dasom_church_sermon_columns'));
        add_action('manage_dasom_sermon_posts_custom_column', array($this, 'dasom_church_sermon_column_content'), 10, 2);
        add_filter('manage_dasom_album_posts_columns', array($this, 'dasom_church_album_columns'));
        add_action('manage_dasom_album_posts_custom_column', array($this, 'dasom_church_album_column_content'), 10, 2);
        
        // Block editor settings
        add_filter('use_block_editor_for_post_type', array($this, 'dasom_church_disable_block_editor'), 10, 2);
    }
    
    /**
     * Register custom post types
     */
    public function dasom_church_register_post_types() {
        // Church Bulletin
        register_post_type('dasom_bulletin', array(
            'labels' => array(
                'name' => __('Church Bulletins', 'dasom-church'),
                'singular_name' => __('Bulletin', 'dasom-church'),
                'add_new' => __('Add New Bulletin', 'dasom-church'),
                'add_new_item' => __('Add New Bulletin', 'dasom-church'),
                'edit_item' => __('Edit Bulletin', 'dasom-church'),
                'new_item' => __('New Bulletin', 'dasom-church'),
                'view_item' => __('View Bulletin', 'dasom-church'),
                'search_items' => __('Search Bulletins', 'dasom-church'),
                'not_found' => __('No bulletins found', 'dasom-church'),
                'not_found_in_trash' => __('No bulletins found in trash', 'dasom-church')
            ),
            'public' => true,
            'show_in_menu' => 'dasom-church-admin',
            'menu_position' => 1,
            'supports' => array(),
            'show_in_rest' => false,
            'capability_type' => 'post',
            'capabilities' => array(
                'edit_post' => 'edit_posts',
                'read_post' => 'read_private_posts',
                'delete_post' => 'delete_posts',
                'edit_posts' => 'edit_posts',
                'edit_others_posts' => 'edit_others_posts',
                'delete_posts' => 'delete_posts',
                'publish_posts' => 'publish_posts',
                'read_private_posts' => 'read_private_posts'
            )
        ));
        
        // Sermons
        register_post_type('dasom_sermon', array(
            'labels' => array(
                'name' => __('Sermons', 'dasom-church'),
                'singular_name' => __('Sermon', 'dasom-church'),
                'add_new' => __('Add New Sermon', 'dasom-church'),
                'add_new_item' => __('Add New Sermon', 'dasom-church'),
                'edit_item' => __('Edit Sermon', 'dasom-church'),
                'new_item' => __('New Sermon', 'dasom-church'),
                'view_item' => __('View Sermon', 'dasom-church'),
                'search_items' => __('Search Sermons', 'dasom-church'),
                'not_found' => __('No sermons found', 'dasom-church'),
                'not_found_in_trash' => __('No sermons found in trash', 'dasom-church')
            ),
            'public' => true,
            'show_in_menu' => 'dasom-church-admin',
            'menu_position' => 2,
            'supports' => array(),
            'show_in_rest' => false,
            'capability_type' => 'post'
        ));
        
        // Pastoral Columns
        register_post_type('dasom_column', array(
            'labels' => array(
                'name' => __('Pastoral Columns', 'dasom-church'),
                'singular_name' => __('Column', 'dasom-church'),
                'add_new' => __('Add New Column', 'dasom-church'),
                'add_new_item' => __('Add New Column', 'dasom-church'),
                'edit_item' => __('Edit Column', 'dasom-church'),
                'new_item' => __('New Column', 'dasom-church'),
                'view_item' => __('View Column', 'dasom-church'),
                'search_items' => __('Search Columns', 'dasom-church'),
                'not_found' => __('No columns found', 'dasom-church'),
                'not_found_in_trash' => __('No columns found in trash', 'dasom-church')
            ),
            'public' => true,
            'show_in_menu' => 'dasom-church-admin',
            'menu_position' => 3,
            'supports' => array('title', 'editor', 'thumbnail'),
            'show_in_rest' => true,
            'capability_type' => 'post'
        ));
        
        // Church Albums
        register_post_type('dasom_album', array(
            'labels' => array(
                'name' => __('Church Albums', 'dasom-church'),
                'singular_name' => __('Album', 'dasom-church'),
                'add_new' => __('Add New Album', 'dasom-church'),
                'add_new_item' => __('Add New Album', 'dasom-church'),
                'edit_item' => __('Edit Album', 'dasom-church'),
                'new_item' => __('New Album', 'dasom-church'),
                'view_item' => __('View Album', 'dasom-church'),
                'search_items' => __('Search Albums', 'dasom-church'),
                'not_found' => __('No albums found', 'dasom-church'),
                'not_found_in_trash' => __('No albums found in trash', 'dasom-church')
            ),
            'public' => true,
            'show_in_menu' => 'dasom-church-admin',
            'menu_position' => 4,
            'supports' => array('title'),
            'show_in_rest' => false,
            'capability_type' => 'post'
        ));
    }
    
    /**
     * Register taxonomies
     */
    public function dasom_church_register_taxonomies() {
        register_taxonomy('dasom_sermon_category', 'dasom_sermon', array(
            'labels' => array(
                'name' => __('Sermon Categories', 'dasom-church'),
                'singular_name' => __('Sermon Category', 'dasom-church'),
                'search_items' => __('Search Categories', 'dasom-church'),
                'all_items' => __('All Categories', 'dasom-church'),
                'parent_item' => __('Parent Category', 'dasom-church'),
                'parent_item_colon' => __('Parent Category:', 'dasom-church'),
                'edit_item' => __('Edit Category', 'dasom-church'),
                'update_item' => __('Update Category', 'dasom-church'),
                'add_new_item' => __('Add New Category', 'dasom-church'),
                'new_item_name' => __('New Category Name', 'dasom-church'),
                'menu_name' => __('Categories', 'dasom-church')
            ),
            'hierarchical' => true,
            'show_admin_column' => true,
            'rewrite' => array('slug' => 'sermon-category'),
            'show_in_rest' => true,
            'capabilities' => array(
                'manage_terms' => 'manage_categories',
                'edit_terms' => 'manage_categories',
                'delete_terms' => 'manage_categories',
                'assign_terms' => 'edit_posts'
            )
        ));
    }
    
    /**
     * Disable block editor for specific post types
     */
    public function dasom_church_disable_block_editor($use, $post_type) {
        if (in_array($post_type, array('dasom_bulletin', 'dasom_sermon'))) {
            return false;
        }
        return $use;
    }
    
    /**
     * Add meta boxes
     */
    public function dasom_church_add_meta_boxes() {
        add_meta_box(
            'dasom_bulletin_meta',
            __('Bulletin Information', 'dasom-church'),
            array($this, 'dasom_church_bulletin_meta_box'),
            'dasom_bulletin',
            'normal',
            'default'
        );
        
        add_meta_box(
            'dasom_sermon_meta',
            __('Sermon Information', 'dasom-church'),
            array($this, 'dasom_church_sermon_meta_box'),
            'dasom_sermon',
            'normal',
            'default'
        );
        
        add_meta_box(
            'dasom_column_meta',
            __('Column Information', 'dasom-church'),
            array($this, 'dasom_church_column_meta_box'),
            'dasom_column',
            'normal',
            'default'
        );
        
        add_meta_box(
            'dasom_album_meta',
            __('Album Information', 'dasom-church'),
            array($this, 'dasom_church_album_meta_box'),
            'dasom_album',
            'normal',
            'default'
        );
    }
    
    /**
     * Bulletin meta box
     */
    public function dasom_church_bulletin_meta_box($post) {
        wp_nonce_field('dasom_church_bulletin_meta_action', 'dasom_church_bulletin_meta_nonce');
        
        $date = get_post_meta($post->ID, 'dasom_bulletin_date', true);
        $pdf = get_post_meta($post->ID, 'dasom_bulletin_pdf', true);
        $images = get_post_meta($post->ID, 'dasom_bulletin_images', true);
        $images = $images ? json_decode($images, true) : array();
        
        ?>
        <p>
            <label for="dasom_bulletin_date"><?php echo esc_html__('Bulletin Date', 'dasom-church'); ?></label><br>
            <input type="date" id="dasom_bulletin_date" name="dasom_bulletin_date" value="<?php echo esc_attr($date); ?>" />
        </p>
        
        <p>
            <label><?php echo esc_html__('Bulletin PDF', 'dasom-church'); ?></label><br>
            <input type="hidden" id="dasom_bulletin_pdf" name="dasom_bulletin_pdf" value="<?php echo esc_attr($pdf); ?>" />
            <button type="button" class="button" id="dasom_bulletin_pdf_button"><?php echo esc_html__('Upload PDF', 'dasom-church'); ?></button>
            <div id="dasom_bulletin_pdf_preview" style="margin-top:8px;">
                <?php if ($pdf): ?>
                    <a href="<?php echo esc_url(wp_get_attachment_url($pdf)); ?>" target="_blank"><?php echo esc_html__('View Current PDF', 'dasom-church'); ?></a>
                <?php endif; ?>
            </div>
        </p>
        
        <p>
            <label><?php echo esc_html__('Bulletin Images', 'dasom-church'); ?></label><br>
            <input type="hidden" id="dasom_bulletin_images" name="dasom_bulletin_images" value="<?php echo esc_attr(wp_json_encode($images)); ?>" />
            <button type="button" class="button" id="dasom_bulletin_images_button"><?php echo esc_html__('Upload Images', 'dasom-church'); ?></button>
            <ul id="dasom_bulletin_images_preview" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
                <?php foreach ($images as $id): ?>
                    <li data-id="<?php echo esc_attr($id); ?>">
                        <img src="<?php echo esc_url(wp_get_attachment_url($id)); ?>" style="width:100px;height:100px;object-fit:cover;" />
                    </li>
                <?php endforeach; ?>
            </ul>
            <p style="color:#666;margin-top:6px;"><?php echo esc_html__('Drag to reorder images.', 'dasom-church'); ?></p>
        </p>
        <?php
    }
    
    /**
     * Sermon meta box
     */
    public function dasom_church_sermon_meta_box($post) {
        wp_nonce_field('dasom_church_sermon_meta_action', 'dasom_church_sermon_meta_nonce');
        
        $title = get_post_meta($post->ID, 'dasom_sermon_title', true);
        $youtube = get_post_meta($post->ID, 'dasom_sermon_youtube', true);
        $scripture = get_post_meta($post->ID, 'dasom_sermon_scripture', true);
        $sermon_date = get_post_meta($post->ID, 'dasom_sermon_date', true);
        $thumb_id = get_post_meta($post->ID, 'dasom_sermon_thumb_id', true);
        
        ?>
        <p>
            <label for="dasom_sermon_title"><?php echo esc_html__('Sermon Title', 'dasom-church'); ?></label><br>
            <input type="text" id="dasom_sermon_title" name="dasom_sermon_title" value="<?php echo esc_attr($title); ?>" style="width:100%;" />
        </p>
        
        <p>
            <label for="dasom_sermon_scripture"><?php echo esc_html__('Scripture', 'dasom-church'); ?></label><br>
            <input type="text" id="dasom_sermon_scripture" name="dasom_sermon_scripture" value="<?php echo esc_attr($scripture); ?>" style="width:100%;" />
        </p>
        
        <p>
            <label for="dasom_sermon_youtube"><?php echo esc_html__('YouTube URL', 'dasom-church'); ?></label><br>
            <input type="url" id="dasom_sermon_youtube" name="dasom_sermon_youtube" value="<?php echo esc_url($youtube); ?>" style="width:100%;" />
        </p>
        
        <p>
            <label for="dasom_sermon_date"><?php echo esc_html__('Sermon Date', 'dasom-church'); ?></label><br>
            <input type="date" id="dasom_sermon_date" name="dasom_sermon_date" value="<?php echo esc_attr($sermon_date); ?>" />
        </p>
        
        <p>
            <label><?php echo esc_html__('YouTube Thumbnail', 'dasom-church'); ?></label><br>
            <input type="hidden" id="dasom_sermon_thumb_id" name="dasom_sermon_thumb_id" value="<?php echo esc_attr($thumb_id); ?>" />
            <button type="button" class="button" id="dasom_sermon_thumb_button"><?php echo esc_html__('Upload Thumbnail', 'dasom-church'); ?></button>
            <button type="button" class="button" id="dasom_sermon_thumb_fetch"><?php echo esc_html__('Fetch YouTube Thumbnail', 'dasom-church'); ?></button>
            <div id="dasom_sermon_thumb_preview" style="margin-top:10px;">
                <?php if ($thumb_id): ?>
                    <img src="<?php echo esc_url(wp_get_attachment_url($thumb_id)); ?>" style="width:160px;height:90px;object-fit:cover;" />
                <?php endif; ?>
            </div>
        </p>
        <?php
    }
    
    /**
     * Column meta box
     */
    public function dasom_church_column_meta_box($post) {
        wp_nonce_field('dasom_church_column_meta_action', 'dasom_church_column_meta_nonce');
        
        $author = get_post_meta($post->ID, 'dasom_column_author', true);
        $topic = get_post_meta($post->ID, 'dasom_column_topic', true);
        
        ?>
        <p>
            <label for="dasom_column_author"><?php echo esc_html__('Author', 'dasom-church'); ?></label><br>
            <input type="text" id="dasom_column_author" name="dasom_column_author" value="<?php echo esc_attr($author); ?>" style="width:100%;" />
        </p>
        
        <p>
            <label for="dasom_column_topic"><?php echo esc_html__('Topic', 'dasom-church'); ?></label><br>
            <input type="text" id="dasom_column_topic" name="dasom_column_topic" value="<?php echo esc_attr($topic); ?>" style="width:100%;" />
        </p>
        <?php
    }
    
    /**
     * Album meta box
     */
    public function dasom_church_album_meta_box($post) {
        wp_nonce_field('dasom_church_album_meta_action', 'dasom_church_album_meta_nonce');
        
        $images = get_post_meta($post->ID, 'dasom_album_images', true);
        $images = $images ? json_decode($images, true) : array();
        $youtube = get_post_meta($post->ID, 'dasom_album_youtube', true);
        $thumb_id = get_post_meta($post->ID, 'dasom_album_thumb_id', true);
        
        ?>
        <p>
            <label><?php echo esc_html__('Album Images', 'dasom-church'); ?></label><br>
            <input type="hidden" id="dasom_album_images" name="dasom_album_images" value="<?php echo esc_attr(wp_json_encode($images)); ?>" />
            <button type="button" class="button" id="dasom_album_images_button"><?php echo esc_html__('Upload/Select Images', 'dasom-church'); ?></button>
            <ul id="dasom_album_images_preview" style="margin-top:10px; display:flex; flex-wrap:wrap; gap:10px;">
                <?php foreach ($images as $id): ?>
                    <li data-id="<?php echo esc_attr($id); ?>">
                        <img src="<?php echo esc_url(wp_get_attachment_url($id)); ?>" style="width:100px;height:100px;object-fit:cover;" />
                    </li>
                <?php endforeach; ?>
            </ul>
        </p>
        
        <p>
            <label for="dasom_album_youtube"><?php echo esc_html__('YouTube URL', 'dasom-church'); ?></label><br>
            <input type="url" id="dasom_album_youtube" name="dasom_album_youtube" value="<?php echo esc_url($youtube); ?>" style="width:100%;" />
        </p>
        
        <p>
            <label><?php echo esc_html__('YouTube Thumbnail', 'dasom-church'); ?></label><br>
            <input type="hidden" id="dasom_album_thumb_id" name="dasom_album_thumb_id" value="<?php echo esc_attr($thumb_id); ?>" />
            <button type="button" class="button" id="dasom_album_thumb_button"><?php echo esc_html__('Upload Thumbnail', 'dasom-church'); ?></button>
            <button type="button" class="button" id="dasom_album_thumb_fetch"><?php echo esc_html__('Fetch YouTube Thumbnail', 'dasom-church'); ?></button>
            <div id="dasom_album_thumb_preview" style="margin-top:10px;">
                <?php if ($thumb_id): ?>
                    <img src="<?php echo esc_url(wp_get_attachment_url($thumb_id)); ?>" style="width:160px;height:90px;object-fit:cover;" />
                <?php endif; ?>
            </div>
        </p>
        <?php
    }
    
    /**
     * Save post meta with nonce verification
     */
    public function dasom_church_save_post_meta($post_id) {
        // Skip autosave and revisions
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (wp_is_post_revision($post_id)) return;
        
        $post_type = get_post_type($post_id);
        
        // Bulletin meta
        if ($post_type === 'dasom_bulletin') {
            if (!isset($_POST['dasom_church_bulletin_meta_nonce']) || 
                !wp_verify_nonce($_POST['dasom_church_bulletin_meta_nonce'], 'dasom_church_bulletin_meta_action')) {
                return;
            }
            
            if (!current_user_can('edit_post', $post_id)) return;
            
            if (isset($_POST['dasom_bulletin_date'])) {
                update_post_meta($post_id, 'dasom_bulletin_date', sanitize_text_field($_POST['dasom_bulletin_date']));
            }
            if (isset($_POST['dasom_bulletin_pdf'])) {
                update_post_meta($post_id, 'dasom_bulletin_pdf', absint($_POST['dasom_bulletin_pdf']));
            }
            if (isset($_POST['dasom_bulletin_images'])) {
                $images = json_decode(stripslashes($_POST['dasom_bulletin_images']), true);
                if (is_array($images)) {
                    $images = array_map('absint', $images);
                    update_post_meta($post_id, 'dasom_bulletin_images', wp_json_encode($images));
                }
            }
            
            // Auto-generate title from date
            $date = get_post_meta($post_id, 'dasom_bulletin_date', true);
            if ($date) {
                $new_title = date_i18n(__('Y년 n월 j일', 'dasom-church'), strtotime($date)) . ' ' . __('Church Bulletin', 'dasom-church');
                $post = get_post($post_id);
                if ($post && $post->post_title !== $new_title) {
                    wp_update_post(array(
                        'ID' => $post_id,
                        'post_title' => $new_title,
                        'post_name' => sanitize_title($new_title)
                    ));
                }
            }
        }
        
        // Sermon meta
        if ($post_type === 'dasom_sermon') {
            if (!isset($_POST['dasom_church_sermon_meta_nonce']) || 
                !wp_verify_nonce($_POST['dasom_church_sermon_meta_nonce'], 'dasom_church_sermon_meta_action')) {
                return;
            }
            
            if (!current_user_can('edit_post', $post_id)) return;
            
            $title = sanitize_text_field($_POST['dasom_sermon_title'] ?? '');
            $youtube = esc_url_raw($_POST['dasom_sermon_youtube'] ?? '');
            $scripture = sanitize_text_field($_POST['dasom_sermon_scripture'] ?? '');
            $sermon_date = sanitize_text_field($_POST['dasom_sermon_date'] ?? '');
            $thumb_id = absint($_POST['dasom_sermon_thumb_id'] ?? 0);
            
            update_post_meta($post_id, 'dasom_sermon_title', $title);
            update_post_meta($post_id, 'dasom_sermon_youtube', $youtube);
            update_post_meta($post_id, 'dasom_sermon_scripture', $scripture);
            update_post_meta($post_id, 'dasom_sermon_date', $sermon_date);
            update_post_meta($post_id, 'dasom_sermon_thumb_id', $thumb_id);
            
            // Sync post title
            if ($title) {
                $post = get_post($post_id);
                if ($post && $post->post_title !== $title) {
                    wp_update_post(array(
                        'ID' => $post_id,
                        'post_title' => $title,
                        'post_name' => sanitize_title($title)
                    ));
                }
            }
            
            // Set featured image
            if ($thumb_id) {
                set_post_thumbnail($post_id, $thumb_id);
            } elseif ($youtube && preg_match('/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^\&\?\/]+)/', $youtube, $matches)) {
                $youtube_id = $matches[1];
                $thumbnail_url = "https://img.youtube.com/vi/{$youtube_id}/maxresdefault.jpg";
                
                if (!function_exists('media_sideload_image')) {
                    require_once(ABSPATH . 'wp-admin/includes/media.php');
                    require_once(ABSPATH . 'wp-admin/includes/file.php');
                    require_once(ABSPATH . 'wp-admin/includes/image.php');
                }
                
                $image_id = media_sideload_image($thumbnail_url, $post_id, $title, 'id');
                if (is_wp_error($image_id)) {
                    $image_id = media_sideload_image("https://img.youtube.com/vi/{$youtube_id}/hqdefault.jpg", $post_id, $title, 'id');
                }
                if (!is_wp_error($image_id)) {
                    set_post_thumbnail($post_id, $image_id);
                }
            }
            
            // Set default category
            $default = get_term_by('name', __('Sunday Sermon', 'dasom-church'), 'dasom_sermon_category');
            if ($default && !wp_get_post_terms($post_id, 'dasom_sermon_category')) {
                wp_set_post_terms($post_id, array($default->term_id), 'dasom_sermon_category', false);
            }
        }
        
        // Column meta
        if ($post_type === 'dasom_column') {
            if (!isset($_POST['dasom_church_column_meta_nonce']) || 
                !wp_verify_nonce($_POST['dasom_church_column_meta_nonce'], 'dasom_church_column_meta_action')) {
                return;
            }
            
            if (!current_user_can('edit_post', $post_id)) return;
            
            if (isset($_POST['dasom_column_author'])) {
                update_post_meta($post_id, 'dasom_column_author', sanitize_text_field($_POST['dasom_column_author']));
            }
            if (isset($_POST['dasom_column_topic'])) {
                update_post_meta($post_id, 'dasom_column_topic', sanitize_text_field($_POST['dasom_column_topic']));
            }
        }
        
        // Album meta
        if ($post_type === 'dasom_album') {
            if (!isset($_POST['dasom_church_album_meta_nonce']) || 
                !wp_verify_nonce($_POST['dasom_church_album_meta_nonce'], 'dasom_church_album_meta_action')) {
                return;
            }
            
            if (!current_user_can('edit_post', $post_id)) return;
            
            $youtube = esc_url_raw($_POST['dasom_album_youtube'] ?? '');
            $thumb_id = absint($_POST['dasom_album_thumb_id'] ?? 0);
            
            update_post_meta($post_id, 'dasom_album_youtube', $youtube);
            update_post_meta($post_id, 'dasom_album_thumb_id', $thumb_id);
            
            if (isset($_POST['dasom_album_images'])) {
                $images = json_decode(stripslashes($_POST['dasom_album_images']), true);
                if (is_array($images)) {
                    $images = array_map('absint', $images);
                    update_post_meta($post_id, 'dasom_album_images', wp_json_encode($images));
                }
            }
            
            // Set featured image
            if ($thumb_id) {
                set_post_thumbnail($post_id, $thumb_id);
            } elseif ($youtube && preg_match('/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^\&\?\/]+)/', $youtube, $matches)) {
                $youtube_id = $matches[1];
                $thumbnail_url = "https://img.youtube.com/vi/{$youtube_id}/maxresdefault.jpg";
                
                if (!function_exists('media_sideload_image')) {
                    require_once(ABSPATH . 'wp-admin/includes/media.php');
                    require_once(ABSPATH . 'wp-admin/includes/file.php');
                    require_once(ABSPATH . 'wp-admin/includes/image.php');
                }
                
                $image_id = media_sideload_image($thumbnail_url, $post_id, get_the_title($post_id), 'id');
                if (!is_wp_error($image_id)) {
                    set_post_thumbnail($post_id, $image_id);
                    update_post_meta($post_id, 'dasom_album_thumb_id', $image_id);
                }
            }
        }
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function dasom_church_admin_scripts($hook) {
        global $post;
        
        if (($hook == 'post-new.php' || $hook == 'post.php') && isset($post->post_type)) {
            wp_enqueue_media();
            wp_enqueue_script('jquery-ui-sortable');
            
            $post_types = array('dasom_bulletin', 'dasom_sermon', 'dasom_album');
            if (in_array($post->post_type, $post_types)) {
                wp_enqueue_script('dasom-church-admin', DASOM_CHURCH_PLUGIN_URL . 'assets/js/admin.js', array('jquery', 'wp-media'), DASOM_CHURCH_VERSION, true);
                wp_enqueue_style('dasom-church-admin', DASOM_CHURCH_PLUGIN_URL . 'assets/css/admin.css', array(), DASOM_CHURCH_VERSION);
            }
        }
    }
    
    /**
     * Custom columns for bulletin posts
     */
    public function dasom_church_bulletin_columns($columns) {
        return array(
            'cb' => $columns['cb'],
            'bulletin_date' => __('Bulletin Date', 'dasom-church'),
            'bulletin_pdf' => __('PDF File', 'dasom-church'),
            'bulletin_images' => __('Bulletin Images', 'dasom-church')
        );
    }
    
    /**
     * Custom column content for bulletins
     */
    public function dasom_church_bulletin_column_content($column, $post_id) {
        switch ($column) {
            case 'bulletin_date':
                echo esc_html(get_post_meta($post_id, 'dasom_bulletin_date', true));
                break;
            case 'bulletin_pdf':
                $pdf = get_post_meta($post_id, 'dasom_bulletin_pdf', true);
                if ($pdf) {
                    echo '<a href="' . esc_url(wp_get_attachment_url($pdf)) . '" target="_blank">' . esc_html__('View', 'dasom-church') . '</a>';
                } else {
                    echo esc_html__('None', 'dasom-church');
                }
                break;
            case 'bulletin_images':
                $images = get_post_meta($post_id, 'dasom_bulletin_images', true);
                $images = $images ? json_decode($images, true) : array();
                if ($images) {
                    echo '<div style="display:flex;gap:5px;flex-wrap:nowrap;overflow-x:auto;max-width:600px;">';
                    foreach ($images as $id) {
                        $url = wp_get_attachment_url($id);
                        if ($url) {
                            echo '<img src="' . esc_url($url) . '" style="width:60px;height:60px;object-fit:cover;" />';
                        }
                    }
                    echo '</div>';
                } else {
                    echo esc_html__('None', 'dasom-church');
                }
                break;
        }
    }
    
    /**
     * Custom columns for sermon posts
     */
    public function dasom_church_sermon_columns($columns) {
        return array(
            'cb' => $columns['cb'],
            'sermon_date' => __('Sermon Date', 'dasom-church'),
            'sermon_title' => __('Title', 'dasom-church'),
            'sermon_scripture' => __('Scripture', 'dasom-church'),
            'sermon_youtube' => __('YouTube', 'dasom-church'),
            'sermon_thumb' => __('Thumbnail', 'dasom-church'),
            'date' => __('Publication Status', 'dasom-church')
        );
    }
    
    /**
     * Custom column content for sermons
     */
    public function dasom_church_sermon_column_content($column, $post_id) {
        switch ($column) {
            case 'sermon_date':
                $date = get_post_meta($post_id, 'dasom_sermon_date', true);
                echo $date ? esc_html(date_i18n('Y-m-d', strtotime($date))) : '-';
                break;
            case 'sermon_title':
                echo esc_html(get_post_meta($post_id, 'dasom_sermon_title', true));
                break;
            case 'sermon_scripture':
                echo esc_html(get_post_meta($post_id, 'dasom_sermon_scripture', true));
                break;
            case 'sermon_youtube':
                $youtube = get_post_meta($post_id, 'dasom_sermon_youtube', true);
                if ($youtube) {
                    echo '<a href="' . esc_url($youtube) . '" target="_blank">' . esc_html($youtube) . '</a>';
                } else {
                    echo esc_html__('None', 'dasom-church');
                }
                break;
            case 'sermon_thumb':
                if (has_post_thumbnail($post_id)) {
                    echo get_the_post_thumbnail($post_id, array(100, 56), array('style' => 'width:100px;height:56px;object-fit:cover;'));
                } else {
                    echo esc_html__('None', 'dasom-church');
                }
                break;
            case 'date':
                $post = get_post($post_id);
                if ($post->post_status === 'future') {
                    echo '<span style="color:orange;">' . esc_html__('Scheduled: ', 'dasom-church') . esc_html(date_i18n('Y-m-d H:i', strtotime($post->post_date))) . '</span>';
                } else {
                    echo esc_html(date_i18n('Y-m-d H:i', strtotime($post->post_date)));
                }
                break;
        }
    }
    
    /**
     * Custom columns for album posts
     */
    public function dasom_church_album_columns($columns) {
        return array(
            'cb' => $columns['cb'],
            'title' => __('Album Title', 'dasom-church'),
            'youtube' => __('YouTube', 'dasom-church'),
            'thumb' => __('Thumbnail', 'dasom-church'),
            'images' => __('Album Images', 'dasom-church'),
            'date' => __('Created Date', 'dasom-church')
        );
    }
    
    /**
     * Custom column content for albums
     */
    public function dasom_church_album_column_content($column, $post_id) {
        switch ($column) {
            case 'youtube':
                $youtube = get_post_meta($post_id, 'dasom_album_youtube', true);
                if ($youtube) {
                    echo '<a href="' . esc_url($youtube) . '" target="_blank">' . esc_html($youtube) . '</a>';
                } else {
                    echo esc_html__('None', 'dasom-church');
                }
                break;
            case 'thumb':
                if (has_post_thumbnail($post_id)) {
                    echo get_the_post_thumbnail($post_id, array(100, 56), array('style' => 'width:100px;height:56px;object-fit:cover;'));
                } else {
                    echo esc_html__('None', 'dasom-church');
                }
                break;
            case 'images':
                $images = get_post_meta($post_id, 'dasom_album_images', true);
                $images = $images ? json_decode($images, true) : array();
                if (!empty($images)) {
                    echo '<div style="display:flex; flex-direction:row; gap:5px; flex-wrap:wrap; max-width:600px;">';
                    foreach ($images as $id) {
                        $url = wp_get_attachment_url($id);
                        if ($url) {
                            echo '<img src="' . esc_url($url) . '" style="width:60px;height:60px;object-fit:cover;" />';
                        }
                    }
                    echo '</div>';
                } else {
                    echo esc_html__('None', 'dasom-church');
                }
                break;
        }
    }
}

