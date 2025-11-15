<?php
/**
 * Admin columns and Quick Edit functionality for Dasom Church Management
 *
 * @package Dasom_Church
 * @since 1.0.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Admin columns class
 */
class DW_Church_Columns {
    
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
        // Bulletin columns
        add_filter('manage_bulletin_posts_columns', array($this, 'dasom_church_bulletin_columns'));
        add_action('manage_bulletin_posts_custom_column', array($this, 'dasom_church_bulletin_column_content'), 10, 2);
        
        // Sermon columns
        add_filter('manage_sermon_posts_columns', array($this, 'dasom_church_sermon_columns'));
        add_action('manage_sermon_posts_custom_column', array($this, 'dasom_church_sermon_column_content'), 10, 2);
        
        // Column columns
        add_filter('manage_column_posts_columns', array($this, 'dasom_church_column_columns'));
        add_action('manage_column_posts_custom_column', array($this, 'dasom_church_column_column_content'), 10, 2);
        
        // Album columns
        add_filter('manage_album_posts_columns', array($this, 'dasom_church_album_columns'));
        add_action('manage_album_posts_custom_column', array($this, 'dasom_church_album_column_content'), 10, 2);
        
        // Banner columns
        add_filter('manage_banner_posts_columns', array($this, 'dasom_church_banner_columns'));
        add_action('manage_banner_posts_custom_column', array($this, 'dasom_church_banner_column_content'), 10, 2);
        add_filter('manage_edit-banner_sortable_columns', array($this, 'dasom_church_banner_sortable_columns'));
        
        // Quick Edit - DISABLED to prevent infinite loop
        // add_action('quick_edit_custom_box', array($this, 'dasom_church_quick_edit_fields'), 10, 2);
        // add_action('save_post', array($this, 'dasom_church_quick_edit_save'));
        
        // Admin scripts for Quick Edit
        add_action('admin_enqueue_scripts', array($this, 'dasom_church_admin_scripts'));
        
        // Ensure Published status is available in Quick Edit
        // Use very high priority to ensure it runs before WordPress default filters
        add_filter('get_available_post_statuses', array($this, 'dasom_church_ensure_published_status'), 10, 2);
    }
    
    /**
     * Ensure Published status is available in Quick Edit
     */
    public function dasom_church_ensure_published_status($statuses, $post_type) {
        // Only apply to our custom post types
        if (!in_array($post_type, array('bulletin', 'sermon', 'column', 'album', 'banner'))) {
            return $statuses;
        }
        
        // If statuses is empty or not an array, initialize it
        if (!is_array($statuses)) {
            $statuses = array();
        }
        
        // Ensure 'publish' status is included
        // Remove it first if it exists to avoid duplicates, then add it at the beginning
        $statuses = array_filter($statuses, function($status) {
            return $status !== 'publish';
        });
        
        // Add 'publish' at the beginning of the array
        array_unshift($statuses, 'publish');
        
        // Re-index array to ensure proper order
        $statuses = array_values($statuses);
        
        return $statuses;
    }
    
    /**
     * Bulletin columns
     */
    public function dasom_church_bulletin_columns($columns) {
        $new_columns = array();
        
        // Keep checkbox
        if (isset($columns['cb'])) {
            $new_columns['cb'] = $columns['cb'];
        }
        
        $new_columns['bulletin_date'] = __('주보 날짜', 'dw-church');
        $new_columns['bulletin_pdf'] = __('PDF 파일', 'dw-church');
        $new_columns['bulletin_images'] = __('주보 이미지', 'dw-church');
        $new_columns['date'] = __('게시일', 'dw-church');
        
        return $new_columns;
    }
    
    /**
     * Bulletin column content
     */
    public function dasom_church_bulletin_column_content($column, $post_id) {
        switch ($column) {
            case 'bulletin_date':
                $date = get_post_meta($post_id, 'dw_bulletin_date', true);
                if ($date) {
                    // Format date for display (한글 형식)
                    $timestamp = strtotime($date);
                    if ($timestamp !== false && $timestamp > 0) {
                        echo esc_html(date_i18n('Y년 n월 j일', $timestamp));
                    } else {
                        echo esc_html($date);
                    }
                } else {
                    echo '—';
                }
                break;
                
            case 'bulletin_pdf':
                $pdf = get_post_meta($post_id, 'dw_bulletin_pdf', true);
                if ($pdf) {
                    $url = wp_get_attachment_url($pdf);
                    if ($url) {
                        echo '<a href="' . esc_url($url) . '" target="_blank">' . __('보기', 'dw-church') . '</a>';
                    } else {
                        echo '—';
                    }
                } else {
                    echo '—';
                }
                break;
                
            case 'bulletin_images':
                $images = get_post_meta($post_id, 'dw_bulletin_images', true);
                $images = $images ? json_decode($images, true) : array();
                if (!empty($images)) {
                    echo '<div style="display:flex;gap:5px;flex-wrap:nowrap;overflow-x:auto;max-width:600px;">';
                    foreach ($images as $id) {
                        $url = wp_get_attachment_url($id);
                        if ($url) {
                            echo '<img src="' . esc_url($url) . '" style="width:60px;height:60px;object-fit:cover;" />';
                        }
                    }
                    echo '</div>';
                } else {
                    echo '—';
                }
                break;
        }
    }
    
    /**
     * Sermon columns
     */
    public function dasom_church_sermon_columns($columns) {
        $new_columns = array();
        
        // Keep checkbox
        if (isset($columns['cb'])) {
            $new_columns['cb'] = $columns['cb'];
        }
        
        $new_columns['sermon_date'] = __('설교 일자', 'dw-church');
        $new_columns['sermon_title'] = __('제목', 'dw-church');
        $new_columns['sermon_scripture'] = __('성경구절', 'dw-church');
        $new_columns['sermon_preacher'] = __('설교자', 'dw-church');
        $new_columns['sermon_youtube'] = __('YouTube', 'dw-church');
        $new_columns['sermon_thumb'] = __('썸네일', 'dw-church');
        $new_columns['date'] = __('게시 상태', 'dw-church');
        
        return $new_columns;
    }
    
    /**
     * Sermon column content
     */
    public function dasom_church_sermon_column_content($column, $post_id) {
        switch ($column) {
            case 'sermon_date':
                $date = get_post_meta($post_id, 'dw_sermon_date', true);
                if ($date && $date !== '') {
                    // Convert to readable format
                    $formatted_date = date_i18n('Y-m-d', strtotime($date));
                    echo esc_html($formatted_date);
                } else {
                    echo '—';
                }
                break;
                
            case 'sermon_title':
                $title = get_post_meta($post_id, 'dw_sermon_title', true);
                if ($title) {
                    echo esc_html($title);
                } else {
                    // Fallback to post title
                    $post_title = get_the_title($post_id);
                    echo $post_title ? esc_html($post_title) : '—';
                }
                break;
                
            case 'sermon_scripture':
                $scripture = get_post_meta($post_id, 'dw_sermon_scripture', true);
                if ($scripture) {
                    echo esc_html($scripture);
                } else {
                    echo '—';
                }
                break;
                
            case 'sermon_preacher':
                $preachers = wp_get_post_terms($post_id, 'dw_sermon_preacher', array('fields' => 'names'));
                if (!is_wp_error($preachers) && !empty($preachers)) {
                    echo esc_html(implode(', ', $preachers));
                } else {
                    // Try to get default preacher
                    $default_preacher = get_option('default_sermon_preacher', __('담임목사', 'dw-church'));
                    echo esc_html($default_preacher);
                }
                break;
                
            case 'sermon_youtube':
                $youtube = get_post_meta($post_id, 'dw_sermon_youtube', true);
                if ($youtube) {
                    echo '<a href="' . esc_url($youtube) . '" target="_blank">' . esc_html($youtube) . '</a>';
                } else {
                    echo '—';
                }
                break;
                
            case 'sermon_thumb':
                if (has_post_thumbnail($post_id)) {
                    echo get_the_post_thumbnail($post_id, array(100, 56), array('style' => 'width:100px;height:56px;object-fit:cover;'));
                } else {
                    echo '—';
                }
                break;
                
            case 'date':
                $post = get_post($post_id);
                if ($post->post_status === 'future') {
                    echo '<span style="color:orange;">예약됨: ' . esc_html(date_i18n('Y-m-d H:i', strtotime($post->post_date))) . '</span>';
                } else {
                    echo esc_html(date_i18n('Y-m-d H:i', strtotime($post->post_date)));
                }
                break;
        }
    }
    
    /**
     * Column columns
     */
    public function dasom_church_column_columns($columns) {
        $new_columns = array();
        
        // Keep checkbox
        if (isset($columns['cb'])) {
            $new_columns['cb'] = $columns['cb'];
        }
        
        $new_columns['date'] = __('게시일', 'dw-church');
        $new_columns['title'] = __('제목', 'dw-church');
        $new_columns['top_image'] = __('상단 이미지', 'dw-church');
        $new_columns['youtube'] = __('YouTube', 'dw-church');
        $new_columns['thumb'] = __('대표 이미지', 'dw-church');
        
        return $new_columns;
    }
    
    /**
     * Column column content
     */
    public function dasom_church_column_column_content($column, $post_id) {
        switch ($column) {
            case 'top_image':
                $top_image = get_post_meta($post_id, 'dw_column_top_image', true);
                if ($top_image) {
                    echo wp_get_attachment_image($top_image, array(80, 80), false, array('style' => 'object-fit:cover;'));
                } else {
                    echo __('이미지 없음', 'dw-church');
                }
                break;
                
            case 'youtube':
                $youtube = get_post_meta($post_id, 'dw_column_youtube', true);
                if ($youtube) {
                    echo '<a href="' . esc_url($youtube) . '" target="_blank">' . __('YouTube 보기', 'dw-church') . '</a>';
                } else {
                    echo '—';
                }
                break;
                
            case 'thumb':
                if (has_post_thumbnail($post_id)) {
                    echo get_the_post_thumbnail($post_id, array(80, 80), array('style' => 'object-fit:cover;'));
                } else {
                    echo __('이미지 없음', 'dw-church');
                }
                break;
        }
    }
    
    /**
     * Album columns
     */
    public function dasom_church_album_columns($columns) {
        $new_columns = array();
        
        // Keep checkbox
        if (isset($columns['cb'])) {
            $new_columns['cb'] = $columns['cb'];
        }
        
        $new_columns['title'] = __('앨범 제목', 'dw-church');
        $new_columns['youtube'] = __('YouTube', 'dw-church');
        $new_columns['thumb'] = __('썸네일', 'dw-church');
        $new_columns['images'] = __('앨범 이미지', 'dw-church');
        $new_columns['date'] = __('작성일', 'dw-church');
        
        return $new_columns;
    }
    
    /**
     * Album column content
     */
    public function dasom_church_album_column_content($column, $post_id) {
        switch ($column) {
            case 'youtube':
                $youtube = get_post_meta($post_id, 'dw_album_youtube', true);
                if ($youtube) {
                    echo '<a href="' . esc_url($youtube) . '" target="_blank">' . esc_html($youtube) . '</a>';
                } else {
                    echo '—';
                }
                break;
                
            case 'thumb':
                if (has_post_thumbnail($post_id)) {
                    echo get_the_post_thumbnail($post_id, array(100, 56), array('style' => 'width:100px;height:56px;object-fit:cover;'));
                } else {
                    echo '—';
                }
                break;
                
            case 'images':
                $images = get_post_meta($post_id, 'dw_album_images', true);
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
                    echo '—';
                }
                break;
        }
    }
    
    /**
     * Banner columns
     */
    public function dasom_church_banner_columns($columns) {
        $new_columns = array();
        
        // Keep checkbox
        if (isset($columns['cb'])) {
            $new_columns['cb'] = $columns['cb'];
        }
        
        $new_columns['title'] = __('배너 제목', 'dw-church');
        $new_columns['menu_order'] = __('순서', 'dw-church');
        $new_columns['banner_category'] = __('카테고리', 'dw-church');
        $new_columns['banner_image'] = __('배너 이미지', 'dw-church');
        $new_columns['link_url'] = __('링크 URL', 'dw-church');
        $new_columns['start_date'] = __('시작 날짜', 'dw-church');
        $new_columns['end_date'] = __('종료 날짜', 'dw-church');
        $new_columns['link_target'] = __('열기 방식', 'dw-church');
        $new_columns['date'] = __('작성일', 'dw-church');
        
        return $new_columns;
    }
    
    /**
     * Banner sortable columns
     */
    public function dasom_church_banner_sortable_columns($columns) {
        $columns['menu_order'] = 'menu_order';
        return $columns;
    }
    
    /**
     * Banner column content
     */
    public function dasom_church_banner_column_content($column, $post_id) {
        switch ($column) {
            case 'menu_order':
                $post = get_post($post_id);
                $menu_order = $post->menu_order;
                echo '<strong>' . esc_html($menu_order) . '</strong>';
                echo '<br><small style="color:#666;">' . __('숫자가 작을수록 먼저 표시', 'dw-church') . '</small>';
                break;
                
            case 'banner_category':
                $terms = wp_get_post_terms($post_id, 'banner_category');
                if (!empty($terms) && !is_wp_error($terms)) {
                    $category_name = $terms[0]->name;
                    $color = ($category_name === '메인 배너' || $category_name === 'Main Banner') ? '#2271b1' : '#50b83c';
                    echo '<span style="display:inline-block;padding:3px 8px;background:' . $color . ';color:#fff;border-radius:3px;font-size:11px;">' . esc_html($category_name) . '</span>';
                } else {
                    echo '<span style="color:#999;">' . __('미분류', 'dw-church') . '</span>';
                }
                break;
                
            case 'banner_image':
                // Get category to determine which image to show
                $terms = wp_get_post_terms($post_id, 'banner_category');
                $category = !empty($terms) && !is_wp_error($terms) ? $terms[0]->name : '';
                
                if ($category === '메인 배너' || $category === 'Main Banner') {
                    $pc_image = get_post_meta($post_id, 'dw_banner_pc_image', true);
                    $mobile_image = get_post_meta($post_id, 'dw_banner_mobile_image', true);
                    
                    if ($pc_image) {
                        $url = wp_get_attachment_url($pc_image);
                        if ($url) {
                            echo '<div style="margin-bottom:5px;"><small>PC:</small><br><img src="' . esc_url($url) . '" style="width:150px;height:auto;max-height:40px;object-fit:cover;border:1px solid #ddd;" /></div>';
                        }
                    }
                    if ($mobile_image) {
                        $url = wp_get_attachment_url($mobile_image);
                        if ($url) {
                            echo '<div><small>Mobile:</small><br><img src="' . esc_url($url) . '" style="width:80px;height:auto;max-height:40px;object-fit:cover;border:1px solid #ddd;" /></div>';
                        }
                    }
                    if (!$pc_image && !$mobile_image) {
                        echo '—';
                    }
                } elseif ($category === '서브 배너' || $category === 'Sub Banner') {
                    $sub_image = get_post_meta($post_id, 'dw_banner_sub_image', true);
                    $sub_ratio = get_post_meta($post_id, 'dw_banner_sub_ratio', true);
                    
                    if ($sub_image) {
                        $url = wp_get_attachment_url($sub_image);
                        if ($url) {
                            echo '<img src="' . esc_url($url) . '" style="width:120px;height:auto;max-height:50px;object-fit:cover;border:1px solid #ddd;" />';
                            if ($sub_ratio) {
                                echo '<br><small style="color:#666;">' . esc_html($sub_ratio) . '</small>';
                            }
                        } else {
                            echo '—';
                        }
                    } else {
                        echo '—';
                    }
                } else {
                    echo '—';
                }
                break;
                
            case 'link_url':
                $link_url = get_post_meta($post_id, 'dw_banner_link_url', true);
                if ($link_url) {
                    echo '<a href="' . esc_url($link_url) . '" target="_blank" style="word-break:break-all;">' . esc_html($link_url) . '</a>';
                } else {
                    echo '—';
                }
                break;
                
            case 'start_date':
                $start_date = get_post_meta($post_id, 'dw_banner_start_date', true);
                if ($start_date) {
                    $timestamp = strtotime($start_date);
                    if ($timestamp !== false && $timestamp > 0) {
                        echo esc_html(date_i18n('Y-m-d H:i', $timestamp));
                        if ($timestamp > current_time('timestamp')) {
                            echo '<br><span style="color:#f0ad4e;">' . __('(예약됨)', 'dw-church') . '</span>';
                        }
                    } else {
                        echo '—';
                    }
                } else {
                    echo __('즉시', 'dw-church');
                }
                break;
                
            case 'end_date':
                $end_date = get_post_meta($post_id, 'dw_banner_end_date', true);
                if ($end_date) {
                    $timestamp = strtotime($end_date);
                    if ($timestamp !== false && $timestamp > 0) {
                        echo esc_html(date_i18n('Y-m-d H:i', $timestamp));
                        if ($timestamp < current_time('timestamp')) {
                            echo '<br><span style="color:#dc3545;">' . __('(만료됨)', 'dw-church') . '</span>';
                        }
                    } else {
                        echo '—';
                    }
                } else {
                    echo __('무기한', 'dw-church');
                }
                break;
                
            case 'link_target':
                $link_target = get_post_meta($post_id, 'dw_banner_link_target', true);
                if ($link_target === '_blank') {
                    echo __('새 창', 'dw-church');
                } else {
                    echo __('현재 창', 'dw-church');
                }
                break;
        }
    }
    
    /**
     * Quick Edit fields
     */
    public function dasom_church_quick_edit_fields($column_name, $post_type) {
        static $printNonce = true;
        static $printed_forms = array();
        
        if ($printNonce) {
            $printNonce = false;
            wp_nonce_field('dasom_church_quick_edit', 'dasom_church_quick_edit_nonce');
        }
        
        // Only print fields once per post type
        if (in_array($post_type, $printed_forms)) {
            return;
        }
        $printed_forms[] = $post_type;
        
        // Add all custom fields for this post type at once
        switch ($post_type) {
            case 'bulletin':
                echo '<fieldset class="inline-edit-col-right">';
                echo '<div class="inline-edit-col">';
                echo '<label>';
                echo '<span class="title">' . __('주보 날짜', 'dw-church') . '</span>';
                echo '<input type="date" name="dw_bulletin_date" value="" />';
                echo '</label>';
                echo '</div>';
                echo '</fieldset>';
                break;
                
            case 'sermon':
                echo '<fieldset class="inline-edit-col-right">';
                echo '<div class="inline-edit-col">';
                echo '<label>';
                echo '<span class="title">' . __('설교 일자', 'dw-church') . '</span>';
                echo '<input type="date" name="dw_sermon_date" value="" />';
                echo '</label>';
                echo '</div>';
                echo '</fieldset>';
                break;
                
            case 'column':
                echo '<fieldset class="inline-edit-col-right">';
                echo '<div class="inline-edit-col">';
                echo '<label>';
                echo '<span class="title">' . __('작성자', 'dw-church') . '</span>';
                echo '<input type="text" name="column_author" value="" />';
                echo '</label>';
                echo '</div>';
                echo '<div class="inline-edit-col">';
                echo '<label>';
                echo '<span class="title">' . __('주제', 'dw-church') . '</span>';
                echo '<input type="text" name="column_topic" value="" />';
                echo '</label>';
                echo '</div>';
                echo '</fieldset>';
                break;
        }
    }
    
    /**
     * Save Quick Edit
     */
    public function dasom_church_quick_edit_save($post_id) {
        // Only process Quick Edit saves - check for Quick Edit specific data
        if (!isset($_POST['dasom_church_quick_edit_nonce']) || 
            !wp_verify_nonce($_POST['dasom_church_quick_edit_nonce'], 'dasom_church_quick_edit')) {
            return;
        }
        
        // Additional check: only process if this is actually a Quick Edit request
        if (!isset($_POST['action']) || $_POST['action'] !== 'inline-save') {
            return;
        }
        
        // Check if this is an autosave
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        // Check if this is a revision
        if (wp_is_post_revision($post_id)) {
            return;
        }
        
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        $post_type = get_post_type($post_id);
        
        switch ($post_type) {
            case 'bulletin':
                if (isset($_POST['dw_bulletin_date']) && !empty($_POST['dw_bulletin_date'])) {
                    $date = sanitize_text_field($_POST['dw_bulletin_date']);
                    // Debug log
                    error_log('Quick Edit - Bulletin date received: ' . $date);
                    
                    // Validate date format (YYYY-MM-DD)
                    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                        update_post_meta($post_id, 'dw_bulletin_date', $date);
                        error_log('Quick Edit - Bulletin date saved: ' . $date);
                    } else {
                        error_log('Quick Edit - Invalid bulletin date format: ' . $date);
                    }
                }
                break;
                
            case 'sermon':
                if (isset($_POST['dw_sermon_date']) && !empty($_POST['dw_sermon_date'])) {
                    $date = sanitize_text_field($_POST['dw_sermon_date']);
                    // Debug log
                    error_log('Quick Edit - Sermon date received: ' . $date);
                    
                    // Validate date format (YYYY-MM-DD)
                    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                        update_post_meta($post_id, 'dw_sermon_date', $date);
                        error_log('Quick Edit - Sermon date saved: ' . $date);
                    } else {
                        error_log('Quick Edit - Invalid sermon date format: ' . $date);
                    }
                }
                break;
                
            case 'column':
                if (isset($_POST['column_author'])) {
                    update_post_meta($post_id, 'column_author', sanitize_text_field($_POST['column_author']));
                }
                if (isset($_POST['column_topic'])) {
                    update_post_meta($post_id, 'column_topic', sanitize_text_field($_POST['column_topic']));
                }
                break;
        }
    }
    
    /**
     * Admin scripts for Quick Edit
     */
    public function dasom_church_admin_scripts($hook) {
        if ($hook !== 'edit.php') {
            return;
        }
        
        global $post_type;
        if (!in_array($post_type, array('bulletin', 'sermon', 'column', 'album'))) {
            return;
        }
        
        wp_enqueue_script('jquery');
        wp_add_inline_script('jquery', $this->dasom_church_get_quick_edit_script());
        
        // Localize script with AJAX URL
        wp_localize_script('jquery', 'dasomChurchQuickEdit', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('dasom_church_quick_edit_data'),
            'postType' => $post_type
        ));
    }
    
    /**
     * Get Quick Edit script
     */
    private function dasom_church_get_quick_edit_script() {
        return "
        (function($) {
            // Store current post data for Quick Edit
            var postData = {};
            
            // Function to ensure Published option exists in status dropdown
            function ensurePublishedOption() {
                var statusSelect = $('select[name=\"_status\"]');
                console.log('[Quick Edit] ensurePublishedOption called - statusSelect found:', statusSelect.length > 0);
                if (statusSelect.length > 0) {
                    // Log all existing options
                    var allOptions = [];
                    statusSelect.find('option').each(function() {
                        allOptions.push($(this).val() + ':' + $(this).text());
                    });
                    console.log('[Quick Edit] Current status options:', allOptions.join(', '));
                    
                    var hasPublished = statusSelect.find('option[value=\"publish\"]').length > 0;
                    console.log('[Quick Edit] Has Published option:', hasPublished);
                    if (!hasPublished) {
                        // Add Published option at the beginning
                        var publishOption = $('<option></option>').attr('value', 'publish').text('Published');
                        statusSelect.prepend(publishOption);
                        console.log('[Quick Edit] Published option added');
                        return true;
                    }
                } else {
                    console.warn('[Quick Edit] Status select not found in ensurePublishedOption');
                }
                return false;
            }
            
            // Start when DOM is ready
            $(document).ready(function() {
                // Try immediately
                ensurePublishedOption();
            });
            
            // Get post data from the table row
            function getPostDataFromRow(row) {
                var post_id = row.attr('id').replace('post-', '');
                var data = { post_id: post_id };
                var post_type = dasomChurchQuickEdit.postType;
                
                // Extract data from table cells (for all post types)
                row.find('td').each(function(index) {
                    var cell = $(this);
                    var columnClass = cell.attr('class');
                    
                    if (columnClass) {
                        if (columnClass.includes('bulletin_date')) {
                            data.dw_bulletin_date = cell.text().trim();
                        } else if (columnClass.includes('column_author')) {
                            data.column_author = cell.text().trim();
                        } else if (columnClass.includes('column_topic')) {
                            data.column_topic = cell.text().trim();
                        }
                    }
                });
                
                return data;
            }
            
            // Function to populate Quick Edit fields
            function populateQuickEditFields(post_id, post_type) {
                console.log('[Quick Edit] populateQuickEditFields called - post_id:', post_id, 'post_type:', post_type);
                
                // Get data via AJAX (same for all post types)
                $.ajax({
                    url: dasomChurchQuickEdit.ajaxUrl,
                    type: 'POST',
                    data: {
                        action: 'dasom_church_get_quick_edit_data',
                        post_id: post_id,
                        post_type: post_type,
                        nonce: dasomChurchQuickEdit.nonce
                    },
                    success: function(response) {
                        console.log('[Quick Edit] AJAX Success Response:', response);
                        if (response.success) {
                            var ajaxData = response.data;
                            console.log('[Quick Edit] AJAX Data:', ajaxData);
                            
                            // Function to fill fields with retry
                            var fillFields = function(attempts) {
                                attempts = attempts || 0;
                                if (attempts > 20) {
                                    console.log('[Quick Edit] fillFields: Max attempts reached');
                                    return;
                                }
                                
                                var fieldsReady = true;
                                
                                // Check if Quick Edit form is ready
                                var aaField = $('input[name=\"aa\"]');
                                var mmField = $('select[name=\"mm\"]');
                                var jjField = $('input[name=\"jj\"]');
                                
                                console.log('[Quick Edit] fillFields attempt ' + attempts + ' - aaExists:', aaField.length > 0, 'mmExists:', mmField.length > 0, 'jjExists:', jjField.length > 0);
                                
                                if (aaField.length === 0 || mmField.length === 0 || jjField.length === 0) {
                                    fieldsReady = false;
                                }
                                
                                if (!fieldsReady) {
                                    setTimeout(function() { fillFields(attempts + 1); }, 50);
                                    return;
                                }
                                
                                console.log('[Quick Edit] Fields ready, filling data...');
                                
                                // Fill WordPress default date fields
                                if (ajaxData.post_date) {
                                    console.log('[Quick Edit] Filling date:', ajaxData.post_date);
                                    // post_date format: Y-m-d H:i:s or Y-m-d
                                    var dateMatch = ajaxData.post_date.match(/(\d{4})-(\d{2})-(\d{2})/);
                                    if (dateMatch) {
                                        console.log('[Quick Edit] Date match:', dateMatch[1], dateMatch[2], dateMatch[3]);
                                        aaField.val(dateMatch[1]);
                                        mmField.val(dateMatch[2]);
                                        jjField.val(dateMatch[3]);
                                        console.log('[Quick Edit] Date fields filled - aa:', aaField.val(), 'mm:', mmField.val(), 'jj:', jjField.val());
                                    } else {
                                        console.warn('[Quick Edit] Date format not matched:', ajaxData.post_date);
                                    }
                                } else {
                                    console.warn('[Quick Edit] No post_date in ajaxData');
                                }
                                
                                // Fill WordPress default author field
                                if (ajaxData.post_author) {
                                    console.log('[Quick Edit] Filling author:', ajaxData.post_author);
                                    var authorSelect = $('select[name=\"post_author\"]');
                                    if (authorSelect.length > 0) {
                                        authorSelect.val(ajaxData.post_author);
                                        console.log('[Quick Edit] Author field filled:', authorSelect.val());
                                    } else {
                                        console.warn('[Quick Edit] Author select not found');
                                    }
                                } else {
                                    console.warn('[Quick Edit] No post_author in ajaxData');
                                }
                                
                                // Fill post status
                                if (ajaxData.post_status) {
                                    console.log('[Quick Edit] ===== STATUS FILLING START =====');
                                    console.log('[Quick Edit] Target status from AJAX:', ajaxData.post_status);
                                    var statusSelect = $('select[name=\"_status\"]');
                                    console.log('[Quick Edit] Status select found:', statusSelect.length > 0);
                                    
                                    if (statusSelect.length > 0) {
                                        // First, unselect all options
                                        statusSelect.find('option').prop('selected', false);
                                        console.log('[Quick Edit] All options unselected');
                                        
                                        // Remove duplicate options (keep only first occurrence of each value)
                                        var seenValues = {};
                                        statusSelect.find('option').each(function() {
                                            var opt = $(this);
                                            var val = opt.val();
                                            if (seenValues[val]) {
                                                opt.remove();
                                                console.log('[Quick Edit] Removed duplicate option:', val);
                                            } else {
                                                seenValues[val] = true;
                                            }
                                        });
                                        
                                        // Ensure Published option exists
                                        ensurePublishedOption();
                                        
                                        // Log all options after cleanup
                                        var optionsAfter = [];
                                        statusSelect.find('option').each(function() {
                                            var opt = $(this);
                                            optionsAfter.push(opt.val() + ':' + opt.text());
                                        });
                                        console.log('[Quick Edit] Options AFTER cleanup:', optionsAfter.join(', '));
                                        
                                        // Now set the status value
                                        var targetStatus = ajaxData.post_status;
                                        console.log('[Quick Edit] Setting status to:', targetStatus);
                                        
                                        // Find and select the target option directly
                                        var targetOption = statusSelect.find('option[value=\"' + targetStatus + '\"]');
                                        console.log('[Quick Edit] Target option found:', targetOption.length > 0);
                                        
                                        if (targetOption.length > 0) {
                                            // IMPORTANT: Get native DOM element AFTER ensurePublishedOption and AFTER any DOM updates
                                            // Re-query the select element to ensure we have the latest DOM state
                                            statusSelect = $('select[name=\"_status\"]');
                                            var selectElement = statusSelect[0];
                                            
                                            if (!selectElement) {
                                                console.error('[Quick Edit] Select element not found after re-query');
                                                return;
                                            }
                                            
                                            // Log all options with their indices for debugging
                                            console.log('[Quick Edit] All options in select (BEFORE adding publish):');
                                            for (var i = 0; i < selectElement.options.length; i++) {
                                                console.log('[Quick Edit]   Index ' + i + ': value=\"' + selectElement.options[i].value + '\", text=\"' + selectElement.options[i].text + '\"');
                                            }
                                            
                                            // Remove or unselect the -1 (No Change) option first
                                            var noChangeOption = statusSelect.find('option[value=\"-1\"]');
                                            if (noChangeOption.length > 0) {
                                                noChangeOption.prop('selected', false);
                                                console.log('[Quick Edit] -1 (No Change) option unselected');
                                            }
                                            
                                            // Unselect all options
                                            statusSelect.find('option').prop('selected', false);
                                            
                                            // Find target option index using native DOM
                                            var targetIndex = -1;
                                            for (var i = 0; i < selectElement.options.length; i++) {
                                                if (selectElement.options[i].value === targetStatus) {
                                                    targetIndex = i;
                                                    console.log('[Quick Edit] Found target option at index:', i);
                                                    break;
                                                }
                                            }
                                            
                                            // If target option not found in native DOM, add it directly
                                            if (targetIndex < 0 && targetStatus === 'publish') {
                                                console.log('[Quick Edit] publish option not found in native DOM, adding it directly');
                                                var publishOption = document.createElement('option');
                                                publishOption.value = 'publish';
                                                publishOption.text = 'Published';
                                                // Insert at the beginning
                                                selectElement.insertBefore(publishOption, selectElement.options[0]);
                                                targetIndex = 0;
                                                console.log('[Quick Edit] publish option added to native DOM at index 0');
                                                
                                                // Log all options after adding
                                                console.log('[Quick Edit] All options in select (AFTER adding publish):');
                                                for (var i = 0; i < selectElement.options.length; i++) {
                                                    console.log('[Quick Edit]   Index ' + i + ': value=\"' + selectElement.options[i].value + '\", text=\"' + selectElement.options[i].text + '\"');
                                                }
                                            }
                                            
                                            if (targetIndex >= 0) {
                                                // Set selectedIndex using native DOM API
                                                selectElement.selectedIndex = targetIndex;
                                                console.log('[Quick Edit] Target option selected using selectedIndex:', targetIndex);
                                                
                                                // Also set using jQuery for consistency
                                                targetOption.prop('selected', true);
                                                
                                                // Verify using native API
                                                var nativeValue = selectElement.value;
                                                console.log('[Quick Edit] Native select value:', nativeValue);
                                                
                                                // Verify using jQuery
                                                var jqueryValue = statusSelect.val();
                                                console.log('[Quick Edit] jQuery select value:', jqueryValue);
                                                
                                                // Trigger change event
                                                statusSelect.trigger('change');
                                                
                                                // Final verification
                                                var finalNativeValue = selectElement.value;
                                                var finalJqueryValue = statusSelect.val();
                                                console.log('[Quick Edit] Final native value:', finalNativeValue);
                                                console.log('[Quick Edit] Final jQuery value:', finalJqueryValue);
                                                
                                                // Log all selected options
                                                var finalOptions = [];
                                                statusSelect.find('option').each(function() {
                                                    if ($(this).prop('selected')) {
                                                        finalOptions.push($(this).val() + ':' + $(this).text());
                                                    }
                                                });
                                                console.log('[Quick Edit] Final selected options:', finalOptions.join(', '));
                                            } else {
                                                console.error('[Quick Edit] Target option index not found for value:', targetStatus);
                                                console.error('[Quick Edit] Available option values:', Array.from(selectElement.options).map(function(opt) { return opt.value; }).join(', '));
                                                
                                                // Fallback: try using jQuery .val() directly
                                                console.log('[Quick Edit] Trying fallback: jQuery .val() method');
                                                statusSelect.val(targetStatus);
                                                var fallbackValue = statusSelect.val();
                                                console.log('[Quick Edit] Fallback value:', fallbackValue);
                                                
                                                if (fallbackValue === targetStatus) {
                                                    statusSelect.trigger('change');
                                                    console.log('[Quick Edit] Fallback successful');
                                                }
                                            }
                                        } else {
                                            console.error('[Quick Edit] Target option not found for value:', targetStatus);
                                        }
                                        
                                        console.log('[Quick Edit] ===== STATUS FILLING END =====');
                                    } else {
                                        console.error('[Quick Edit] Status select not found!');
                                    }
                                } else {
                                    console.error('[Quick Edit] No post_status in ajaxData!', ajaxData);
                                }
                                
                                // Fill custom fields
                                if (post_type === 'bulletin' && ajaxData.dw_bulletin_date) {
                                    $('input[name=\"dw_bulletin_date\"]').val(ajaxData.dw_bulletin_date);
                                }
                                
                                if (post_type === 'column') {
                                    if (ajaxData.column_author) {
                                        $('input[name=\"column_author\"]').val(ajaxData.column_author);
                                    }
                                    if (ajaxData.column_topic) {
                                        $('input[name=\"column_topic\"]').val(ajaxData.column_topic);
                                    }
                                }
                                
                                // Check sermon categories
                                if (post_type === 'sermon' && ajaxData.sermon_categories && ajaxData.sermon_categories.length > 0) {
                                    console.log('[Quick Edit] Filling sermon categories:', ajaxData.sermon_categories);
                                    var categoryCheckboxes = $('input[name=\"tax_input[sermon_category][]\"]');
                                    console.log('[Quick Edit] Found category checkboxes:', categoryCheckboxes.length);
                                    if (categoryCheckboxes.length > 0) {
                                        categoryCheckboxes.prop('checked', false);
                                        ajaxData.sermon_categories.forEach(function(categoryId) {
                                            var checkbox = $('input[name=\"tax_input[sermon_category][]\"][value=\"' + categoryId + '\"]');
                                            if (checkbox.length > 0) {
                                                checkbox.prop('checked', true);
                                                console.log('[Quick Edit] Category checked:', categoryId);
                                            } else {
                                                console.warn('[Quick Edit] Category checkbox not found:', categoryId);
                                            }
                                        });
                                    } else {
                                        console.warn('[Quick Edit] No category checkboxes found');
                                    }
                                } else {
                                    console.warn('[Quick Edit] No sermon_categories in ajaxData or empty - post_type:', post_type, 'has_categories:', ajaxData.sermon_categories ? true : false, 'categories_length:', ajaxData.sermon_categories ? ajaxData.sermon_categories.length : 0);
                                }
                            };
                            
                            // Start filling fields with delay
                            setTimeout(function() { fillFields(0); }, 100);
                            setTimeout(function() { fillFields(0); }, 300);
                            setTimeout(function() { fillFields(0); }, 500);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('[Quick Edit] AJAX Error:', status, error);
                        console.error('[Quick Edit] Response:', xhr.responseText);
                        console.error('[Quick Edit] Status Code:', xhr.status);
                    }
                });
            }
            
            // Populate Quick Edit fields when opened
            $(document).on('click', '.editinline', function() {
                var row = $(this).closest('tr');
                var post_id = row.attr('id').replace('post-', '');
                var post_type = dasomChurchQuickEdit.postType;
                
                // Store data for this post
                postData[post_id] = getPostDataFromRow(row);
                
                // Get status from row data attribute (WordPress stores it here)
                var rowStatus = row.find('.post-state').data('status') || row.data('status');
                if (rowStatus) {
                    postData[post_id].post_status = rowStatus;
                }
                
                // Ensure Published option exists
                ensurePublishedOption();
                setTimeout(ensurePublishedOption, 100);
                setTimeout(ensurePublishedOption, 300);
                
                // Populate fields
                populateQuickEditFields(post_id, post_type);
            });
            
            // Also handle WordPress inlineEditPost event
            $(document).on('inlineEditPost', function(e, post) {
                var post_id = post.ID;
                var post_type = dasomChurchQuickEdit.postType;
                
                // Ensure Published option exists
                ensurePublishedOption();
                setTimeout(ensurePublishedOption, 100);
                setTimeout(ensurePublishedOption, 300);
                
                // Use same populate function
                populateQuickEditFields(post_id, post_type);
            });
            
            // Also populate when Quick Edit form is shown
            $(document).on('focus', '.editinline', function() {
                var row = $(this).closest('tr');
                var post_id = row.attr('id').replace('post-', '');
                var post_type = dasomChurchQuickEdit.postType;
                
                // Store data for this post
                postData[post_id] = getPostDataFromRow(row);
                
                // Populate fields
                populateQuickEditFields(post_id, post_type);
            });
        })(jQuery);
        ";
    }
}

// Initialize the columns
DW_Church_Columns::get_instance();

// AJAX handler for Quick Edit data
add_action('wp_ajax_dasom_church_get_quick_edit_data', 'dasom_church_get_quick_edit_data_callback');
function dasom_church_get_quick_edit_data_callback() {
    error_log('[Quick Edit PHP] AJAX callback called');
    error_log('[Quick Edit PHP] POST data: ' . print_r($_POST, true));
    
    if (!wp_verify_nonce($_POST['nonce'], 'dasom_church_quick_edit_data')) {
        error_log('[Quick Edit PHP] Security check failed');
        wp_die('Security check failed');
    }
    
    if (!current_user_can('edit_posts')) {
        error_log('[Quick Edit PHP] Insufficient permissions');
        wp_die('Insufficient permissions');
    }
    
    $post_id = intval($_POST['post_id']);
    $post_type = sanitize_text_field($_POST['post_type']);
    
    error_log('[Quick Edit PHP] Processing post_id: ' . $post_id . ', post_type: ' . $post_type);
    
    $data = array();
    
    // Get WordPress default post data
    $post = get_post($post_id);
    if ($post) {
        $data['post_date'] = $post->post_date;
        $data['post_author'] = $post->post_author;
        $data['post_status'] = $post->post_status;
        error_log('[Quick Edit PHP] Post data retrieved: ' . print_r($data, true));
        error_log('[Quick Edit PHP] Post status value: ' . $post->post_status);
        error_log('[Quick Edit PHP] Post status type: ' . gettype($post->post_status));
        error_log('[Quick Edit PHP] Post status empty check: ' . (empty($post->post_status) ? 'EMPTY' : 'NOT EMPTY'));
        error_log('[Quick Edit PHP] Post status === publish: ' . ($post->post_status === 'publish' ? 'YES' : 'NO'));
    } else {
        error_log('[Quick Edit PHP] Post not found for post_id: ' . $post_id);
    }
    
    switch ($post_type) {
        case 'bulletin':
            $bulletin_date = get_post_meta($post_id, 'dw_bulletin_date', true);
            if ($bulletin_date && $bulletin_date !== '') {
                // If already in YYYY-MM-DD format, use as is
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $bulletin_date)) {
                    $data['dw_bulletin_date'] = $bulletin_date;
                } else {
                    // Try to convert other formats
                    $timestamp = strtotime($bulletin_date);
                    if ($timestamp !== false && $timestamp > 0) {
                        $data['dw_bulletin_date'] = date('Y-m-d', $timestamp);
                    }
                }
            }
            break;
            
        case 'sermon':
            $sermon_date = get_post_meta($post_id, 'dw_sermon_date', true);
            error_log('[Quick Edit PHP] Sermon date meta: ' . ($sermon_date ? $sermon_date : 'empty'));
            if ($sermon_date && $sermon_date !== '') {
                // If already in YYYY-MM-DD format, use as is
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $sermon_date)) {
                    $data['dw_sermon_date'] = $sermon_date;
                } else {
                    // Try to convert other formats
                    $timestamp = strtotime($sermon_date);
                    if ($timestamp !== false && $timestamp > 0) {
                        $data['dw_sermon_date'] = date('Y-m-d', $timestamp);
                    }
                }
            }
            // Get sermon categories
            $categories = wp_get_post_terms($post_id, 'sermon_category', array('fields' => 'ids'));
            error_log('[Quick Edit PHP] Sermon categories: ' . print_r($categories, true));
            if (!is_wp_error($categories) && !empty($categories)) {
                $data['sermon_categories'] = $categories;
                error_log('[Quick Edit PHP] Sermon categories added to data: ' . print_r($categories, true));
            } else {
                error_log('[Quick Edit PHP] Sermon categories error or empty: ' . (is_wp_error($categories) ? $categories->get_error_message() : 'empty'));
            }
            break;
            
        case 'column':
            $data['column_author'] = get_post_meta($post_id, 'column_author', true);
            $data['column_topic'] = get_post_meta($post_id, 'column_topic', true);
            break;
    }
    
    error_log('[Quick Edit PHP] Final data to send: ' . print_r($data, true));
    wp_send_json_success($data);
}
