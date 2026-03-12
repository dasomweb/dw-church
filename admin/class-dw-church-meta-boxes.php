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
class DW_Church_Meta_Boxes {
    
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
        add_action('admin_footer', array($this, 'dasom_church_admin_footer_scripts'));
        
        // Quick Edit is handled by Dasom_Church_Columns class
        
        // Admin head styles
        add_action('admin_head', array($this, 'dasom_church_admin_head_styles'));
        
        // Force classic editor for column post type
        add_filter('use_block_editor_for_post_type', array($this, 'dasom_church_disable_gutenberg_for_column'), 10, 2);
        
        // Display album image error notices
        add_action('admin_notices', array($this, 'dasom_church_display_album_image_error'));
    }
    
    /**
     * Add meta boxes
     */
    public function dasom_church_add_meta_boxes() {
        // Debug: Log meta box registration
        error_log('DW Church Meta Boxes - Registering meta boxes');
        
        // 주보 메타박스
        add_meta_box(
            'bulletin_meta',
            __('주보 정보', 'dw-church'),
            array($this, 'dasom_church_bulletin_meta_box'),
            'bulletin',
            'normal',
            'default'
        );
        
        // 설교 메타박스
        add_meta_box(
            'sermon_meta',
            __('설교 정보', 'dw-church'),
            array($this, 'dasom_church_sermon_meta_box'),
            'sermon',
            'normal',
            'default'
        );
        
        // 목회컬럼 메타박스
        add_meta_box(
            'column_meta',
            __('목회컬럼 정보', 'dw-church'),
            array($this, 'dasom_church_column_meta_box'),
            'column',
            'normal',
            'default'
        );
        
        // 교회앨범 메타박스
        add_meta_box(
            'album_meta',
            __('앨범 정보', 'dw-church'),
            array($this, 'dasom_church_album_meta_box'),
            'album',
            'normal',
            'default'
        );
        
        // 배너 메타박스
        error_log('DW Church Meta Boxes - Registering banner meta box');
        add_meta_box(
            'banner_meta',
            __('배너 정보', 'dw-church'),
            array($this, 'dasom_church_banner_meta_box'),
            'banner',
            'normal',
            'default'
        );
        
        // 이벤트 메타박스
        add_meta_box(
            'event_meta',
            __('이벤트 정보', 'dw-church'),
            array($this, 'dasom_church_event_meta_box'),
            'event',
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
                    <label for="dw_bulletin_date"><?php _e('주보 날짜', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="date" id="dw_bulletin_date" name="dw_bulletin_date" value="<?php echo esc_attr($date); ?>" class="regular-text" />
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_bulletin_pdf"><?php _e('주보 PDF', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_bulletin_pdf" name="dw_bulletin_pdf" value="<?php echo esc_attr($pdf); ?>" />
                    <button type="button" class="button" id="dw_bulletin_pdf_button"><?php _e('PDF 업로드', 'dw-church'); ?></button>
                    <div id="bulletin_pdf_preview" style="margin-top:8px;">
                        <?php if ($pdf): 
                            $pdf_url = wp_get_attachment_url($pdf);
                            $pdf_path = get_attached_file($pdf);
                            if ($pdf_path) {
                                $pdf_filename = basename($pdf_path);
                            } else {
                                $pdf_filename = get_the_title($pdf);
                                if (empty($pdf_filename)) {
                                    $pdf_filename = __('PDF 파일', 'dw-church');
                                }
                            }
                        ?>
                            <div style="padding:8px;background:#f0f0f1;border-radius:4px;">
                                <a href="<?php echo esc_url($pdf_url); ?>" target="_blank" style="color:#2271b1;font-weight:500;text-decoration:none;"><?php echo esc_html($pdf_filename); ?></a>
                            </div>
                        <?php endif; ?>
                    </div>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="bulletin_images"><?php _e('주보 이미지', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_bulletin_images" name="dw_bulletin_images" value='<?php echo esc_attr(json_encode($images)); ?>' />
                    <button type="button" class="button" id="dw_bulletin_images_button"><?php _e('이미지 업로드', 'dw-church'); ?></button>
                    <ul id="dw_bulletin_images_preview" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
                        <?php foreach ($images as $id): ?>
                            <li data-id="<?php echo esc_attr($id); ?>" style="position:relative;">
                                <img src="<?php echo esc_url(wp_get_attachment_url($id)); ?>" style="width:100px;height:100px;object-fit:cover;" />
                                <button type="button" class="button-link remove-image" style="position:absolute;top:-8px;right:-8px;background:#dc3545;color:white;border:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.2);transition:all 0.2s ease;">×</button>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                    <p class="description"><?php _e('드래그하여 순서를 변경할 수 있습니다.', 'dw-church'); ?></p>
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
            $def_name = get_option('default_sermon_preacher', __('담임목사', 'dw-church'));
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
                    <label for="dw_sermon_title"><?php _e('설교 제목', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_sermon_title" name="dw_sermon_title" value="<?php echo esc_attr($title); ?>" class="regular-text" />
                    <p class="description"><?php _e('제목 앞뒤에 따옴표(")를 넣지 마세요.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_sermon_scripture"><?php _e('성경구절', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_sermon_scripture" name="dw_sermon_scripture" value="<?php echo esc_attr($scripture); ?>" class="regular-text" />
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="sermon_preacher_term"><?php _e('설교자', 'dw-church'); ?></label>
                </th>
                <td>
                    <select id="dw_sermon_preacher_term" name="dw_sermon_preacher_term" class="regular-text">
                        <option value="">— <?php _e('설교자 선택', 'dw-church'); ?> —</option>
                        <?php foreach ($terms as $t): ?>
                            <option value="<?php echo (int)$t->term_id; ?>" <?php selected($selected_preacher_id, (int)$t->term_id); ?>>
                                <?php echo esc_html($t->name); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <p class="description"><?php _e('설교자 추가/수정/삭제는 교회관리 → 대시보드 → 설교자 관리에서 할 수 있습니다.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_sermon_youtube"><?php _e('YouTube URL', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_sermon_youtube" name="dw_sermon_youtube" value="<?php echo esc_url($youtube); ?>" class="regular-text" />
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_sermon_date"><?php _e('설교 일자', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="date" id="dw_sermon_date" name="dw_sermon_date" value="<?php echo esc_attr($sermon_date); ?>" class="regular-text" />
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="sermon_thumb_id"><?php _e('YouTube 썸네일', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_sermon_thumb_id" name="dw_sermon_thumb_id" value="<?php echo esc_attr($thumb_id); ?>" />
                    <button type="button" class="button" id="dw_sermon_thumb_button"><?php _e('썸네일 업로드/선택', 'dw-church'); ?></button>
                    <button type="button" class="button" id="dw_sermon_thumb_fetch"><?php _e('YouTube 썸네일 불러오기', 'dw-church'); ?></button>
                    <button type="button" class="button button-link-delete" id="dw_sermon_thumb_remove" style="color:#b32d2e;"><?php _e('썸네일 삭제', 'dw-church'); ?></button>
                    <div id="dw_sermon_thumb_preview" style="margin-top:10px;">
                        <?php if ($thumb_id): ?>
                            <img src="<?php echo esc_url(wp_get_attachment_url($thumb_id)); ?>" style="width:160px;height:90px;object-fit:cover;" />
                        <?php endif; ?>
                    </div>
                    <p class="description"><?php _e('미리보기만 표시됩니다. 저장 시 썸네일이 대표 이미지로 등록됩니다.', 'dw-church'); ?></p>
                    <p class="description"><?php _e('권장 이미지 사이즈: 1280×720px, 72dpi', 'dw-church'); ?></p>
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
            <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 16px; font-weight: 600;"><?php _e('목회컬럼 정보', 'dw-church'); ?></h3>
            
            <div style="margin-bottom: 20px;">
                <label for="dw_column_top_image" style="display: block; margin-bottom: 8px; font-weight: 600;"><?php _e('상단 이미지', 'dw-church'); ?></label>
                <input type="hidden" id="dw_column_top_image" name="dw_column_top_image" value="<?php echo esc_attr($top_image); ?>" />
                <button type="button" class="button" id="dw_column_top_image_button"><?php _e('이미지 업로드/선택', 'dw-church'); ?></button>
                <div id="dw_column_top_image_preview" style="margin-top: 10px;">
                    <?php if ($top_image): ?>
                        <img src="<?php echo esc_url(wp_get_attachment_url($top_image)); ?>" style="width: 160px; height: 90px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px;" />
                    <?php endif; ?>
                </div>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;"><?php _e('상단 이미지가 대표 이미지로 설정됩니다.', 'dw-church'); ?></p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label for="dw_column_bottom_image" style="display: block; margin-bottom: 8px; font-weight: 600;"><?php _e('하단 이미지', 'dw-church'); ?></label>
                <input type="hidden" id="dw_column_bottom_image" name="dw_column_bottom_image" value="<?php echo esc_attr($bottom_image); ?>" />
                <button type="button" class="button" id="dw_column_bottom_image_button"><?php _e('이미지 업로드/선택', 'dw-church'); ?></button>
                <div id="dw_column_bottom_image_preview" style="margin-top: 10px;">
                    <?php if ($bottom_image): ?>
                        <img src="<?php echo esc_url(wp_get_attachment_url($bottom_image)); ?>" style="width: 160px; height: 90px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px;" />
                    <?php endif; ?>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label for="dw_column_youtube" style="display: block; margin-bottom: 8px; font-weight: 600;"><?php _e('YouTube URL', 'dw-church'); ?></label>
                <input type="url" id="dw_column_youtube" name="dw_column_youtube" value="<?php echo esc_url($youtube); ?>" style="width: 100%; max-width: 500px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" />
            </div>
            
            <div style="margin-bottom: 20px;">
                <label for="column_thumb_id" style="display: block; margin-bottom: 8px; font-weight: 600;"><?php _e('YouTube 썸네일', 'dw-church'); ?></label>
                <input type="hidden" id="dw_column_thumb_id" name="dw_column_thumb_id" value="<?php echo esc_attr($thumb_id); ?>" />
                <button type="button" class="button" id="dw_column_thumb_button"><?php _e('썸네일 업로드/선택', 'dw-church'); ?></button>
                <button type="button" class="button" id="dw_column_thumb_fetch"><?php _e('YouTube 썸네일 불러오기', 'dw-church'); ?></button>
                <button type="button" class="button button-link-delete" id="dw_column_thumb_remove" style="color:#b32d2e;"><?php _e('썸네일 삭제', 'dw-church'); ?></button>
                <div id="dw_column_thumb_preview" style="margin-top: 10px;">
                    <?php if ($thumb_id): ?>
                        <img src="<?php echo esc_url(wp_get_attachment_url($thumb_id)); ?>" style="width: 160px; height: 90px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px;" />
                    <?php endif; ?>
                </div>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;"><?php _e('미리보기만 표시됩니다. 저장 시 썸네일이 대표 이미지로 등록됩니다.', 'dw-church'); ?></p>
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
                    <label for="album_images"><?php _e('앨범 이미지', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_album_images" name="dw_album_images" value='<?php echo esc_attr(json_encode($images)); ?>' autocomplete="off" data-lpignore="true" />
                    <button type="button" class="button" id="dw_album_images_button"><?php _e('이미지 업로드/선택', 'dw-church'); ?></button>
                    <p class="description" style="margin-top:8px; color:#666;">
                        <?php _e('💡 권장사항: 이미지 개수는 10-15개 정도로 제한하는 것을 권장합니다. 이미지가 많을 경우 갤러리 로딩 시 속도 문제가 발생할 수 있습니다.', 'dw-church'); ?>
                    </p>
                    
                    <!-- Image count display moved ABOVE the thumbnail list -->
                    <p class="description" id="dw_album_images_count" style="margin-top:10px;">
                        <?php 
                        $current_count = count($images);
                        $message = sprintf(__('현재 %d개 이미지', 'dw-church'), $current_count);
                        echo esc_html($message);
                        ?>
                    </p>
                    <?php if (empty($images)): ?>
                        <p class="description" id="dw_album_images_empty"><?php _e('이미지가 없습니다. 위의 버튼을 클릭하여 이미지를 업로드하세요.', 'dw-church'); ?></p>
                    <?php endif; ?>
                    
                    <!-- Thumbnail list -->
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
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_album_youtube"><?php _e('YouTube URL', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_album_youtube" name="dw_album_youtube" value="<?php echo esc_url($youtube); ?>" class="regular-text" />
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="album_thumb_id"><?php _e('YouTube 썸네일', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_album_thumb_id" name="dw_album_thumb_id" value="<?php echo esc_attr($thumb_id); ?>" />
                    <button type="button" class="button" id="dw_album_thumb_button"><?php _e('썸네일 업로드/선택', 'dw-church'); ?></button>
                    <button type="button" class="button" id="dw_album_thumb_fetch"><?php _e('YouTube 썸네일 불러오기', 'dw-church'); ?></button>
                    <button type="button" class="button button-link-delete" id="dw_album_thumb_remove" style="color:#b32d2e;"><?php _e('썸네일 삭제', 'dw-church'); ?></button>
                    <div id="dw_album_thumb_preview" style="margin-top:10px;">
                        <?php if ($thumb_id): ?>
                            <img src="<?php echo esc_url(wp_get_attachment_url($thumb_id)); ?>" style="width:160px;height:90px;object-fit:cover;" />
                        <?php endif; ?>
                    </div>
                    <p class="description"><?php _e('미리보기만 표시됩니다. 저장 시 썸네일이 대표 이미지로 등록됩니다.', 'dw-church'); ?></p>
                </td>
            </tr>
        </table>
        <?php
    }
    
    /**
     * 배너 메타박스
     */
    public function dasom_church_banner_meta_box($post) {
        error_log('DW Church Banner Meta Box - Function called for post ID: ' . $post->ID);
        
        wp_nonce_field('dasom_church_banner_meta', 'dasom_church_banner_nonce');
        
        // Debug: Log post ID and meta data
        error_log('DW Church Banner Meta Box - Post ID: ' . $post->ID);
        error_log('DW Church Banner Meta Box - Post type: ' . $post->post_type);
        error_log('DW Church Banner Meta Box - Post status: ' . $post->post_status);
        
        // Get current banner category (for reference only, all fields always visible)
        $terms = wp_get_post_terms($post->ID, 'banner_category');
        $current_category = !empty($terms) && !is_wp_error($terms) ? $terms[0]->name : '';
        
        $pc_image = get_post_meta($post->ID, 'dw_banner_pc_image', true);
        $mobile_image = get_post_meta($post->ID, 'dw_banner_mobile_image', true);
        $link_url = get_post_meta($post->ID, 'dw_banner_link_url', true);
        $link_target = get_post_meta($post->ID, 'dw_banner_link_target', true);
        $link_target = $link_target ? $link_target : '_self';
        $start_date = get_post_meta($post->ID, 'dw_banner_start_date', true);
        $end_date = get_post_meta($post->ID, 'dw_banner_end_date', true);
        
        // Debug: Log loaded meta data
        error_log('DW Church Banner Meta - PC Image: ' . $pc_image);
        error_log('DW Church Banner Meta - Mobile Image: ' . $mobile_image);
        error_log('DW Church Banner Meta - Link URL: ' . $link_url);
        error_log('DW Church Banner Meta - Start Date: ' . $start_date);
        error_log('DW Church Banner Meta - End Date: ' . $end_date);
        
        // Get text overlay fields (optional)
        $text_title = get_post_meta($post->ID, 'dw_banner_text_title', true);
        $text_subtitle = get_post_meta($post->ID, 'dw_banner_text_subtitle', true);
        $text_description = get_post_meta($post->ID, 'dw_banner_text_description', true);
        $text_position = get_post_meta($post->ID, 'dw_banner_text_position', true);
        $text_position = $text_position ? $text_position : 'center-center';
        $text_align = get_post_meta($post->ID, 'dw_banner_text_align', true);
        $text_align = $text_align ? $text_align : 'center';
        $text_width_pc = get_post_meta($post->ID, 'dw_banner_text_width_pc', true);
        $text_width_pc = $text_width_pc ? $text_width_pc : '600';
        $text_width_laptop = get_post_meta($post->ID, 'dw_banner_text_width_laptop', true);
        $text_width_laptop = $text_width_laptop ? $text_width_laptop : '600';
        $text_width_tablet = get_post_meta($post->ID, 'dw_banner_text_width_tablet', true);
        $text_width_tablet = $text_width_tablet ? $text_width_tablet : '500';
        $text_width_mobile = get_post_meta($post->ID, 'dw_banner_text_width_mobile', true);
        $text_width_mobile = $text_width_mobile ? $text_width_mobile : '300';
        $bg_position_pc = get_post_meta($post->ID, 'dw_banner_bg_position_pc', true);
        $bg_position_pc = $bg_position_pc ? $bg_position_pc : 'center center';
        $bg_position_laptop = get_post_meta($post->ID, 'dw_banner_bg_position_laptop', true);
        $bg_position_laptop = $bg_position_laptop ? $bg_position_laptop : 'center center';
        $bg_position_tablet = get_post_meta($post->ID, 'dw_banner_bg_position_tablet', true);
        $bg_position_tablet = $bg_position_tablet ? $bg_position_tablet : 'center center';
        $bg_position_mobile = get_post_meta($post->ID, 'dw_banner_bg_position_mobile', true);
        $bg_position_mobile = $bg_position_mobile ? $bg_position_mobile : 'center center';
        $content_padding_top = get_post_meta($post->ID, 'dw_banner_content_padding_top', true);
        $content_padding_top = $content_padding_top ? $content_padding_top : '40';
        $content_padding_right = get_post_meta($post->ID, 'dw_banner_content_padding_right', true);
        $content_padding_right = $content_padding_right ? $content_padding_right : '40';
        $content_padding_bottom = get_post_meta($post->ID, 'dw_banner_content_padding_bottom', true);
        $content_padding_bottom = $content_padding_bottom ? $content_padding_bottom : '40';
        $content_padding_left = get_post_meta($post->ID, 'dw_banner_content_padding_left', true);
        $content_padding_left = $content_padding_left ? $content_padding_left : '40';
        ?>
        <div style="background:#f9f9f9;padding:15px;margin-bottom:20px;border:1px solid #ddd;border-radius:4px;">
            <p style="margin:0;font-size:13px;color:#666;">
                <strong><?php _e('배너 이미지:', 'dw-church'); ?></strong><br>
                • <strong><?php _e('메인 배너', 'dw-church'); ?>:</strong> <?php _e('PC (1920px) + 모바일 (720px) 이미지를 사용합니다', 'dw-church'); ?><br>
                <strong><?php _e('텍스트 오버레이:', 'dw-church'); ?></strong> <?php _e('제목, 부제목, 설명을 입력하면 배경 이미지 위에 표시됩니다. 입력하지 않으면 이미지만 표시됩니다.', 'dw-church'); ?>
            </p>
        </div>
        
        <table class="form-table">
            <!-- 메인 배너 필드 -->
            <tr class="banner-field banner-main-field" data-banner-type="main">
                <th scope="row">
                    <label for="dw_banner_pc_image"><?php _e('PC용 배너 이미지 (1920px)', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_banner_pc_image" name="dw_banner_pc_image" value="<?php echo esc_attr($pc_image); ?>" />
                    <button type="button" class="button" id="dw_banner_pc_image_button"><?php _e('PC용 이미지 업로드', 'dw-church'); ?></button>
                    <button type="button" class="button button-link-delete" id="dw_banner_pc_image_remove" style="color:#b32d2e;"><?php _e('이미지 삭제', 'dw-church'); ?></button>
                    <div id="dw_banner_pc_image_preview" style="margin-top:10px;">
                        <?php if ($pc_image): ?>
                            <img src="<?php echo esc_url(wp_get_attachment_url($pc_image)); ?>" style="max-width:400px;height:auto;object-fit:cover;border:1px solid #ddd;" />
                        <?php endif; ?>
                    </div>
                    <p class="description"><?php _e('권장 크기: 가로 1920px', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr class="banner-field banner-main-field" data-banner-type="main">
                <th scope="row">
                    <label for="dw_banner_mobile_image"><?php _e('모바일용 배너 이미지 (720px)', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_banner_mobile_image" name="dw_banner_mobile_image" value="<?php echo esc_attr($mobile_image); ?>" />
                    <button type="button" class="button" id="dw_banner_mobile_image_button"><?php _e('모바일용 이미지 업로드', 'dw-church'); ?></button>
                    <button type="button" class="button button-link-delete" id="dw_banner_mobile_image_remove" style="color:#b32d2e;"><?php _e('이미지 삭제', 'dw-church'); ?></button>
                    <div id="dw_banner_mobile_image_preview" style="margin-top:10px;">
                        <?php if ($mobile_image): ?>
                            <img src="<?php echo esc_url(wp_get_attachment_url($mobile_image)); ?>" style="max-width:300px;height:auto;object-fit:cover;border:1px solid #ddd;" />
                        <?php endif; ?>
                    </div>
                    <p class="description"><?php _e('권장 크기: 가로 720px', 'dw-church'); ?></p>
                </td>
            </tr>
            
            <!-- 텍스트 오버레이 필드 (선택사항) -->
            <tr>
                <th scope="row" colspan="2" style="background:#e7f3ff;padding:15px;">
                    <h3 style="margin:0;color:#135e96;">📝 <?php _e('텍스트 오버레이 (선택사항)', 'dw-church'); ?></h3>
                    <p style="margin:5px 0 0 0;font-weight:normal;font-size:13px;color:#666;"><?php _e('아래 필드를 입력하면 배경 이미지 위에 텍스트가 표시됩니다. 비워두면 이미지만 표시됩니다.', 'dw-church'); ?></p>
                </th>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_banner_text_title"><?php _e('제목 (Title)', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_banner_text_title" name="dw_banner_text_title" value="<?php echo esc_attr($text_title); ?>" class="regular-text" />
                    <p class="description"><?php _e('배너에 표시될 메인 제목을 입력하세요.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_banner_text_subtitle"><?php _e('부제목 (Subtitle)', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_banner_text_subtitle" name="dw_banner_text_subtitle" value="<?php echo esc_attr($text_subtitle); ?>" class="regular-text" />
                    <p class="description"><?php _e('배너에 표시될 부제목을 입력하세요.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_banner_text_description"><?php _e('설명 (Description)', 'dw-church'); ?></label>
                </th>
                <td>
                    <textarea id="dw_banner_text_description" name="dw_banner_text_description" class="large-text" rows="3"><?php echo esc_textarea($text_description); ?></textarea>
                    <p class="description"><?php _e('배너에 표시될 짧은 설명을 입력하세요.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_banner_text_position"><?php _e('텍스트 위치', 'dw-church'); ?></label>
                </th>
                <td>
                    <select id="dw_banner_text_position" name="dw_banner_text_position" class="regular-text">
                        <optgroup label="<?php _e('상단', 'dw-church'); ?>">
                            <option value="top-left" <?php selected($text_position, 'top-left'); ?>><?php _e('상단 왼쪽', 'dw-church'); ?></option>
                            <option value="top-center" <?php selected($text_position, 'top-center'); ?>><?php _e('상단 중앙', 'dw-church'); ?></option>
                            <option value="top-right" <?php selected($text_position, 'top-right'); ?>><?php _e('상단 오른쪽', 'dw-church'); ?></option>
                        </optgroup>
                        <optgroup label="<?php _e('중앙', 'dw-church'); ?>">
                            <option value="center-left" <?php selected($text_position, 'center-left'); ?>><?php _e('중앙 왼쪽', 'dw-church'); ?></option>
                            <option value="center-center" <?php selected($text_position, 'center-center'); ?>><?php _e('중앙', 'dw-church'); ?></option>
                            <option value="center-right" <?php selected($text_position, 'center-right'); ?>><?php _e('중앙 오른쪽', 'dw-church'); ?></option>
                        </optgroup>
                        <optgroup label="<?php _e('하단', 'dw-church'); ?>">
                            <option value="bottom-left" <?php selected($text_position, 'bottom-left'); ?>><?php _e('하단 왼쪽', 'dw-church'); ?></option>
                            <option value="bottom-center" <?php selected($text_position, 'bottom-center'); ?>><?php _e('하단 중앙', 'dw-church'); ?></option>
                            <option value="bottom-right" <?php selected($text_position, 'bottom-right'); ?>><?php _e('하단 오른쪽', 'dw-church'); ?></option>
                        </optgroup>
                    </select>
                    <p class="description"><?php _e('텍스트가 표시될 위치를 선택하세요.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_banner_text_align"><?php _e('텍스트 정렬', 'dw-church'); ?></label>
                </th>
                <td>
                    <select id="dw_banner_text_align" name="dw_banner_text_align" class="regular-text">
                        <option value="left" <?php selected($text_align, 'left'); ?>><?php _e('왼쪽 정렬', 'dw-church'); ?></option>
                        <option value="center" <?php selected($text_align, 'center'); ?>><?php _e('중앙 정렬', 'dw-church'); ?></option>
                        <option value="right" <?php selected($text_align, 'right'); ?>><?php _e('오른쪽 정렬', 'dw-church'); ?></option>
                    </select>
                    <p class="description"><?php _e('텍스트 콘텐츠 내부의 정렬 방식을 선택하세요.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label><?php _e('텍스트 컨테이너 폭 (반응형)', 'dw-church'); ?></label>
                </th>
                <td>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;max-width:600px;">
                        <div>
                            <label for="dw_banner_text_width_pc" style="display:block;margin-bottom:5px;font-weight:600;"><?php _e('🖥️ PC', 'dw-church'); ?></label>
                            <input type="number" id="dw_banner_text_width_pc" name="dw_banner_text_width_pc" value="<?php echo esc_attr($text_width_pc); ?>" class="small-text" min="100" max="2000" step="10" /> px
                        </div>
                        <div>
                            <label for="dw_banner_text_width_laptop" style="display:block;margin-bottom:5px;font-weight:600;"><?php _e('💻 Laptop', 'dw-church'); ?></label>
                            <input type="number" id="dw_banner_text_width_laptop" name="dw_banner_text_width_laptop" value="<?php echo esc_attr($text_width_laptop); ?>" class="small-text" min="100" max="2000" step="10" /> px
                        </div>
                        <div>
                            <label for="dw_banner_text_width_tablet" style="display:block;margin-bottom:5px;font-weight:600;"><?php _e('📱 Tablet', 'dw-church'); ?></label>
                            <input type="number" id="dw_banner_text_width_tablet" name="dw_banner_text_width_tablet" value="<?php echo esc_attr($text_width_tablet); ?>" class="small-text" min="100" max="2000" step="10" /> px
                        </div>
                        <div>
                            <label for="dw_banner_text_width_mobile" style="display:block;margin-bottom:5px;font-weight:600;"><?php _e('📱 Mobile', 'dw-church'); ?></label>
                            <input type="number" id="dw_banner_text_width_mobile" name="dw_banner_text_width_mobile" value="<?php echo esc_attr($text_width_mobile); ?>" class="small-text" min="100" max="2000" step="10" /> px
                        </div>
                    </div>
                    <p class="description" style="margin-top:10px;"><?php _e('각 디바이스별로 텍스트 컨테이너의 최대 폭을 설정하세요. 좁게 설정하면 여러 줄로, 넓게 설정하면 한 줄로 표시됩니다. (기본값 - PC: 600px, Laptop: 600px, Tablet: 500px, Mobile: 300px)', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label><?php _e('배경 이미지 위치 (반응형)', 'dw-church'); ?></label>
                </th>
                <td>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;max-width:800px;">
                        <div>
                            <label for="dw_banner_bg_position_pc" style="display:block;margin-bottom:5px;font-weight:600;"><?php _e('🖥️ PC (1920px+)', 'dw-church'); ?></label>
                            <select id="dw_banner_bg_position_pc" name="dw_banner_bg_position_pc" class="regular-text">
                                <option value="center top" <?php selected($bg_position_pc, 'center top'); ?>><?php _e('상단 중앙', 'dw-church'); ?></option>
                                <option value="center center" <?php selected($bg_position_pc, 'center center'); ?>><?php _e('정중앙', 'dw-church'); ?></option>
                                <option value="center bottom" <?php selected($bg_position_pc, 'center bottom'); ?>><?php _e('하단 중앙', 'dw-church'); ?></option>
                                <option value="left center" <?php selected($bg_position_pc, 'left center'); ?>><?php _e('왼쪽 중앙', 'dw-church'); ?></option>
                                <option value="right center" <?php selected($bg_position_pc, 'right center'); ?>><?php _e('오른쪽 중앙', 'dw-church'); ?></option>
                                <option value="left top" <?php selected($bg_position_pc, 'left top'); ?>><?php _e('왼쪽 상단', 'dw-church'); ?></option>
                                <option value="right top" <?php selected($bg_position_pc, 'right top'); ?>><?php _e('오른쪽 상단', 'dw-church'); ?></option>
                                <option value="left bottom" <?php selected($bg_position_pc, 'left bottom'); ?>><?php _e('왼쪽 하단', 'dw-church'); ?></option>
                                <option value="right bottom" <?php selected($bg_position_pc, 'right bottom'); ?>><?php _e('오른쪽 하단', 'dw-church'); ?></option>
                            </select>
                        </div>
                        <div>
                            <label for="dw_banner_bg_position_laptop" style="display:block;margin-bottom:5px;font-weight:600;"><?php _e('💻 Laptop (1024px~1919px)', 'dw-church'); ?></label>
                            <select id="dw_banner_bg_position_laptop" name="dw_banner_bg_position_laptop" class="regular-text">
                                <option value="center top" <?php selected($bg_position_laptop, 'center top'); ?>><?php _e('상단 중앙', 'dw-church'); ?></option>
                                <option value="center center" <?php selected($bg_position_laptop, 'center center'); ?>><?php _e('정중앙', 'dw-church'); ?></option>
                                <option value="center bottom" <?php selected($bg_position_laptop, 'center bottom'); ?>><?php _e('하단 중앙', 'dw-church'); ?></option>
                                <option value="left center" <?php selected($bg_position_laptop, 'left center'); ?>><?php _e('왼쪽 중앙', 'dw-church'); ?></option>
                                <option value="right center" <?php selected($bg_position_laptop, 'right center'); ?>><?php _e('오른쪽 중앙', 'dw-church'); ?></option>
                                <option value="left top" <?php selected($bg_position_laptop, 'left top'); ?>><?php _e('왼쪽 상단', 'dw-church'); ?></option>
                                <option value="right top" <?php selected($bg_position_laptop, 'right top'); ?>><?php _e('오른쪽 상단', 'dw-church'); ?></option>
                                <option value="left bottom" <?php selected($bg_position_laptop, 'left bottom'); ?>><?php _e('왼쪽 하단', 'dw-church'); ?></option>
                                <option value="right bottom" <?php selected($bg_position_laptop, 'right bottom'); ?>><?php _e('오른쪽 하단', 'dw-church'); ?></option>
                            </select>
                        </div>
                        <div>
                            <label for="dw_banner_bg_position_tablet" style="display:block;margin-bottom:5px;font-weight:600;"><?php _e('📱 Tablet (768px~1023px)', 'dw-church'); ?></label>
                            <select id="dw_banner_bg_position_tablet" name="dw_banner_bg_position_tablet" class="regular-text">
                                <option value="center top" <?php selected($bg_position_tablet, 'center top'); ?>><?php _e('상단 중앙', 'dw-church'); ?></option>
                                <option value="center center" <?php selected($bg_position_tablet, 'center center'); ?>><?php _e('정중앙', 'dw-church'); ?></option>
                                <option value="center bottom" <?php selected($bg_position_tablet, 'center bottom'); ?>><?php _e('하단 중앙', 'dw-church'); ?></option>
                                <option value="left center" <?php selected($bg_position_tablet, 'left center'); ?>><?php _e('왼쪽 중앙', 'dw-church'); ?></option>
                                <option value="right center" <?php selected($bg_position_tablet, 'right center'); ?>><?php _e('오른쪽 중앙', 'dw-church'); ?></option>
                                <option value="left top" <?php selected($bg_position_tablet, 'left top'); ?>><?php _e('왼쪽 상단', 'dw-church'); ?></option>
                                <option value="right top" <?php selected($bg_position_tablet, 'right top'); ?>><?php _e('오른쪽 상단', 'dw-church'); ?></option>
                                <option value="left bottom" <?php selected($bg_position_tablet, 'left bottom'); ?>><?php _e('왼쪽 하단', 'dw-church'); ?></option>
                                <option value="right bottom" <?php selected($bg_position_tablet, 'right bottom'); ?>><?php _e('오른쪽 하단', 'dw-church'); ?></option>
                            </select>
                        </div>
                        <div>
                            <label for="dw_banner_bg_position_mobile" style="display:block;margin-bottom:5px;font-weight:600;"><?php _e('📱 Mobile (~767px)', 'dw-church'); ?></label>
                            <select id="dw_banner_bg_position_mobile" name="dw_banner_bg_position_mobile" class="regular-text">
                                <option value="center top" <?php selected($bg_position_mobile, 'center top'); ?>><?php _e('상단 중앙', 'dw-church'); ?></option>
                                <option value="center center" <?php selected($bg_position_mobile, 'center center'); ?>><?php _e('정중앙', 'dw-church'); ?></option>
                                <option value="center bottom" <?php selected($bg_position_mobile, 'center bottom'); ?>><?php _e('하단 중앙', 'dw-church'); ?></option>
                                <option value="left center" <?php selected($bg_position_mobile, 'left center'); ?>><?php _e('왼쪽 중앙', 'dw-church'); ?></option>
                                <option value="right center" <?php selected($bg_position_mobile, 'right center'); ?>><?php _e('오른쪽 중앙', 'dw-church'); ?></option>
                                <option value="left top" <?php selected($bg_position_mobile, 'left top'); ?>><?php _e('왼쪽 상단', 'dw-church'); ?></option>
                                <option value="right top" <?php selected($bg_position_mobile, 'right top'); ?>><?php _e('오른쪽 상단', 'dw-church'); ?></option>
                                <option value="left bottom" <?php selected($bg_position_mobile, 'left bottom'); ?>><?php _e('왼쪽 하단', 'dw-church'); ?></option>
                                <option value="right bottom" <?php selected($bg_position_mobile, 'right bottom'); ?>><?php _e('오른쪽 하단', 'dw-church'); ?></option>
                            </select>
                        </div>
                    </div>
                    <p class="description" style="margin-top:10px;"><?php _e('각 디바이스별로 배경 이미지의 표시 위치를 개별 설정할 수 있습니다. 모바일에서는 인물의 얼굴이 잘리지 않도록 상단 중앙을, PC에서는 정중앙을 선택하는 등 디바이스별 최적화가 가능합니다.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label><?php _e('콘텐츠 여백 (Padding)', 'dw-church'); ?></label>
                </th>
                <td>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:400px;">
                        <div>
                            <label for="dw_banner_content_padding_top" style="display:block;margin-bottom:5px;"><?php _e('위쪽 (px)', 'dw-church'); ?></label>
                            <input type="number" id="dw_banner_content_padding_top" name="dw_banner_content_padding_top" value="<?php echo esc_attr($content_padding_top); ?>" class="small-text" min="0" step="5" />
                        </div>
                        <div>
                            <label for="dw_banner_content_padding_right" style="display:block;margin-bottom:5px;"><?php _e('오른쪽 (px)', 'dw-church'); ?></label>
                            <input type="number" id="dw_banner_content_padding_right" name="dw_banner_content_padding_right" value="<?php echo esc_attr($content_padding_right); ?>" class="small-text" min="0" step="5" />
                        </div>
                        <div>
                            <label for="dw_banner_content_padding_bottom" style="display:block;margin-bottom:5px;"><?php _e('아래쪽 (px)', 'dw-church'); ?></label>
                            <input type="number" id="dw_banner_content_padding_bottom" name="dw_banner_content_padding_bottom" value="<?php echo esc_attr($content_padding_bottom); ?>" class="small-text" min="0" step="5" />
                        </div>
                        <div>
                            <label for="dw_banner_content_padding_left" style="display:block;margin-bottom:5px;"><?php _e('왼쪽 (px)', 'dw-church'); ?></label>
                            <input type="number" id="dw_banner_content_padding_left" name="dw_banner_content_padding_left" value="<?php echo esc_attr($content_padding_left); ?>" class="small-text" min="0" step="5" />
                        </div>
                    </div>
                    <p class="description" style="margin-top:10px;"><?php _e('텍스트 콘텐츠의 여백을 픽셀 단위로 설정하세요. 기본값: 40px', 'dw-church'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_banner_link_url"><?php _e('링크 URL', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_banner_link_url" name="dw_banner_link_url" value="<?php echo esc_url($link_url); ?>" class="regular-text" placeholder="https://" style="width:70%;" />
                    <label style="margin-left:15px;">
                        <input type="checkbox" id="dw_banner_link_target" name="dw_banner_link_target" value="_blank" <?php checked($link_target, '_blank'); ?> />
                        <?php _e('새창으로 열기', 'dw-church'); ?>
                    </label>
                    <p class="description"><?php _e('배너 전체 영역 클릭 시 이동할 URL을 입력하세요.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_banner_start_date"><?php _e('배너 시작 날짜', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="datetime-local" id="dw_banner_start_date" name="dw_banner_start_date" value="<?php echo esc_attr($start_date); ?>" class="regular-text" />
                    <button type="button" class="button" id="dw_banner_start_date_reset" style="margin-left:5px;"><?php _e('Reset', 'dw-church'); ?></button>
                    <p class="description"><?php _e('이 날짜부터 배너가 표시됩니다. 비워두면 즉시 표시됩니다.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_banner_end_date"><?php _e('배너 종료 날짜', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="datetime-local" id="dw_banner_end_date" name="dw_banner_end_date" value="<?php echo esc_attr($end_date); ?>" class="regular-text" />
                    <button type="button" class="button" id="dw_banner_end_date_reset" style="margin-left:5px;"><?php _e('Reset', 'dw-church'); ?></button>
                    <p class="description"><?php _e('이 날짜 이후 배너가 자동으로 비공개(Draft)로 전환됩니다. 비워두면 무기한 표시됩니다.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="menu_order"><?php _e('표시 순서', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="number" id="menu_order" name="menu_order" value="<?php echo esc_attr($post->menu_order); ?>" class="small-text" min="0" step="1" />
                    <p class="description"><?php _e('숫자가 작을수록 먼저 표시됩니다. DW Banner Slider 위젯에서 "Order By"를 "Menu Order"로 설정하면 이 순서대로 표시됩니다.', 'dw-church'); ?></p>
                </td>
            </tr>
        </table>
        <?php
    }
    
    /**
     * 이벤트 메타박스
     */
    public function dasom_church_event_meta_box($post) {
        wp_nonce_field('dasom_church_event_meta', 'dasom_church_event_nonce');
        
        $bg_image = get_post_meta($post->ID, 'dw_event_bg_image', true);
        $event_department = get_post_meta($post->ID, 'dw_event_department', true);
        $event_datetime = get_post_meta($post->ID, 'dw_event_datetime', true);
        $event_url = get_post_meta($post->ID, 'dw_event_url', true);
        $event_url_target = get_post_meta($post->ID, 'dw_event_url_target', true);
        $event_description = get_post_meta($post->ID, 'dw_event_description', true);
        $youtube_url = get_post_meta($post->ID, 'dw_event_youtube_url', true);
        $thumb_id = get_post_meta($post->ID, 'dw_event_thumb_id', true);
        $image_only = get_post_meta($post->ID, 'dw_event_image_only', true);
        ?>
        <div style="background:#f9f9f9;padding:15px;margin-bottom:20px;border:1px solid #ddd;border-radius:4px;">
            <p style="margin:0;font-size:13px;color:#666;">
                <strong><?php _e('이벤트 정보:', 'dw-church'); ?></strong><br>
                • <?php _e('배경 이미지 위에 이벤트 제목, 날짜/시간, Read More 버튼이 표시됩니다.', 'dw-church'); ?><br>
                • <?php _e('YouTube 링크를 입력하면 썸네일을 자동으로 가져올 수 있습니다.', 'dw-church'); ?>
            </p>
        </div>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_event_bg_image"><?php _e('배경 이미지', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_event_bg_image" name="dw_event_bg_image" value="<?php echo esc_attr($bg_image); ?>" />
                    <button type="button" class="button" id="dw_event_bg_image_button"><?php _e('이미지 업로드', 'dw-church'); ?></button>
                    <button type="button" class="button button-link-delete" id="dw_event_bg_image_remove" style="color:#b32d2e;"><?php _e('이미지 삭제', 'dw-church'); ?></button>
                    <div id="dw_event_bg_image_preview" style="margin-top:10px;">
                        <?php if ($bg_image): ?>
                            <img src="<?php echo esc_url(wp_get_attachment_url($bg_image)); ?>" style="max-width:400px;height:auto;object-fit:cover;border:1px solid #ddd;" />
                        <?php endif; ?>
                    </div>
                    <p class="description" style="margin-top:10px;">
                        <label>
                            <input type="checkbox" id="dw_event_image_only" name="dw_event_image_only" value="1" <?php checked($image_only, '1'); ?> />
                            <?php _e('이미지만 사용', 'dw-church'); ?>
                        </label>
                        <br>
                        <small style="color:#666;"><?php _e('체크하면 DW Event Grid에서 텍스트 오버레이(제목, 날짜 등)가 표시되지 않습니다.', 'dw-church'); ?><br>
                        <?php _e('이미지만 사용할 경우 이미지는 1080x1350을 권장합니다.', 'dw-church'); ?></small>
                    </p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_event_department"><?php _e('부서', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_event_department" name="dw_event_department" value="<?php echo esc_attr($event_department); ?>" class="regular-text" placeholder="예: 청년부, 유년부" />
                    <p class="description"><?php _e('이벤트를 주관하는 부서를 입력하세요.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_event_datetime"><?php _e('이벤트 날짜 및 시간', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_event_datetime" name="dw_event_datetime" value="<?php echo esc_attr($event_datetime); ?>" class="regular-text" placeholder="예: 2025년 12월 25일 오후 3시" />
                    <p class="description"><?php _e('이벤트가 열리는 날짜와 시간을 입력하세요. (자유 텍스트)', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_event_url"><?php _e('이벤트 URL', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_event_url" name="dw_event_url" value="<?php echo esc_url($event_url); ?>" class="regular-text" placeholder="https://example.com" style="width:70%;" />
                    <label style="margin-left:15px;">
                        <input type="checkbox" id="dw_event_url_target" name="dw_event_url_target" value="_blank" <?php checked($event_url_target, '_blank'); ?> />
                        <?php _e('새창으로 열기', 'dw-church'); ?>
                    </label>
                    <p class="description"><?php _e('이벤트 상세 페이지 또는 외부 링크 URL을 입력하세요.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_event_description"><?php _e('행사 설명', 'dw-church'); ?></label>
                </th>
                <td>
                    <textarea id="dw_event_description" name="dw_event_description" class="large-text" rows="4"><?php echo esc_textarea($event_description); ?></textarea>
                    <p class="description"><?php _e('이벤트에 대한 설명을 입력하세요.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_event_youtube_url"><?php _e('YouTube URL', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_event_youtube_url" name="dw_event_youtube_url" value="<?php echo esc_url($youtube_url); ?>" class="regular-text" placeholder="https://www.youtube.com/watch?v=..." />
                    <p class="description"><?php _e('YouTube 비디오 링크를 입력하세요.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_event_thumb_id"><?php _e('YouTube 썸네일', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_event_thumb_id" name="dw_event_thumb_id" value="<?php echo esc_attr($thumb_id); ?>" />
                    <button type="button" class="button" id="dw_event_thumb_button"><?php _e('썸네일 업로드/선택', 'dw-church'); ?></button>
                    <button type="button" class="button" id="dw_event_thumb_fetch"><?php _e('YouTube 썸네일 불러오기', 'dw-church'); ?></button>
                    <button type="button" class="button button-link-delete" id="dw_event_thumb_remove" style="color:#b32d2e;"><?php _e('썸네일 삭제', 'dw-church'); ?></button>
                    <div id="dw_event_thumb_preview" style="margin-top:10px;">
                        <?php if ($thumb_id): ?>
                            <img src="<?php echo esc_url(wp_get_attachment_url($thumb_id)); ?>" style="width:160px;height:90px;object-fit:cover;" />
                        <?php endif; ?>
                    </div>
                    <p class="description"><?php _e('미리보기만 표시됩니다. 저장 시 썸네일이 대표 이미지로 등록됩니다.', 'dw-church'); ?></p>
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
            case 'banner':
                $this->dasom_church_save_banner_meta($post_id);
                break;
            case 'event':
                $this->dasom_church_save_event_meta($post_id);
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
            
            // Auto-set first image as featured image
            $images = json_decode(sanitize_text_field($_POST['dw_bulletin_images']), true);
            if (is_array($images) && !empty($images)) {
                $first_image_id = intval($images[0]);
                if ($first_image_id > 0) {
                    set_post_thumbnail($post_id, $first_image_id);
                    error_log("Bulletin featured image set: Post ID={$post_id}, Image ID={$first_image_id}");
                }
            }
        }
        
        // Auto-generate title
        $date = get_post_meta($post_id, 'dw_bulletin_date', true);
        if ($date) {
            $new_title = date_i18n('Y년 n월 j일', strtotime($date)) . ' ' . __('교회주보', 'dw-church');
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
                $def = get_option('default_sermon_preacher', __('담임목사', 'dw-church'));
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
            $images_json = wp_unslash($_POST['dw_album_images']);
            
            // Handle empty string case
            if (trim($images_json) === '') {
                $images = array();
            } else {
                $images = json_decode($images_json, true);
                
                // If JSON decode failed, log error and try to continue with empty array
                if (json_last_error() !== JSON_ERROR_NONE) {
                    error_log('DW Church Album: JSON decode error - ' . json_last_error_msg() . ' for value: ' . substr($images_json, 0, 100));
                    $images = array();
                }
            }
            
            // Ensure $images is always an array
            if (!is_array($images)) {
                $images = array();
            }
            
            // Check if exceeds 15 images limit
            if (count($images) > 15) {
                // Store error message in transient for display
                set_transient('dw_church_album_image_error_' . $post_id, sprintf(
                    __('앨범 이미지 저장 실패: %d개의 이미지가 선택되어 있습니다. 최대 15개까지만 저장할 수 있습니다. 이미지를 제거하여 15개 이하로 줄여주세요.', 'dw-church'),
                    count($images)
                ), 30);
                
                // Prevent save - don't update post meta
                // The post itself may be saved, but images won't be saved
                return;
            }
            
            // Ensure all values are integers
            $images = array_map('absint', $images);
            $images = array_filter($images); // Remove any zero values
            $images = array_values($images); // Reindex array
            
            // Always save, even if empty array (to clear previous images)
            update_post_meta($post_id, 'dw_album_images', wp_json_encode($images));
            
            // Auto-set first image as featured image (only if no manual YouTube thumbnail is set)
            $manual_youtube_thumb_id = get_post_meta($post_id, 'dw_album_thumb_id', true);
            if (!$manual_youtube_thumb_id && !empty($images)) {
                $first_image_id = intval($images[0]);
                if ($first_image_id > 0) {
                    set_post_thumbnail($post_id, $first_image_id);
                    // album_thumb_id는 YouTube 썸네일용이므로 건드리지 않음
                }
            }
        }
        
        // 교회앨범에서는 YouTube 썸네일이 Featured Image를 대체하지 않음
        // YouTube 썸네일은 별도 필드로만 관리됨
    }
    
    /**
     * Save banner meta
     */
    private function dasom_church_save_banner_meta($post_id) {
        if (!isset($_POST['dasom_church_banner_nonce']) || 
            !wp_verify_nonce($_POST['dasom_church_banner_nonce'], 'dasom_church_banner_meta')) {
            error_log('DW Church Banner Save - Nonce verification failed');
            return;
        }
        
        error_log('DW Church Banner Save - Post ID: ' . $post_id);
        error_log('DW Church Banner Save - POST data: ' . print_r($_POST, true));
        
        // Save all banner image fields (no category restriction)
        // Main banner fields
        if (isset($_POST['dw_banner_pc_image'])) {
            $pc_image_id = intval($_POST['dw_banner_pc_image']);
            update_post_meta($post_id, 'dw_banner_pc_image', $pc_image_id);
        }
        
        if (isset($_POST['dw_banner_mobile_image'])) {
            update_post_meta($post_id, 'dw_banner_mobile_image', intval($_POST['dw_banner_mobile_image']));
        }
        
        // Set featured image based on which image is uploaded
        // Priority: PC image > Mobile image
        $pc_image_id = isset($_POST['dw_banner_pc_image']) ? intval($_POST['dw_banner_pc_image']) : 0;
        $mobile_image_id = isset($_POST['dw_banner_mobile_image']) ? intval($_POST['dw_banner_mobile_image']) : 0;
        
        if ($pc_image_id > 0) {
            set_post_thumbnail($post_id, $pc_image_id);
        } elseif ($mobile_image_id > 0) {
            set_post_thumbnail($post_id, $mobile_image_id);
        }
        
        // Save text overlay fields (all optional)
        if (isset($_POST['dw_banner_text_title'])) {
            update_post_meta($post_id, 'dw_banner_text_title', sanitize_text_field($_POST['dw_banner_text_title']));
        }
        if (isset($_POST['dw_banner_text_subtitle'])) {
            update_post_meta($post_id, 'dw_banner_text_subtitle', sanitize_text_field($_POST['dw_banner_text_subtitle']));
        }
        if (isset($_POST['dw_banner_text_description'])) {
            update_post_meta($post_id, 'dw_banner_text_description', sanitize_textarea_field($_POST['dw_banner_text_description']));
        }
        if (isset($_POST['dw_banner_text_position'])) {
            $position = sanitize_text_field($_POST['dw_banner_text_position']);
            $valid_positions = array('top-left', 'top-center', 'top-right', 'center-left', 'center-center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right');
            if (in_array($position, $valid_positions)) {
                update_post_meta($post_id, 'dw_banner_text_position', $position);
            }
        }
        if (isset($_POST['dw_banner_text_align'])) {
            $align = sanitize_text_field($_POST['dw_banner_text_align']);
            if (in_array($align, array('left', 'center', 'right'))) {
                update_post_meta($post_id, 'dw_banner_text_align', $align);
            }
        }
        // Save responsive text width
        if (isset($_POST['dw_banner_text_width_pc'])) {
            $width = absint($_POST['dw_banner_text_width_pc']);
            if ($width >= 100 && $width <= 2000) {
                update_post_meta($post_id, 'dw_banner_text_width_pc', $width);
            }
        }
        if (isset($_POST['dw_banner_text_width_laptop'])) {
            $width = absint($_POST['dw_banner_text_width_laptop']);
            if ($width >= 100 && $width <= 2000) {
                update_post_meta($post_id, 'dw_banner_text_width_laptop', $width);
            }
        }
        if (isset($_POST['dw_banner_text_width_tablet'])) {
            $width = absint($_POST['dw_banner_text_width_tablet']);
            if ($width >= 100 && $width <= 2000) {
                update_post_meta($post_id, 'dw_banner_text_width_tablet', $width);
            }
        }
        if (isset($_POST['dw_banner_text_width_mobile'])) {
            $width = absint($_POST['dw_banner_text_width_mobile']);
            if ($width >= 100 && $width <= 2000) {
                update_post_meta($post_id, 'dw_banner_text_width_mobile', $width);
            }
        }
        
        $valid_positions = array(
            'center top', 'center center', 'center bottom',
            'left center', 'right center',
            'left top', 'right top', 'left bottom', 'right bottom'
        );
        
        if (isset($_POST['dw_banner_bg_position_pc'])) {
            $position = sanitize_text_field($_POST['dw_banner_bg_position_pc']);
            if (in_array($position, $valid_positions)) {
                update_post_meta($post_id, 'dw_banner_bg_position_pc', $position);
            }
        }
        if (isset($_POST['dw_banner_bg_position_laptop'])) {
            $position = sanitize_text_field($_POST['dw_banner_bg_position_laptop']);
            if (in_array($position, $valid_positions)) {
                update_post_meta($post_id, 'dw_banner_bg_position_laptop', $position);
            }
        }
        if (isset($_POST['dw_banner_bg_position_tablet'])) {
            $position = sanitize_text_field($_POST['dw_banner_bg_position_tablet']);
            if (in_array($position, $valid_positions)) {
                update_post_meta($post_id, 'dw_banner_bg_position_tablet', $position);
            }
        }
        if (isset($_POST['dw_banner_bg_position_mobile'])) {
            $position = sanitize_text_field($_POST['dw_banner_bg_position_mobile']);
            if (in_array($position, $valid_positions)) {
                update_post_meta($post_id, 'dw_banner_bg_position_mobile', $position);
            }
        }
        if (isset($_POST['dw_banner_content_padding_top'])) {
            update_post_meta($post_id, 'dw_banner_content_padding_top', absint($_POST['dw_banner_content_padding_top']));
        }
        if (isset($_POST['dw_banner_content_padding_right'])) {
            update_post_meta($post_id, 'dw_banner_content_padding_right', absint($_POST['dw_banner_content_padding_right']));
        }
        if (isset($_POST['dw_banner_content_padding_bottom'])) {
            update_post_meta($post_id, 'dw_banner_content_padding_bottom', absint($_POST['dw_banner_content_padding_bottom']));
        }
        if (isset($_POST['dw_banner_content_padding_left'])) {
            update_post_meta($post_id, 'dw_banner_content_padding_left', absint($_POST['dw_banner_content_padding_left']));
        }
        
        // Save common fields (link, dates)
        if (isset($_POST['dw_banner_link_url'])) {
            update_post_meta($post_id, 'dw_banner_link_url', esc_url_raw($_POST['dw_banner_link_url']));
        }
        
        if (isset($_POST['dw_banner_link_target'])) {
            update_post_meta($post_id, 'dw_banner_link_target', '_blank');
        } else {
            update_post_meta($post_id, 'dw_banner_link_target', '_self');
        }
        
        if (isset($_POST['dw_banner_start_date'])) {
            $start_date = sanitize_text_field($_POST['dw_banner_start_date']);
            update_post_meta($post_id, 'dw_banner_start_date', $start_date);
            
            if (!empty($start_date) && strtotime($start_date) > current_time('timestamp')) {
                remove_action('save_post', array($this, 'dasom_church_save_meta_boxes'));
                wp_update_post(array(
                    'ID' => $post_id,
                    'post_status' => 'future',
                    'post_date' => date('Y-m-d H:i:s', strtotime($start_date)),
                    'post_date_gmt' => get_gmt_from_date(date('Y-m-d H:i:s', strtotime($start_date)))
                ));
                add_action('save_post', array($this, 'dasom_church_save_meta_boxes'));
            }
        }
        
        if (isset($_POST['dw_banner_end_date'])) {
            $end_date = sanitize_text_field($_POST['dw_banner_end_date']);
            update_post_meta($post_id, 'dw_banner_end_date', $end_date);
        }
        
        // Save menu_order (display order)
        if (isset($_POST['menu_order'])) {
            $menu_order = intval($_POST['menu_order']);
            remove_action('save_post', array($this, 'dasom_church_save_meta_boxes'));
            wp_update_post(array(
                'ID' => $post_id,
                'menu_order' => $menu_order
            ));
            add_action('save_post', array($this, 'dasom_church_save_meta_boxes'));
        }
    }
    
    /**
     * Save event meta
     */
    private function dasom_church_save_event_meta($post_id) {
        if (!isset($_POST['dasom_church_event_nonce']) || 
            !wp_verify_nonce($_POST['dasom_church_event_nonce'], 'dasom_church_event_meta')) {
            return;
        }
        
        // Save background image
        if (isset($_POST['dw_event_bg_image'])) {
            $bg_image_id = intval($_POST['dw_event_bg_image']);
            update_post_meta($post_id, 'dw_event_bg_image', $bg_image_id);
            
            // Set as featured image
            if ($bg_image_id > 0) {
                set_post_thumbnail($post_id, $bg_image_id);
            }
        }
        
        // Save event department
        if (isset($_POST['dw_event_department'])) {
            update_post_meta($post_id, 'dw_event_department', sanitize_text_field($_POST['dw_event_department']));
        }
        
        // Save event datetime (free text)
        if (isset($_POST['dw_event_datetime'])) {
            update_post_meta($post_id, 'dw_event_datetime', sanitize_text_field($_POST['dw_event_datetime']));
        }
        
        // Save event URL
        if (isset($_POST['dw_event_url'])) {
            update_post_meta($post_id, 'dw_event_url', esc_url_raw($_POST['dw_event_url']));
        }
        
        // Save event URL target
        if (isset($_POST['dw_event_url_target'])) {
            update_post_meta($post_id, 'dw_event_url_target', '_blank');
        } else {
            update_post_meta($post_id, 'dw_event_url_target', '_self');
        }
        
        // Save event description
        if (isset($_POST['dw_event_description'])) {
            update_post_meta($post_id, 'dw_event_description', sanitize_textarea_field($_POST['dw_event_description']));
        }
        
        // Save YouTube URL
        if (isset($_POST['dw_event_youtube_url'])) {
            update_post_meta($post_id, 'dw_event_youtube_url', esc_url_raw($_POST['dw_event_youtube_url']));
        }
        
        // Save YouTube thumbnail ID
        if (isset($_POST['dw_event_thumb_id'])) {
            update_post_meta($post_id, 'dw_event_thumb_id', intval($_POST['dw_event_thumb_id']));
        }
        
        // Save image only option
        if (isset($_POST['dw_event_image_only'])) {
            update_post_meta($post_id, 'dw_event_image_only', '1');
        } else {
            update_post_meta($post_id, 'dw_event_image_only', '0');
        }
        
        // Set featured image - prioritize manual thumb_id
        $thumb_id = get_post_meta($post_id, 'dw_event_thumb_id', true);
        if ($thumb_id) {
            set_post_thumbnail($post_id, $thumb_id);
        }
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
        
        if (!isset($post->post_type) || !in_array($post->post_type, array('bulletin', 'sermon', 'column', 'album', 'banner', 'event'))) {
            return;
        }
        
        wp_enqueue_media();
        wp_enqueue_script('jquery-ui-sortable');
        
        // Enqueue admin.js file
        wp_enqueue_script(
            'dasom-church-admin',
            DASOM_CHURCH_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery', 'jquery-ui-sortable'),
            DASOM_CHURCH_VERSION,
            true
        );
        
        // Localize script for translations
        wp_localize_script('dasom-church-admin', 'dasomChurchAdmin', array(
            'strings' => array(
                'uploadPdf' => __('주보 PDF 업로드', 'dw-church'),
                'select' => __('선택', 'dw-church'),
                'add' => __('추가', 'dw-church'),
                'uploadImages' => __('이미지 업로드', 'dw-church'),
                'uploadThumbnail' => __('썸네일 업로드', 'dw-church'),
                'uploadAlbumImages' => __('앨범 이미지 업로드', 'dw-church'),
                'enterYoutubeUrl' => __('먼저 YouTube URL을 입력하세요.', 'dw-church'),
                'invalidUrl' => __('유효하지 않은 YouTube URL입니다.', 'dw-church'),
                'validationError' => __('오류를 수정한 후 다시 시도하세요.', 'dw-church'),
                'viewPdf' => __('선택된 PDF 보기', 'dw-church'),
            )
        ));
    }
    
    /**
     * Admin footer scripts
     */
    public function dasom_church_admin_footer_scripts() {
        global $post;
        
        // Only load on post edit screens
        // Check if get_current_screen() is available (only available after admin_init)
        if (!function_exists('get_current_screen')) {
            return;
        }
        
        $screen = get_current_screen();
        if (!$screen || !in_array($screen->id, array('bulletin', 'sermon', 'column', 'album', 'banner', 'event'))) {
            return;
        }
        
        if (!isset($post->post_type) || !in_array($post->post_type, array('bulletin', 'sermon', 'column', 'album', 'banner', 'event'))) {
            return;
        }
        
        echo '<script type="text/javascript">';
        echo $this->dasom_church_get_admin_script();
        echo '</script>';
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
                    var filename = attachment.filename || attachment.title || 'PDF 파일';
                    $('#bulletin_pdf_preview').html(
                        '<div style=\"padding:8px;background:#f0f0f1;border-radius:4px;\">' +
                        '<a href=\"' + attachment.url + '\" target=\"_blank\" style=\"color:#2271b1;font-weight:500;text-decoration:none;\">' + filename + '</a>' +
                        '</div>'
                    );
                });
                frame.open();
            });
            
            // 이미지 멀티 업로더 (bulletin만, album은 admin.js에서 처리)
            // IMPORTANT: Album images button is handled in admin.js to avoid duplicate handlers
            $('#dw_bulletin_images_button').on('click', function(e) {
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
                    $('#dw_bulletin_images_preview li').each(function() {
                        ids.push($(this).data('id'));
                    });
                    selection.each(function(attachment) {
                        var att = attachment.toJSON();
                        if (ids.indexOf(att.id) === -1) {
                            ids.push(att.id);
                            $('#dw_bulletin_images_preview').append(
                                '<li data-id=\"' + att.id + '\" style=\"position:relative;\">' +
                                '<img src=\"' + att.url + '\" style=\"width:100px;height:100px;object-fit:cover;\" />' +
                                '<button type=\"button\" class=\"button-link remove-image\" style=\"position:absolute;top:-8px;right:-8px;background:#dc3545;color:white;border:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.2);transition:all 0.2s ease;\">×</button>' +
                                '</li>'
                            );
                        }
                    });
                    $('#dw_bulletin_images').val(JSON.stringify(ids));
                });
                frame.open();
            });
            
            // 이미지 제거 (bulletin만, album은 admin.js에서 처리)
            $(document).on('click', '#dw_bulletin_images_preview .remove-image', function() {
                $(this).parent().remove();
                var ids = [];
                $('#dw_bulletin_images_preview li').each(function() {
                    ids.push($(this).data('id'));
                });
                $('#dw_bulletin_images').val(JSON.stringify(ids));
            });
            
            // 주보 이미지 정렬 (성능 최적화)
            $('#dw_bulletin_images_preview').sortable({
                items: 'li',
                cursor: 'move',
                opacity: 0.8,
                placeholder: 'sortable-placeholder',
                tolerance: 'pointer',
                distance: 5,
                delay: 100,
                forceHelperSize: true,
                forcePlaceholderSize: true,
                update: function() {
                    var ids = [];
                    $(this).find('li').each(function() {
                        ids.push($(this).data('id'));
                    });
                    $('#dw_bulletin_images').val(JSON.stringify(ids));
                }
            });
            
            // 앨범 이미지 정렬 (성능 최적화)
            $('#dw_album_images_preview').sortable({
                items: 'li',
                cursor: 'move',
                opacity: 0.8,
                placeholder: 'sortable-placeholder',
                tolerance: 'pointer',
                distance: 5,
                delay: 100,
                forceHelperSize: true,
                forcePlaceholderSize: true,
                update: function() {
                    var ids = [];
                    $(this).find('li').each(function() {
                        ids.push($(this).data('id'));
                    });
                    $('#dw_album_images').val(JSON.stringify(ids));
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
            
            // YouTube 썸네일 불러오기 (설교, 목회컬럼, 교회앨범, 이벤트)
            $('#dw_sermon_thumb_fetch, #dw_column_thumb_fetch, #dw_album_thumb_fetch, #dw_event_thumb_fetch').on('click', function(e) {
                e.preventDefault();
                var buttonId = $(e.target).attr('id');
                var url = '';
                
                if (buttonId === 'dw_sermon_thumb_fetch') {
                    url = $('#dw_sermon_youtube').val();
                } else if (buttonId === 'dw_column_thumb_fetch') {
                    url = $('#dw_column_youtube').val();
                } else if (buttonId === 'dw_album_thumb_fetch') {
                    url = $('#dw_album_youtube').val();
                } else if (buttonId === 'dw_event_thumb_fetch') {
                    url = $('#dw_event_youtube_url').val();
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
                        } else if (buttonId === 'dw_event_thumb_fetch') {
                            $('#dw_event_thumb_preview').html('<img src=\"' + max + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                        }
                    };
                    img.onerror = function() {
                        if (buttonId === 'dw_sermon_thumb_fetch') {
                            $('#dw_sermon_thumb_preview').html('<img src=\"' + hq + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                        } else if (buttonId === 'dw_column_thumb_fetch') {
                            $('#dw_column_thumb_preview').html('<img src=\"' + hq + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                        } else if (buttonId === 'dw_album_thumb_fetch') {
                            $('#dw_album_thumb_preview').html('<img src=\"' + hq + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                        } else if (buttonId === 'dw_event_thumb_fetch') {
                            $('#dw_event_thumb_preview').html('<img src=\"' + hq + '\" style=\"width:160px;height:90px;object-fit:cover;\" />');
                        }
                    };
                    img.src = max;
                } else {
                    alert('유효한 YouTube URL이 아닙니다.');
                }
            });
            
            // YouTube 썸네일 삭제 (설교, 목회컬럼, 교회앨범, 이벤트)
            $('#dw_sermon_thumb_remove, #dw_column_thumb_remove, #dw_album_thumb_remove, #dw_event_thumb_remove').on('click', function(e) {
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
                    } else if (buttonId === 'dw_event_thumb_remove') {
                        $('#dw_event_thumb_id').val('');
                        $('#dw_event_thumb_preview').html('');
                    }
                }
            });
            
            // 배너 PC 이미지 업로드
            $('#dw_banner_pc_image_button').on('click', function(e) {
                e.preventDefault();
                var frame = wp.media({
                    title: 'PC용 배너 이미지 업로드',
                    button: {text: '선택'},
                    library: {type: 'image'},
                    multiple: false
                });
                frame.on('select', function() {
                    var attachment = frame.state().get('selection').first().toJSON();
                    $('#dw_banner_pc_image').val(attachment.id);
                    $('#dw_banner_pc_image_preview').html('<img src=\"' + attachment.url + '\" style=\"max-width:400px;height:auto;object-fit:cover;border:1px solid #ddd;\" />');
                });
                frame.open();
            });
            
            // 배너 PC 이미지 삭제
            $('#dw_banner_pc_image_remove').on('click', function(e) {
                e.preventDefault();
                if (confirm('PC용 이미지를 삭제하시겠습니까?')) {
                    $('#dw_banner_pc_image').val('');
                    $('#dw_banner_pc_image_preview').html('');
                }
            });
            
            // 배너 모바일 이미지 업로드
            $('#dw_banner_mobile_image_button').on('click', function(e) {
                e.preventDefault();
                var frame = wp.media({
                    title: '모바일용 배너 이미지 업로드',
                    button: {text: '선택'},
                    library: {type: 'image'},
                    multiple: false
                });
                frame.on('select', function() {
                    var attachment = frame.state().get('selection').first().toJSON();
                    $('#dw_banner_mobile_image').val(attachment.id);
                    $('#dw_banner_mobile_image_preview').html('<img src=\"' + attachment.url + '\" style=\"max-width:300px;height:auto;object-fit:cover;border:1px solid #ddd;\" />');
                });
                frame.open();
            });
            
            // 배너 모바일 이미지 삭제
            $('#dw_banner_mobile_image_remove').on('click', function(e) {
                e.preventDefault();
                if (confirm('모바일용 이미지를 삭제하시겠습니까?')) {
                    $('#dw_banner_mobile_image').val('');
                    $('#dw_banner_mobile_image_preview').html('');
                }
            });
            
            
            // 배너 시작 날짜 리셋
            $('#dw_banner_start_date_reset').on('click', function(e) {
                e.preventDefault();
                $('#dw_banner_start_date').val('');
            });
            
            // 배너 종료 날짜 리셋
            $('#dw_banner_end_date_reset').on('click', function(e) {
                e.preventDefault();
                $('#dw_banner_end_date').val('');
            });
            
            // Event 배경 이미지 업로드
            $('#dw_event_bg_image_button').on('click', function(e) {
                e.preventDefault();
                var frame = wp.media({
                    title: '배경 이미지 업로드',
                    button: {text: '선택'},
                    library: {type: 'image'},
                    multiple: false
                });
                frame.on('select', function() {
                    var attachment = frame.state().get('selection').first().toJSON();
                    $('#dw_event_bg_image').val(attachment.id);
                    $('#dw_event_bg_image_preview').html('<img src=\"' + attachment.url + '\" style=\"max-width:400px;height:auto;object-fit:cover;border:1px solid #ddd;\" />');
                });
                frame.open();
            });
            
            // Event 배경 이미지 삭제
            $('#dw_event_bg_image_remove').on('click', function(e) {
                e.preventDefault();
                if (confirm('이미지를 삭제하시겠습니까?')) {
                    $('#dw_event_bg_image').val('');
                    $('#dw_event_bg_image_preview').html('');
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
        
        // Sortable placeholder styles for smooth drag & drop
        if (in_array($post_type, array('bulletin', 'album'))) {
            echo '<style>
                .sortable-placeholder {
                    background: #f0f0f1 !important;
                    border: 2px dashed #8c8f94 !important;
                    visibility: visible !important;
                    width: 100px !important;
                    height: 100px !important;
                    margin: 0 !important;
                    display: inline-block !important;
                }
                
                #dw_bulletin_images_preview li,
                #dw_album_images_preview li {
                    cursor: move !important;
                    transition: none !important;
                }
                
                #dw_bulletin_images_preview li:hover,
                #dw_album_images_preview li:hover {
                    opacity: 0.8;
                }
                
                .ui-sortable-helper {
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
                    transform: rotate(2deg) !important;
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
    
    /**
     * Display album image error notice
     */
    public function dasom_church_display_album_image_error() {
        global $post;
        
        // Only show on album post edit pages
        if (!isset($_GET['post']) || get_post_type($_GET['post']) !== 'album') {
            return;
        }
        
        $post_id = intval($_GET['post']);
        $error_message = get_transient('dw_church_album_image_error_' . $post_id);
        
        if ($error_message) {
            echo '<div class="notice notice-error is-dismissible">';
            echo '<p><strong>' . esc_html($error_message) . '</strong></p>';
            echo '</div>';
            
            // Delete transient after displaying
            delete_transient('dw_church_album_image_error_' . $post_id);
        }
    }
}

// Initialize the meta boxes
DW_Church_Meta_Boxes::get_instance();
