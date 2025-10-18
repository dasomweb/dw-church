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
        
        <?php endif; ?>
        
        <?php submit_button(); ?>
    </form>
</div>

