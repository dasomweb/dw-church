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
        <a href="?page=dasom-church-settings&tab=github_update" class="nav-tab <?php echo $active_tab == 'github_update' ? 'nav-tab-active' : ''; ?>">
            <?php _e('GitHub 업데이트', 'dasom-church'); ?>
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
        
        <?php elseif ($active_tab == 'github_update'): ?>
        
        <!-- GitHub 업데이트 탭 -->
        <h2><?php echo esc_html__('GitHub 업데이트 설정', 'dasom-church'); ?></h2>
        <p><?php echo esc_html__('비공개(Private) GitHub 저장소에서 플러그인 업데이트를 받으려면 Personal Access Token이 필요합니다.', 'dasom-church'); ?></p>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_github_access_token"><?php echo esc_html__('GitHub Personal Access Token', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="password" id="dw_github_access_token" name="dw_github_access_token" value="<?php echo esc_attr($github_token); ?>" class="regular-text" placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                    <p class="description">
                        <?php echo esc_html__('공개(Public) 저장소의 경우 이 필드를 비워두세요.', 'dasom-church'); ?><br><br>
                        <strong><?php echo esc_html__('📝 토큰 생성 방법:', 'dasom-church'); ?></strong><br>
                        1. <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener" class="button button-secondary" style="margin:8px 0;display:inline-block;"><?php echo esc_html__('→ GitHub Token 생성하기', 'dasom-church'); ?></a><br>
                        2. <strong>Note:</strong> "DW Church Plugin Updates" 입력<br>
                        3. <strong>Expiration:</strong> 만료 기간 선택 (권장: No expiration 또는 1 year)<br>
                        4. <strong>Scopes:</strong> <code>repo</code> 체크 (Full control of private repositories)<br>
                        5. "Generate token" 클릭 후 토큰을 복사하여 위 필드에 붙여넣기<br>
                        6. "변경사항 저장" 버튼 클릭<br><br>
                        <strong style="color:#d63638;">⚠️ <?php echo esc_html__('중요:', 'dasom-church'); ?></strong> <?php echo esc_html__('토큰은 한 번만 표시되므로 안전한 곳에 보관하세요.', 'dasom-church'); ?>
                    </p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <?php echo esc_html__('업데이트 캐시', 'dasom-church'); ?>
                </th>
                <td>
                    <a href="<?php echo esc_url(admin_url('plugins.php?dasom_check_update=1')); ?>" class="button button-secondary">
                        <?php echo esc_html__('🔄 업데이트 강제 확인', 'dasom-church'); ?>
                    </a>
                    <p class="description">
                        <?php echo esc_html__('GitHub에서 최신 릴리스를 즉시 확인합니다. (캐시 무시)', 'dasom-church'); ?><br>
                        <?php echo esc_html__('Token을 변경한 후 또는 업데이트가 감지되지 않을 때 사용하세요.', 'dasom-church'); ?>
                    </p>
                </td>
            </tr>
        </table>
        
        <div class="notice notice-info inline" style="margin:20px 0;padding:12px;">
            <p>
                <strong>💡 <?php echo esc_html__('사용 팁:', 'dasom-church'); ?></strong><br>
                • <?php echo esc_html__('Token 저장 후 "업데이트 강제 확인" 버튼을 클릭하여 연결을 테스트하세요.', 'dasom-church'); ?><br>
                • <?php echo esc_html__('플러그인 → DW Church Management System에서 자동 업데이트를 활성화할 수 있습니다.', 'dasom-church'); ?><br>
                • <?php echo esc_html__('업데이트 실패 시 에러 메시지에서 자세한 정보를 확인할 수 있습니다.', 'dasom-church'); ?>
            </p>
        </div>
        
        <?php endif; ?>
        
        <?php submit_button(); ?>
    </form>
</div>

