<?php
/**
 * Meta boxes and Quick Edit functionality for Dasom Church Management
 *
 * @package Dasom_Church
 * @since 1.0.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Meta boxes class
 */
class Dasom_Church_Meta_Boxes {
    
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
        add_action('add_meta_boxes', array($this, 'dasom_church_add_meta_boxes'));
        add_action('save_post', array($this, 'dasom_church_save_meta_boxes'));
        add_action('admin_enqueue_scripts', array($this, 'dasom_church_admin_scripts'));
        
        // Quick Edit is handled by Dasom_Church_Columns class
        
        // Admin head styles
        add_action('admin_head', array($this, 'dasom_church_admin_head_styles'));
        
        // Force classic editor for column post type
        add_filter('use_block_editor_for_post_type', array($this, 'dasom_church_disable_gutenberg_for_column'), 10, 2);
    }
    
    /**
     * Add meta boxes
     */
    public function dasom_church_add_meta_boxes() {
        // 주보 메타박스
        add_meta_box(
            'bulletin_meta',
            __('주보 정보', 'dasom-church'),
            array($this, 'dasom_church_bulletin_meta_box'),
            'bulletin',
            'normal',
            'default'
        );
        
        // 설교 메타박스
        add_meta_box(
            'sermon_meta',
            __('설교 정보', 'dasom-church'),
            array($this, 'dasom_church_sermon_meta_box'),
            'sermon',
            'normal',
            'default'
        );
        
        // 목회컬럼 메타박스
        add_meta_box(
            'column_meta',
            __('목회컬럼 정보', 'dasom-church'),
            array($this, 'dasom_church_column_meta_box'),
            'column',
            'normal',
            'default'
        );
        
        // 교회앨범 메타박스
        add_meta_box(
            'album_meta',
            __('앨범 정보', 'dasom-church'),
            array($this, 'dasom_church_album_meta_box'),
            'album',
            'normal',
            'default'
        );
    }
    
    /**
     * 주보 메타박스
     */
    public function dasom_church_bulletin_meta_box($post) {
        wp_nonce_field('dasom_church_bulletin_meta', 'dasom_church_bulletin_nonce');
        
        $date = get_post_meta($post->ID, 'dw_bulletin_date', true);
        $pdf = get_post_meta($post->ID, 'dw_bulletin_pdf', true);
        $images = get_post_meta($post->ID, 'dw_bulletin_images', true);
        $images = $images ? json_decode($images, true) : array();
        $images = is_array($images) ? $images : array();
        ?>
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_bulletin_date"><?php _e('주보 날짜', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="date" id="dw_bulletin_date" name="dw_bulletin_date" value="<?php echo esc_attr($date); ?>" class="regular-text" />
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_bulletin_pdf"><?php _e('주보 PDF', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_bulletin_pdf" name="dw_bulletin_pdf" value="<?php echo esc_attr($pdf); ?>" />
                    <button type="button" class="button" id="dw_bulletin_pdf_button"><?php _e('PDF 업로드', 'dasom-church'); ?></button>
                    <div id="bulletin_pdf_preview" style="margin-top:8px;">
                        <?php if ($pdf): ?>
                            <a href="<?php echo esc_url(wp_get_attachment_url($pdf)); ?>" target="_blank"><?php _e('현재 PDF 보기', 'dasom-church'); ?></a>
                        <?php endif; ?>
                    </div>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="bulletin_images"><?php _e('주보 이미지', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_bulletin_images" name="dw_bulletin_images" value='<?php echo esc_attr(json_encode($images)); ?>' />
                    <button type="button" class="button" id="dw_bulletin_images_button"><?php _e('이미지 업로드', 'dasom-church'); ?></button>
                    <ul id="dw_bulletin_images_preview" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
                        <?php foreach ($images as $id): ?>
                            <li data-id="<?php echo esc_attr($id); ?>" style="position:relative;">
                                <img src="<?php echo esc_url(wp_get_attachment_url($id)); ?>" style="width:100px;height:100px;object-fit:cover;" />
                                <button type="button" class="button-link remove-image" style="position:absolute;top:-8px;right:-8px;background:#dc3545;color:white;border:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.2);transition:all 0.2s ease;">×</button>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                    <p class="description"><?php _e('드래그하여 순서를 변경할 수 있습니다.', 'dasom-church'); ?></p>
                </td>
            </tr>
        </table>
        <?php
    }
    
    /**
     * 설교 메타박스
     */
    public function dasom_church_sermon_meta_box($post) {
        wp_nonce_field('dasom_church_sermon_meta', 'dasom_church_sermon_nonce');
        
        $title = get_post_meta($post->ID, 'dw_sermon_title', true);
        $youtube = get_post_meta($post->ID, 'dw_sermon_youtube', true);
        $scripture = get_post_meta($post->ID, 'dw_sermon_scripture', true);
        $sermon_date = get_post_meta($post->ID, 'dw_sermon_date', true);
        $thumb_id = get_post_meta($post->ID, 'dw_sermon_thumb_id', true);
        
        // 설교자 드롭다운용 데이터
        $terms = get_terms(array(
            'taxonomy' => 'dw_sermon_preacher',
            'hide_empty' => false,
        ));
        $assigned_ids = wp_get_post_terms($post->ID, 'dw_sermon_preacher', array('fields'=>'ids'));
        $selected_preacher_id = $assigned_ids ? $assigned_ids[0] : 0;
        
        if (!$selected_preacher_id) {
            $def_name = get_option('default_sermon_preacher', __('담임목사', 'dasom-church'));
            if ($def_name) {
                $def_term = get_term_by('name', $def_name, 'dw_sermon_preacher');
                if ($def_term) {
                    $selected_preacher_id = (int)$def_term->term_id;
                }
            }
        }
        ?>
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_sermon_title"><?php _e('설교 제목', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_sermon_title" name="dw_sermon_title" value="<?php echo esc_attr($title); ?>" class="regular-text" />
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_sermon_scripture"><?php _e('성경구절', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_sermon_scripture" name="dw_sermon_scripture" value="<?php echo esc_attr($scripture); ?>" class="regular-text" />
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="sermon_preacher_term"><?php _e('설교자', 'dasom-church'); ?></label>
                </th>
                <td>
                    <select id="dw_sermon_preacher_term" name="dw_sermon_preacher_term" class="regular-text">
                        <option value="">— <?php _e('설교자 선택', 'dasom-church'); ?> —</option>
                        <?php foreach ($terms as $t): ?>
                            <option value="<?php echo (int)$t->term_id; ?>" <?php selected($selected_preacher_id, (int)$t->term_id); ?>>
                                <?php echo esc_html($t->name); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <p class="description"><?php _e('설교자 추가/수정/삭제는 교회관리 → 대시보드 → 설교자 관리에서 할 수 있습니다.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_sermon_youtube"><?php _e('YouTube URL', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_sermon_youtube" name="dw_sermon_youtube" value="<?php echo esc_url($youtube); ?>" class="regular-text" />
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_sermon_date"><?php _e('설교 일자', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="date" id="dw_sermon_date" name="dw_sermon_date" value="<?php echo esc_attr($sermon_date); ?>" class="regular-text" />
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="sermon_thumb_id"><?php _e('YouTube 썸네일', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_sermon_thumb_id" name="dw_sermon_thumb_id" value="<?php echo esc_attr($thumb_id); ?>" />
                    <button type="button" class="button" id="dw_sermon_thumb_button"><?php _e('썸네일 업로드/선택', 'dasom-church'); ?></button>
                    <button type="button" class="button" id="dw_sermon_thumb_fetch"><?php _e('YouTube 썸네일 불러오기', 'dasom-church'); ?></button>
                    <button type="button" class="button button-link-delete" id="dw_sermon_thumb_remove" style="color:#b32d2e;"><?php _e('썸네일 삭제', 'dasom-church'); ?></button>
                    <div id="dw_sermon_thumb_preview" style="margin-top:10px;">
                        <?php if ($thumb_id): ?>
                            <img src="<?php echo esc_url(wp_get_attachment_url($thumb_id)); ?>" style="width:160px;height:90px;object-fit:cover;" />
                        <?php endif; ?>
                    </div>
                    <p class="description"><?php _e('미리보기만 표시됩니다. 저장 시 썸네일이 대표 이미지로 등록됩니다.', 'dasom-church'); ?></p>
                </td>
            </tr>
        </table>
        <?php
    }
    
    /**
     * 목회컬럼 메타박스
     */
    public function dasom_church_column_meta_box($post) {
        wp_nonce_field('dasom_church_column_meta', 'dasom_church_column_nonce');
        
        $title = get_post_meta($post->ID, 'dw_column_title', true);
        $content = get_post_meta($post->ID, 'dw_column_content', true);
        $top_image = get_post_meta($post->ID, 'dw_column_top_image', true);
        $bottom_image = get_post_meta($post->ID, 'dw_column_bottom_image', true);
        $youtube = get_post_meta($post->ID, 'dw_column_youtube', true);
        $thumb_id = get_post_meta($post->ID, 'dw_column_thumb_id', true);
        ?>
        <div style="background: #fff; padding: 20px; border: 1px solid #ccd0d4; border-radius: 4px;">
            <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 16px; font-weight: 600;"><?php _e('목회컬럼 정보', 'dasom-church'); ?></h3>
            
            <div style="margin-bottom: 20px;">
                <label for="dw_column_top_image" style="display: block; margin-bottom: 8px; font-weight: 600;"><?php _e('상단 이미지', 'dasom-church'); ?></label>
                <input type="hidden" id="dw_column_top_image" name="dw_column_top_image" value="<?php echo esc_attr($top_image); ?>" />
                <button type="button" class="button" id="dw_column_top_image_button"><?php _e('이미지 업로드/선택', 'dasom-church'); ?></button>
                <div id="dw_column_top_image_preview" style="margin-top: 10px;">
                    <?php if ($top_image): ?>
                        <img src="<?php echo esc_url(wp_get_attachment_url($top_image)); ?>" style="width: 160px; height: 90px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px;" />
                    <?php endif; ?>
                </div>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;"><?php _e('상단 이미지가 대표 이미지로 설정됩니다.', 'dasom-church'); ?></p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label for="dw_column_bottom_image" style="display: block; margin-bottom: 8px; font-weight: 600;"><?php _e('하단 이미지', 'dasom-church'); ?></label>
                <input type="hidden" id="dw_column_bottom_image" name="dw_column_bottom_image" value="<?php echo esc_attr($bottom_image); ?>" />
                <button type="button" class="button" id="dw_column_bottom_image_button"><?php _e('이미지 업로드/선택', 'dasom-church'); ?></button>
                <div id="dw_column_bottom_image_preview" style="margin-top: 10px;">
                    <?php if ($bottom_image): ?>
                        <img src="<?php echo esc_url(wp_get_attachment_url($bottom_image)); ?>" style="width: 160px; height: 90px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px;" />
                    <?php endif; ?>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label for="dw_column_youtube" style="display: block; margin-bottom: 8px; font-weight: 600;"><?php _e('YouTube URL', 'dasom-church'); ?></label>
                <input type="url" id="dw_column_youtube" name="dw_column_youtube" value="<?php echo esc_url($youtube); ?>" style="width: 100%; max-width: 500px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" />
            </div>
            
            <div style="margin-bottom: 20px;">
                <label for="column_thumb_id" style="display: block; margin-bottom: 8px; font-weight: 600;"><?php _e('YouTube 썸네일', 'dasom-church'); ?></label>
                <input type="hidden" id="dw_column_thumb_id" name="dw_column_thumb_id" value="<?php echo esc_attr($thumb_id); ?>" />
                <button type="button" class="button" id="dw_column_thumb_button"><?php _e('썸네일 업로드/선택', 'dasom-church'); ?></button>
                <button type="button" class="button" id="dw_column_thumb_fetch"><?php _e('YouTube 썸네일 불러오기', 'dasom-church'); ?></button>
                <button type="button" class="button button-link-delete" id="dw_column_thumb_remove" style="color:#b32d2e;"><?php _e('썸네일 삭제', 'dasom-church'); ?></button>
                <div id="dw_column_thumb_preview" style="margin-top: 10px;">
                    <?php if ($thumb_id): ?>
                        <img src="<?php echo esc_url(wp_get_attachment_url($thumb_id)); ?>" style="width: 160px; height: 90px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px;" />
                    <?php endif; ?>
                </div>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;"><?php _e('미리보기만 표시됩니다. 저장 시 썸네일이 대표 이미지로 등록됩니다.', 'dasom-church'); ?></p>
            </div>
        </div>
        <?php
    }
    
    /**
     * 교회앨범 메타박스
     */
    public function dasom_church_album_meta_box($post) {
        wp_nonce_field('dasom_church_album_meta', 'dasom_church_album_nonce');
        
        $images = get_post_meta($post->ID, 'dw_album_images', true);
        $images = $images ? json_decode($images, true) : array();
        $images = is_array($images) ? $images : array();
        $youtube = get_post_meta($post->ID, 'dw_album_youtube', true);
        $thumb_id = get_post_meta($post->ID, 'dw_album_thumb_id', true);
        ?>
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="album_images"><?php _e('앨범 이미지', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_album_images" name="dw_album_images" value='<?php echo esc_attr(json_encode($images)); ?>' />
                    <button type="button" class="button" id="dw_album_images_button"><?php _e('이미지 업로드/선택', 'dasom-church'); ?></button>
                    <ul id="dw_album_images_preview" style="margin-top:10px; display:flex; flex-wrap:wrap; gap:10px;">
                        <?php foreach ($images as $id): ?>
                            <li data-id="<?php echo esc_attr($id); ?>" style="position:relative;">
                                <?php 
                                $attachment_url = wp_get_attachment_url($id);
                                if ($attachment_url): ?>
                                    <img src="<?php echo esc_url($attachment_url); ?>" style="width:100px;height:100px;object-fit:cover;" />
                                <?php else: ?>
                                    <div style="width:100px;height:100px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#666;">
                                        <?php echo esc_html($id); ?>
                                    </div>
                                <?php endif; ?>
                                <button type="button" class="button-link remove-image" style="position:absolute;top:-8px;right:-8px;background:#dc3545;color:white;border:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.2);transition:all 0.2s ease;">×</button>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                    <?php if (empty($images)): ?>
                        <p class="description"><?php _e('이미지가 없습니다. 위의 버튼을 클릭하여 이미지를 업로드하세요.', 'dasom-church'); ?></p>
                    <?php endif; ?>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_album_youtube"><?php _e('YouTube URL', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_album_youtube" name="dw_album_youtube" value="<?php echo esc_url($youtube); ?>" class="regular-text" />
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="album_thumb_id"><?php _e('YouTube 썸네일', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_album_thumb_id" name="dw_album_thumb_id" value="<?php echo esc_attr($thumb_id); ?>" />
                    <button type="button" class="button" id="dw_album_thumb_button"><?php _e('썸네일 업로드/선택', 'dasom-church'); ?></button>
                    <button type="button" class="button" id="dw_album_thumb_fetch"><?php _e('YouTube 썸네일 불러오기', 'dasom-church'); ?></button>
                    <button type="button" class="button button-link-delete" id="dw_album_thumb_remove" style="color:#b32d2e;"><?php _e('썸네일 삭제', 'dasom-church'); ?></button>
                    <div id="dw_album_thumb_preview" style="margin-top:10px;">
                        <?php if ($thumb_id): ?>
                            <img src="<?php echo esc_url(wp_get_attachment_url($thumb_id)); ?>" style="width:160px;height:90px;object-fit:cover;" />
                        <?php endif; ?>
                    </div>
                    <p class="description"><?php _e('미리보기만 표시됩니다. 저장 시 썸네일이 대표 이미지로 등록됩니다.', 'dasom-church'); ?></p>
                </td>
            </tr>
        </table>
        <?php
    }
    
    /**
     * Save meta boxes
     */
    public function dasom_church_save_meta_boxes($post_id) {
        // Check if this is an autosave
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        // Check if this is a revision
        if (wp_is_post_revision($post_id)) {
            return;
        }
        
        // Check user capabilities
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        $post_type = get_post_type($post_id);
        
        switch ($post_type) {
            case 'bulletin':
                $this->dasom_church_save_bulletin_meta($post_id);
                break;
            case 'sermon':
                $this->dasom_church_save_sermon_meta($post_id);
                break;
            case 'column':
                $this->dasom_church_save_column_meta($post_id);
                break;
            case 'album':
                $this->dasom_church_save_album_meta($post_id);
                break;
        }
    }
    
    /**
     * Save bulletin meta
     */
    private function dasom_church_save_bulletin_meta($post_id) {
        if (!isset($_POST['dasom_church_bulletin_nonce']) || 
            !wp_verify_nonce($_POST['dasom_church_bulletin_nonce'], 'dasom_church_bulletin_meta')) {
            error_log('Bulletin meta save: Nonce verification failed');
            return;
        }
        
        // Save meta fields
        if (isset($_POST['dw_bulletin_date'])) {
            $date = sanitize_text_field($_POST['dw_bulletin_date']);
            update_post_meta($post_id, 'dw_bulletin_date', $date);
            error_log("Bulletin date saved: Post ID={$post_id}, Date={$date}");
        } else {
            error_log("Bulletin date NOT received in POST data");
        }
        
        if (isset($_POST['dw_bulletin_pdf'])) {
            update_post_meta($post_id, 'dw_bulletin_pdf', intval($_POST['dw_bulletin_pdf']));
        }
        
        if (isset($_POST['dw_bulletin_images'])) {
            update_post_meta($post_id, 'dw_bulletin_images', sanitize_text_field($_POST['dw_bulletin_images']));
        }
        
        // Auto-generate title
        $date = get_post_meta($post_id, 'dw_bulletin_date', true);
        if ($date) {
            $new_title = date_i18n('Y년 n월 j일', strtotime($date)) . ' ' . __('교회주보', 'dasom-church');
            $post = get_post($post_id);
            if ($post && $post->post_title !== $new_title) {
                // Remove this action to prevent infinite loop
                remove_action('save_post', array($this, 'dasom_church_save_meta_boxes'));
                
                wp_update_post(array(
                    'ID' => $post_id,
                    'post_title' => $new_title,
                    'post_name' => sanitize_title($new_title)
                ));
                
                // Re-add the action
                add_action('save_post', array($this, 'dasom_church_save_meta_boxes'));
            }
        }
    }
    
    /**
     * Save sermon meta
     */
    private function dasom_church_save_sermon_meta($post_id) {
        if (!isset($_POST['dasom_church_sermon_nonce']) || 
            !wp_verify_nonce($_POST['dasom_church_sermon_nonce'], 'dasom_church_sermon_meta')) {
            return;
        }
        
        // Save meta fields
        if (isset($_POST['dw_sermon_title'])) {
            $title = sanitize_text_field($_POST['dw_sermon_title']);
            update_post_meta($post_id, 'dw_sermon_title', $title);
            
            // Update post title (with infinite loop prevention)
            if ($title) {
                // Remove this action to prevent infinite loop
                remove_action('save_post', array($this, 'dasom_church_save_meta_boxes'));
                
                wp_update_post(array(
                    'ID' => $post_id,
                    'post_title' => $title,
                    'post_name' => sanitize_title($title)
                ));
                
                // Re-add the action
                add_action('save_post', array($this, 'dasom_church_save_meta_boxes'));
            }
        }
        
        if (isset($_POST['dw_sermon_youtube'])) {
            update_post_meta($post_id, 'dw_sermon_youtube', esc_url_raw($_POST['dw_sermon_youtube']));
        }
        
        if (isset($_POST['dw_sermon_scripture'])) {
            update_post_meta($post_id, 'dw_sermon_scripture', sanitize_text_field($_POST['dw_sermon_scripture']));
        }
        
        if (isset($_POST['dw_sermon_date'])) {
            update_post_meta($post_id, 'dw_sermon_date', sanitize_text_field($_POST['dw_sermon_date']));
        }
        
        if (isset($_POST['dw_sermon_thumb_id'])) {
            update_post_meta($post_id, 'dw_sermon_thumb_id', intval($_POST['dw_sermon_thumb_id']));
        }
        
        // Save preacher
        if (isset($_POST['dw_sermon_preacher_term'])) {
            $preacher_id = intval($_POST['dw_sermon_preacher_term']);
            if ($preacher_id > 0) {
                wp_set_post_terms($post_id, array($preacher_id), 'dw_sermon_preacher', false);
            } else {
                // Apply default preacher
                $def = get_option('default_sermon_preacher', __('담임목사', 'dasom-church'));
                if ($def) {
                    $term = get_term_by('name', $def, 'dw_sermon_preacher');
                    if ($term && !is_wp_error($term)) {
                        wp_set_post_terms($post_id, array($term->term_id), 'dw_sermon_preacher', false);
                    }
                }
            }
        }
        
        // Set featured image - prioritize manual thumb_id, then YouTube thumbnail
        $thumb_id = get_post_meta($post_id, 'dw_sermon_thumb_id', true);
        if ($thumb_id) {
            set_post_thumbnail($post_id, $thumb_id);
        } else {
            // Try to get YouTube thumbnail
            $youtube = get_post_meta($post_id, 'dw_sermon_youtube', true);
            if ($youtube && preg_match('/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^\&\?\/]+)/', $youtube, $matches)) {
                $youtube_id = $matches[1];
                $thumbnail_url = "https://img.youtube.com/vi/{$youtube_id}/maxresdefault.jpg";
                
                // Load required files for media_sideload_image
                if (!function_exists('media_sideload_image')) {
                    require_once(ABSPATH . 'wp-admin/includes/media.php');
                    require_once(ABSPATH . 'wp-admin/includes/file.php');
                    require_once(ABSPATH . 'wp-admin/includes/image.php');
                }
                
                $image_id = media_sideload_image($thumbnail_url, $post_id, get_post_meta($post_id, 'dw_sermon_title', true), 'id');
                if (!is_wp_error($image_id)) {
                    set_post_thumbnail($post_id, $image_id);
                    update_post_meta($post_id, 'dw_sermon_thumb_id', $image_id);
                }
            }
        }
    }
    
    /**
     * Save column meta
     */
    private function dasom_church_save_column_meta($post_id) {
        if (!isset($_POST['dasom_church_column_nonce']) || 
            !wp_verify_nonce($_POST['dasom_church_column_nonce'], 'dasom_church_column_meta')) {
            return;
        }
        
        
        if (isset($_POST['dw_column_top_image'])) {
            update_post_meta($post_id, 'dw_column_top_image', intval($_POST['dw_column_top_image']));
            
            // Set featured image to top image
            $top_image_id = intval($_POST['dw_column_top_image']);
            if ($top_image_id > 0) {
                set_post_thumbnail($post_id, $top_image_id);
            }
        }
        
        if (isset($_POST['dw_column_bottom_image'])) {
            update_post_meta($post_id, 'dw_column_bottom_image', intval($_POST['dw_column_bottom_image']));
        }
        
        if (isset($_POST['dw_column_youtube'])) {
            update_post_meta($post_id, 'dw_column_youtube', esc_url_raw($_POST['dw_column_youtube']));
        }
        
        if (isset($_POST['dw_column_thumb_id'])) {
            update_post_meta($post_id, 'dw_column_thumb_id', intval($_POST['dw_column_thumb_id']));
        }
    }
    
    /**
     * Save album meta
     */
    private function dasom_church_save_album_meta($post_id) {
        if (!isset($_POST['dasom_church_album_nonce']) || 
            !wp_verify_nonce($_POST['dasom_church_album_nonce'], 'dasom_church_album_meta')) {
            return;
        }
        
        if (isset($_POST['dw_album_youtube'])) {
            update_post_meta($post_id, 'dw_album_youtube', esc_url_raw($_POST['dw_album_youtube']));
        }
        
        if (isset($_POST['dw_album_thumb_id'])) {
            update_post_meta($post_id, 'dw_album_thumb_id', intval($_POST['dw_album_thumb_id']));
        }
        
        if (isset($_POST['dw_album_images'])) {
            update_post_meta($post_id, 'dw_album_images', sanitize_text_field($_POST['dw_album_images']));
            
            // Auto-set first image as featured image (only if no manual YouTube thumbnail is set)
            $manual_youtube_thumb_id = get_post_meta($post_id, 'dw_album_thumb_id', true);
            if (!$manual_youtube_thumb_id) {
                $images = json_decode(sanitize_text_field($_POST['dw_album_images']), true);
                if (is_array($images) && !empty($images)) {
                    $first_image_id = intval($images[0]);
                    if ($first_image_id > 0) {
                        set_post_thumbnail($post_id, $first_image_id);
                        // album_thumb_id는 YouTube 썸네일용이므로 건드리지 않음
                    }
                }
            }
        }
        
        // 교회앨범에서는 YouTube 썸네일이 Featured Image를 대체하지 않음
        // YouTube 썸네일은 별도 필드로만 관리됨
    }
    
    // Quick Edit functionality is handled by Dasom_Church_Columns class
    
    /**
     * Admin scripts
     */
    public function dasom_church_admin_scripts($hook) {
        global $post;
        
        // Only load on post edit screens
        if (!in_array($hook, array('post.php', 'post-new.php', 'edit.php'))) {
            return;
        }
        
        if (!isset($post->post_type) || !in_array($post->post_type, array('bulletin', 'sermon', 'column', 'album'))) {
            return;
        }
        
        wp_enqueue_media();
        wp_enqueue_script('jquery-ui-sortable');
        
        wp_add_inline_script('jquery', $this->dasom_church_get_admin_script());
    }
    
    /**
     * Get admin script
     */
    private function dasom_church_get_admin_script() {
        return "
        jQuery(document).ready(function($) {
            // PDF 업로더
            $('#dw_bulletin_pdf_button').on('click', function(e) {
                e.preventDefault();
                var frame = wp.media({
                    title: '주보 PDF 업로드',
                    button: {text: '선택'},
                    library: {type: 'application/pdf'},
                    multiple: false
                });
                frame.on('select', function() {
                    var attachment = frame.state().get('selection').first().toJSON();
                    $('#dw_bulletin_pdf').val(attachment.id);
                    $('#bulletin_pdf_preview').html('<a href=\"' + attachment.url + '\" target=\"_blank\">선택된 PDF 보기</a>');
                });
                frame.open();
            });
            
            // 이미지 멀티 업로더
            $('#dw_bulletin_images_button, #dw_album_images_button').on('click', function(e) {
                e.preventDefault();
                var frame = wp.media({
                    title: '이미지 업로드',
                    button: {text: '추가'},
                    library: {type: 'image'},
                    multiple: true
                });
                frame.on('select', function() {
                    var selection = frame.state().get('selection');
                    var ids = [];
                    $('#dw_bulletin_images_preview li, #dw_album_images_preview li').each(function() {
                        ids.push($(this).data('id'));
                    });
                    selection.each(function(attachment) {
                        var att = attachment.toJSON();
                        ids.push(att.id);
                        $('#dw_bulletin_images_preview, #dw_album_images_preview').append(
                            '<li data-id=\"' + att.id + '\" style=\"position:relative;\">' +
                            '<img src=\"' + att.url + '\" style=\"width:100px;height:100px;object-fit:cover;\" />' +
                            '<button type=\"button\" class=\"button-link remove-image\" style=\"position:absolute;top:-8px;right:-8px;background:#dc3545;color:white;border:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.2);transition:all 0.2s ease;\">×</button>' +
                            '</li>'
                        );
                    });
                    $('#dw_bulletin_images, #dw_album_images').val(JSON.stringify(ids));
                    
                    // 앨범 이미지 추가 시 Featured Image는 PHP에서 처리 (JavaScript에서는 thumb_id 건드리지 않음)
                });
                frame.open();
            });
            
            // 이미지 제거
            $(document).on('click', '.remove-image', function() {
                $(this).parent().remove();
                var ids = [];
                $('#dw_bulletin_images_preview li, #dw_album_images_preview li').each(function() {
                    ids.push($(this).data('id'));
                });
                $('#dw_bulletin_images, #dw_album_images').val(JSON.stringify(ids));
                
                // 앨범 이미지 제거 시 Featured Image는 PHP에서 처리 (JavaScript에서는 thumb_id 건드리지 않음)
            });
            
            // 정렬
            $('#dw_bulletin_images_preview, #dw_album_images_preview').sortable({
                update: function() {
                    var ids = [];
                    $(this).find('li').each(function() {
                        ids.push($(this).data('id'));
                    });
                    $('#dw_bulletin_images, #dw_album_images').val(JSON.stringify(ids));
                    
                    // 앨범 이미지 순서 변경 시 Featured Image는 PHP에서 처리 (JavaScript에서는 thumb_id 건드리지 않음)
                }
            });
            
            // 썸네일 업로드
            $('#dw_sermon_thumb_button, #dw_album_thumb_button, #dw_column_thumb_button, #dw_column_top_image_button, #dw_column_bottom_image_button').on('click', function(e) {
                e.preventDefault();
                var frame = wp.media({
                    title: '이미지 업로드',
                    button: {text: '선택'},
                    library: {type: 'image'},
                    multiple: false
                });
                frame.on('select', function() {
                    var attachment = frame.state().get('selection').first().toJSON();
                    var buttonId = $(e.target).attr('id');
                    
                    if (buttonId === 'dw_column_top_image_button') {
                        $('#dw_column_top_image').val(attachment.id);
                        $('#dw_column_top_image_preview').html('<img src=\"' + attachment.url + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                    } else if (buttonId === 'dw_column_bottom_image_button') {
                        $('#dw_column_bottom_image').val(attachment.id);
                        $('#dw_column_bottom_image_preview').html('<img src=\"' + attachment.url + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                    } else if (buttonId === 'dw_sermon_thumb_button') {
                        $('#dw_sermon_thumb_id').val(attachment.id);
                        $('#dw_sermon_thumb_preview').html('<img src=\"' + attachment.url + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                    } else if (buttonId === 'dw_album_thumb_button') {
                        $('#dw_album_thumb_id').val(attachment.id);
                        $('#dw_album_thumb_preview').html('<img src=\"' + attachment.url + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                    } else if (buttonId === 'dw_column_thumb_button') {
                        $('#dw_column_thumb_id').val(attachment.id);
                        $('#dw_column_thumb_preview').html('<img src=\"' + attachment.url + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                    }
                });
                frame.open();
            });
            
            // YouTube 썸네일 불러오기 (설교, 목회컬럼, 교회앨범)
            $('#dw_sermon_thumb_fetch, #dw_column_thumb_fetch, #dw_album_thumb_fetch').on('click', function(e) {
                e.preventDefault();
                var buttonId = $(e.target).attr('id');
                var url = '';
                
                if (buttonId === 'dw_sermon_thumb_fetch') {
                    url = $('#dw_sermon_youtube').val();
                } else if (buttonId === 'dw_column_thumb_fetch') {
                    url = $('#dw_column_youtube').val();
                } else if (buttonId === 'dw_album_thumb_fetch') {
                    url = $('#dw_album_youtube').val();
                }
                
                var match = url.match(/(?:youtu\\.be\\/|youtube\\.com\\/(?:watch\\?v=|embed\\/|v\\/))([^\\&\\?\\/]+)/);
                if (match) {
                    var yid = match[1];
                    var max = 'https://img.youtube.com/vi/' + yid + '/maxresdefault.jpg';
                    var hq = 'https://img.youtube.com/vi/' + yid + '/hqdefault.jpg';
                    
                    var img = new Image();
                    img.onload = function() {
                        if (buttonId === 'dw_sermon_thumb_fetch') {
                            $('#dw_sermon_thumb_preview').html('<img src=\"' + max + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                        } else if (buttonId === 'dw_column_thumb_fetch') {
                            $('#dw_column_thumb_preview').html('<img src=\"' + max + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                        } else if (buttonId === 'dw_album_thumb_fetch') {
                            $('#dw_album_thumb_preview').html('<img src=\"' + max + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                        }
                    };
                    img.onerror = function() {
                        if (buttonId === 'dw_sermon_thumb_fetch') {
                            $('#dw_sermon_thumb_preview').html('<img src=\"' + hq + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                        } else if (buttonId === 'dw_column_thumb_fetch') {
                            $('#dw_column_thumb_preview').html('<img src=\"' + hq + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                        } else if (buttonId === 'dw_album_thumb_fetch') {
                            $('#dw_album_thumb_preview').html('<img src=\"' + hq + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                        }
                    };
                    img.src = max;
                } else {
                    alert('유효한 YouTube URL이 아닙니다.');
                }
            });
            
            // YouTube 썸네일 삭제 (설교, 목회컬럼, 교회앨범)
            $('#dw_sermon_thumb_remove, #dw_column_thumb_remove, #dw_album_thumb_remove').on('click', function(e) {
                e.preventDefault();
                var buttonId = $(e.target).attr('id');
                
                if (confirm('썸네일을 삭제하시겠습니까?')) {
                    if (buttonId === 'dw_sermon_thumb_remove') {
                        $('#dw_sermon_thumb_id').val('');
                        $('#dw_sermon_thumb_preview').html('');
                    } else if (buttonId === 'dw_column_thumb_remove') {
                        $('#dw_column_thumb_id').val('');
                        $('#dw_column_thumb_preview').html('');
                    } else if (buttonId === 'dw_album_thumb_remove') {
                        $('#dw_album_thumb_id').val('');
                        $('#dw_album_thumb_preview').html('');
                    }
                }
            });
        });
        ";
    }
    
    /**
     * Admin head styles
     */
    public function dasom_church_admin_head_styles() {
        global $post_type;
        if (in_array($post_type, array('bulletin', 'sermon'))) {
            echo '<style>#titlediv { display: none; }</style>';
        }
        
        // Hide Author section for bulletin, column and sermon post types
        if (in_array($post_type, array('bulletin', 'column', 'sermon'))) {
            echo '<style>
                #authordiv {
                    display: none !important;
                }
            </style>';
        }
        
        // Hide sermon_preacher taxonomy section for sermon post type
        if ($post_type === 'sermon') {
            echo '<style>
                #dw_sermon_preacherdiv,
                #tagsdiv-dw_sermon_preacher {
                    display: none !important;
                }
            </style>';
        }
    }
    
    /**
     * Disable Gutenberg for column post type
     */
    public function dasom_church_disable_gutenberg_for_column($current_status, $post_type) {
        if ($post_type === 'column') {
            return false;
        }
        return $current_status;
    }
}

// Initialize the meta boxes
Dasom_Church_Meta_Boxes::get_instance();
