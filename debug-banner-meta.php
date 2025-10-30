<?php
/**
 * Banner Meta Debugging Script
 * 
 * Usage: 
 * 1. Upload this file to the root directory
 * 2. Access: https://yourdomain.com/debug-banner-meta.php?banner_id=123
 * 3. Replace 123 with your actual banner post ID
 */

// Load WordPress
require_once('./wp-load.php');

// Security check
if (!current_user_can('manage_options')) {
    die('Permission denied. You must be an administrator.');
}

// Get banner ID from URL
$banner_id = isset($_GET['banner_id']) ? intval($_GET['banner_id']) : 0;

if ($banner_id === 0) {
    die('Please provide a banner ID: ?banner_id=123');
}

// Check if post exists
$post = get_post($banner_id);
if (!$post || $post->post_type !== 'banner') {
    die('Banner not found or invalid post type.');
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Banner Meta Debug - ID: <?php echo $banner_id; ?></title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; }
        h1 { color: #0073aa; }
        h2 { color: #333; margin-top: 30px; border-bottom: 2px solid #0073aa; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; width: 40%; }
        td { background: #fff; }
        .success { color: green; font-weight: 600; }
        .warning { color: orange; font-weight: 600; }
        .empty { color: #999; font-style: italic; }
        .code { background: #f0f0f0; padding: 2px 6px; font-family: monospace; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>?îç Banner Meta Debugging</h1>
    <p><strong>Banner ID:</strong> <?php echo $banner_id; ?></p>
    <p><strong>Title:</strong> <?php echo get_the_title($banner_id); ?></p>
    <p><strong>Status:</strong> <?php echo get_post_status($banner_id); ?></p>

    <h2>?ìù Text Content</h2>
    <table>
        <tr>
            <th>Meta Key</th>
            <th>Value</th>
        </tr>
        <tr>
            <td><code>dw_banner_text_title</code></td>
            <td><?php 
                $value = get_post_meta($banner_id, 'dw_banner_text_title', true);
                echo $value ? esc_html($value) : '<span class="empty">(empty)</span>';
            ?></td>
        </tr>
        <tr>
            <td><code>dw_banner_text_subtitle</code></td>
            <td><?php 
                $value = get_post_meta($banner_id, 'dw_banner_text_subtitle', true);
                echo $value ? esc_html($value) : '<span class="empty">(empty)</span>';
            ?></td>
        </tr>
        <tr>
            <td><code>dw_banner_text_description</code></td>
            <td><?php 
                $value = get_post_meta($banner_id, 'dw_banner_text_description', true);
                echo $value ? esc_html($value) : '<span class="empty">(empty)</span>';
            ?></td>
        </tr>
    </table>

    <h2>?ìç Text Position & Alignment</h2>
    <table>
        <tr>
            <th>Meta Key</th>
            <th>Value</th>
        </tr>
        <tr>
            <td><code>dw_banner_text_position</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_text_position', true);
                echo $value ? esc_html($value) : '<span class="warning">NOT SET (default: center-center)</span>';
            ?></strong></td>
        </tr>
        <tr>
            <td><code>dw_banner_text_align</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_text_align', true);
                echo $value ? esc_html($value) : '<span class="warning">NOT SET (default: center)</span>';
            ?></strong></td>
        </tr>
    </table>

    <h2>?ìè Text Container Width (Responsive)</h2>
    <table>
        <tr>
            <th>Device</th>
            <th>Width (px)</th>
        </tr>
        <tr>
            <td>?ñ•Ô∏?PC <code>(dw_banner_text_width_pc)</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_text_width_pc', true);
                echo $value ? $value . 'px' : '<span class="warning">NOT SET (default: 600px)</span>';
            ?></strong></td>
        </tr>
        <tr>
            <td>?íª Laptop <code>(dw_banner_text_width_laptop)</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_text_width_laptop', true);
                echo $value ? $value . 'px' : '<span class="warning">NOT SET (default: 600px)</span>';
            ?></strong></td>
        </tr>
        <tr>
            <td>?ì± Tablet <code>(dw_banner_text_width_tablet)</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_text_width_tablet', true);
                echo $value ? $value . 'px' : '<span class="warning">NOT SET (default: 500px)</span>';
            ?></strong></td>
        </tr>
        <tr>
            <td>?ì± Mobile <code>(dw_banner_text_width_mobile)</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_text_width_mobile', true);
                echo $value ? $value . 'px' : '<span class="warning">NOT SET (default: 300px)</span>';
            ?></strong></td>
        </tr>
    </table>

    <h2>?ñºÔ∏?Background Image Position (Responsive)</h2>
    <table>
        <tr>
            <th>Device</th>
            <th>Position</th>
        </tr>
        <tr>
            <td>?ñ•Ô∏?PC <code>(dw_banner_bg_position_pc)</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_bg_position_pc', true);
                echo $value ? $value : '<span class="warning">NOT SET (default: center center)</span>';
            ?></strong></td>
        </tr>
        <tr>
            <td>?íª Laptop <code>(dw_banner_bg_position_laptop)</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_bg_position_laptop', true);
                echo $value ? $value : '<span class="warning">NOT SET (default: center center)</span>';
            ?></strong></td>
        </tr>
        <tr>
            <td>?ì± Tablet <code>(dw_banner_bg_position_tablet)</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_bg_position_tablet', true);
                echo $value ? $value : '<span class="warning">NOT SET (default: center center)</span>';
            ?></strong></td>
        </tr>
        <tr>
            <td>?ì± Mobile <code>(dw_banner_bg_position_mobile)</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_bg_position_mobile', true);
                echo $value ? $value : '<span class="warning">NOT SET (default: center center)</span>';
            ?></strong></td>
        </tr>
    </table>

    <h2>?ì¶ Content Padding</h2>
    <table>
        <tr>
            <th>Side</th>
            <th>Padding (px)</th>
        </tr>
        <tr>
            <td>‚¨ÜÔ∏è Top <code>(dw_banner_content_padding_top)</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_content_padding_top', true);
                echo $value !== '' ? $value . 'px' : '<span class="warning">NOT SET (default: 40px)</span>';
            ?></strong></td>
        </tr>
        <tr>
            <td>?°Ô∏è Right <code>(dw_banner_content_padding_right)</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_content_padding_right', true);
                echo $value !== '' ? $value . 'px' : '<span class="warning">NOT SET (default: 40px)</span>';
            ?></strong></td>
        </tr>
        <tr>
            <td>‚¨áÔ∏è Bottom <code>(dw_banner_content_padding_bottom)</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_content_padding_bottom', true);
                echo $value !== '' ? $value . 'px' : '<span class="warning">NOT SET (default: 40px)</span>';
            ?></strong></td>
        </tr>
        <tr>
            <td>‚¨ÖÔ∏è Left <code>(dw_banner_content_padding_left)</code></td>
            <td><strong class="success"><?php 
                $value = get_post_meta($banner_id, 'dw_banner_content_padding_left', true);
                echo $value !== '' ? $value . 'px' : '<span class="warning">NOT SET (default: 40px)</span>';
            ?></strong></td>
        </tr>
    </table>

    <h2>?îó Link Settings</h2>
    <table>
        <tr>
            <th>Meta Key</th>
            <th>Value</th>
        </tr>
        <tr>
            <td><code>dw_banner_link_url</code></td>
            <td><?php 
                $value = get_post_meta($banner_id, 'dw_banner_link_url', true);
                echo $value ? '<a href="' . esc_url($value) . '" target="_blank">' . esc_html($value) . '</a>' : '<span class="empty">(empty)</span>';
            ?></td>
        </tr>
        <tr>
            <td><code>dw_banner_link_target</code></td>
            <td><strong><?php 
                $value = get_post_meta($banner_id, 'dw_banner_link_target', true);
                echo $value ? esc_html($value) : '<span class="empty">(default: _self)</span>';
            ?></strong></td>
        </tr>
    </table>

    <h2>?í° Troubleshooting Tips</h2>
    <ul>
        <li><strong>If values show correctly here but not on the frontend:</strong>
            <ul>
                <li>Clear Elementor cache: <code>Elementor ??Tools ??Regenerate CSS & Data</code></li>
                <li>Clear browser cache (Ctrl + F5)</li>
                <li>Check if you're viewing the correct banner ID</li>
            </ul>
        </li>
        <li><strong>If values are NOT SET:</strong>
            <ul>
                <li>Make sure you clicked "Update" button after changing values</li>
                <li>Check browser console for JavaScript errors</li>
                <li>Disable other plugins temporarily to check for conflicts</li>
            </ul>
        </li>
        <li><strong>If padding/width shows as 0:</strong>
            <ul>
                <li>This is valid! 0 means no padding or very narrow width</li>
                <li>Try setting a value like 40 for padding or 600 for width</li>
            </ul>
        </li>
    </ul>

    <p style="margin-top: 40px; padding: 15px; background: #f0f8ff; border-left: 4px solid #0073aa;">
        <strong>?íæ Delete this file after debugging</strong> for security reasons!
    </p>
</body>
</html>

