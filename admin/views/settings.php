<?php
/**
 * Settings view
 *
 * @package Dasom_Church
 * @since 1.0.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get current values
$church_name = dasom_church_get_setting('name', '');
$church_address = dasom_church_get_setting('address', '');
$church_phone = dasom_church_get_setting('phone', '');
$church_email = dasom_church_get_setting('email', '');
$church_website = dasom_church_get_setting('website', '');

// Social URLs
$social_youtube = dasom_church_get_setting('social_youtube', '');
$social_instagram = dasom_church_get_setting('social_instagram', '');
$social_facebook = dasom_church_get_setting('social_facebook', '');
$social_linkedin = dasom_church_get_setting('social_linkedin', '');
$social_tiktok = dasom_church_get_setting('social_tiktok', '');
$social_kakaotalk = dasom_church_get_setting('social_kakaotalk', '');
$social_kakaotalk_channel = dasom_church_get_setting('social_kakaotalk_channel', '');

// Dashboard visibility
$dashboard_fields_visibility = get_option('dw_dashboard_fields_visibility', 'administrator');

// GitHub settings
$github_token = get_option('dw_github_access_token', '');

// Data deletion setting
$delete_data_on_uninstall = get_option('dw_delete_data_on_uninstall', 'no');

// Widget settings
$enable_gallery_widget = get_option('dw_enable_gallery_widget', 'yes');
$enable_sermon_widget = get_option('dw_enable_sermon_widget', 'yes');
$enable_single_sermon_widget = get_option('dw_enable_single_sermon_widget', 'yes');
$enable_bulletin_widget = get_option('dw_enable_bulletin_widget', 'yes');
$enable_column_widget = get_option('dw_enable_column_widget', 'yes');
$enable_banner_slider_widget = get_option('dw_enable_banner_slider_widget', 'yes');
$enable_pastoral_column_widget = get_option('dw_enable_pastoral_column_widget', 'yes');
$enable_pastoral_columns_grid_widget = get_option('dw_enable_pastoral_columns_grid_widget', 'yes');
?>

<div class="wrap">
    <h1><?php echo esc_html__('DW 교회관리 설정', 'dasom-church'); ?></h1>
    
    <?php
    $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'church_info';
    ?>
    
    <h2 class="nav-tab-wrapper">
        <a href="?page=dasom-church-settings&tab=church_info" class="nav-tab <?php echo $active_tab == 'church_info' ? 'nav-tab-active' : ''; ?>">
            <?php _e('교회 정보', 'dasom-church'); ?>
        </a>
        <a href="?page=dasom-church-settings&tab=widgets" class="nav-tab <?php echo $active_tab == 'widgets' ? 'nav-tab-active' : ''; ?>">
            <?php _e('위젯', 'dasom-church'); ?>
        </a>
        <a href="?page=dasom-church-settings&tab=plugin_settings" class="nav-tab <?php echo $active_tab == 'plugin_settings' ? 'nav-tab-active' : ''; ?>">
            <?php _e('설정', 'dasom-church'); ?>
        </a>
    </h2>
    
    <form method="post" action="">
        <?php wp_nonce_field('dasom_church_settings_action', 'dasom_church_settings_nonce'); ?>
        
        <?php if ($active_tab == 'church_info'): ?>
        <!-- 교회 정보 탭 -->
        <h2><?php _e('기본 정보', 'dasom-church'); ?></h2>
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_church_name"><?php echo esc_html__('Church Name', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_church_name" name="dw_church_name" value="<?php echo esc_attr($church_name); ?>" class="regular-text" />
                    <p class="description"><?php echo esc_html__('Enter the name of your church.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_church_address"><?php echo esc_html__('Church Address', 'dasom-church'); ?></label>
                </th>
                <td>
                    <textarea id="dw_church_address" name="dw_church_address" rows="3" cols="50"><?php echo esc_textarea($church_address); ?></textarea>
                    <p class="description"><?php echo esc_html__('Enter the full address of your church.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_church_phone"><?php echo esc_html__('Phone Number', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_church_phone" name="dw_church_phone" value="<?php echo esc_attr($church_phone); ?>" class="regular-text" />
                    <p class="description"><?php echo esc_html__('Enter the church phone number.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_church_email"><?php echo esc_html__('Email Address', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="email" id="dw_church_email" name="dw_church_email" value="<?php echo esc_attr($church_email); ?>" class="regular-text" />
                    <p class="description"><?php echo esc_html__('Enter the church email address.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_church_website"><?php echo esc_html__('Website URL', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_church_website" name="dw_church_website" value="<?php echo esc_attr($church_website); ?>" class="regular-text" />
                    <p class="description"><?php echo esc_html__('Enter the church website URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
        </table>
        
        <h2><?php echo esc_html__('Social Media URLs', 'dasom-church'); ?></h2>
        <p><?php echo esc_html__('Enter your church social media URLs below. Leave empty if not applicable.', 'dasom-church'); ?></p>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_social_youtube"><?php echo esc_html__('YouTube', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_youtube" name="dw_social_youtube" value="<?php echo esc_attr($social_youtube); ?>" class="regular-text" placeholder="https://www.youtube.com/channel/..." />
                    <p class="description"><?php echo esc_html__('Enter your YouTube channel URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_social_instagram"><?php echo esc_html__('Instagram', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_instagram" name="dw_social_instagram" value="<?php echo esc_attr($social_instagram); ?>" class="regular-text" placeholder="https://www.instagram.com/..." />
                    <p class="description"><?php echo esc_html__('Enter your Instagram profile URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_social_facebook"><?php echo esc_html__('Facebook', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_facebook" name="dw_social_facebook" value="<?php echo esc_attr($social_facebook); ?>" class="regular-text" placeholder="https://www.facebook.com/..." />
                    <p class="description"><?php echo esc_html__('Enter your Facebook page URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_social_linkedin"><?php echo esc_html__('LinkedIn', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_linkedin" name="dw_social_linkedin" value="<?php echo esc_attr($social_linkedin); ?>" class="regular-text" placeholder="https://www.linkedin.com/company/..." />
                    <p class="description"><?php echo esc_html__('Enter your LinkedIn company page URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_social_tiktok"><?php echo esc_html__('TikTok', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_tiktok" name="dw_social_tiktok" value="<?php echo esc_attr($social_tiktok); ?>" class="regular-text" placeholder="https://www.tiktok.com/@..." />
                    <p class="description"><?php echo esc_html__('Enter your TikTok profile URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_social_kakaotalk"><?php echo esc_html__('KakaoTalk', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_kakaotalk" name="dw_social_kakaotalk" value="<?php echo esc_attr($social_kakaotalk); ?>" class="regular-text" placeholder="https://open.kakao.com/o/..." />
                    <p class="description"><?php echo esc_html__('Enter your KakaoTalk open chat URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_social_kakaotalk_channel"><?php echo esc_html__('KakaoTalk Channel', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_kakaotalk_channel" name="dw_social_kakaotalk_channel" value="<?php echo esc_attr($social_kakaotalk_channel); ?>" class="regular-text" placeholder="https://pf.kakao.com/..." />
                    <p class="description"><?php echo esc_html__('Enter your KakaoTalk Channel URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
        </table>
        
        <?php elseif ($active_tab == 'plugin_settings'): ?>
        <!-- 플러그인 설정 탭 -->
        <h2><?php echo esc_html__('대시보드 설정', 'dasom-church'); ?></h2>
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_dashboard_fields_visibility"><?php echo esc_html__('커스텀 필드 안내 표시 권한', 'dasom-church'); ?></label>
                </th>
                <td>
                    <select id="dw_dashboard_fields_visibility" name="dw_dashboard_fields_visibility">
                        <option value="administrator" <?php selected($dashboard_fields_visibility, 'administrator'); ?>><?php echo esc_html__('Administrator (관리자)', 'dasom-church'); ?></option>
                        <option value="editor" <?php selected($dashboard_fields_visibility, 'editor'); ?>><?php echo esc_html__('Editor (편집자)', 'dasom-church'); ?></option>
                        <option value="author" <?php selected($dashboard_fields_visibility, 'author'); ?>><?php echo esc_html__('Author (작성자)', 'dasom-church'); ?></option>
                        <option value="contributor" <?php selected($dashboard_fields_visibility, 'contributor'); ?>><?php echo esc_html__('Contributor (기여자)', 'dasom-church'); ?></option>
                    </select>
                    <p class="description"><?php echo esc_html__('대시보드에서 "Elementor에서 사용할 커스텀 필드 안내"와 "교회설정 커스텀 필드 안내" 섹션을 볼 수 있는 최소 권한을 설정합니다.', 'dasom-church'); ?></p>
                </td>
            </tr>
        </table>
        
        <h2><?php echo esc_html__('플러그인 삭제 설정', 'dasom-church'); ?></h2>
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_delete_data_on_uninstall"><?php echo esc_html__('플러그인 삭제 시 데이터 삭제', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_delete_data_on_uninstall" name="dw_delete_data_on_uninstall" value="yes" <?php checked($delete_data_on_uninstall, 'yes'); ?> />
                            <?php echo esc_html__('플러그인 삭제 시 모든 데이터 삭제', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong style="color:#dc3545;">⚠️ <?php echo esc_html__('주의:', 'dasom-church'); ?></strong><br>
                            <?php echo esc_html__('이 옵션을 활성화하면 플러그인을 삭제할 때 다음 데이터가 모두 삭제됩니다:', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('모든 포스트 (주보, 설교, 컬럼, 앨범, 배너)', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('모든 커스텀 필드 데이터', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('모든 설정 정보', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('설교자 taxonomy 데이터', 'dasom-church'); ?><br><br>
                            <strong style="color:#2271b1;">💡 <?php echo esc_html__('권장:', 'dasom-church'); ?></strong><br>
                            <?php echo esc_html__('데이터를 보존하려면 이 옵션을 비활성화한 채로 두세요. 플러그인을 다시 설치하면 기존 데이터를 그대로 사용할 수 있습니다.', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
        </table>
        
        <?php elseif ($active_tab == 'widgets'): ?>
        <!-- 위젯 설정 탭 -->
        <h2><?php _e('위젯 관리', 'dasom-church'); ?></h2>
        <p class="description" style="margin-bottom:20px;">
            <?php _e('DW 교회관리 시스템에서 제공하는 위젯의 사용 여부를 관리할 수 있습니다. 위젯은 Elementor, 구텐버그, Kadence Block Pro에서 사용 가능합니다.', 'dasom-church'); ?>
        </p>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_enable_gallery_widget"><?php echo esc_html__('DW Gallery Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_gallery_widget" name="dw_enable_gallery_widget" value="yes" <?php checked($enable_gallery_widget, 'yes'); ?> />
                            <?php echo esc_html__('DW Gallery Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('교회앨범 이미지를 갤러리 형태로 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('Grid / Masonry 레이아웃 선택', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('반응형 컬럼 설정 (1-6 컬럼)', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('이미지 크기 선택 (Thumbnail, Medium, Large, Full)', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('Elementor, 구텐버그, Kadence Block Pro 지원', 'dasom-church'); ?><br><br>
                            <strong style="color:#2271b1;">💡 <?php echo esc_html__('사용 방법:', 'dasom-church'); ?></strong><br>
                            <?php echo esc_html__('• Elementor: 위젯 패널에서 "DW Gallery" 검색', 'dasom-church'); ?><br>
                            <?php echo esc_html__('• 구텐버그: 블록 추가에서 "DW Gallery" 검색', 'dasom-church'); ?><br>
                            <?php echo esc_html__('• Kadence: 자동으로 모든 블록 호환', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_sermon_widget"><?php echo esc_html__('DW Recent Sermons Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_sermon_widget" name="dw_enable_sermon_widget" value="yes" <?php checked($enable_sermon_widget, 'yes'); ?> />
                            <?php echo esc_html__('DW Recent Sermons Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('최근 설교 목록 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('Grid / List 레이아웃 선택', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('설교일, 설교자, 썸네일 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('반응형 컬럼 설정', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_single_sermon_widget"><?php echo esc_html__('DW Sermon Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_single_sermon_widget" name="dw_enable_single_sermon_widget" value="yes" <?php checked($enable_single_sermon_widget, 'yes'); ?> />
                            <?php echo esc_html__('DW Sermon Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('단일 설교 상세 정보 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('설교 제목, 설교자, 성경구절', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('설교 썸네일 및 메타 정보', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('현재 포스트 / 최신 포스트 / 수동 선택', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_bulletin_widget"><?php echo esc_html__('DW Bulletins Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_bulletin_widget" name="dw_enable_bulletin_widget" value="yes" <?php checked($enable_bulletin_widget, 'yes'); ?> />
                            <?php echo esc_html__('DW Bulletins Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('최근 주보 목록 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('PDF 다운로드 링크', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('주보 이미지 썸네일', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('날짜순 정렬', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_column_widget"><?php echo esc_html__('DW Pastoral Columns Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_column_widget" name="dw_enable_column_widget" value="yes" <?php checked($enable_column_widget, 'yes'); ?> />
                            <?php echo esc_html__('DW Pastoral Columns Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('최근 목회컬럼 목록 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('컬럼 썸네일 및 발췌문', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('Grid 레이아웃', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('반응형 컬럼 설정', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_banner_slider_widget"><?php echo esc_html__('DW Banner Slider Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_banner_slider_widget" name="dw_enable_banner_slider_widget" value="yes" <?php checked($enable_banner_slider_widget, 'yes'); ?> />
                            <?php echo esc_html__('DW Banner Slider Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('배너 슬라이더 (Swiper.js)', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('카테고리별 필터링 (메인/서브)', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('자동재생, 네비게이션, 페이지네이션', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('배너 링크 및 타겟 설정', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_pastoral_column_widget"><?php echo esc_html__('DW Pastoral Column Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_pastoral_column_widget" name="dw_enable_pastoral_column_widget" value="yes" <?php checked($enable_pastoral_column_widget, 'yes'); ?> />
                            <?php echo esc_html__('DW Pastoral Column Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('단일 목회 컬럼 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('상단 이미지, 제목, 날짜, 내용, 하단 이미지, YouTube', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('Query: Current Post, Latest Post, Manual Selection', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_pastoral_columns_grid_widget"><?php echo esc_html__('DW Pastoral Columns Recent Grid Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_pastoral_columns_grid_widget" name="dw_enable_pastoral_columns_grid_widget" value="yes" <?php checked($enable_pastoral_columns_grid_widget, 'yes'); ?> />
                            <?php echo esc_html__('DW Pastoral Columns Recent Grid Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('최근 목회 컬럼 그리드 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('썸네일, 제목, 날짜, 발췌문 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('그리드/리스트 레이아웃, Pagination 지원', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
        </table>
        
        <div style="background:#f0f7ff;padding:15px;border-left:4px solid #2271b1;margin-top:20px;">
            <h3 style="margin-top:0;">✨ <?php _e('9개의 위젯 사용 가능!', 'dasom-church'); ?></h3>
            <p style="margin-bottom:0;">
                <?php _e('모든 위젯은 Elementor에서 사용할 수 있습니다. 필요에 따라 개별적으로 활성화/비활성화할 수 있습니다.', 'dasom-church'); ?>
            </p>
        </div>
        
        <?php endif; ?>
        
        <?php submit_button(); ?>
    </form>
</div>

