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
$enable_single_bulletin_widget = get_option('dw_enable_single_bulletin_widget', 'yes');
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
        <a href="?page=dasom-church-settings&tab=speaker_management" class="nav-tab <?php echo $active_tab == 'speaker_management' ? 'nav-tab-active' : ''; ?>">
            <?php _e('설교자 관리', 'dasom-church'); ?>
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
        
        <?php elseif ($active_tab == 'speaker_management'): ?>
        <!-- 설교자 관리 탭 -->
        <h2>🧑‍💼 <?php _e('설교자 관리', 'dasom-church'); ?></h2>
        <p><?php _e('설교자 목록을 관리하고 기본 설교자를 설정할 수 있습니다.', 'dasom-church'); ?></p>
        
        <form method="post" style="margin-bottom:20px;">
            <?php wp_nonce_field('sermon_preacher_actions'); ?>
            <input type="hidden" name="preacher_action" value="add">
            <input type="text" name="preacher_name" class="regular-text" placeholder="<?php _e('설교자 이름 추가', 'dasom-church'); ?>">
            <?php submit_button(__('추가', 'dasom-church'), 'secondary', '', false); ?>
        </form>
        
        <table class="widefat striped" style="max-width:900px;">
            <thead>
                <tr>
                    <th style="width:40px;"><?php _e('ID', 'dasom-church'); ?></th>
                    <th><?php _e('이름', 'dasom-church'); ?></th>
                    <th style="width:200px;"><?php _e('동작', 'dasom-church'); ?></th>
                </tr>
            </thead>
            <tbody>
                <?php if ($preachers): ?>
                    <?php foreach($preachers as $term): ?>
                        <tr>
                            <td><?php echo (int)$term->term_id; ?></td>
                            <td>
                                <form method="post" style="display:flex;gap:8px;align-items:center;">
                                    <?php wp_nonce_field('sermon_preacher_actions'); ?>
                                    <input type="hidden" name="preacher_action" value="rename">
                                    <input type="hidden" name="term_id" value="<?php echo (int)$term->term_id; ?>">
                                    <input type="text" name="new_name" value="<?php echo esc_attr($term->name); ?>" class="regular-text" style="max-width:300px;">
                                    <?php submit_button(__('이름 변경', 'dasom-church'), 'small', '', false); ?>
                                </form>
                            </td>
                            <td>
                                <?php $is_default = ($term->name === $default_preacher); ?>
                                <form method="post" style="display:inline;">
                                    <?php wp_nonce_field('sermon_preacher_actions'); ?>
                                    <input type="hidden" name="preacher_action" value="set_default">
                                    <input type="hidden" name="term_id" value="<?php echo (int)$term->term_id; ?>">
                                    <button type="submit" class="button <?php echo $is_default ? 'button-secondary' : 'button-primary'; ?>" <?php echo $is_default ? 'disabled style="cursor:not-allowed;opacity:0.5;"' : ''; ?>>
                                        <?php echo $is_default ? __('기본 설교자 (현재)', 'dasom-church') : __('기본 설교자로 지정', 'dasom-church'); ?>
                                    </button>
                                </form>
                                <form method="post" style="display:inline;margin-left:8px;" onsubmit="return confirm('<?php _e('삭제하시겠습니까? 이 설교자가 지정된 글의 설교자 값은 비어 있을 수 있습니다.', 'dasom-church'); ?>');">
                                    <?php wp_nonce_field('sermon_preacher_actions'); ?>
                                    <input type="hidden" name="preacher_action" value="delete">
                                    <input type="hidden" name="term_id" value="<?php echo (int)$term->term_id; ?>">
                                    <button type="submit" class="button button-link-delete" style="color:#b32d2e;">
                                        <?php _e('삭제', 'dasom-church'); ?>
                                    </button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr><td colspan="3"><?php _e('등록된 설교자가 없습니다.', 'dasom-church'); ?></td></tr>
                <?php endif; ?>
            </tbody>
        </table>
        
        <?php endif; ?>
        
        <?php submit_button(); ?>
    </form>
</div>

