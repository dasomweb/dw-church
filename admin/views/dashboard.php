<?php
/**
 * Dashboard view
 *
 * @package DW_Church
 * @since 1.0.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

?>

<div class="wrap">
    <h1><?php _e('ÍµêÌöå Í¥ÄÎ¶??Ä?úÎ≥¥??, 'dw-church'); ?></h1>
    <p><?php _e('ÍµêÌöåÏ£ºÎ≥¥, ?§Íµê, Î™©ÌöåÏª¨Îüº, ÍµêÌöå?®Î≤î, ?¥Î≤§?? Î∞∞ÎÑà??ÏµúÏã† ?ÑÌô©???úÎàà???ïÏù∏?????àÏäµ?àÎã§.', 'dw-church'); ?></p>
    
    
    
    <hr>
    
    <!-- ÏµúÏã† ?ÑÌô© Ïπ¥Îìú -->
    <div class="dasom-dashboard-grid">
        <!-- ÍµêÌöåÏ£ºÎ≥¥ -->
        <div class="dasom-dashboard-card">
            <div class="dasom-card-header">
                <h2>?ìñ <?php _e('ÍµêÌöåÏ£ºÎ≥¥', 'dw-church'); ?></h2>
                <a href="<?php echo admin_url('edit.php?post_type=bulletin'); ?>" class="dasom-view-all"><?php _e('?ÑÏ≤¥Î≥¥Í∏∞', 'dw-church'); ?></a>
            </div>
            <?php
            $bulletins = get_posts(array(
                'post_type' => 'bulletin',
                'posts_per_page' => 7,
                'orderby' => 'date',
                'order' => 'DESC'
            ));
            if ($bulletins) {
                echo '<ul class="dasom-dashboard-list">';
                foreach ($bulletins as $post) {
                    $date = get_post_meta($post->ID, 'dw_bulletin_date', true);
                    $formatted_date = $date ? date_i18n('Y.m.d', strtotime($date)) : get_the_date('Y.m.d', $post);
                    echo '<li>';
                    echo '<a href="' . get_edit_post_link($post->ID) . '">' . esc_html(get_the_title($post)) . '</a>';
                    echo '<span class="dasom-date">' . esc_html($formatted_date) . '</span>';
                    echo '</li>';
                }
                echo '</ul>';
            } else {
                echo '<p class="dasom-empty">' . __('Ï£ºÎ≥¥Í∞Ä ?ÜÏäµ?àÎã§.', 'dw-church') . '</p>';
            }
            ?>
        </div>
        
        <!-- ?§Íµê -->
        <div class="dasom-dashboard-card">
            <div class="dasom-card-header">
                <h2>?é§ <?php _e('?§Íµê', 'dw-church'); ?></h2>
                <a href="<?php echo admin_url('edit.php?post_type=sermon'); ?>" class="dasom-view-all"><?php _e('?ÑÏ≤¥Î≥¥Í∏∞', 'dw-church'); ?></a>
            </div>
            <?php
            $sermons = get_posts(array(
                'post_type' => 'sermon',
                'posts_per_page' => 7,
                'orderby' => 'date',
                'order' => 'DESC'
            ));
            if ($sermons) {
                echo '<ul class="dasom-dashboard-list">';
                foreach ($sermons as $post) {
                    $scripture = get_post_meta($post->ID, 'dw_sermon_scripture', true);
                    $date = get_post_meta($post->ID, 'dw_sermon_date', true);
                    $formatted_date = $date ? date_i18n('Y.m.d', strtotime($date)) : get_the_date('Y.m.d', $post);
                    echo '<li>';
                    echo '<a href="' . get_edit_post_link($post->ID) . '">' . esc_html(get_the_title($post)) . '</a>';
                    if ($scripture) {
                        echo '<span class="dasom-scripture">' . esc_html($scripture) . '</span>';
                    }
                    echo '<span class="dasom-date">' . esc_html($formatted_date) . '</span>';
                    echo '</li>';
                }
                echo '</ul>';
            } else {
                echo '<p class="dasom-empty">' . __('?§ÍµêÍ∞Ä ?ÜÏäµ?àÎã§.', 'dw-church') . '</p>';
            }
            ?>
        </div>
        
        <!-- Î™©ÌöåÏª¨Îüº -->
        <div class="dasom-dashboard-card">
            <div class="dasom-card-header">
                <h2>?ñã <?php _e('Î™©ÌöåÏª¨Îüº', 'dw-church'); ?></h2>
                <a href="<?php echo admin_url('edit.php?post_type=column'); ?>" class="dasom-view-all"><?php _e('?ÑÏ≤¥Î≥¥Í∏∞', 'dw-church'); ?></a>
            </div>
            <?php
            $columns = get_posts(array(
                'post_type' => 'column',
                'posts_per_page' => 7,
                'orderby' => 'date',
                'order' => 'DESC'
            ));
            if ($columns) {
                echo '<ul class="dasom-dashboard-list">';
                foreach ($columns as $post) {
                    $youtube = get_post_meta($post->ID, 'dw_column_youtube', true);
                    echo '<li>';
                    echo '<a href="' . get_edit_post_link($post->ID) . '">' . esc_html(get_the_title($post)) . '</a>';
                    if ($youtube) {
                        echo '<span class="dasom-youtube">?ì∫</span>';
                    }
                    echo '<span class="dasom-date">' . get_the_date('Y.m.d', $post) . '</span>';
                    echo '</li>';
                }
                echo '</ul>';
            } else {
                echo '<p class="dasom-empty">' . __('Î™©ÌöåÏª¨Îüº???ÜÏäµ?àÎã§.', 'dw-church') . '</p>';
            }
            ?>
        </div>
        
        <!-- ÍµêÌöå?®Î≤î -->
        <div class="dasom-dashboard-card">
            <div class="dasom-card-header">
                <h2>?ì∑ <?php _e('ÍµêÌöå?®Î≤î', 'dw-church'); ?></h2>
                <a href="<?php echo admin_url('edit.php?post_type=album'); ?>" class="dasom-view-all"><?php _e('?ÑÏ≤¥Î≥¥Í∏∞', 'dw-church'); ?></a>
            </div>
            <?php
            $albums = get_posts(array(
                'post_type' => 'album',
                'posts_per_page' => 7,
                'orderby' => 'date',
                'order' => 'DESC'
            ));
            if ($albums) {
                echo '<ul class="dasom-dashboard-list">';
                foreach ($albums as $post) {
                    $youtube = get_post_meta($post->ID, 'dw_album_youtube', true);
                    echo '<li>';
                    echo '<a href="' . get_edit_post_link($post->ID) . '">' . esc_html(get_the_title($post)) . '</a>';
                    if ($youtube) {
                        echo '<span class="dasom-youtube"><a href="' . esc_url($youtube) . '" target="_blank">YouTube</a></span>';
                    }
                    echo '<span class="dasom-date">' . get_the_date('Y.m.d', $post) . '</span>';
                    echo '</li>';
                }
                echo '</ul>';
            } else {
                echo '<p class="dasom-empty">' . __('?®Î≤î???ÜÏäµ?àÎã§.', 'dw-church') . '</p>';
            }
            ?>
        </div>
        
        <!-- ?¥Î≤§??-->
        <div class="dasom-dashboard-card">
            <div class="dasom-card-header">
                <h2>?éâ <?php _e('?¥Î≤§??, 'dw-church'); ?></h2>
                <a href="<?php echo admin_url('edit.php?post_type=event'); ?>" class="dasom-view-all"><?php _e('?ÑÏ≤¥Î≥¥Í∏∞', 'dw-church'); ?></a>
            </div>
            <?php
            $events = get_posts(array(
                'post_type' => 'event',
                'posts_per_page' => 7,
                'post_status' => array('publish', 'future', 'draft'),
                'orderby' => 'date',
                'order' => 'DESC'
            ));
            if ($events) {
                echo '<ul class="dasom-dashboard-list">';
                foreach ($events as $post) {
                    $event_date = get_post_meta($post->ID, 'dw_event_date', true);
                    $event_time = get_post_meta($post->ID, 'dw_event_time', true);
                    $status_label = '';
                    
                    if ($post->post_status === 'future') {
                        $status_label = '<span style="color:#f0ad4e;">??' . __('?àÏïΩ??, 'dw-church') . '</span>';
                    } elseif ($post->post_status === 'draft') {
                        $status_label = '<span style="color:#999;">?ìÑ ' . __('Draft', 'dw-church') . '</span>';
                    } elseif ($event_date && strtotime($event_date) < current_time('timestamp')) {
                        $status_label = '<span style="color:#dc3545;">?±Ô∏è ' . __('Ï¢ÖÎ£å??, 'dw-church') . '</span>';
                    }
                    
                    echo '<li>';
                    echo '<a href="' . get_edit_post_link($post->ID) . '">' . esc_html(get_the_title($post)) . '</a>';
                    if ($event_date) {
                        $formatted_date = date_i18n('Y.m.d', strtotime($event_date));
                        if ($event_time) {
                            $formatted_date .= ' ' . esc_html($event_time);
                        }
                        echo '<span class="dasom-date">' . esc_html($formatted_date) . '</span>';
                    } else {
                        echo '<span class="dasom-date">' . get_the_date('Y.m.d', $post) . '</span>';
                    }
                    if ($status_label) {
                        echo ' ' . $status_label;
                    }
                    echo '</li>';
                }
                echo '</ul>';
            } else {
                echo '<p class="dasom-empty">' . __('?¥Î≤§?∏Í? ?ÜÏäµ?àÎã§.', 'dw-church') . '</p>';
            }
            ?>
        </div>
        
        <!-- Î∞∞ÎÑà -->
        <div class="dasom-dashboard-card">
            <div class="dasom-card-header">
                <h2>?éØ <?php _e('Î∞∞ÎÑà', 'dw-church'); ?></h2>
                <a href="<?php echo admin_url('edit.php?post_type=banner'); ?>" class="dasom-view-all"><?php _e('?ÑÏ≤¥Î≥¥Í∏∞', 'dw-church'); ?></a>
            </div>
            <?php
            $banners = get_posts(array(
                'post_type' => 'banner',
                'posts_per_page' => 7,
                'post_status' => array('publish', 'future', 'draft'),
                'orderby' => 'date',
                'order' => 'DESC'
            ));
            if ($banners) {
                echo '<ul class="dasom-dashboard-list">';
                foreach ($banners as $post) {
                    $link_url = get_post_meta($post->ID, 'dw_banner_link_url', true);
                    $end_date = get_post_meta($post->ID, 'dw_banner_end_date', true);
                    $status_label = '';
                    
                    if ($post->post_status === 'future') {
                        $status_label = '<span style="color:#f0ad4e;">??' . __('?àÏïΩ??, 'dw-church') . '</span>';
                    } elseif ($post->post_status === 'draft') {
                        $status_label = '<span style="color:#999;">?ìÑ ' . __('Draft', 'dw-church') . '</span>';
                    } elseif ($end_date && strtotime($end_date) < current_time('timestamp')) {
                        $status_label = '<span style="color:#dc3545;">?±Ô∏è ' . __('ÎßåÎ£å??, 'dw-church') . '</span>';
                    }
                    
                    echo '<li>';
                    echo '<a href="' . get_edit_post_link($post->ID) . '">' . esc_html(get_the_title($post)) . '</a>';
                    if ($link_url) {
                        echo '<span class="dasom-youtube">?îó</span>';
                    }
                    if ($status_label) {
                        echo $status_label . ' ';
                    }
                    echo '<span class="dasom-date">' . get_the_date('Y.m.d', $post) . '</span>';
                    echo '</li>';
                }
                echo '</ul>';
            } else {
                echo '<p class="dasom-empty">' . __('Î∞∞ÎÑàÍ∞Ä ?ÜÏäµ?àÎã§.', 'dw-church') . '</p>';
            }
            ?>
        </div>
    </div>
</div>
