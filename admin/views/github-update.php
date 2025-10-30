<?php
/**
 * GitHub Update Settings - ?ÖÎ¶Ω???§Ï†ï ?òÏù¥ÏßÄ
 * WordPress Settings Î©îÎâ¥???úÏãú??(?åÎü¨Í∑∏Ïù∏ ?ÖÎç∞?¥Ìä∏???ÅÌñ•Î∞õÏ? ?äÏùå)
 *
 * @package DW_Church
 * @since 1.5.4
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get current values
$github_token = get_option('dw_github_access_token', '');
?>

<div class="wrap">
    <h1><?php echo esc_html__('DW ?§Ï†ï', 'dw-church'); ?></h1>
    
    <?php
    $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'custom_fields';
    ?>
    
    <h2 class="nav-tab-wrapper">
        <a href="?page=dasom-church-github-update&tab=custom_fields" class="nav-tab <?php echo $active_tab == 'custom_fields' ? 'nav-tab-active' : ''; ?>">
            <?php _e('Ïª§Ïä§?Ä ?ÑÎìú ?àÎÇ¥', 'dw-church'); ?>
        </a>
        <a href="?page=dasom-church-github-update&tab=user_role_control" class="nav-tab <?php echo $active_tab == 'user_role_control' ? 'nav-tab-active' : ''; ?>">
            <?php _e('?¨Ïö©??Í∂åÌïú Í¥ÄÎ¶?, 'dw-church'); ?>
        </a>
        <a href="?page=dasom-church-github-update&tab=github_update" class="nav-tab <?php echo $active_tab == 'github_update' ? 'nav-tab-active' : ''; ?>">
            <?php _e('GitHub ?ÖÎç∞?¥Ìä∏', 'dw-church'); ?>
        </a>
        <a href="?page=dasom-church-github-update&tab=widgets" class="nav-tab <?php echo $active_tab == 'widgets' ? 'nav-tab-active' : ''; ?>">
            <?php _e('?ÑÏ†Ø ?§Ï†ï', 'dw-church'); ?>
        </a>
        <a href="?page=dasom-church-github-update&tab=plugin_settings" class="nav-tab <?php echo $active_tab == 'plugin_settings' ? 'nav-tab-active' : ''; ?>">
            <?php _e('?åÎü¨Í∑∏Ïù∏ ?§Ï†ï', 'dw-church'); ?>
        </a>
        <a href="?page=dasom-church-github-update&tab=admin_customization" class="nav-tab <?php echo $active_tab == 'admin_customization' ? 'nav-tab-active' : ''; ?>">
            <?php _e('Í¥ÄÎ¶¨Ïûê Ïª§Ïä§?∞Îßà?¥Ïßï', 'dw-church'); ?>
        </a>
    </h2>
    
    <?php if ($active_tab == 'custom_fields'): ?>
    <!-- Ïª§Ïä§?Ä ?ÑÎìú ?àÎÇ¥ ??-->
    <h2>?ìå <?php _e('Elementor?êÏÑú ?¨Ïö©??Ïª§Ïä§?Ä ?ÑÎìú ?àÎÇ¥', 'dw-church'); ?></h2>
    <p><?php _e('?ÑÎûò Ïª§Ïä§?Ä ?ÑÎìú ?§Î? Elementor ??Dynamic Tags ??Post Custom Field ??Custom Key ?ÖÎ†•Ïπ∏Ïóê ?£Ïñ¥ ?¨Ïö©?òÏÑ∏??', 'dw-church'); ?></p>
    
    <table class="widefat striped" style="max-width:900px;margin:20px 0;">
        <thead>
            <tr>
                <th style="width:180px;"><?php _e('?¨Ïä§???Ä??, 'dw-church'); ?></th>
                <th style="width:200px;"><?php _e('?ÑÎìú ?§Î™Ö', 'dw-church'); ?></th>
                <th><?php _e('Ïª§Ïä§?Ä ?ÑÎìú ??, 'dw-church'); ?></th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td rowspan="4">?ìñ <?php _e('ÍµêÌöåÏ£ºÎ≥¥ (bulletin)', 'dw-church'); ?></td>
                <td><?php _e('Ï£ºÎ≥¥ ?†Ïßú (YYYY-MM-DD)', 'dw-church'); ?></td>
                <td><code>dw_bulletin_date</code></td>
            </tr>
            <tr>
                <td><?php _e('Ï£ºÎ≥¥ ?†Ïßú (?úÍ?)', 'dw-church'); ?></td>
                <td><code>dw_bulletin_date_formatted</code></td>
            </tr>
            <tr>
                <td><?php _e('Ï£ºÎ≥¥ PDF Ï≤®Î? ID', 'dw-church'); ?></td>
                <td><code>dw_bulletin_pdf</code></td>
            </tr>
            <tr>
                <td><?php _e('Ï£ºÎ≥¥ ?¥Î?ÏßÄ (JSON Î∞∞Ïó¥)', 'dw-church'); ?></td>
                <td><code>dw_bulletin_images</code></td>
            </tr>
            <tr>
                <td rowspan="5">?é§ <?php _e('?§Íµê (sermon)', 'dw-church'); ?></td>
                <td><?php _e('?§Íµê ?úÎ™©', 'dw-church'); ?></td>
                <td><code>dw_sermon_title</code></td>
            </tr>
            <tr>
                <td><?php _e('?±Í≤ΩÍµ¨Ï†à', 'dw-church'); ?></td>
                <td><code>dw_sermon_scripture</code></td>
            </tr>
            <tr>
                <td><?php _e('YouTube URL', 'dw-church'); ?></td>
                <td><code>dw_sermon_youtube</code></td>
            </tr>
            <tr>
                <td><?php _e('?§Íµê ?ºÏûê', 'dw-church'); ?></td>
                <td><code>dw_sermon_date</code></td>
            </tr>
            <tr>
                <td><?php _e('?§Íµê??, 'dw-church'); ?></td>
                <td><code>dw_sermon_preacher</code></td>
            </tr>
            <tr>
                <td rowspan="3">?ì∑ <?php _e('ÍµêÌöå?®Î≤î (album)', 'dw-church'); ?></td>
                <td><?php _e('YouTube URL', 'dw-church'); ?></td>
                <td><code>dw_album_youtube</code></td>
            </tr>
            <tr>
                <td><?php _e('?∏ÎÑ§???¥Î?ÏßÄ ID', 'dw-church'); ?></td>
                <td><code>dw_album_thumb_id</code></td>
            </tr>
            <tr>
                <td><?php _e('?®Î≤î ?¥Î?ÏßÄ (JSON Î∞∞Ïó¥)', 'dw-church'); ?></td>
                <td><code>dw_album_images</code></td>
            </tr>
            <tr>
                <td rowspan="6">?éØ <?php _e('Î∞∞ÎÑà (banner)', 'dw-church'); ?></td>
                <td><?php _e('PC??Î∞∞ÎÑà ?¥Î?ÏßÄ ID', 'dw-church'); ?></td>
                <td><code>dw_banner_pc_image</code></td>
            </tr>
            <tr>
                <td><?php _e('Î™®Î∞î?ºÏö© Î∞∞ÎÑà ?¥Î?ÏßÄ ID', 'dw-church'); ?></td>
                <td><code>dw_banner_mobile_image</code></td>
            </tr>
            <tr>
                <td><?php _e('ÎßÅÌÅ¨ URL', 'dw-church'); ?></td>
                <td><code>dw_banner_link_url</code></td>
            </tr>
            <tr>
                <td><?php _e('ÎßÅÌÅ¨ ?ÄÍ≤?, 'dw-church'); ?></td>
                <td><code>dw_banner_link_target</code></td>
            </tr>
            <tr>
                <td><?php _e('?úÏûë ?†Ïßú', 'dw-church'); ?></td>
                <td><code>dw_banner_start_date</code></td>
            </tr>
            <tr>
                <td><?php _e('Ï¢ÖÎ£å ?†Ïßú', 'dw-church'); ?></td>
                <td><code>dw_banner_end_date</code></td>
            </tr>
            <tr>
                <td rowspan="4">?ñã <?php _e('Î™©ÌöåÏª¨Îüº (column)', 'dw-church'); ?></td>
                <td><?php _e('?ÅÎã® ?¥Î?ÏßÄ ID', 'dw-church'); ?></td>
                <td><code>dw_column_top_image</code></td>
            </tr>
            <tr>
                <td><?php _e('?òÎã® ?¥Î?ÏßÄ ID', 'dw-church'); ?></td>
                <td><code>dw_column_bottom_image</code></td>
            </tr>
            <tr>
                <td><?php _e('YouTube URL', 'dw-church'); ?></td>
                <td><code>dw_column_youtube</code></td>
            </tr>
            <tr>
                <td><?php _e('YouTube ?∏ÎÑ§??ID', 'dw-church'); ?></td>
                <td><code>dw_column_thumb_id</code></td>
            </tr>
            <tr>
                <td rowspan="5">?éâ <?php _e('?¥Î≤§??(event)', 'dw-church'); ?></td>
                <td><?php _e('?¥Î≤§???úÏûë ?†Ïßú', 'dw-church'); ?></td>
                <td><code>dw_event_start_date</code></td>
            </tr>
            <tr>
                <td><?php _e('?¥Î≤§??Ï¢ÖÎ£å ?†Ïßú', 'dw-church'); ?></td>
                <td><code>dw_event_end_date</code></td>
            </tr>
            <tr>
                <td><?php _e('?¥Î≤§???úÍ∞Ñ', 'dw-church'); ?></td>
                <td><code>dw_event_time</code></td>
            </tr>
            <tr>
                <td><?php _e('?¥Î≤§???•ÏÜå', 'dw-church'); ?></td>
                <td><code>dw_event_location</code></td>
            </tr>
            <tr>
                <td><?php _e('?¥Î≤§???∏ÎÑ§???¥Î?ÏßÄ ID', 'dw-church'); ?></td>
                <td><code>dw_event_thumbnail</code></td>
            </tr>
        </tbody>
    </table>
    
    <p style="margin-top:20px;padding:12px;background:#f0f0f1;border-left:4px solid #2271b1;">
        <strong><?php _e('?í° Elementor ?¨Ïö© ??', 'dw-church'); ?></strong><br>
        <?php _e('Dynamic Tags ??Post ??Post Custom Field?êÏÑú ???§Î? ?ÖÎ†•?òÏó¨ ?¨Ïö©?òÏÑ∏??', 'dw-church'); ?><br><br>
        <strong><?php _e('?ìé ?¥Î?ÏßÄ/PDF IDÎ•?URLÎ°?Î≥Ä??', 'dw-church'); ?></strong><br>
        ??<?php _e('?¥Î?ÏßÄ URL:', 'dw-church'); ?> <code>wp_get_attachment_image_url( get_post_meta( get_the_ID(), 'dw_column_top_image', true ), 'full' )</code><br>
        ??<?php _e('PDF URL:', 'dw-church'); ?> <code>wp_get_attachment_url( get_post_meta( get_the_ID(), 'dw_bulletin_pdf', true ) )</code><br>
        ??<?php _e('?∏ÎÑ§??URL:', 'dw-church'); ?> <code>wp_get_attachment_image_url( get_post_meta( get_the_ID(), 'dw_sermon_thumb_id', true ), 'large' )</code><br><br>
        <strong><?php _e('?†Ô∏è JSON Î∞∞Ïó¥ ?∞Ïù¥??', 'dw-church'); ?></strong><br>
        <?php _e('dw_bulletin_images, dw_album_images??JSON Î∞∞Ïó¥ ?ïÌÉúÎ°??Ä?•Îêò??Elementor Í∏∞Î≥∏ Custom FieldÎ°úÎäî Í∑∏Î?Î°?Ï∂úÎ†•?òÏ? ?äÏäµ?àÎã§. Shortcode ?êÎäî Ïª§Ïä§?Ä PHP ÏΩîÎìúÎ°?Ï≤òÎ¶¨?òÏÑ∏??', 'dw-church'); ?>
    </p>
    
    <!-- ÍµêÌöå?§Ï†ï Ïª§Ïä§?Ä ?ÑÎìú ?àÎÇ¥ -->
    <hr>
    <h2>?èõÔ∏?<?php _e('ÍµêÌöå?§Ï†ï Ïª§Ïä§?Ä ?ÑÎìú ?àÎÇ¥', 'dw-church'); ?></h2>
    <p><?php _e('?ÑÎûò Ïª§Ïä§?Ä ?ÑÎìú ?§Î? Elementor ??Dynamic Tags ??Post Custom Field ??Custom Key ?ÖÎ†•Ïπ∏Ïóê ?£Ïñ¥ ?¨Ïö©?òÏÑ∏??', 'dw-church'); ?></p>
    
    <table class="widefat striped" style="max-width:900px;margin:20px 0;">
        <thead>
            <tr>
                <th style="width:200px;"><?php _e('?§Ï†ï Î∂ÑÎ•ò', 'dw-church'); ?></th>
                <th style="width:200px;"><?php _e('?ÑÎìú ?§Î™Ö', 'dw-church'); ?></th>
                <th><?php _e('Ïª§Ïä§?Ä ?ÑÎìú ??, 'dw-church'); ?></th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td rowspan="5">?è¢ <?php _e('Í∏∞Î≥∏ ?ïÎ≥¥', 'dw-church'); ?></td>
                <td><?php _e('ÍµêÌöåÎ™?, 'dw-church'); ?></td>
                <td><code>dw_church_name</code></td>
            </tr>
            <tr>
                <td><?php _e('ÍµêÌöå Ï£ºÏÜå', 'dw-church'); ?></td>
                <td><code>dw_church_address</code></td>
            </tr>
            <tr>
                <td><?php _e('?ÑÌôîÎ≤àÌò∏', 'dw-church'); ?></td>
                <td><code>dw_church_phone</code></td>
            </tr>
            <tr>
                <td><?php _e('?¥Î©î??, 'dw-church'); ?></td>
                <td><code>dw_church_email</code></td>
            </tr>
            <tr>
                <td><?php _e('?πÏÇ¨?¥Ìä∏ URL', 'dw-church'); ?></td>
                <td><code>dw_church_website</code></td>
            </tr>
            <tr>
                <td rowspan="7">?ì± <?php _e('?åÏÖúÎØ∏Îîî??, 'dw-church'); ?></td>
                <td><?php _e('YouTube Ï±ÑÎÑê', 'dw-church'); ?></td>
                <td><code>dw_social_youtube</code></td>
            </tr>
            <tr>
                <td><?php _e('Instagram', 'dw-church'); ?></td>
                <td><code>dw_social_instagram</code></td>
            </tr>
            <tr>
                <td><?php _e('Facebook', 'dw-church'); ?></td>
                <td><code>dw_social_facebook</code></td>
            </tr>
            <tr>
                <td><?php _e('LinkedIn', 'dw-church'); ?></td>
                <td><code>dw_social_linkedin</code></td>
            </tr>
            <tr>
                <td><?php _e('TikTok', 'dw-church'); ?></td>
                <td><code>dw_social_tiktok</code></td>
            </tr>
            <tr>
                <td><?php _e('KakaoTalk', 'dw-church'); ?></td>
                <td><code>dw_social_kakaotalk</code></td>
            </tr>
            <tr>
                <td><?php _e('KakaoTalk Channel', 'dw-church'); ?></td>
                <td><code>dw_social_kakaotalk_channel</code></td>
            </tr>
        </tbody>
    </table>
    
    <p style="color:#666;">
        <?php _e('??ÍµêÌöå?§Ï†ï?Ä WordPress ?µÏÖò?ºÎ°ú ?Ä?•ÎêòÎ©? Elementor?êÏÑú Site Settings ?êÎäî Custom FieldsÎ°??ëÍ∑º?????àÏäµ?àÎã§.', 'dw-church'); ?>
    </p>
    
    <?php elseif ($active_tab == 'user_role_control'): ?>
    <!-- ?¨Ïö©??Í∂åÌïú Í¥ÄÎ¶???-->
    <h2>?ë• <?php _e('?¨Ïö©??Í∂åÌïú Í¥ÄÎ¶?, 'dw-church'); ?></h2>
    <p><?php _e('Author?Ä Editor ??ï†???¨Ïö©?êÍ? Î≥????àÎäî Î©îÎâ¥Î•?Í¥ÄÎ¶¨Ìï† ???àÏäµ?àÎã§.', 'dw-church'); ?></p>
    
    <?php
    // Get current settings
    $menu_visibility_settings = get_option('dw_menu_visibility_settings', array());
    
    // Default menu items for Author/Editor
    $default_menus = array(
        'dashboard' => array('name' => '?Ä?úÎ≥¥??, 'default_author' => true, 'default_editor' => true),
        'sermon' => array('name' => '?§Íµê', 'default_author' => true, 'default_editor' => true),
        'column' => array('name' => 'Î™©ÌöåÏª¨Îüº', 'default_author' => true, 'default_editor' => true),
        'bulletin' => array('name' => 'ÍµêÌöåÏ£ºÎ≥¥', 'default_author' => true, 'default_editor' => true),
        'album' => array('name' => 'ÍµêÌöå?®Î≤î', 'default_author' => true, 'default_editor' => true),
        'event' => array('name' => '?¥Î≤§??, 'default_author' => true, 'default_editor' => true),
        'banner' => array('name' => 'Î∞∞ÎÑà', 'default_author' => true, 'default_editor' => true),
        'settings' => array('name' => '?§Ï†ï', 'default_author' => true, 'default_editor' => true),
        'posts' => array('name' => 'Posts', 'default_author' => true, 'default_editor' => true),
        'pages' => array('name' => 'Pages', 'default_author' => true, 'default_editor' => true),
        'media' => array('name' => 'Media', 'default_author' => true, 'default_editor' => true),
        'users' => array('name' => 'Users', 'default_author' => true, 'default_editor' => true),
        'profile' => array('name' => '?ÑÎ°ú??, 'default_author' => true, 'default_editor' => true),
        'logout' => array('name' => 'Î°úÍ∑∏?ÑÏõÉ', 'default_author' => true, 'default_editor' => true),
    );
    
    // Handle form submission
    if (isset($_POST['save_menu_visibility']) && wp_verify_nonce($_POST['menu_visibility_nonce'], 'save_menu_visibility')) {
        $new_settings = array();
        
        foreach ($default_menus as $menu_key => $menu_data) {
            $new_settings[$menu_key] = array(
                'author' => isset($_POST['menu_visibility'][$menu_key]['author']) ? true : false,
                'editor' => isset($_POST['menu_visibility'][$menu_key]['editor']) ? true : false,
            );
        }
        
        update_option('dw_menu_visibility_settings', $new_settings);
        echo '<div class="notice notice-success"><p>' . __('?§Ï†ï???Ä?•Îêò?àÏäµ?àÎã§.', 'dw-church') . '</p></div>';
        
        // Refresh settings
        $menu_visibility_settings = $new_settings;
    }
    ?>
    
    <form method="post" action="">
        <?php wp_nonce_field('save_menu_visibility', 'menu_visibility_nonce'); ?>
        
        <table class="widefat striped" style="max-width:800px;">
            <thead>
                <tr>
                    <th style="width:200px;"><?php _e('Î©îÎâ¥ ??™©', 'dw-church'); ?></th>
                    <th style="width:100px;text-align:center;"><?php _e('Author', 'dw-church'); ?></th>
                    <th style="width:100px;text-align:center;"><?php _e('Editor', 'dw-church'); ?></th>
                    <th><?php _e('?§Î™Ö', 'dw-church'); ?></th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($default_menus as $menu_key => $menu_data): ?>
                    <?php
                    $author_visible = isset($menu_visibility_settings[$menu_key]['author']) 
                        ? $menu_visibility_settings[$menu_key]['author'] 
                        : $menu_data['default_author'];
                    $editor_visible = isset($menu_visibility_settings[$menu_key]['editor']) 
                        ? $menu_visibility_settings[$menu_key]['editor'] 
                        : $menu_data['default_editor'];
                    ?>
                    <tr>
                        <td><strong><?php echo esc_html($menu_data['name']); ?></strong></td>
                        <td style="text-align:center;">
                            <input type="checkbox" 
                                   name="menu_visibility[<?php echo esc_attr($menu_key); ?>][author]" 
                                   value="1" 
                                   <?php checked($author_visible, true); ?> />
                        </td>
                        <td style="text-align:center;">
                            <input type="checkbox" 
                                   name="menu_visibility[<?php echo esc_attr($menu_key); ?>][editor]" 
                                   value="1" 
                                   <?php checked($editor_visible, true); ?> />
                        </td>
                        <td>
                            <?php
                            switch($menu_key) {
                                case 'dashboard':
                                    echo __('DW ÍµêÌöåÍ¥ÄÎ¶??Ä?úÎ≥¥??, 'dw-church');
                                    break;
                                case 'sermon':
                                    echo __('?§Íµê Í¥ÄÎ¶?, 'dw-church');
                                    break;
                                case 'column':
                                    echo __('Î™©ÌöåÏª¨Îüº Í¥ÄÎ¶?, 'dw-church');
                                    break;
                                case 'bulletin':
                                    echo __('ÍµêÌöåÏ£ºÎ≥¥ Í¥ÄÎ¶?, 'dw-church');
                                    break;
                                case 'album':
                                    echo __('ÍµêÌöå?®Î≤î Í¥ÄÎ¶?, 'dw-church');
                                    break;
                                case 'event':
                                    echo __('?¥Î≤§??Í¥ÄÎ¶?, 'dw-church');
                                    break;
                                case 'banner':
                                    echo __('Î∞∞ÎÑà Í¥ÄÎ¶?, 'dw-church');
                                    break;
                                case 'settings':
                                    echo __('DW ÍµêÌöåÍ¥ÄÎ¶??§Ï†ï', 'dw-church');
                                    break;
                                case 'posts':
                                    echo __('WordPress Posts Í¥ÄÎ¶?, 'dw-church');
                                    break;
                                case 'pages':
                                    echo __('WordPress Pages Í¥ÄÎ¶?, 'dw-church');
                                    break;
                                case 'media':
                                    echo __('ÎØ∏Îîî???ºÏù¥Î∏åÎü¨Î¶?, 'dw-church');
                                    break;
                                case 'users':
                                    echo __('?¨Ïö©??Í¥ÄÎ¶?, 'dw-church');
                                    break;
                                case 'profile':
                                    echo __('?ÑÎ°ú??(Í¥ÄÎ¶¨Ïûê Î∞??®Í? ?úÏóêÎß??úÏãú)', 'dw-church');
                                    break;
                                case 'logout':
                                    echo __('Î°úÍ∑∏?ÑÏõÉ (Í¥ÄÎ¶¨Ïûê Î∞??®Í? ?úÏóêÎß??úÏãú)', 'dw-church');
                                    break;
                                default:
                                    echo __('Í∏∞Ì? Î©îÎâ¥', 'dw-church');
                            }
                            ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        
        <div style="background:#f0f7ff;padding:15px;border-left:4px solid #2271b1;margin:20px 0;">
            <h3 style="margin-top:0;">?í° <?php _e('?¨Ïö© Î∞©Î≤ï:', 'dw-church'); ?></h3>
            <ul style="margin-bottom:0;">
                <li><?php _e('Ï≤¥ÌÅ¨??Î©îÎâ¥???¥Îãπ ??ï†???¨Ïö©?êÍ? Î≥????àÏäµ?àÎã§.', 'dw-church'); ?></li>
                <li><?php _e('Ï≤¥ÌÅ¨ ?¥Ï†ú??Î©îÎâ¥???¥Îãπ ??ï†???¨Ïö©?êÏóêÍ≤??®Í≤®ÏßëÎãà??', 'dw-church'); ?></li>
                <li><?php _e('?àÎ°ú Ï∂îÍ????åÎü¨Í∑∏Ïù∏ Î©îÎâ¥??Í∏∞Î≥∏?ÅÏúºÎ°??®Í≤®ÏßëÎãà??', 'dw-church'); ?></li>
                <li><?php _e('Administrator??Î™®Îì† Î©îÎâ¥???ëÍ∑º?????àÏäµ?àÎã§.', 'dw-church'); ?></li>
            </ul>
        </div>
        
        <input type="hidden" name="save_menu_visibility" value="1" />
        <?php submit_button(__('?§Ï†ï ?Ä??, 'dw-church')); ?>
    </form>
    
    <?php elseif ($active_tab == 'github_update'): ?>
    <p class="description" style="font-size:14px;margin-top:10px;">
        <?php echo esc_html__('???§Ï†ï?Ä WordPress Settings Î©îÎâ¥???àÏñ¥ ?åÎü¨Í∑∏Ïù∏ ?ÖÎç∞?¥Ìä∏???ÅÌñ•Î∞õÏ? ?äÏäµ?àÎã§.', 'dw-church'); ?>
    </p>
    
    <form method="post" action="">
        <?php wp_nonce_field('dasom_church_settings_action', 'dasom_church_settings_nonce'); ?>
        
        <h2><?php echo esc_html__('GitHub Personal Access Token', 'dw-church'); ?></h2>
        <p><?php echo esc_html__('ÎπÑÍ≥µÍ∞?Private) GitHub ?Ä?•ÏÜå?êÏÑú ?åÎü¨Í∑∏Ïù∏ ?ÖÎç∞?¥Ìä∏Î•?Î∞õÏúº?§Î©¥ Personal Access Token???ÑÏöî?©Îãà??', 'dw-church'); ?></p>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_github_access_token"><?php echo esc_html__('GitHub Token', 'dw-church'); ?></label>
                </th>
                <td>
                    <input type="password" id="dw_github_access_token" name="dw_github_access_token" value="<?php echo esc_attr($github_token); ?>" class="regular-text" placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                    <p class="description">
                        <?php echo esc_html__('Í≥µÍ∞ú(Public) ?Ä?•ÏÜå??Í≤ΩÏö∞ ???ÑÎìúÎ•?ÎπÑÏõå?êÏÑ∏??', 'dw-church'); ?><br><br>
                        <strong><?php echo esc_html__('?ìù ?†ÌÅ∞ ?ùÏÑ± Î∞©Î≤ï:', 'dw-church'); ?></strong><br>
                        1. <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener" class="button button-secondary" style="margin:8px 0;display:inline-block;"><?php echo esc_html__('??GitHub Token ?ùÏÑ±?òÍ∏∞', 'dw-church'); ?></a><br>
                        2. <strong>Note:</strong> "DW Church Plugin Updates" ?ÖÎ†•<br>
                        3. <strong>Expiration:</strong> ÎßåÎ£å Í∏∞Í∞Ñ ?†ÌÉù (Í∂åÏû•: No expiration ?êÎäî 1 year)<br>
                        4. <strong>Scopes:</strong> <code>repo</code> Ï≤¥ÌÅ¨ (Full control of private repositories)<br>
                        5. "Generate token" ?¥Î¶≠ ???†ÌÅ∞??Î≥µÏÇ¨?òÏó¨ ???ÑÎìú??Î∂ôÏó¨?£Í∏∞<br>
                        6. "Î≥ÄÍ≤ΩÏÇ¨???Ä?? Î≤ÑÌäº ?¥Î¶≠<br><br>
                        <strong style="color:#d63638;">?†Ô∏è <?php echo esc_html__('Ï§ëÏöî:', 'dw-church'); ?></strong> <?php echo esc_html__('?†ÌÅ∞?Ä ??Î≤àÎßå ?úÏãú?òÎ?Î°??àÏ†Ñ??Í≥≥Ïóê Î≥¥Í??òÏÑ∏??', 'dw-church'); ?>
                    </p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <?php echo esc_html__('?ÖÎç∞?¥Ìä∏ Ï∫êÏãú', 'dw-church'); ?>
                </th>
                <td>
                    <a href="<?php echo esc_url(admin_url('plugins.php?dasom_check_update=1')); ?>" class="button button-secondary">
                        <?php echo esc_html__('?îÑ ?ÖÎç∞?¥Ìä∏ Í∞ïÏ†ú ?ïÏù∏', 'dw-church'); ?>
                    </a>
                    <p class="description">
                        <?php echo esc_html__('GitHub?êÏÑú ÏµúÏã† Î¶¥Î¶¨?§Î? Ï¶âÏãú ?ïÏù∏?©Îãà?? (Ï∫êÏãú Î¨¥Ïãú)', 'dw-church'); ?><br>
                        <?php echo esc_html__('Token??Î≥ÄÍ≤ΩÌïú ???êÎäî ?ÖÎç∞?¥Ìä∏Í∞Ä Í∞êÏ??òÏ? ?äÏùÑ ???¨Ïö©?òÏÑ∏??', 'dw-church'); ?>
                    </p>
                </td>
            </tr>
        </table>
        
        <div class="notice notice-info inline" style="margin:20px 0;padding:12px;">
            <p>
                <strong>?í° <?php echo esc_html__('?¨Ïö© ??', 'dw-church'); ?></strong><br>
                ??<?php echo esc_html__('Token ?Ä????"?ÖÎç∞?¥Ìä∏ Í∞ïÏ†ú ?ïÏù∏" Î≤ÑÌäº???¥Î¶≠?òÏó¨ ?∞Í≤∞???åÏä§?∏Ìïò?∏Ïöî.', 'dw-church'); ?><br>
                ??<?php echo esc_html__('?åÎü¨Í∑∏Ïù∏ ??DW Church Management System?êÏÑú ?êÎèô ?ÖÎç∞?¥Ìä∏Î•??úÏÑ±?îÌï† ???àÏäµ?àÎã§.', 'dw-church'); ?><br>
                ??<?php echo esc_html__('?ÖÎç∞?¥Ìä∏ ?§Ìå® ???êÎü¨ Î©îÏãúÏßÄ?êÏÑú ?êÏÑ∏???ïÎ≥¥Î•??ïÏù∏?????àÏäµ?àÎã§.', 'dw-church'); ?><br>
                ??<strong style="color:#2271b1;">??<?php echo esc_html__('???§Ï†ï?Ä WordPress Settings???àÏñ¥ ?åÎü¨Í∑∏Ïù∏ ?ÖÎç∞?¥Ìä∏ ?úÏóê???†Ï??©Îãà??', 'dw-church'); ?></strong>
            </p>
        </div>
        
        <div class="notice notice-warning inline" style="margin:20px 0;padding:12px;">
            <p>
                <strong>?îí <?php echo esc_html__('Î≥¥Ïïà:', 'dw-church'); ?></strong><br>
                ??<?php echo esc_html__('Token?Ä WordPress ?∞Ïù¥?∞Î≤†?¥Ïä§???àÏ†Ñ?òÍ≤å ?Ä?•Îê©?àÎã§.', 'dw-church'); ?><br>
                ??<?php echo esc_html__('Token???†Ï∂ú?òÎ©¥ Ï¶âÏãú GitHub?êÏÑú ??†ú?òÍ≥† ?àÎ°ú ?ùÏÑ±?òÏÑ∏??', 'dw-church'); ?><br>
                ??<?php echo esc_html__('Token?Ä repo scopeÎß??ÑÏöî?©Îãà??(ÏµúÏÜå Í∂åÌïú ?êÏπô).', 'dw-church'); ?>
            </p>
        </div>
        
        <?php submit_button(); ?>
    </form>
    
    <hr>
    
    <h2><?php echo esc_html__('?åÎü¨Í∑∏Ïù∏ ?ïÎ≥¥', 'dw-church'); ?></h2>
    <table class="widefat striped" style="max-width:600px;">
        <tbody>
            <tr>
                <th style="width:200px;"><?php echo esc_html__('?åÎü¨Í∑∏Ïù∏ ?¥Î¶Ñ', 'dw-church'); ?></th>
                <td>DW Church Management System</td>
            </tr>
            <tr>
                <th><?php echo esc_html__('?ÑÏû¨ Î≤ÑÏ†Ñ', 'dw-church'); ?></th>
                <td><strong><?php echo esc_html(DASOM_CHURCH_VERSION); ?></strong></td>
            </tr>
            <tr>
                <th><?php echo esc_html__('GitHub Repository', 'dw-church'); ?></th>
                <td><a href="https://github.com/dasomweb/dasom-church-management-system" target="_blank" rel="noopener">dasomweb/dasom-church-management-system</a></td>
            </tr>
            <tr>
                <th><?php echo esc_html__('?Ä?•ÏÜå ?Ä??, 'dw-church'); ?></th>
                <td><?php echo esc_html__('?îí Private (ÎπÑÍ≥µÍ∞?', 'dw-church'); ?></td>
            </tr>
            <tr>
                <th><?php echo esc_html__('Token ?ÅÌÉú', 'dw-church'); ?></th>
                <td>
                    <?php if (!empty($github_token)): ?>
                        <span style="color:#46b450;">??<?php echo esc_html__('?§Ï†ï??, 'dw-church'); ?></span>
                        <span style="color:#666;"> (<?php echo esc_html(substr($github_token, 0, 10)); ?>...)</span>
                    <?php else: ?>
                        <span style="color:#d63638;">??<?php echo esc_html__('ÎØ∏ÏÑ§??, 'dw-church'); ?></span>
                    <?php endif; ?>
                </td>
            </tr>
        </tbody>
    </table>
    
    <?php elseif ($active_tab == 'widgets'): ?>
    <!-- ?ÑÏ†Ø ?§Ï†ï ??-->
    <h2><?php _e('?ÑÏ†Ø Í¥ÄÎ¶?, 'dw-church'); ?></h2>
    <p class="description" style="margin-bottom:20px;">
        <?php _e('DW ÍµêÌöåÍ¥ÄÎ¶??úÏä§?úÏóê???úÍ≥µ?òÎäî ?ÑÏ†Ø???¨Ïö© ?¨Î?Î•?Í¥ÄÎ¶¨Ìï† ???àÏäµ?àÎã§. ?ÑÏ†Ø?Ä Elementor, Íµ¨ÌÖêÎ≤ÑÍ∑∏, Kadence Block Pro?êÏÑú ?¨Ïö© Í∞Ä?•Ìï©?àÎã§.', 'dw-church'); ?>
    </p>
    
    <form method="post" action="">
        <?php wp_nonce_field('dasom_church_settings_action', 'dasom_church_settings_nonce'); ?>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_enable_gallery_widget"><?php echo esc_html__('DW Gallery Widget', 'dw-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_gallery_widget" name="dw_enable_gallery_widget" value="yes" <?php checked(get_option('dw_enable_gallery_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Gallery Widget ?¨Ïö©', 'dw-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('Í∏∞Îä•:', 'dw-church'); ?></strong><br>
                            ??<?php echo esc_html__('ÍµêÌöå?®Î≤î ?¥Î?ÏßÄÎ•?Í∞§Îü¨Î¶??ïÌÉúÎ°??úÏãú', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Grid / Masonry ?àÏù¥?ÑÏõÉ ?†ÌÉù', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Î∞òÏùë??Ïª¨Îüº ?§Ï†ï (1-6 Ïª¨Îüº)', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('?¥Î?ÏßÄ ?¨Í∏∞ ?†ÌÉù (Thumbnail, Medium, Large, Full)', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Elementor, Íµ¨ÌÖêÎ≤ÑÍ∑∏, Kadence Block Pro ÏßÄ??, 'dw-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_sermon_widget"><?php echo esc_html__('DW Recent Sermons Widget', 'dw-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_sermon_widget" name="dw_enable_sermon_widget" value="yes" <?php checked(get_option('dw_enable_sermon_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Recent Sermons Widget ?¨Ïö©', 'dw-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('Í∏∞Îä•:', 'dw-church'); ?></strong><br>
                            ??<?php echo esc_html__('ÏµúÍ∑º ?§Íµê Î™©Î°ù ?úÏãú', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Grid / List ?àÏù¥?ÑÏõÉ ?†ÌÉù', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('?§Íµê?? ?§Íµê?? ?∏ÎÑ§???úÏãú', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Î∞òÏùë??Ïª¨Îüº ?§Ï†ï', 'dw-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_single_sermon_widget"><?php echo esc_html__('DW Sermon Widget', 'dw-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_single_sermon_widget" name="dw_enable_single_sermon_widget" value="yes" <?php checked(get_option('dw_enable_single_sermon_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Sermon Widget ?¨Ïö©', 'dw-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('Í∏∞Îä•:', 'dw-church'); ?></strong><br>
                            ??<?php echo esc_html__('?®Ïùº ?§Íµê ?ÅÏÑ∏ ?ïÎ≥¥ ?úÏãú', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('?§Íµê ?úÎ™©, ?§Íµê?? ?±Í≤ΩÍµ¨Ï†à', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('?§Íµê ?∏ÎÑ§??Î∞?Î©îÌ? ?ïÎ≥¥', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('?ÑÏû¨ ?¨Ïä§??/ ÏµúÏã† ?¨Ïä§??/ ?òÎèô ?†ÌÉù', 'dw-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_bulletin_widget"><?php echo esc_html__('DW Recent Bulletin Widget', 'dw-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_bulletin_widget" name="dw_enable_bulletin_widget" value="yes" <?php checked(get_option('dw_enable_bulletin_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Recent Bulletin Widget ?¨Ïö©', 'dw-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('Í∏∞Îä•:', 'dw-church'); ?></strong><br>
                            ??<?php echo esc_html__('ÏµúÍ∑º Ï£ºÎ≥¥ Î™©Î°ù ?úÏãú', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('PDF ?§Ïö¥Î°úÎìú ÎßÅÌÅ¨', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Ï£ºÎ≥¥ ?¥Î?ÏßÄ ?∏ÎÑ§??, 'dw-church'); ?><br>
                            ??<?php echo esc_html__('?†Ïßú???ïÎ†¨', 'dw-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_single_bulletin_widget"><?php echo esc_html__('DW Single Bulletin Widget', 'dw-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_single_bulletin_widget" name="dw_enable_single_bulletin_widget" value="yes" <?php checked(get_option('dw_enable_single_bulletin_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Single Bulletin Widget ?¨Ïö©', 'dw-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('Í∏∞Îä•:', 'dw-church'); ?></strong><br>
                            ??<?php echo esc_html__('?πÏ†ï Ï£ºÎ≥¥ ?†ÌÉù ?úÏãú', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Ï£ºÎ≥¥ ?†Ïßú ?úÏãú', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('PDF ?§Ïö¥Î°úÎìú Î≤ÑÌäº', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Ï£ºÎ≥¥ ?¥Î?ÏßÄ ?ÑÏ≤¥ ?¨Í∏∞Î°??úÏÑú?ÄÎ°??úÏãú', 'dw-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_column_widget"><?php echo esc_html__('DW Pastoral Columns Widget', 'dw-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_column_widget" name="dw_enable_column_widget" value="yes" <?php checked(get_option('dw_enable_column_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Pastoral Columns Widget ?¨Ïö©', 'dw-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('Í∏∞Îä•:', 'dw-church'); ?></strong><br>
                            ??<?php echo esc_html__('ÏµúÍ∑º Î™©ÌöåÏª¨Îüº Î™©Î°ù ?úÏãú', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Ïª¨Îüº ?∏ÎÑ§??Î∞?Î∞úÏ∑åÎ¨?, 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Grid ?àÏù¥?ÑÏõÉ', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Î∞òÏùë??Ïª¨Îüº ?§Ï†ï', 'dw-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_banner_slider_widget"><?php echo esc_html__('DW Banner Slider Widget', 'dw-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_banner_slider_widget" name="dw_enable_banner_slider_widget" value="yes" <?php checked(get_option('dw_enable_banner_slider_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Banner Slider Widget ?¨Ïö©', 'dw-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('Í∏∞Îä•:', 'dw-church'); ?></strong><br>
                            ??<?php echo esc_html__('Î∞∞ÎÑà ?¨Îùº?¥Îçî (Swiper.js)', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Ïπ¥ÌÖåÍ≥†Î¶¨Î≥??ÑÌÑ∞Îß?(Î©îÏù∏/?úÎ∏å)', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('?êÎèô?¨ÏÉù, ?§ÎπÑÍ≤åÏù¥?? ?òÏù¥ÏßÄ?§Ïù¥??, 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Î∞∞ÎÑà ÎßÅÌÅ¨ Î∞??ÄÍ≤??§Ï†ï', 'dw-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_pastoral_column_widget"><?php echo esc_html__('DW Pastoral Column Widget', 'dw-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_pastoral_column_widget" name="dw_enable_pastoral_column_widget" value="yes" <?php checked(get_option('dw_enable_pastoral_column_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Pastoral Column Widget ?¨Ïö©', 'dw-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('Í∏∞Îä•:', 'dw-church'); ?></strong><br>
                            ??<?php echo esc_html__('?®Ïùº Î™©Ìöå Ïª¨Îüº ?úÏãú', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('?ÅÎã® ?¥Î?ÏßÄ, ?úÎ™©, ?†Ïßú, ?¥Ïö©, ?òÎã® ?¥Î?ÏßÄ, YouTube', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Query: Current Post, Latest Post, Manual Selection', 'dw-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_pastoral_columns_grid_widget"><?php echo esc_html__('DW Pastoral Columns Recent Grid Widget', 'dw-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_pastoral_columns_grid_widget" name="dw_enable_pastoral_columns_grid_widget" value="yes" <?php checked(get_option('dw_enable_pastoral_columns_grid_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Pastoral Columns Recent Grid Widget ?¨Ïö©', 'dw-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('Í∏∞Îä•:', 'dw-church'); ?></strong><br>
                            ??<?php echo esc_html__('ÏµúÍ∑º Î™©Ìöå Ïª¨Îüº Í∑∏Î¶¨???úÏãú', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('?∏ÎÑ§?? ?úÎ™©, ?†Ïßú, Î∞úÏ∑åÎ¨??úÏãú', 'dw-church'); ?><br>
                            ??<?php echo esc_html__('Í∑∏Î¶¨??Î¶¨Ïä§???àÏù¥?ÑÏõÉ, Pagination ÏßÄ??, 'dw-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
        </table>
        
        <div style="background:#f0f7ff;padding:15px;border-left:4px solid #2271b1;margin-top:20px;">
            <h3 style="margin-top:0;">??<?php _e('9Í∞úÏùò ?ÑÏ†Ø ?¨Ïö© Í∞Ä??', 'dw-church'); ?></h3>
            <p style="margin-bottom:0;">
                <?php _e('Î™®Îì† ?ÑÏ†Ø?Ä Elementor?êÏÑú ?¨Ïö©?????àÏäµ?àÎã§. ?ÑÏöî???∞Îùº Í∞úÎ≥Ñ?ÅÏúºÎ°??úÏÑ±??ÎπÑÌôú?±Ìôî?????àÏäµ?àÎã§.', 'dw-church'); ?>
            </p>
        </div>
        
        <?php submit_button(); ?>
    </form>
    
    <?php elseif ($active_tab == 'admin_customization'): ?>
    <!-- Í¥ÄÎ¶¨Ïûê Ïª§Ïä§?∞Îßà?¥Ïßï ??-->
    <h2>?é® <?php _e('Í¥ÄÎ¶¨Ïûê Ïª§Ïä§?∞Îßà?¥Ïßï', 'dw-church'); ?></h2>
    <p><?php _e('AdministratorÎ•??úÏô∏??Î™®Îì† ??ï†???¨Ïö©?êÏóêÍ≤??ÅÏö©?òÎäî Í¥ÄÎ¶¨Ïûê Î∞??®Í?, Î©îÎâ¥ ?§Ì??ºÎßÅ, Í¥ÄÎ¶¨Ïûê Î∞??úÎ™© ?§Ï†ï??Í¥ÄÎ¶¨Ìï† ???àÏäµ?àÎã§.', 'dw-church'); ?></p>
    
    <?php
    // Get current settings
    $admin_bar_hide = get_option('dw_admin_bar_hide', 'yes'); // Default: hide admin bar for non-Administrator
    $admin_menu_bg_color = get_option('dw_admin_menu_bg_color', '#1d2327');
    $admin_menu_font_color = get_option('dw_admin_menu_font_color', '#ffffff');
    $admin_menu_font_size = get_option('dw_admin_menu_font_size', '14');
    $admin_menu_font_weight = get_option('dw_admin_menu_font_weight', '400');
    $admin_bar_title = get_option('dw_admin_bar_title', 'DW ÍµêÌöåÍ¥ÄÎ¶?);
    $admin_menu_church_name = get_option('dw_admin_menu_church_name', '');
    $admin_menu_top_image = get_option('dw_admin_menu_top_image', '');
    
    // Handle form submission
    if (isset($_POST['save_admin_customization']) && wp_verify_nonce($_POST['admin_customization_nonce'], 'save_admin_customization')) {
        $admin_bar_hide = sanitize_text_field($_POST['admin_bar_hide']);
        $admin_menu_bg_color = sanitize_hex_color($_POST['admin_menu_bg_color']);
        $admin_menu_font_color = sanitize_hex_color($_POST['admin_menu_font_color']);
        $admin_menu_font_size = sanitize_text_field($_POST['admin_menu_font_size']);
        $admin_menu_font_weight = sanitize_text_field($_POST['admin_menu_font_weight']);
        $admin_bar_title = sanitize_text_field($_POST['admin_bar_title']);
        $admin_menu_church_name = wp_kses($_POST['admin_menu_church_name'], array(
            'br' => array(),
            'strong' => array(),
            'em' => array(),
            'span' => array('style' => array()),
            'div' => array('style' => array()),
            'p' => array('style' => array())
        ));
        $admin_menu_top_image = esc_url_raw($_POST['admin_menu_top_image']);
        
        update_option('dw_admin_bar_hide', $admin_bar_hide);
        update_option('dw_admin_menu_bg_color', $admin_menu_bg_color);
        update_option('dw_admin_menu_font_color', $admin_menu_font_color);
        update_option('dw_admin_menu_font_size', $admin_menu_font_size);
        update_option('dw_admin_menu_font_weight', $admin_menu_font_weight);
        update_option('dw_admin_bar_title', $admin_bar_title);
        update_option('dw_admin_menu_church_name', $admin_menu_church_name);
        update_option('dw_admin_menu_top_image', $admin_menu_top_image);
        
        echo '<div class="notice notice-success"><p>' . __('?§Ï†ï???Ä?•Îêò?àÏäµ?àÎã§.', 'dw-church') . '</p></div>';
    }
    ?>
    
    <form method="post" action="">
        <?php wp_nonce_field('save_admin_customization', 'admin_customization_nonce'); ?>
        
        <table class="form-table">
            <tr>
                <th scope="row"><?php _e('Í¥ÄÎ¶¨Ïûê Î∞??®Í?', 'dw-church'); ?></th>
                <td>
                    <label>
                        <input type="checkbox" name="admin_bar_hide" value="yes" <?php checked($admin_bar_hide, 'yes'); ?> />
                        <?php _e('Í¥ÄÎ¶¨Ïûê Î∞îÎ? ?®ÍπÅ?àÎã§ (?ÑÎ°†?∏Ïóî??Î∞?Î∞±Ïóî?úÏóê??', 'dw-church'); ?>
                    </label>
                    <p class="description"><?php _e('Í∏∞Î≥∏?ÅÏúºÎ°?AdministratorÎ•??úÏô∏??Î™®Îì† ??ï†???¨Ïö©?êÏóêÍ≤?Í¥ÄÎ¶¨Ïûê Î∞îÍ? ?®Í≤®ÏßëÎãà?? Ï≤¥ÌÅ¨ ?¥Ï†ú?òÎ©¥ ?ÑÎ°†?∏Ïóî?úÏ? Î∞±Ïóî??Í¥ÄÎ¶¨Ïûê ?ÅÏó≠) Î™®Îëê?êÏÑú Í¥ÄÎ¶¨Ïûê Î∞îÍ? ?úÏãú?©Îãà??', 'dw-church'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Í¥ÄÎ¶¨Ïûê Î©îÎâ¥ Î∞∞Í≤Ω??, 'dw-church'); ?></th>
                <td>
                    <input type="color" name="admin_menu_bg_color" value="<?php echo esc_attr($admin_menu_bg_color); ?>" />
                    <p class="description"><?php _e('AdministratorÎ•??úÏô∏??Î™®Îì† ??ï†???¨Ïö©?êÏóêÍ≤??ÅÏö©?òÎäî Í¥ÄÎ¶¨Ïûê Î©îÎâ¥??Î∞∞Í≤Ω?âÏùÑ ?§Ï†ï?©Îãà??', 'dw-church'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Í¥ÄÎ¶¨Ïûê Î©îÎâ¥ ?∞Ìä∏??, 'dw-church'); ?></th>
                <td>
                    <input type="color" name="admin_menu_font_color" value="<?php echo esc_attr($admin_menu_font_color); ?>" />
                    <p class="description"><?php _e('AdministratorÎ•??úÏô∏??Î™®Îì† ??ï†???¨Ïö©?êÏóêÍ≤??ÅÏö©?òÎäî Í¥ÄÎ¶¨Ïûê Î©îÎâ¥???∞Ìä∏?âÏùÑ ?§Ï†ï?©Îãà??', 'dw-church'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Í¥ÄÎ¶¨Ïûê Î©îÎâ¥ ?∞Ìä∏ ?¨Ïù¥Ï¶?, 'dw-church'); ?></th>
                <td>
                    <input type="number" name="admin_menu_font_size" value="<?php echo esc_attr($admin_menu_font_size); ?>" min="10" max="24" step="1" style="width:80px;" /> px
                    <p class="description"><?php _e('Í¥ÄÎ¶¨Ïûê Î©îÎâ¥???∞Ìä∏ ?¨Ïù¥Ï¶àÎ? ?§Ï†ï?©Îãà?? (10px ~ 24px)', 'dw-church'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Í¥ÄÎ¶¨Ïûê Î©îÎâ¥ ?∞Ìä∏ ÍµµÍ∏∞', 'dw-church'); ?></th>
                <td>
                    <select name="admin_menu_font_weight" style="width:120px;">
                        <option value="300" <?php selected($admin_menu_font_weight, '300'); ?>>Light (300)</option>
                        <option value="400" <?php selected($admin_menu_font_weight, '400'); ?>>Normal (400)</option>
                        <option value="500" <?php selected($admin_menu_font_weight, '500'); ?>>Medium (500)</option>
                        <option value="600" <?php selected($admin_menu_font_weight, '600'); ?>>Semi Bold (600)</option>
                        <option value="700" <?php selected($admin_menu_font_weight, '700'); ?>>Bold (700)</option>
                        <option value="800" <?php selected($admin_menu_font_weight, '800'); ?>>Extra Bold (800)</option>
                    </select>
                    <p class="description"><?php _e('Í¥ÄÎ¶¨Ïûê Î©îÎâ¥???∞Ìä∏ ÍµµÍ∏∞Î•??§Ï†ï?©Îãà??', 'dw-church'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Í¥ÄÎ¶¨Ïûê Î∞??úÎ™©', 'dw-church'); ?></th>
                <td>
                    <input type="text" name="admin_bar_title" value="<?php echo esc_attr($admin_bar_title); ?>" class="regular-text" />
                    <p class="description"><?php _e('AdministratorÎ•??úÏô∏??Î™®Îì† ??ï†???¨Ïö©?êÏóêÍ≤??ÅÏö©?òÎäî Í¥ÄÎ¶¨Ïûê Î∞??ÅÎã®???úÏãú???úÎ™©???§Ï†ï?©Îãà??', 'dw-church'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Î©îÎâ¥ ?ÅÎã® ?úÎ™©', 'dw-church'); ?></th>
                <td>
                    <textarea name="admin_menu_church_name" rows="3" cols="50" class="large-text"><?php echo esc_textarea($admin_menu_church_name); ?></textarea>
                    <p class="description"><?php _e('Í¥ÄÎ¶¨Ïûê Î©îÎâ¥ ?ÅÎã®???úÏãú???úÎ™©???§Ï†ï?©Îãà?? HTML ?úÍ∑∏ ?¨Ïö© Í∞Ä?? <br>, <strong>, <em>, <span style="color: red;"> ?? ÎπÑÏõå?êÎ©¥ ?úÏãú?òÏ? ?äÏäµ?àÎã§.', 'dw-church'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('Î©îÎâ¥ ?ÅÎã® ?¥Î?ÏßÄ', 'dw-church'); ?></th>
                <td>
                    <input type="url" name="admin_menu_top_image" value="<?php echo esc_attr($admin_menu_top_image); ?>" class="regular-text" placeholder="https://example.com/image.png" />
                    <p class="description"><?php _e('Í¥ÄÎ¶¨Ïûê Î©îÎâ¥ ?ÅÎã®???úÏãú???¥Î?ÏßÄ URL???ÖÎ†•?òÏÑ∏?? ?úÎ™©Í≥??®Íªò ?úÏãú?©Îãà??', 'dw-church'); ?></p>
                </td>
            </tr>
            
        </table>
        
        <div style="background:#f0f7ff;padding:15px;border-left:4px solid #2271b1;margin:20px 0;">
            <h3 style="margin-top:0;">?í° <?php _e('?¨Ïö© Î∞©Î≤ï:', 'dw-church'); ?></h3>
            <ul style="margin-bottom:0;">
                    <li><?php _e('Í¥ÄÎ¶¨Ïûê Î∞??®Í?: AdministratorÎ•??úÏô∏??Î™®Îì† ??ï†???¨Ïö©?êÏóêÍ≤??ÅÏö©?©Îãà?? Í∏∞Î≥∏?ÅÏúºÎ°?Í¥ÄÎ¶¨Ïûê Î∞îÎäî ?®Í≤®ÏßÄÎ©? ?ÑÏöî???ÑÎ°†?∏Ïóî?úÏ? Î∞±Ïóî??Í¥ÄÎ¶¨Ïûê ?ÅÏó≠) Î™®Îëê?êÏÑú Í¥ÄÎ¶¨Ïûê Î∞îÎ? ?úÏãú?????àÏäµ?àÎã§.', 'dw-church'); ?></li>
                    <li><?php _e('Î©îÎâ¥ ?§Ì??ºÎßÅ: AdministratorÎ•??úÏô∏??Î™®Îì† ??ï†???¨Ïö©?êÏóêÍ≤??ÅÏö©?òÎäî Í¥ÄÎ¶¨Ïûê Î©îÎâ¥??Î∞∞Í≤Ω?âÍ≥º ?∞Ìä∏?âÏùÑ Ïª§Ïä§?∞Îßà?¥Ïßï?????àÏäµ?àÎã§.', 'dw-church'); ?></li>
                    <li><?php _e('Í¥ÄÎ¶¨Ïûê Î∞??úÎ™©: AdministratorÎ•??úÏô∏??Î™®Îì† ??ï†???¨Ïö©?êÏóêÍ≤??ÅÏö©?òÎäî Í¥ÄÎ¶¨Ïûê Î∞??ÅÎã®???úÏãú??Î∏åÎûú?úÎ™Ö???§Ï†ï?????àÏäµ?àÎã§.', 'dw-church'); ?></li>
                    <li><?php _e('Collapse Menu ?®Í?: AdministratorÎ•??úÏô∏??Î™®Îì† ??ï†???¨Ïö©?êÏóêÍ≤??ÅÏö©?òÎäî Collapse Menu Î≤ÑÌäº???®ÍπÅ?àÎã§.', 'dw-church'); ?></li>
            </ul>
        </div>
        
        <input type="hidden" name="save_admin_customization" value="1" />
        <?php submit_button(__('?§Ï†ï ?Ä??, 'dw-church')); ?>
    </form>
    
    <?php elseif ($active_tab == 'plugin_settings'): ?>
    <!-- ?åÎü¨Í∑∏Ïù∏ ?§Ï†ï ??-->
    <h2><?php echo esc_html__('?Ä?úÎ≥¥???§Ï†ï', 'dw-church'); ?></h2>
    <table class="form-table">
        <tr>
            <th scope="row">
                <label for="dw_dashboard_fields_visibility"><?php echo esc_html__('Ïª§Ïä§?Ä ?ÑÎìú ?àÎÇ¥ ?úÏãú Í∂åÌïú', 'dw-church'); ?></label>
            </th>
            <td>
                <select id="dw_dashboard_fields_visibility" name="dw_dashboard_fields_visibility">
                    <option value="administrator" <?php selected(get_option('dw_dashboard_fields_visibility', 'administrator'), 'administrator'); ?>><?php echo esc_html__('Administrator (Í¥ÄÎ¶¨Ïûê)', 'dw-church'); ?></option>
                    <option value="editor" <?php selected(get_option('dw_dashboard_fields_visibility', 'administrator'), 'editor'); ?>><?php echo esc_html__('Editor (?∏Ïßë??', 'dw-church'); ?></option>
                    <option value="author" <?php selected(get_option('dw_dashboard_fields_visibility', 'administrator'), 'author'); ?>><?php echo esc_html__('Author (?ëÏÑ±??', 'dw-church'); ?></option>
                    <option value="contributor" <?php selected(get_option('dw_dashboard_fields_visibility', 'administrator'), 'contributor'); ?>><?php echo esc_html__('Contributor (Í∏∞Ïó¨??', 'dw-church'); ?></option>
                </select>
                <p class="description"><?php echo esc_html__('?Ä?úÎ≥¥?úÏóê??"Elementor?êÏÑú ?¨Ïö©??Ïª§Ïä§?Ä ?ÑÎìú ?àÎÇ¥"?Ä "ÍµêÌöå?§Ï†ï Ïª§Ïä§?Ä ?ÑÎìú ?àÎÇ¥" ?πÏÖò??Î≥????àÎäî ÏµúÏÜå Í∂åÌïú???§Ï†ï?©Îãà??', 'dw-church'); ?></p>
            </td>
        </tr>
    </table>
    
    <h2><?php echo esc_html__('?åÎü¨Í∑∏Ïù∏ ??†ú ?§Ï†ï', 'dw-church'); ?></h2>
    <table class="form-table">
        <tr>
            <th scope="row">
                <label for="dw_delete_data_on_uninstall"><?php echo esc_html__('?åÎü¨Í∑∏Ïù∏ ??†ú ???∞Ïù¥????†ú', 'dw-church'); ?></label>
            </th>
            <td>
                <fieldset>
                    <label>
                        <input type="checkbox" id="dw_delete_data_on_uninstall" name="dw_delete_data_on_uninstall" value="yes" <?php checked(get_option('dw_delete_data_on_uninstall', 'no'), 'yes'); ?> />
                        <?php echo esc_html__('?åÎü¨Í∑∏Ïù∏ ??†ú ??Î™®Îì† ?∞Ïù¥????†ú', 'dw-church'); ?>
                    </label>
                    <p class="description" style="margin-top:10px;">
                        <strong style="color:#dc3545;">?†Ô∏è <?php echo esc_html__('Ï£ºÏùò:', 'dw-church'); ?></strong><br>
                        <?php echo esc_html__('???µÏÖò???úÏÑ±?îÌïòÎ©??åÎü¨Í∑∏Ïù∏????†ú?????§Ïùå ?∞Ïù¥?∞Í? Î™®Îëê ??†ú?©Îãà??', 'dw-church'); ?><br>
                        ??<?php echo esc_html__('Î™®Îì† ?¨Ïä§??(Ï£ºÎ≥¥, ?§Íµê, Ïª¨Îüº, ?®Î≤î, Î∞∞ÎÑà)', 'dw-church'); ?><br>
                        ??<?php echo esc_html__('Î™®Îì† Ïª§Ïä§?Ä ?ÑÎìú ?∞Ïù¥??, 'dw-church'); ?><br>
                        ??<?php echo esc_html__('Î™®Îì† ?§Ï†ï ?ïÎ≥¥', 'dw-church'); ?><br>
                        ??<?php echo esc_html__('?§Íµê??taxonomy ?∞Ïù¥??, 'dw-church'); ?><br><br>
                        <strong style="color:#2271b1;">?í° <?php echo esc_html__('Í∂åÏû•:', 'dw-church'); ?></strong><br>
                        <?php echo esc_html__('?∞Ïù¥?∞Î? Î≥¥Ï°¥?òÎ†§Î©????µÏÖò??ÎπÑÌôú?±Ìôî??Ï±ÑÎ°ú ?êÏÑ∏?? ?åÎü¨Í∑∏Ïù∏???§Ïãú ?§Ïπò?òÎ©¥ Í∏∞Ï°¥ ?∞Ïù¥?∞Î? Í∑∏Î?Î°??¨Ïö©?????àÏäµ?àÎã§.', 'dw-church'); ?>
                    </p>
                </fieldset>
            </td>
        </tr>
    </table>
    
    <form method="post" action="">
        <?php wp_nonce_field('dasom_church_settings_action', 'dasom_church_settings_nonce'); ?>
        <?php submit_button(); ?>
    </form>
    
    <?php endif; ?>
</div>

