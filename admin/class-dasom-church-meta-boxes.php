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
        
        // 배너 메타박스
        add_meta_box(
            'banner_meta',
            __('배너 정보', 'dasom-church'),
            array($this, 'dasom_church_banner_meta_box'),
            'banner',
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
     * 배너 메타박스
     */
    public function dasom_church_banner_meta_box($post) {
        wp_nonce_field('dasom_church_banner_meta', 'dasom_church_banner_nonce');
        
        // Get current banner category
        $terms = wp_get_post_terms($post->ID, 'banner_category');
        $current_category = !empty($terms) && !is_wp_error($terms) ? $terms[0]->name : '';
        
        $pc_image = get_post_meta($post->ID, 'dw_banner_pc_image', true);
        $mobile_image = get_post_meta($post->ID, 'dw_banner_mobile_image', true);
        $sub_image = get_post_meta($post->ID, 'dw_banner_sub_image', true);
        $sub_ratio = get_post_meta($post->ID, 'dw_banner_sub_ratio', true);
        $sub_ratio = $sub_ratio ? $sub_ratio : '16:9';
        $link_url = get_post_meta($post->ID, 'dw_banner_link_url', true);
        $link_target = get_post_meta($post->ID, 'dw_banner_link_target', true);
        $link_target = $link_target ? $link_target : '_self';
        $start_date = get_post_meta($post->ID, 'dw_banner_start_date', true);
        $end_date = get_post_meta($post->ID, 'dw_banner_end_date', true);
        
        // Get display type and text content fields
        $display_type = get_post_meta($post->ID, 'dw_banner_display_type', true);
        $display_type = $display_type ? $display_type : 'image_only';
        $bg_image = get_post_meta($post->ID, 'dw_banner_bg_image', true);
        $text_title = get_post_meta($post->ID, 'dw_banner_text_title', true);
        $text_subtitle = get_post_meta($post->ID, 'dw_banner_text_subtitle', true);
        $text_description = get_post_meta($post->ID, 'dw_banner_text_description', true);
        $text_position = get_post_meta($post->ID, 'dw_banner_text_position', true);
        $text_position = $text_position ? $text_position : 'center-center';
        $text_align = get_post_meta($post->ID, 'dw_banner_text_align', true);
        $text_align = $text_align ? $text_align : 'center';
        $content_padding_top = get_post_meta($post->ID, 'dw_banner_content_padding_top', true);
        $content_padding_top = $content_padding_top ? $content_padding_top : '40';
        $content_padding_right = get_post_meta($post->ID, 'dw_banner_content_padding_right', true);
        $content_padding_right = $content_padding_right ? $content_padding_right : '40';
        $content_padding_bottom = get_post_meta($post->ID, 'dw_banner_content_padding_bottom', true);
        $content_padding_bottom = $content_padding_bottom ? $content_padding_bottom : '40';
        $content_padding_left = get_post_meta($post->ID, 'dw_banner_content_padding_left', true);
        $content_padding_left = $content_padding_left ? $content_padding_left : '40';
        $button_text = get_post_meta($post->ID, 'dw_banner_button_text', true);
        $button_text = $button_text ? $button_text : __('자세히 보기', 'dasom-church');
        ?>
        <div style="background:#f9f9f9;padding:15px;margin-bottom:20px;border:1px solid #ddd;border-radius:4px;">
            <p style="margin:0;font-size:13px;color:#666;">
                <strong><?php _e('배너 종류:', 'dasom-church'); ?></strong> 
                <?php _e('오른쪽 사이드바에서 배너 카테고리를 선택하면 해당하는 필드가 표시됩니다.', 'dasom-church'); ?><br>
                • <strong><?php _e('메인 배너', 'dasom-church'); ?>:</strong> <?php _e('PC (1920px) + 모바일 (720px) 이미지', 'dasom-church'); ?><br>
                • <strong><?php _e('서브 배너', 'dasom-church'); ?>:</strong> <?php _e('1024px 고정폭, 비율 선택 가능 (16:9, 4:3, 1:1)', 'dasom-church'); ?>
            </p>
        </div>
        
        <table class="form-table">
            <!-- 디스플레이 타입 선택 -->
            <tr>
                <th scope="row">
                    <label><?php _e('배너 표시 방식', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label style="display:inline-block;margin-right:20px;">
                            <input type="radio" name="dw_banner_display_type" value="image_only" <?php checked($display_type, 'image_only'); ?> />
                            <?php _e('이미지만', 'dasom-church'); ?>
                        </label>
                        <label style="display:inline-block;">
                            <input type="radio" name="dw_banner_display_type" value="image_with_text" <?php checked($display_type, 'image_with_text'); ?> />
                            <?php _e('배경이미지 + 텍스트', 'dasom-church'); ?>
                        </label>
                    </fieldset>
                    <p class="description"><?php _e('배너 표시 방식을 선택하세요. "배경이미지 + 텍스트"를 선택하면 이미지 위에 텍스트와 버튼이 표시됩니다.', 'dasom-church'); ?></p>
                </td>
            </tr>
        </table>
        
        <table class="form-table">
            <!-- 메인 배너 필드 -->
            <tr class="banner-field banner-main-field" data-banner-type="main" style="<?php echo ($current_category === '메인 배너' || $current_category === 'Main Banner') ? '' : 'display:none;'; ?>">
                <th scope="row">
                    <label for="dw_banner_pc_image"><?php _e('PC용 배너 이미지 (1920px)', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_banner_pc_image" name="dw_banner_pc_image" value="<?php echo esc_attr($pc_image); ?>" />
                    <button type="button" class="button" id="dw_banner_pc_image_button"><?php _e('PC용 이미지 업로드', 'dasom-church'); ?></button>
                    <button type="button" class="button button-link-delete" id="dw_banner_pc_image_remove" style="color:#b32d2e;"><?php _e('이미지 삭제', 'dasom-church'); ?></button>
                    <div id="dw_banner_pc_image_preview" style="margin-top:10px;">
                        <?php if ($pc_image): ?>
                            <img src="<?php echo esc_url(wp_get_attachment_url($pc_image)); ?>" style="max-width:400px;height:auto;object-fit:cover;border:1px solid #ddd;" />
                        <?php endif; ?>
                    </div>
                    <p class="description"><?php _e('권장 크기: 가로 1920px', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr class="banner-field banner-main-field" data-banner-type="main" style="<?php echo ($current_category === '메인 배너' || $current_category === 'Main Banner') ? '' : 'display:none;'; ?>">
                <th scope="row">
                    <label for="dw_banner_mobile_image"><?php _e('모바일용 배너 이미지 (720px)', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_banner_mobile_image" name="dw_banner_mobile_image" value="<?php echo esc_attr($mobile_image); ?>" />
                    <button type="button" class="button" id="dw_banner_mobile_image_button"><?php _e('모바일용 이미지 업로드', 'dasom-church'); ?></button>
                    <button type="button" class="button button-link-delete" id="dw_banner_mobile_image_remove" style="color:#b32d2e;"><?php _e('이미지 삭제', 'dasom-church'); ?></button>
                    <div id="dw_banner_mobile_image_preview" style="margin-top:10px;">
                        <?php if ($mobile_image): ?>
                            <img src="<?php echo esc_url(wp_get_attachment_url($mobile_image)); ?>" style="max-width:300px;height:auto;object-fit:cover;border:1px solid #ddd;" />
                        <?php endif; ?>
                    </div>
                    <p class="description"><?php _e('권장 크기: 가로 720px', 'dasom-church'); ?></p>
                </td>
            </tr>
            
            <!-- 서브 배너 필드 -->
            <tr class="banner-field banner-sub-field" data-banner-type="sub" style="<?php echo ($current_category === '서브 배너' || $current_category === 'Sub Banner') ? '' : 'display:none;'; ?>">
                <th scope="row">
                    <label for="dw_banner_sub_ratio"><?php _e('이미지 비율', 'dasom-church'); ?></label>
                </th>
                <td>
                    <select id="dw_banner_sub_ratio" name="dw_banner_sub_ratio" class="regular-text">
                        <option value="16:9" <?php selected($sub_ratio, '16:9'); ?>>16:9 (1024x576px)</option>
                        <option value="4:3" <?php selected($sub_ratio, '4:3'); ?>>4:3 (1024x768px)</option>
                        <option value="1:1" <?php selected($sub_ratio, '1:1'); ?>>1:1 (1024x1024px)</option>
                    </select>
                    <p class="description"><?php _e('서브 배너는 가로 1024px 고정입니다. 비율을 선택하세요.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr class="banner-field banner-sub-field" data-banner-type="sub" style="<?php echo ($current_category === '서브 배너' || $current_category === 'Sub Banner') ? '' : 'display:none;'; ?>">
                <th scope="row">
                    <label for="dw_banner_sub_image"><?php _e('서브 배너 이미지 (1024px)', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_banner_sub_image" name="dw_banner_sub_image" value="<?php echo esc_attr($sub_image); ?>" />
                    <button type="button" class="button" id="dw_banner_sub_image_button"><?php _e('이미지 업로드', 'dasom-church'); ?></button>
                    <button type="button" class="button button-link-delete" id="dw_banner_sub_image_remove" style="color:#b32d2e;"><?php _e('이미지 삭제', 'dasom-church'); ?></button>
                    <div id="dw_banner_sub_image_preview" style="margin-top:10px;">
                        <?php if ($sub_image): ?>
                            <img src="<?php echo esc_url(wp_get_attachment_url($sub_image)); ?>" style="max-width:400px;height:auto;object-fit:cover;border:1px solid #ddd;" />
                        <?php endif; ?>
                    </div>
                    <p class="description"><?php _e('권장 크기: 가로 1024px, 세로는 선택한 비율에 따라 자동 결정', 'dasom-church'); ?></p>
                </td>
            </tr>
            
            <!-- 배경이미지 + 텍스트 모드 전용 필드 -->
            <tr class="banner-text-field" style="<?php echo ($display_type === 'image_with_text') ? '' : 'display:none;'; ?>">
                <th scope="row">
                    <label for="dw_banner_bg_image"><?php _e('배경 이미지', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="hidden" id="dw_banner_bg_image" name="dw_banner_bg_image" value="<?php echo esc_attr($bg_image); ?>" />
                    <button type="button" class="button" id="dw_banner_bg_image_button"><?php _e('배경 이미지 업로드', 'dasom-church'); ?></button>
                    <button type="button" class="button button-link-delete" id="dw_banner_bg_image_remove" style="color:#b32d2e;"><?php _e('이미지 삭제', 'dasom-church'); ?></button>
                    <div id="dw_banner_bg_image_preview" style="margin-top:10px;">
                        <?php if ($bg_image): ?>
                            <img src="<?php echo esc_url(wp_get_attachment_url($bg_image)); ?>" style="max-width:400px;height:auto;object-fit:cover;border:1px solid #ddd;" />
                        <?php endif; ?>
                    </div>
                    <p class="description"><?php _e('텍스트의 배경이 될 이미지를 업로드하세요.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr class="banner-text-field" style="<?php echo ($display_type === 'image_with_text') ? '' : 'display:none;'; ?>">
                <th scope="row">
                    <label for="dw_banner_text_title"><?php _e('제목 (Title)', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_banner_text_title" name="dw_banner_text_title" value="<?php echo esc_attr($text_title); ?>" class="regular-text" />
                    <p class="description"><?php _e('배너에 표시될 메인 제목을 입력하세요.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr class="banner-text-field" style="<?php echo ($display_type === 'image_with_text') ? '' : 'display:none;'; ?>">
                <th scope="row">
                    <label for="dw_banner_text_subtitle"><?php _e('부제목 (Subtitle)', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_banner_text_subtitle" name="dw_banner_text_subtitle" value="<?php echo esc_attr($text_subtitle); ?>" class="regular-text" />
                    <p class="description"><?php _e('배너에 표시될 부제목을 입력하세요.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr class="banner-text-field" style="<?php echo ($display_type === 'image_with_text') ? '' : 'display:none;'; ?>">
                <th scope="row">
                    <label for="dw_banner_text_description"><?php _e('설명 (Description)', 'dasom-church'); ?></label>
                </th>
                <td>
                    <textarea id="dw_banner_text_description" name="dw_banner_text_description" class="large-text" rows="3"><?php echo esc_textarea($text_description); ?></textarea>
                    <p class="description"><?php _e('배너에 표시될 짧은 설명을 입력하세요.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr class="banner-text-field" style="<?php echo ($display_type === 'image_with_text') ? '' : 'display:none;'; ?>">
                <th scope="row">
                    <label for="dw_banner_text_position"><?php _e('텍스트 위치', 'dasom-church'); ?></label>
                </th>
                <td>
                    <select id="dw_banner_text_position" name="dw_banner_text_position" class="regular-text">
                        <optgroup label="<?php _e('상단', 'dasom-church'); ?>">
                            <option value="top-left" <?php selected($text_position, 'top-left'); ?>><?php _e('상단 왼쪽', 'dasom-church'); ?></option>
                            <option value="top-center" <?php selected($text_position, 'top-center'); ?>><?php _e('상단 중앙', 'dasom-church'); ?></option>
                            <option value="top-right" <?php selected($text_position, 'top-right'); ?>><?php _e('상단 오른쪽', 'dasom-church'); ?></option>
                        </optgroup>
                        <optgroup label="<?php _e('중앙', 'dasom-church'); ?>">
                            <option value="center-left" <?php selected($text_position, 'center-left'); ?>><?php _e('중앙 왼쪽', 'dasom-church'); ?></option>
                            <option value="center-center" <?php selected($text_position, 'center-center'); ?>><?php _e('중앙', 'dasom-church'); ?></option>
                            <option value="center-right" <?php selected($text_position, 'center-right'); ?>><?php _e('중앙 오른쪽', 'dasom-church'); ?></option>
                        </optgroup>
                        <optgroup label="<?php _e('하단', 'dasom-church'); ?>">
                            <option value="bottom-left" <?php selected($text_position, 'bottom-left'); ?>><?php _e('하단 왼쪽', 'dasom-church'); ?></option>
                            <option value="bottom-center" <?php selected($text_position, 'bottom-center'); ?>><?php _e('하단 중앙', 'dasom-church'); ?></option>
                            <option value="bottom-right" <?php selected($text_position, 'bottom-right'); ?>><?php _e('하단 오른쪽', 'dasom-church'); ?></option>
                        </optgroup>
                    </select>
                    <p class="description"><?php _e('텍스트가 표시될 위치를 선택하세요.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr class="banner-text-field" style="<?php echo ($display_type === 'image_with_text') ? '' : 'display:none;'; ?>">
                <th scope="row">
                    <label for="dw_banner_text_align"><?php _e('텍스트 정렬', 'dasom-church'); ?></label>
                </th>
                <td>
                    <select id="dw_banner_text_align" name="dw_banner_text_align" class="regular-text">
                        <option value="left" <?php selected($text_align, 'left'); ?>><?php _e('왼쪽 정렬', 'dasom-church'); ?></option>
                        <option value="center" <?php selected($text_align, 'center'); ?>><?php _e('중앙 정렬', 'dasom-church'); ?></option>
                        <option value="right" <?php selected($text_align, 'right'); ?>><?php _e('오른쪽 정렬', 'dasom-church'); ?></option>
                    </select>
                    <p class="description"><?php _e('텍스트 콘텐츠 내부의 정렬 방식을 선택하세요.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr class="banner-text-field" style="<?php echo ($display_type === 'image_with_text') ? '' : 'display:none;'; ?>">
                <th scope="row">
                    <label><?php _e('콘텐츠 여백 (Padding)', 'dasom-church'); ?></label>
                </th>
                <td>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:400px;">
                        <div>
                            <label for="dw_banner_content_padding_top" style="display:block;margin-bottom:5px;"><?php _e('위쪽 (px)', 'dasom-church'); ?></label>
                            <input type="number" id="dw_banner_content_padding_top" name="dw_banner_content_padding_top" value="<?php echo esc_attr($content_padding_top); ?>" class="small-text" min="0" step="5" />
                        </div>
                        <div>
                            <label for="dw_banner_content_padding_right" style="display:block;margin-bottom:5px;"><?php _e('오른쪽 (px)', 'dasom-church'); ?></label>
                            <input type="number" id="dw_banner_content_padding_right" name="dw_banner_content_padding_right" value="<?php echo esc_attr($content_padding_right); ?>" class="small-text" min="0" step="5" />
                        </div>
                        <div>
                            <label for="dw_banner_content_padding_bottom" style="display:block;margin-bottom:5px;"><?php _e('아래쪽 (px)', 'dasom-church'); ?></label>
                            <input type="number" id="dw_banner_content_padding_bottom" name="dw_banner_content_padding_bottom" value="<?php echo esc_attr($content_padding_bottom); ?>" class="small-text" min="0" step="5" />
                        </div>
                        <div>
                            <label for="dw_banner_content_padding_left" style="display:block;margin-bottom:5px;"><?php _e('왼쪽 (px)', 'dasom-church'); ?></label>
                            <input type="number" id="dw_banner_content_padding_left" name="dw_banner_content_padding_left" value="<?php echo esc_attr($content_padding_left); ?>" class="small-text" min="0" step="5" />
                        </div>
                    </div>
                    <p class="description" style="margin-top:10px;"><?php _e('텍스트 콘텐츠의 여백을 픽셀 단위로 설정하세요. 기본값: 40px', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr class="banner-text-field" style="<?php echo ($display_type === 'image_with_text') ? '' : 'display:none;'; ?>">
                <th scope="row">
                    <label for="dw_banner_button_text"><?php _e('버튼 텍스트', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_banner_button_text" name="dw_banner_button_text" value="<?php echo esc_attr($button_text); ?>" class="regular-text" />
                    <p class="description"><?php _e('버튼에 표시될 텍스트를 입력하세요. 비워두면 버튼이 표시되지 않습니다.', 'dasom-church'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_banner_link_url"><?php _e('링크 URL', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_banner_link_url" name="dw_banner_link_url" value="<?php echo esc_url($link_url); ?>" class="regular-text" placeholder="https://" />
                    <p class="description banner-image-only-desc" style="<?php echo ($display_type === 'image_only') ? '' : 'display:none;'; ?>"><?php _e('배너 클릭 시 이동할 URL을 입력하세요.', 'dasom-church'); ?></p>
                    <p class="description banner-text-desc" style="<?php echo ($display_type === 'image_with_text') ? '' : 'display:none;'; ?>"><?php _e('버튼 클릭 시 이동할 URL을 입력하세요. (이미지만 모드에서는 이미지에 링크가 적용됩니다)', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_banner_link_target"><?php _e('링크 열기 방식', 'dasom-church'); ?></label>
                </th>
                <td>
                    <select id="dw_banner_link_target" name="dw_banner_link_target" class="regular-text">
                        <option value="_self" <?php selected($link_target, '_self'); ?>><?php _e('현재 창에서 열기', 'dasom-church'); ?></option>
                        <option value="_blank" <?php selected($link_target, '_blank'); ?>><?php _e('새 창에서 열기', 'dasom-church'); ?></option>
                    </select>
                    <p class="description"><?php _e('링크를 클릭했을 때 어떻게 열릴지 선택하세요.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_banner_start_date"><?php _e('배너 시작 날짜', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="datetime-local" id="dw_banner_start_date" name="dw_banner_start_date" value="<?php echo esc_attr($start_date); ?>" class="regular-text" />
                    <button type="button" class="button" id="dw_banner_start_date_reset" style="margin-left:5px;"><?php _e('Reset', 'dasom-church'); ?></button>
                    <p class="description"><?php _e('이 날짜부터 배너가 표시됩니다. 비워두면 즉시 표시됩니다.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_banner_end_date"><?php _e('배너 종료 날짜', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="datetime-local" id="dw_banner_end_date" name="dw_banner_end_date" value="<?php echo esc_attr($end_date); ?>" class="regular-text" />
                    <button type="button" class="button" id="dw_banner_end_date_reset" style="margin-left:5px;"><?php _e('Reset', 'dasom-church'); ?></button>
                    <p class="description"><?php _e('이 날짜 이후 배너가 자동으로 비공개(Draft)로 전환됩니다. 비워두면 무기한 표시됩니다.', 'dasom-church'); ?></p>
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
    
    /**
     * Save banner meta
     */
    private function dasom_church_save_banner_meta($post_id) {
        if (!isset($_POST['dasom_church_banner_nonce']) || 
            !wp_verify_nonce($_POST['dasom_church_banner_nonce'], 'dasom_church_banner_meta')) {
            return;
        }
        
        // Get banner category to determine which fields to save
        $terms = wp_get_post_terms($post_id, 'banner_category');
        $category = !empty($terms) && !is_wp_error($terms) ? $terms[0]->name : '';
        
        // Save main banner fields
        if ($category === '메인 배너' || $category === 'Main Banner') {
            if (isset($_POST['dw_banner_pc_image'])) {
                $pc_image_id = intval($_POST['dw_banner_pc_image']);
                update_post_meta($post_id, 'dw_banner_pc_image', $pc_image_id);
                if ($pc_image_id > 0) {
                    set_post_thumbnail($post_id, $pc_image_id);
                }
            }
            
            if (isset($_POST['dw_banner_mobile_image'])) {
                update_post_meta($post_id, 'dw_banner_mobile_image', intval($_POST['dw_banner_mobile_image']));
            }
            
            // Clear sub banner fields
            delete_post_meta($post_id, 'dw_banner_sub_image');
            delete_post_meta($post_id, 'dw_banner_sub_ratio');
        }
        // Save sub banner fields
        elseif ($category === '서브 배너' || $category === 'Sub Banner') {
            if (isset($_POST['dw_banner_sub_ratio'])) {
                $ratio = sanitize_text_field($_POST['dw_banner_sub_ratio']);
                if (in_array($ratio, array('16:9', '4:3', '1:1'))) {
                    update_post_meta($post_id, 'dw_banner_sub_ratio', $ratio);
                }
            }
            
            if (isset($_POST['dw_banner_sub_image'])) {
                $sub_image_id = intval($_POST['dw_banner_sub_image']);
                update_post_meta($post_id, 'dw_banner_sub_image', $sub_image_id);
                if ($sub_image_id > 0) {
                    set_post_thumbnail($post_id, $sub_image_id);
                }
            }
            
            // Clear main banner fields
            delete_post_meta($post_id, 'dw_banner_pc_image');
            delete_post_meta($post_id, 'dw_banner_mobile_image');
        }
        
        // Save display type
        if (isset($_POST['dw_banner_display_type'])) {
            $display_type = sanitize_text_field($_POST['dw_banner_display_type']);
            if (in_array($display_type, array('image_only', 'image_with_text'))) {
                update_post_meta($post_id, 'dw_banner_display_type', $display_type);
                
                // Save text mode fields if display type is image_with_text
                if ($display_type === 'image_with_text') {
                    if (isset($_POST['dw_banner_bg_image'])) {
                        $bg_image_id = intval($_POST['dw_banner_bg_image']);
                        update_post_meta($post_id, 'dw_banner_bg_image', $bg_image_id);
                    }
                    
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
                    
                    if (isset($_POST['dw_banner_button_text'])) {
                        update_post_meta($post_id, 'dw_banner_button_text', sanitize_text_field($_POST['dw_banner_button_text']));
                    }
                    
                    if (isset($_POST['dw_banner_text_align'])) {
                        $align = sanitize_text_field($_POST['dw_banner_text_align']);
                        if (in_array($align, array('left', 'center', 'right'))) {
                            update_post_meta($post_id, 'dw_banner_text_align', $align);
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
                } else {
                    // Clear text mode fields if switching to image only
                    delete_post_meta($post_id, 'dw_banner_bg_image');
                    delete_post_meta($post_id, 'dw_banner_text_title');
                    delete_post_meta($post_id, 'dw_banner_text_subtitle');
                    delete_post_meta($post_id, 'dw_banner_text_description');
                    delete_post_meta($post_id, 'dw_banner_text_position');
                    delete_post_meta($post_id, 'dw_banner_text_align');
                    delete_post_meta($post_id, 'dw_banner_content_padding_top');
                    delete_post_meta($post_id, 'dw_banner_content_padding_right');
                    delete_post_meta($post_id, 'dw_banner_content_padding_bottom');
                    delete_post_meta($post_id, 'dw_banner_content_padding_left');
                    delete_post_meta($post_id, 'dw_banner_button_text');
                }
            }
        }
        
        // Save common fields (link, dates)
        if (isset($_POST['dw_banner_link_url'])) {
            update_post_meta($post_id, 'dw_banner_link_url', esc_url_raw($_POST['dw_banner_link_url']));
        }
        
        if (isset($_POST['dw_banner_link_target'])) {
            $target = sanitize_text_field($_POST['dw_banner_link_target']);
            if (in_array($target, array('_self', '_blank'))) {
                update_post_meta($post_id, 'dw_banner_link_target', $target);
            }
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
        
        if (!isset($post->post_type) || !in_array($post->post_type, array('bulletin', 'sermon', 'column', 'album', 'banner'))) {
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
            
            // 배너 서브 이미지 업로드
            $('#dw_banner_sub_image_button').on('click', function(e) {
                e.preventDefault();
                var frame = wp.media({
                    title: '서브 배너 이미지 업로드',
                    button: {text: '선택'},
                    library: {type: 'image'},
                    multiple: false
                });
                frame.on('select', function() {
                    var attachment = frame.state().get('selection').first().toJSON();
                    $('#dw_banner_sub_image').val(attachment.id);
                    $('#dw_banner_sub_image_preview').html('<img src=\"' + attachment.url + '\" style=\"max-width:400px;height:auto;object-fit:cover;border:1px solid #ddd;\" />');
                });
                frame.open();
            });
            
            // 배너 서브 이미지 삭제
            $('#dw_banner_sub_image_remove').on('click', function(e) {
                e.preventDefault();
                if (confirm('서브 배너 이미지를 삭제하시겠습니까?')) {
                    $('#dw_banner_sub_image').val('');
                    $('#dw_banner_sub_image_preview').html('');
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
}

// Initialize the meta boxes
Dasom_Church_Meta_Boxes::get_instance();
