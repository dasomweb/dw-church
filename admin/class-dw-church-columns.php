<?php
/**
 * Admin columns and Quick Edit functionality for Dasom Church Management
 *
 * @package DW_Church
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
        
        // Quick Edit - DISABLED to prevent infinite loop
        // add_action('quick_edit_custom_box', array($this, 'dasom_church_quick_edit_fields'), 10, 2);
        // add_action('save_post', array($this, 'dasom_church_quick_edit_save'));
        
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
        
        $new_columns['bulletin_date'] = __('주보 ?�짜', 'dw-church');
        $new_columns['bulletin_pdf'] = __('PDF ?�일', 'dw-church');
        $new_columns['bulletin_images'] = __('주보 ?��?지', 'dw-church');
        $new_columns['date'] = __('게시??, 'dw-church');
        
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
                    // Format date for display (?��? ?�식)
                    $timestamp = strtotime($date);
                    if ($timestamp !== false && $timestamp > 0) {
                        echo esc_html(date_i18n('Y??n??j??, $timestamp));
                    } else {
                        echo esc_html($date);
                    }
                } else {
                    echo '??;
                }
                break;
                
            case 'bulletin_pdf':
                $pdf = get_post_meta($post_id, 'dw_bulletin_pdf', true);
                if ($pdf) {
                    $url = wp_get_attachment_url($pdf);
                    if ($url) {
                        echo '<a href="' . esc_url($url) . '" target="_blank">' . __('보기', 'dw-church') . '</a>';
                    } else {
                        echo '??;
                    }
                } else {
                    echo '??;
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
                    echo '??;
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
        
        $new_columns['sermon_date'] = __('?�교 ?�자', 'dw-church');
        $new_columns['sermon_title'] = __('?�목', 'dw-church');
        $new_columns['sermon_scripture'] = __('?�경구절', 'dw-church');
        $new_columns['sermon_preacher'] = __('?�교??, 'dw-church');
        $new_columns['sermon_youtube'] = __('YouTube', 'dw-church');
        $new_columns['sermon_thumb'] = __('?�네??, 'dw-church');
        $new_columns['date'] = __('게시 ?�태', 'dw-church');
        
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
                    echo '??;
                }
                break;
                
            case 'sermon_title':
                $title = get_post_meta($post_id, 'dw_sermon_title', true);
                if ($title) {
                    echo esc_html($title);
                } else {
                    // Fallback to post title
                    $post_title = get_the_title($post_id);
                    echo $post_title ? esc_html($post_title) : '??;
                }
                break;
                
            case 'sermon_scripture':
                $scripture = get_post_meta($post_id, 'dw_sermon_scripture', true);
                if ($scripture) {
                    echo esc_html($scripture);
                } else {
                    echo '??;
                }
                break;
                
            case 'sermon_preacher':
                $preachers = wp_get_post_terms($post_id, 'dw_sermon_preacher', array('fields' => 'names'));
                if (!is_wp_error($preachers) && !empty($preachers)) {
                    echo esc_html(implode(', ', $preachers));
                } else {
                    // Try to get default preacher
                    $default_preacher = get_option('default_sermon_preacher', __('?�임목사', 'dw-church'));
                    echo esc_html($default_preacher);
                }
                break;
                
            case 'sermon_youtube':
                $youtube = get_post_meta($post_id, 'dw_sermon_youtube', true);
                if ($youtube) {
                    echo '<a href="' . esc_url($youtube) . '" target="_blank">' . esc_html($youtube) . '</a>';
                } else {
                    echo '??;
                }
                break;
                
            case 'sermon_thumb':
                if (has_post_thumbnail($post_id)) {
                    echo get_the_post_thumbnail($post_id, array(100, 56), array('style' => 'width:100px;height:56px;object-fit:cover;'));
                } else {
                    echo '??;
                }
                break;
                
            case 'date':
                $post = get_post($post_id);
                if ($post->post_status === 'future') {
                    echo '<span style="color:orange;">?�약?? ' . esc_html(date_i18n('Y-m-d H:i', strtotime($post->post_date))) . '</span>';
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
        
        $new_columns['date'] = __('게시??, 'dw-church');
        $new_columns['title'] = __('?�목', 'dw-church');
        $new_columns['top_image'] = __('?�단 ?��?지', 'dw-church');
        $new_columns['youtube'] = __('YouTube', 'dw-church');
        $new_columns['thumb'] = __('?�???��?지', 'dw-church');
        
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
                    echo __('?��?지 ?�음', 'dw-church');
                }
                break;
                
            case 'youtube':
                $youtube = get_post_meta($post_id, 'dw_column_youtube', true);
                if ($youtube) {
                    echo '<a href="' . esc_url($youtube) . '" target="_blank">' . __('YouTube 보기', 'dw-church') . '</a>';
                } else {
                    echo '??;
                }
                break;
                
            case 'thumb':
                if (has_post_thumbnail($post_id)) {
                    echo get_the_post_thumbnail($post_id, array(80, 80), array('style' => 'object-fit:cover;'));
                } else {
                    echo __('?��?지 ?�음', 'dw-church');
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
        
        $new_columns['title'] = __('?�범 ?�목', 'dw-church');
        $new_columns['youtube'] = __('YouTube', 'dw-church');
        $new_columns['thumb'] = __('?�네??, 'dw-church');
        $new_columns['images'] = __('?�범 ?��?지', 'dw-church');
        $new_columns['date'] = __('?�성??, 'dw-church');
        
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
                    echo '??;
                }
                break;
                
            case 'thumb':
                if (has_post_thumbnail($post_id)) {
                    echo get_the_post_thumbnail($post_id, array(100, 56), array('style' => 'width:100px;height:56px;object-fit:cover;'));
                } else {
                    echo '??;
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
                    echo '??;
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
        
        $new_columns['title'] = __('배너 ?�목', 'dw-church');
        $new_columns['banner_category'] = __('카테고리', 'dw-church');
        $new_columns['banner_image'] = __('배너 ?��?지', 'dw-church');
        $new_columns['link_url'] = __('링크 URL', 'dw-church');
        $new_columns['start_date'] = __('?�작 ?�짜', 'dw-church');
        $new_columns['end_date'] = __('종료 ?�짜', 'dw-church');
        $new_columns['link_target'] = __('?�기 방식', 'dw-church');
        $new_columns['date'] = __('?�성??, 'dw-church');
        
        return $new_columns;
    }
    
    /**
     * Banner column content
     */
    public function dasom_church_banner_column_content($column, $post_id) {
        switch ($column) {
            case 'banner_category':
                $terms = wp_get_post_terms($post_id, 'banner_category');
                if (!empty($terms) && !is_wp_error($terms)) {
                    $category_name = $terms[0]->name;
                    $color = ($category_name === '메인 배너' || $category_name === 'Main Banner') ? '#2271b1' : '#50b83c';
                    echo '<span style="display:inline-block;padding:3px 8px;background:' . $color . ';color:#fff;border-radius:3px;font-size:11px;">' . esc_html($category_name) . '</span>';
                } else {
                    echo '<span style="color:#999;">' . __('미분�?, 'dw-church') . '</span>';
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
                        echo '??;
                    }
                } elseif ($category === '?�브 배너' || $category === 'Sub Banner') {
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
                            echo '??;
                        }
                    } else {
                        echo '??;
                    }
                } else {
                    echo '??;
                }
                break;
                
            case 'link_url':
                $link_url = get_post_meta($post_id, 'dw_banner_link_url', true);
                if ($link_url) {
                    echo '<a href="' . esc_url($link_url) . '" target="_blank" style="word-break:break-all;">' . esc_html($link_url) . '</a>';
                } else {
                    echo '??;
                }
                break;
                
            case 'start_date':
                $start_date = get_post_meta($post_id, 'dw_banner_start_date', true);
                if ($start_date) {
                    $timestamp = strtotime($start_date);
                    if ($timestamp !== false && $timestamp > 0) {
                        echo esc_html(date_i18n('Y-m-d H:i', $timestamp));
                        if ($timestamp > current_time('timestamp')) {
                            echo '<br><span style="color:#f0ad4e;">' . __('(?�약??', 'dw-church') . '</span>';
                        }
                    } else {
                        echo '??;
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
                            echo '<br><span style="color:#dc3545;">' . __('(만료??', 'dw-church') . '</span>';
                        }
                    } else {
                        echo '??;
                    }
                } else {
                    echo __('무기??, 'dw-church');
                }
                break;
                
            case 'link_target':
                $link_target = get_post_meta($post_id, 'dw_banner_link_target', true);
                if ($link_target === '_blank') {
                    echo __('??�?, 'dw-church');
                } else {
                    echo __('?�재 �?, 'dw-church');
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
                echo '<span class="title">' . __('주보 ?�짜', 'dw-church') . '</span>';
                echo '<input type="date" name="dw_bulletin_date" value="" />';
                echo '</label>';
                echo '</div>';
                echo '</fieldset>';
                break;
                
            case 'sermon':
                echo '<fieldset class="inline-edit-col-right">';
                echo '<div class="inline-edit-col">';
                echo '<label>';
                echo '<span class="title">' . __('?�교 ?�자', 'dw-church') . '</span>';
                echo '<input type="date" name="dw_sermon_date" value="" />';
                echo '</label>';
                echo '</div>';
                echo '</fieldset>';
                break;
                
            case 'column':
                echo '<fieldset class="inline-edit-col-right">';
                echo '<div class="inline-edit-col">';
                echo '<label>';
                echo '<span class="title">' . __('?�성??, 'dw-church') . '</span>';
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
                            data.dw_bulletin_date = cell.text().trim();
                        } else if (columnClass.includes('sermon_date')) {
                            data.dw_sermon_date = cell.text().trim();
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
                        if (postDate && postDate !== '??) {
                            // Parse the date and fill the WordPress date fields
                            var dateMatch = postDate.match(/(\d{4})-(\d{2})-(\d{2})/);
                            if (dateMatch) {
                                $('input[name=\"aa\"]').val(dateMatch[1]); // Year
                                $('select[name=\"mm\"]').val(dateMatch[2]); // Month
                                $('input[name=\"jj\"]').val(dateMatch[3]); // Day
                            }
                        }
                        
                        // Fill WordPress default author field
                        if (postAuthor && postAuthor !== '??) {
                            $('select[name=\"post_author\"]').val(postAuthor);
                        }
                        
                        // Fill our custom fields
                        if (post_type === 'bulletin' && data.dw_bulletin_date && data.dw_bulletin_date !== '??) {
                            var bulletinDate = data.dw_bulletin_date;
                            // Only set if it's already in YYYY-MM-DD format
                            if (bulletinDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                $('input[name=\"dw_bulletin_date\"]').val(bulletinDate);
                            }
                        }
                        
                        if (post_type === 'sermon' && data.dw_sermon_date && data.dw_sermon_date !== '??) {
                            var sermonDate = data.dw_sermon_date;
                            // Only set if it's already in YYYY-MM-DD format
                            if (sermonDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                $('input[name=\"dw_sermon_date\"]').val(sermonDate);
                            }
                        }
                        
                        if (post_type === 'column') {
                            if (data.column_author && data.column_author !== '??) {
                                $('input[name=\"column_author\"]').val(data.column_author);
                            }
                            if (data.column_topic && data.column_topic !== '??) {
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
                                if (post_type === 'bulletin' && ajaxData.dw_bulletin_date) {
                                    $('input[name=\"dw_bulletin_date\"]').val(ajaxData.dw_bulletin_date);
                                }
                                
                                if (post_type === 'sermon' && ajaxData.dw_sermon_date) {
                                    $('input[name=\"dw_sermon_date\"]').val(ajaxData.dw_sermon_date);
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
DW_Church_Columns::get_instance();

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
            break;
            
        case 'column':
            $data['column_author'] = get_post_meta($post_id, 'column_author', true);
            $data['column_topic'] = get_post_meta($post_id, 'column_topic', true);
            break;
    }
    
    wp_send_json_success($data);
}
