<?php
/**
 * Settings view
 *
 * @package DW_Church
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

// Speaker management variables (from original dashboard)
$default_preacher = get_option('default_sermon_preacher', __('?¥ÏûÑÎ™©ÏÇ¨', 'dw-church'));
$preachers = get_terms(array(
    'taxonomy' => 'dw_sermon_preacher',
    'hide_empty' => false,
    'orderby' => 'name',
    'order' => 'ASC'
));

// Handle WP_Error
if (is_wp_error($preachers)) {
    $preachers = array();
}
?>

<div class="wrap">
    <h1><?php echo esc_html__('DW ÍµêÌöåÍ¥ÄÎ¶??§Ï†ï', 'dw-church'); ?></h1>
    
    <?php
    $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'church_info';
    ?>
    
    <h2 class="nav-tab-wrapper">
        <a href="?page=dasom-church-settings&tab=church_info" class="nav-tab <?php echo $active_tab == 'church_info' ? 'nav-tab-active' : ''; ?>">
            <?php _e('ÍµêÌöå ?ïÎ≥¥', 'dw-church'); ?>
        </a>
        <a href="?page=dasom-church-settings&tab=speaker_management" class="nav-tab <?php echo $active_tab == 'speaker_management' ? 'nav-tab-active' : ''; ?>">
            <?php _e('?§Íµê??Í¥ÄÎ¶?, 'dw-church'); ?>
        </a>
    </h2>
    
    <form method="post" action="">
        <?php wp_nonce_field('dasom_church_settings_action', 'dasom_church_settings_nonce'); ?>
        
        <?php if ($active_tab == 'church_info'): ?>
        <!-- ÍµêÌöå ?ïÎ≥¥ ??-->
        <h2><?php _e('Í∏∞Î≥∏ ?ïÎ≥¥', 'dw-church'); ?></h2>
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_church_name"><?php echo esc_html__('Church Name', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_church_name" name="dw_church_name" value="<?php echo esc_attr($church_name); ?>" class="regular-text" />
                    <p class="description"><?php echo esc_html__('Enter the name of your church.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_church_address"><?php echo esc_html__('Church Address', 'dw-church'); ?></label>
                </th>
                <td>
                    <textarea id="dw_church_address" name="dw_church_address" rows="3" cols="50"><?php echo esc_textarea($church_address); ?></textarea>
                    <p class="description"><?php echo esc_html__('Enter the full address of your church.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_church_phone"><?php echo esc_html__('Phone Number', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dw_church_phone" name="dw_church_phone" value="<?php echo esc_attr($church_phone); ?>" class="regular-text" />
                    <p class="description"><?php echo esc_html__('Enter the church phone number.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_church_email"><?php echo esc_html__('Email Address', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="email" id="dw_church_email" name="dw_church_email" value="<?php echo esc_attr($church_email); ?>" class="regular-text" />
                    <p class="description"><?php echo esc_html__('Enter the church email address.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_church_website"><?php echo esc_html__('Website URL', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_church_website" name="dw_church_website" value="<?php echo esc_attr($church_website); ?>" class="regular-text" />
                    <p class="description"><?php echo esc_html__('Enter the church website URL.', 'dw-church'); ?></p>
                </td>
            </tr>
        </table>
        
        <h2><?php echo esc_html__('Social Media URLs', 'dw-church'); ?></h2>
        <p><?php echo esc_html__('Enter your church social media URLs below. Leave empty if not applicable.', 'dw-church'); ?></p>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_social_youtube"><?php echo esc_html__('YouTube', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_youtube" name="dw_social_youtube" value="<?php echo esc_attr($social_youtube); ?>" class="regular-text" placeholder="https://www.youtube.com/channel/..." />
                    <p class="description"><?php echo esc_html__('Enter your YouTube channel URL.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_social_instagram"><?php echo esc_html__('Instagram', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_instagram" name="dw_social_instagram" value="<?php echo esc_attr($social_instagram); ?>" class="regular-text" placeholder="https://www.instagram.com/..." />
                    <p class="description"><?php echo esc_html__('Enter your Instagram profile URL.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_social_facebook"><?php echo esc_html__('Facebook', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_facebook" name="dw_social_facebook" value="<?php echo esc_attr($social_facebook); ?>" class="regular-text" placeholder="https://www.facebook.com/..." />
                    <p class="description"><?php echo esc_html__('Enter your Facebook page URL.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_social_linkedin"><?php echo esc_html__('LinkedIn', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_linkedin" name="dw_social_linkedin" value="<?php echo esc_attr($social_linkedin); ?>" class="regular-text" placeholder="https://www.linkedin.com/company/..." />
                    <p class="description"><?php echo esc_html__('Enter your LinkedIn company page URL.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_social_tiktok"><?php echo esc_html__('TikTok', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_tiktok" name="dw_social_tiktok" value="<?php echo esc_attr($social_tiktok); ?>" class="regular-text" placeholder="https://www.tiktok.com/@..." />
                    <p class="description"><?php echo esc_html__('Enter your TikTok profile URL.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_social_kakaotalk"><?php echo esc_html__('KakaoTalk', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_kakaotalk" name="dw_social_kakaotalk" value="<?php echo esc_attr($social_kakaotalk); ?>" class="regular-text" placeholder="https://open.kakao.com/o/..." />
                    <p class="description"><?php echo esc_html__('Enter your KakaoTalk open chat URL.', 'dw-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dw_social_kakaotalk_channel"><?php echo esc_html__('KakaoTalk Channel', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dw_social_kakaotalk_channel" name="dw_social_kakaotalk_channel" value="<?php echo esc_attr($social_kakaotalk_channel); ?>" class="regular-text" placeholder="https://pf.kakao.com/..." />
                    <p class="description"><?php echo esc_html__('Enter your KakaoTalk Channel URL.', 'dw-church'); ?></p>
                </td>
            </tr>
        </table>
        
        <?php elseif ($active_tab == 'speaker_management'): ?>
        <!-- ?§Íµê??Í¥ÄÎ¶???-->
        <hr>
        <h2>?ßë?çüí?<?php _e('?§Íµê??Í¥ÄÎ¶?, 'dw-church'); ?></h2>
        
        <form method="post" style="margin-bottom:20px;">
            <?php wp_nonce_field('sermon_preacher_actions'); ?>
            <input type="hidden" name="preacher_action" value="add">
            <input type="text" name="preacher_name" class="regular-text" placeholder="<?php _e('?§Íµê???¥Î¶Ñ Ï∂îÍ?', 'dw-church'); ?>">
            <?php submit_button(__('Ï∂îÍ?', 'dw-church'), 'secondary', '', false); ?>
        </form>
        
        <table class="widefat striped" style="max-width:900px;">
            <thead>
                <tr>
                    <th style="width:40px;"><?php _e('ID', 'dw-church'); ?></th>
                    <th><?php _e('?¥Î¶Ñ', 'dw-church'); ?></th>
                    <th style="width:200px;"><?php _e('?ôÏûë', 'dw-church'); ?></th>
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
                                    <?php submit_button(__('?¥Î¶Ñ Î≥ÄÍ≤?, 'dw-church'), 'small', '', false); ?>
                                </form>
                            </td>
                            <td>
                                <?php $is_default = ($term->name === $default_preacher); ?>
                                <form method="post" style="display:inline;">
                                    <?php wp_nonce_field('sermon_preacher_actions'); ?>
                                    <input type="hidden" name="preacher_action" value="set_default">
                                    <input type="hidden" name="term_id" value="<?php echo (int)$term->term_id; ?>">
                                    <button type="submit" class="button <?php echo $is_default ? 'button-secondary' : 'button-primary'; ?>" <?php echo $is_default ? 'disabled style="cursor:not-allowed;opacity:0.5;"' : ''; ?>>
                                        <?php echo $is_default ? __('Í∏∞Î≥∏ ?§Íµê??(?ÑÏû¨)', 'dw-church') : __('Í∏∞Î≥∏ ?§Íµê?êÎ°ú ÏßÄ??, 'dw-church'); ?>
                                    </button>
                                </form>
                                <form method="post" style="display:inline;margin-left:8px;" onsubmit="return confirm('<?php _e('??†ú?òÏãúÍ≤†Ïäµ?àÍπå? ???§Íµê?êÍ? ÏßÄ?ïÎêú Í∏Ä???§Íµê??Í∞íÏ? ÎπÑÏñ¥ ?àÏùÑ ???àÏäµ?àÎã§.', 'dw-church'); ?>');">
                                    <?php wp_nonce_field('sermon_preacher_actions'); ?>
                                    <input type="hidden" name="preacher_action" value="delete">
                                    <input type="hidden" name="term_id" value="<?php echo (int)$term->term_id; ?>">
                                    <button type="submit" class="button button-link-delete" style="color:#b32d2e;">
                                        <?php _e('??†ú', 'dw-church'); ?>
                                    </button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr><td colspan="3"><?php _e('?±Î°ù???§Íµê?êÍ? ?ÜÏäµ?àÎã§.', 'dw-church'); ?></td></tr>
                <?php endif; ?>
            </tbody>
        </table>
        
        <?php endif; ?>
        
        <?php submit_button(); ?>
    </form>
</div>

