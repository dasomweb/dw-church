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
class Dasom_Church_Columns {
    
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
        
        // Quick Edit
        add_action('quick_edit_custom_box', array($this, 'dasom_church_quick_edit_fields'), 10, 2);
        add_action('save_post', array($this, 'dasom_church_quick_edit_save'));
        
        // Admin scripts for Quick Edit
        add_action('admin_enqueue_scripts', array($this, 'dasom_church_admin_scripts'));
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
        
        $new_columns['bulletin_date'] = __('주보 날짜', 'dasom-church');
        $new_columns['bulletin_pdf'] = __('PDF 파일', 'dasom-church');
        $new_columns['bulletin_images'] = __('주보 이미지', 'dasom-church');
        $new_columns['date'] = __('게시일', 'dasom-church');
        
        return $new_columns;
    }
    
    /**
     * Bulletin column content
     */
    public function dasom_church_bulletin_column_content($column, $post_id) {
        switch ($column) {
            case 'bulletin_date':
                $date = get_post_meta($post_id, 'bulletin_date', true);
                if ($date) {
                    // Format date for display
                    $formatted_date = date_i18n('Y-m-d', strtotime($date));
                    echo esc_html($formatted_date);
                } else {
                    echo '—';
                }
                break;
                
            case 'bulletin_pdf':
                $pdf = get_post_meta($post_id, 'bulletin_pdf', true);
                if ($pdf) {
                    $url = wp_get_attachment_url($pdf);
                    if ($url) {
                        echo '<a href="' . esc_url($url) . '" target="_blank">' . __('보기', 'dasom-church') . '</a>';
                    } else {
                        echo '—';
                    }
                } else {
                    echo '—';
                }
                break;
                
            case 'bulletin_images':
                $images = get_post_meta($post_id, 'bulletin_images', true);
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
        
        $new_columns['sermon_date'] = __('설교 일자', 'dasom-church');
        $new_columns['sermon_title'] = __('제목', 'dasom-church');
        $new_columns['sermon_scripture'] = __('성경구절', 'dasom-church');
        $new_columns['sermon_preacher'] = __('설교자', 'dasom-church');
        $new_columns['sermon_youtube'] = __('YouTube', 'dasom-church');
        $new_columns['sermon_thumb'] = __('썸네일', 'dasom-church');
        $new_columns['date'] = __('게시 상태', 'dasom-church');
        
        return $new_columns;
    }
    
    /**
     * Sermon column content
     */
    public function dasom_church_sermon_column_content($column, $post_id) {
        switch ($column) {
            case 'sermon_date':
                $date = get_post_meta($post_id, 'sermon_date', true);
                if ($date && $date !== '') {
                    // Convert to readable format
                    $formatted_date = date_i18n('Y-m-d', strtotime($date));
                    echo esc_html($formatted_date);
                } else {
                    echo '—';
                }
                break;
                
            case 'sermon_title':
                $title = get_post_meta($post_id, 'sermon_title', true);
                if ($title) {
                    echo esc_html($title);
                } else {
                    // Fallback to post title
                    $post_title = get_the_title($post_id);
                    echo $post_title ? esc_html($post_title) : '—';
                }
                break;
                
            case 'sermon_scripture':
                $scripture = get_post_meta($post_id, 'sermon_scripture', true);
                if ($scripture) {
                    echo esc_html($scripture);
                } else {
                    echo '—';
                }
                break;
                
            case 'sermon_preacher':
                $preachers = wp_get_post_terms($post_id, 'sermon_preacher', array('fields' => 'names'));
                if (!is_wp_error($preachers) && !empty($preachers)) {
                    echo esc_html(implode(', ', $preachers));
                } else {
                    // Try to get default preacher
                    $default_preacher = get_option('default_sermon_preacher', __('담임목사', 'dasom-church'));
                    echo esc_html($default_preacher);
                }
                break;
                
            case 'sermon_youtube':
                $youtube = get_post_meta($post_id, 'sermon_youtube', true);
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
        
        $new_columns['date'] = __('게시일', 'dasom-church');
        $new_columns['title'] = __('제목', 'dasom-church');
        $new_columns['content'] = __('내용 요약', 'dasom-church');
        $new_columns['column_author'] = __('작성자', 'dasom-church');
        $new_columns['column_topic'] = __('주제', 'dasom-church');
        $new_columns['thumb'] = __('대표 이미지', 'dasom-church');
        
        return $new_columns;
    }
    
    /**
     * Column column content
     */
    public function dasom_church_column_column_content($column, $post_id) {
        switch ($column) {
            case 'content':
                $content = get_post_field('post_content', $post_id);
                $plain = wp_strip_all_tags($content);
                echo mb_strimwidth($plain, 0, 100, '...', 'UTF-8');
                break;
                
            case 'column_author':
                $author = get_post_meta($post_id, 'column_author', true);
                echo $author ? esc_html($author) : '—';
                break;
                
            case 'column_topic':
                $topic = get_post_meta($post_id, 'column_topic', true);
                echo $topic ? esc_html($topic) : '—';
                break;
                
            case 'thumb':
                if (has_post_thumbnail($post_id)) {
                    echo get_the_post_thumbnail($post_id, array(80, 80), array('style' => 'object-fit:cover;'));
                } else {
                    echo __('이미지 없음', 'dasom-church');
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
        
        $new_columns['title'] = __('앨범 제목', 'dasom-church');
        $new_columns['youtube'] = __('YouTube', 'dasom-church');
        $new_columns['thumb'] = __('썸네일', 'dasom-church');
        $new_columns['images'] = __('앨범 이미지', 'dasom-church');
        $new_columns['date'] = __('작성일', 'dasom-church');
        
        return $new_columns;
    }
    
    /**
     * Album column content
     */
    public function dasom_church_album_column_content($column, $post_id) {
        switch ($column) {
            case 'youtube':
                $youtube = get_post_meta($post_id, 'album_youtube', true);
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
                $images = get_post_meta($post_id, 'album_images', true);
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
                echo '<span class="title">' . __('주보 날짜', 'dasom-church') . '</span>';
                echo '<input type="date" name="bulletin_date" value="" />';
                echo '</label>';
                echo '</div>';
                echo '</fieldset>';
                break;
                
            case 'sermon':
                echo '<fieldset class="inline-edit-col-right">';
                echo '<div class="inline-edit-col">';
                echo '<label>';
                echo '<span class="title">' . __('설교 일자', 'dasom-church') . '</span>';
                echo '<input type="date" name="sermon_date" value="" />';
                echo '</label>';
                echo '</div>';
                echo '</fieldset>';
                break;
                
            case 'column':
                echo '<fieldset class="inline-edit-col-right">';
                echo '<div class="inline-edit-col">';
                echo '<label>';
                echo '<span class="title">' . __('작성자', 'dasom-church') . '</span>';
                echo '<input type="text" name="column_author" value="" />';
                echo '</label>';
                echo '</div>';
                echo '<div class="inline-edit-col">';
                echo '<label>';
                echo '<span class="title">' . __('주제', 'dasom-church') . '</span>';
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
        if (!isset($_POST['dasom_church_quick_edit_nonce']) || 
            !wp_verify_nonce($_POST['dasom_church_quick_edit_nonce'], 'dasom_church_quick_edit')) {
            return;
        }
        
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        $post_type = get_post_type($post_id);
        
        switch ($post_type) {
            case 'bulletin':
                if (isset($_POST['bulletin_date']) && !empty($_POST['bulletin_date'])) {
                    $date = sanitize_text_field($_POST['bulletin_date']);
                    // Debug log
                    error_log('Bulletin date received: ' . $date);
                    
                    // Validate date format (YYYY-MM-DD)
                    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                        update_post_meta($post_id, 'bulletin_date', $date);
                        error_log('Bulletin date saved: ' . $date);
                    } else {
                        error_log('Invalid bulletin date format: ' . $date);
                    }
                }
                break;
                
            case 'sermon':
                if (isset($_POST['sermon_date']) && !empty($_POST['sermon_date'])) {
                    $date = sanitize_text_field($_POST['sermon_date']);
                    // Debug log
                    error_log('Sermon date received: ' . $date);
                    
                    // Validate date format (YYYY-MM-DD)
                    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                        update_post_meta($post_id, 'sermon_date', $date);
                        error_log('Sermon date saved: ' . $date);
                    } else {
                        error_log('Invalid sermon date format: ' . $date);
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
        jQuery(document).ready(function($) {
            // Store current post data for Quick Edit
            var postData = {};
            
            // Get post data from the table row
            function getPostDataFromRow(row) {
                var post_id = row.attr('id').replace('post-', '');
                var data = { post_id: post_id };
                
                // Extract data from table cells
                row.find('td').each(function(index) {
                    var cell = $(this);
                    var columnClass = cell.attr('class');
                    
                    if (columnClass) {
                        if (columnClass.includes('bulletin_date')) {
                            data.bulletin_date = cell.text().trim();
                        } else if (columnClass.includes('sermon_date')) {
                            data.sermon_date = cell.text().trim();
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
                // Try to get data from stored post data first
                var data = postData[post_id];
                
                if (data) {
                    setTimeout(function() {
                        // Populate WordPress default fields
                        var post = $('tr#post-' + post_id);
                        var postDate = post.find('.column-date').text().trim();
                        var postAuthor = post.find('.column-author').text().trim();
                        
                        // Fill WordPress default date fields
                        if (postDate && postDate !== '—') {
                            // Parse the date and fill the WordPress date fields
                            var dateMatch = postDate.match(/(\d{4})-(\d{2})-(\d{2})/);
                            if (dateMatch) {
                                $('input[name=\"aa\"]').val(dateMatch[1]); // Year
                                $('select[name=\"mm\"]').val(dateMatch[2]); // Month
                                $('input[name=\"jj\"]').val(dateMatch[3]); // Day
                            }
                        }
                        
                        // Fill WordPress default author field
                        if (postAuthor && postAuthor !== '—') {
                            $('select[name=\"post_author\"]').val(postAuthor);
                        }
                        
                        // Fill our custom fields
                        if (post_type === 'bulletin' && data.bulletin_date && data.bulletin_date !== '—') {
                            var bulletinDate = data.bulletin_date;
                            // Only set if it's already in YYYY-MM-DD format
                            if (bulletinDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                $('input[name=\"bulletin_date\"]').val(bulletinDate);
                            }
                        }
                        
                        if (post_type === 'sermon' && data.sermon_date && data.sermon_date !== '—') {
                            var sermonDate = data.sermon_date;
                            // Only set if it's already in YYYY-MM-DD format
                            if (sermonDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                $('input[name=\"sermon_date\"]').val(sermonDate);
                            }
                        }
                        
                        if (post_type === 'column') {
                            if (data.column_author && data.column_author !== '—') {
                                $('input[name=\"column_author\"]').val(data.column_author);
                            }
                            if (data.column_topic && data.column_topic !== '—') {
                                $('input[name=\"column_topic\"]').val(data.column_topic);
                            }
                        }
                    }, 100);
                }
                
                // Also try AJAX as backup
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
                        if (response.success) {
                            var ajaxData = response.data;
                            
                            setTimeout(function() {
                                // Fill WordPress default fields
                                if (ajaxData.post_date) {
                                    var dateMatch = ajaxData.post_date.match(/(\d{4})-(\d{2})-(\d{2})/);
                                    if (dateMatch) {
                                        $('input[name=\"aa\"]').val(dateMatch[1]); // Year
                                        $('select[name=\"mm\"]').val(dateMatch[2]); // Month
                                        $('input[name=\"jj\"]').val(dateMatch[3]); // Day
                                    }
                                }
                                
                                if (ajaxData.post_author) {
                                    $('select[name=\"post_author\"]').val(ajaxData.post_author);
                                }
                                
                                // Fill our custom fields
                                if (post_type === 'bulletin' && ajaxData.bulletin_date) {
                                    $('input[name=\"bulletin_date\"]').val(ajaxData.bulletin_date);
                                }
                                
                                if (post_type === 'sermon' && ajaxData.sermon_date) {
                                    $('input[name=\"sermon_date\"]').val(ajaxData.sermon_date);
                                }
                                
                                if (post_type === 'column') {
                                    if (ajaxData.column_author) {
                                        $('input[name=\"column_author\"]').val(ajaxData.column_author);
                                    }
                                    if (ajaxData.column_topic) {
                                        $('input[name=\"column_topic\"]').val(ajaxData.column_topic);
                                    }
                                }
                            }, 200);
                        }
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
                
                // Populate fields
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
        });
        ";
    }
}

// Initialize the columns
Dasom_Church_Columns::get_instance();

// AJAX handler for Quick Edit data
add_action('wp_ajax_dasom_church_get_quick_edit_data', 'dasom_church_get_quick_edit_data_callback');
function dasom_church_get_quick_edit_data_callback() {
    if (!wp_verify_nonce($_POST['nonce'], 'dasom_church_quick_edit_data')) {
        wp_die('Security check failed');
    }
    
    if (!current_user_can('edit_posts')) {
        wp_die('Insufficient permissions');
    }
    
    $post_id = intval($_POST['post_id']);
    $post_type = sanitize_text_field($_POST['post_type']);
    
    $data = array();
    
    // Get WordPress default post data
    $post = get_post($post_id);
    if ($post) {
        $data['post_date'] = $post->post_date;
        $data['post_author'] = $post->post_author;
    }
    
    switch ($post_type) {
        case 'bulletin':
            $bulletin_date = get_post_meta($post_id, 'bulletin_date', true);
            if ($bulletin_date && $bulletin_date !== '') {
                // If already in YYYY-MM-DD format, use as is
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $bulletin_date)) {
                    $data['bulletin_date'] = $bulletin_date;
                } else {
                    // Try to convert other formats
                    $timestamp = strtotime($bulletin_date);
                    if ($timestamp !== false && $timestamp > 0) {
                        $data['bulletin_date'] = date('Y-m-d', $timestamp);
                    }
                }
            }
            break;
            
        case 'sermon':
            $sermon_date = get_post_meta($post_id, 'sermon_date', true);
            if ($sermon_date && $sermon_date !== '') {
                // If already in YYYY-MM-DD format, use as is
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $sermon_date)) {
                    $data['sermon_date'] = $sermon_date;
                } else {
                    // Try to convert other formats
                    $timestamp = strtotime($sermon_date);
                    if ($timestamp !== false && $timestamp > 0) {
                        $data['sermon_date'] = date('Y-m-d', $timestamp);
                    }
                }
            }
            break;
            
        case 'column':
            $data['column_author'] = get_post_meta($post_id, 'column_author', true);
            $data['column_topic'] = get_post_meta($post_id, 'column_topic', true);
            break;
    }
    
    wp_send_json_success($data);
}
