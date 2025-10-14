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
?>

<div class="wrap">
    <h1><?php echo esc_html__('Church Settings', 'dasom-church'); ?></h1>
    
    <form method="post" action="">
        <?php wp_nonce_field('dasom_church_settings_action', 'dasom_church_settings_nonce'); ?>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dasom_church_name"><?php echo esc_html__('Church Name', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dasom_church_name" name="dasom_church_name" value="<?php echo esc_attr($church_name); ?>" class="regular-text" />
                    <p class="description"><?php echo esc_html__('Enter the name of your church.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dasom_church_address"><?php echo esc_html__('Church Address', 'dasom-church'); ?></label>
                </th>
                <td>
                    <textarea id="dasom_church_address" name="dasom_church_address" rows="3" cols="50"><?php echo esc_textarea($church_address); ?></textarea>
                    <p class="description"><?php echo esc_html__('Enter the full address of your church.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dasom_church_phone"><?php echo esc_html__('Phone Number', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="text" id="dasom_church_phone" name="dasom_church_phone" value="<?php echo esc_attr($church_phone); ?>" class="regular-text" />
                    <p class="description"><?php echo esc_html__('Enter the church phone number.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dasom_church_email"><?php echo esc_html__('Email Address', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="email" id="dasom_church_email" name="dasom_church_email" value="<?php echo esc_attr($church_email); ?>" class="regular-text" />
                    <p class="description"><?php echo esc_html__('Enter the church email address.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dasom_church_website"><?php echo esc_html__('Website URL', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dasom_church_website" name="dasom_church_website" value="<?php echo esc_attr($church_website); ?>" class="regular-text" />
                    <p class="description"><?php echo esc_html__('Enter the church website URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
        </table>
        
        <h2><?php echo esc_html__('Social Media URLs', 'dasom-church'); ?></h2>
        <p><?php echo esc_html__('Enter your church social media URLs below. Leave empty if not applicable.', 'dasom-church'); ?></p>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dasom_social_youtube"><?php echo esc_html__('YouTube', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dasom_social_youtube" name="dasom_social_youtube" value="<?php echo esc_attr($social_youtube); ?>" class="regular-text" placeholder="https://www.youtube.com/channel/..." />
                    <p class="description"><?php echo esc_html__('Enter your YouTube channel URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dasom_social_instagram"><?php echo esc_html__('Instagram', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dasom_social_instagram" name="dasom_social_instagram" value="<?php echo esc_attr($social_instagram); ?>" class="regular-text" placeholder="https://www.instagram.com/..." />
                    <p class="description"><?php echo esc_html__('Enter your Instagram profile URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dasom_social_facebook"><?php echo esc_html__('Facebook', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dasom_social_facebook" name="dasom_social_facebook" value="<?php echo esc_attr($social_facebook); ?>" class="regular-text" placeholder="https://www.facebook.com/..." />
                    <p class="description"><?php echo esc_html__('Enter your Facebook page URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dasom_social_linkedin"><?php echo esc_html__('LinkedIn', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dasom_social_linkedin" name="dasom_social_linkedin" value="<?php echo esc_attr($social_linkedin); ?>" class="regular-text" placeholder="https://www.linkedin.com/company/..." />
                    <p class="description"><?php echo esc_html__('Enter your LinkedIn company page URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dasom_social_tiktok"><?php echo esc_html__('TikTok', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dasom_social_tiktok" name="dasom_social_tiktok" value="<?php echo esc_attr($social_tiktok); ?>" class="regular-text" placeholder="https://www.tiktok.com/@..." />
                    <p class="description"><?php echo esc_html__('Enter your TikTok profile URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dasom_social_kakaotalk"><?php echo esc_html__('KakaoTalk', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dasom_social_kakaotalk" name="dasom_social_kakaotalk" value="<?php echo esc_attr($social_kakaotalk); ?>" class="regular-text" placeholder="https://open.kakao.com/o/..." />
                    <p class="description"><?php echo esc_html__('Enter your KakaoTalk open chat URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="dasom_social_kakaotalk_channel"><?php echo esc_html__('KakaoTalk Channel', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="url" id="dasom_social_kakaotalk_channel" name="dasom_social_kakaotalk_channel" value="<?php echo esc_attr($social_kakaotalk_channel); ?>" class="regular-text" placeholder="https://pf.kakao.com/..." />
                    <p class="description"><?php echo esc_html__('Enter your KakaoTalk Channel URL.', 'dasom-church'); ?></p>
                </td>
            </tr>
        </table>
        
        <?php submit_button(); ?>
    </form>
</div>

