<?php
/**
 * Dashboard view
 *
 * @package Dasom_Church
 * @since 1.0.0
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get dashboard visibility setting
$dashboard_fields_visibility = get_option('dw_dashboard_fields_visibility', 'administrator');

// Check if current user can view custom fields guide
function can_view_custom_fields_guide($required_role) {
    $role_hierarchy = array(
        'administrator' => 4,
        'editor' => 3,
        'author' => 2,
        'contributor' => 1
    );
    
    $user = wp_get_current_user();
    $user_level = 0;
    
    foreach ($role_hierarchy as $role => $level) {
        if (in_array($role, $user->roles)) {
            $user_level = max($user_level, $level);
        }
    }
    
    $required_level = isset($role_hierarchy[$required_role]) ? $role_hierarchy[$required_role] : 4;
    
    return $user_level >= $required_level;
}

$default_preacher = get_option('default_sermon_preacher', __('담임목사', 'dasom-church'));
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
    <h1><?php _e('교회 관리 대시보드', 'dasom-church'); ?></h1>
    <p><?php _e('교회주보, 설교, 목회컬럼, 교회앨범, 배너의 최신 현황을 한눈에 확인할 수 있습니다.', 'dasom-church'); ?></p>
    
    
    
    <hr>
    
    <!-- 최신 현황 카드 -->
    <div class="dasom-dashboard-grid">
        <!-- 교회주보 -->
        <div class="dasom-dashboard-card">
            <div class="dasom-card-header">
                <h2>📖 <?php _e('교회주보', 'dasom-church'); ?></h2>
                <a href="<?php echo admin_url('edit.php?post_type=bulletin'); ?>" class="dasom-view-all"><?php _e('전체보기', 'dasom-church'); ?></a>
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
                echo '<p class="dasom-empty">' . __('주보가 없습니다.', 'dasom-church') . '</p>';
            }
            ?>
        </div>
        
        <!-- 설교 -->
        <div class="dasom-dashboard-card">
            <div class="dasom-card-header">
                <h2>🎤 <?php _e('설교', 'dasom-church'); ?></h2>
                <a href="<?php echo admin_url('edit.php?post_type=sermon'); ?>" class="dasom-view-all"><?php _e('전체보기', 'dasom-church'); ?></a>
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
                echo '<p class="dasom-empty">' . __('설교가 없습니다.', 'dasom-church') . '</p>';
            }
            ?>
        </div>
        
        <!-- 목회컬럼 -->
        <div class="dasom-dashboard-card">
            <div class="dasom-card-header">
                <h2>🖋 <?php _e('목회컬럼', 'dasom-church'); ?></h2>
                <a href="<?php echo admin_url('edit.php?post_type=column'); ?>" class="dasom-view-all"><?php _e('전체보기', 'dasom-church'); ?></a>
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
                        echo '<span class="dasom-youtube">📺</span>';
                    }
                    echo '<span class="dasom-date">' . get_the_date('Y.m.d', $post) . '</span>';
                    echo '</li>';
                }
                echo '</ul>';
            } else {
                echo '<p class="dasom-empty">' . __('목회컬럼이 없습니다.', 'dasom-church') . '</p>';
            }
            ?>
        </div>
        
        <!-- 교회앨범 -->
        <div class="dasom-dashboard-card">
            <div class="dasom-card-header">
                <h2>📷 <?php _e('교회앨범', 'dasom-church'); ?></h2>
                <a href="<?php echo admin_url('edit.php?post_type=album'); ?>" class="dasom-view-all"><?php _e('전체보기', 'dasom-church'); ?></a>
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
                echo '<p class="dasom-empty">' . __('앨범이 없습니다.', 'dasom-church') . '</p>';
            }
            ?>
        </div>
        
        <!-- 배너 -->
        <div class="dasom-dashboard-card">
            <div class="dasom-card-header">
                <h2>🎯 <?php _e('배너', 'dasom-church'); ?></h2>
                <a href="<?php echo admin_url('edit.php?post_type=banner'); ?>" class="dasom-view-all"><?php _e('전체보기', 'dasom-church'); ?></a>
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
                        $status_label = '<span style="color:#f0ad4e;">⏰ ' . __('예약됨', 'dasom-church') . '</span>';
                    } elseif ($post->post_status === 'draft') {
                        $status_label = '<span style="color:#999;">📄 ' . __('Draft', 'dasom-church') . '</span>';
                    } elseif ($end_date && strtotime($end_date) < current_time('timestamp')) {
                        $status_label = '<span style="color:#dc3545;">⏱️ ' . __('만료됨', 'dasom-church') . '</span>';
                    }
                    
                    echo '<li>';
                    echo '<a href="' . get_edit_post_link($post->ID) . '">' . esc_html(get_the_title($post)) . '</a>';
                    if ($link_url) {
                        echo '<span class="dasom-youtube">🔗</span>';
                    }
                    if ($status_label) {
                        echo $status_label . ' ';
                    }
                    echo '<span class="dasom-date">' . get_the_date('Y.m.d', $post) . '</span>';
                    echo '</li>';
                }
                echo '</ul>';
            } else {
                echo '<p class="dasom-empty">' . __('배너가 없습니다.', 'dasom-church') . '</p>';
            }
            ?>
        </div>
    </div>
</div>