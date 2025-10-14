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
    <p><?php _e('교회주보, 설교, 목회컬럼, 교회앨범의 최신 현황을 한눈에 확인할 수 있습니다.', 'dasom-church'); ?></p>
    
    <!-- 설교자 관리 -->
    <hr>
    <h2>🧑‍💼 <?php _e('설교자 관리', 'dasom-church'); ?></h2>
    
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
                            <form method="post" style="display:inline;">
                                <?php wp_nonce_field('sermon_preacher_actions'); ?>
                                <input type="hidden" name="preacher_action" value="set_default">
                                <input type="hidden" name="term_id" value="<?php echo (int)$term->term_id; ?>">
                                <?php 
                                $is_default = ($term->name === $default_preacher);
                                submit_button(
                                    $is_default ? __('기본설교자(현재)', 'dasom-church') : __('기본설교자로 지정', 'dasom-church'),
                                    $is_default ? 'secondary' : 'primary small',
                                    '',
                                    false,
                                    $is_default ? array('disabled' => 'disabled') : array()
                                ); 
                                ?>
                            </form>
                            <form method="post" style="display:inline;margin-left:8px;" onsubmit="return confirm('<?php _e('삭제하시겠습니까? 이 설교자가 지정된 글의 설교자 값은 비어 있을 수 있습니다.', 'dasom-church'); ?>');">
                                <?php wp_nonce_field('sermon_preacher_actions'); ?>
                                <input type="hidden" name="preacher_action" value="delete">
                                <input type="hidden" name="term_id" value="<?php echo (int)$term->term_id; ?>">
                                <?php submit_button(__('삭제', 'dasom-church'), 'delete small', '', false); ?>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr><td colspan="3"><?php _e('등록된 설교자가 없습니다.', 'dasom-church'); ?></td></tr>
            <?php endif; ?>
        </tbody>
    </table>
    
    <?php if (current_user_can('administrator')): ?>
        <!-- Elementor Custom Field 안내 (관리자만 표시) -->
        <hr>
        <h2>📌 <?php _e('Elementor에서 사용할 커스텀 필드 안내', 'dasom-church'); ?></h2>
        <p><?php _e('아래 커스텀 필드 키를 Elementor → Dynamic Tags → Post Custom Field → Custom Key 입력칸에 넣어 사용하세요.', 'dasom-church'); ?></p>
        
        <table class="widefat striped" style="max-width:900px;margin:20px 0;">
            <thead>
                <tr>
                    <th style="width:180px;"><?php _e('포스트 타입', 'dasom-church'); ?></th>
                    <th style="width:200px;"><?php _e('필드 설명', 'dasom-church'); ?></th>
                    <th><?php _e('커스텀 필드 키', 'dasom-church'); ?></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td rowspan="3">📖 <?php _e('교회주보 (bulletin)', 'dasom-church'); ?></td>
                    <td><?php _e('주보 날짜', 'dasom-church'); ?></td>
                    <td><code>dw_bulletin_date</code></td>
                </tr>
                <tr>
                    <td><?php _e('주보 PDF 첨부 ID', 'dasom-church'); ?></td>
                    <td><code>dw_bulletin_pdf</code></td>
                </tr>
                <tr>
                    <td><?php _e('주보 이미지 (JSON 배열)', 'dasom-church'); ?></td>
                    <td><code>dw_bulletin_images</code></td>
                </tr>
                <tr>
                    <td rowspan="5">🎤 <?php _e('설교 (sermon)', 'dasom-church'); ?></td>
                    <td><?php _e('설교 제목', 'dasom-church'); ?></td>
                    <td><code>dw_sermon_title</code></td>
                </tr>
                <tr>
                    <td><?php _e('성경구절', 'dasom-church'); ?></td>
                    <td><code>dw_sermon_scripture</code></td>
                </tr>
                <tr>
                    <td><?php _e('YouTube URL', 'dasom-church'); ?></td>
                    <td><code>dw_sermon_youtube</code></td>
                </tr>
                <tr>
                    <td><?php _e('설교 일자', 'dasom-church'); ?></td>
                    <td><code>dw_sermon_date</code></td>
                </tr>
                <tr>
                    <td><?php _e('설교자', 'dasom-church'); ?></td>
                    <td><code>sermon_preacher</code></td>
                </tr>
                <tr>
                    <td rowspan="3">📷 <?php _e('교회앨범 (album)', 'dasom-church'); ?></td>
                    <td><?php _e('YouTube URL', 'dasom-church'); ?></td>
                    <td><code>dw_album_youtube</code></td>
                </tr>
                <tr>
                    <td><?php _e('썸네일 이미지 ID', 'dasom-church'); ?></td>
                    <td><code>dw_album_thumb_id</code></td>
                </tr>
                <tr>
                    <td><?php _e('앨범 이미지 (JSON 배열)', 'dasom-church'); ?></td>
                    <td><code>dw_album_images</code></td>
                </tr>
                <tr>
                    <td rowspan="5">🖋 <?php _e('목회컬럼 (column)', 'dasom-church'); ?></td>
                    <td><?php _e('상단 이미지', 'dasom-church'); ?></td>
                    <td><code>dw_column_top_image</code></td>
                </tr>
                <tr>
                    <td><?php _e('하단 이미지', 'dasom-church'); ?></td>
                    <td><code>dw_column_bottom_image</code></td>
                </tr>
                <tr>
                    <td><?php _e('YouTube URL', 'dasom-church'); ?></td>
                    <td><code>dw_column_youtube</code></td>
                </tr>
                <tr>
                    <td><?php _e('YouTube 썸네일 ID', 'dasom-church'); ?></td>
                    <td><code>dw_column_thumb_id</code></td>
                </tr>
                <tr>
                    <td><?php _e('제목', 'dasom-church'); ?></td>
                    <td><code>dw_column_title</code></td>
                </tr>
            </tbody>
        </table>
        
        <p style="color:#666;">
            <?php _e('※ JSON 배열 형태(album_images)는 Elementor 기본 Custom Field로는 그대로 출력되지 않습니다. Shortcode 또는 ACF Gallery 필드로 변환해서 사용하세요.', 'dasom-church'); ?>
        </p>
        
        <!-- 교회설정 커스텀 필드 안내 -->
        <hr>
        <h2>🏛️ <?php _e('교회설정 커스텀 필드 안내', 'dasom-church'); ?></h2>
        <p><?php _e('아래 커스텀 필드 키를 Elementor → Dynamic Tags → Post Custom Field → Custom Key 입력칸에 넣어 사용하세요.', 'dasom-church'); ?></p>
        
        <table class="widefat striped" style="max-width:900px;margin:20px 0;">
            <thead>
                <tr>
                    <th style="width:200px;"><?php _e('설정 분류', 'dasom-church'); ?></th>
                    <th style="width:200px;"><?php _e('필드 설명', 'dasom-church'); ?></th>
                    <th><?php _e('커스텀 필드 키', 'dasom-church'); ?></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td rowspan="5">🏢 <?php _e('기본 정보', 'dasom-church'); ?></td>
                    <td><?php _e('교회명', 'dasom-church'); ?></td>
                    <td><code>dasom_church_name</code></td>
                </tr>
                <tr>
                    <td><?php _e('교회 주소', 'dasom-church'); ?></td>
                    <td><code>dasom_church_address</code></td>
                </tr>
                <tr>
                    <td><?php _e('전화번호', 'dasom-church'); ?></td>
                    <td><code>dasom_church_phone</code></td>
                </tr>
                <tr>
                    <td><?php _e('이메일', 'dasom-church'); ?></td>
                    <td><code>dasom_church_email</code></td>
                </tr>
                <tr>
                    <td><?php _e('웹사이트 URL', 'dasom-church'); ?></td>
                    <td><code>dasom_church_website</code></td>
                </tr>
                <tr>
                    <td rowspan="7">📱 <?php _e('소셜미디어', 'dasom-church'); ?></td>
                    <td><?php _e('YouTube 채널', 'dasom-church'); ?></td>
                    <td><code>dasom_social_youtube</code></td>
                </tr>
                <tr>
                    <td><?php _e('Instagram', 'dasom-church'); ?></td>
                    <td><code>dasom_social_instagram</code></td>
                </tr>
                <tr>
                    <td><?php _e('Facebook', 'dasom-church'); ?></td>
                    <td><code>dasom_social_facebook</code></td>
                </tr>
                <tr>
                    <td><?php _e('LinkedIn', 'dasom-church'); ?></td>
                    <td><code>dasom_social_linkedin</code></td>
                </tr>
                <tr>
                    <td><?php _e('TikTok', 'dasom-church'); ?></td>
                    <td><code>dasom_social_tiktok</code></td>
                </tr>
                <tr>
                    <td><?php _e('KakaoTalk', 'dasom-church'); ?></td>
                    <td><code>dasom_social_kakaotalk</code></td>
                </tr>
                <tr>
                    <td><?php _e('KakaoTalk Channel', 'dasom-church'); ?></td>
                    <td><code>dasom_social_kakaotalk_channel</code></td>
                </tr>
            </tbody>
        </table>
        
        <p style="color:#666;">
            <?php _e('※ 교회설정은 WordPress 옵션으로 저장되며, Elementor에서 Site Settings 또는 Custom Fields로 접근할 수 있습니다.', 'dasom-church'); ?>
        </p>
    <?php endif; ?>
    
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
    </div>
</div>