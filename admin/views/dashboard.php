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
    'taxonomy' => 'sermon_preacher',
    'hide_empty' => false,
    'orderby' => 'name',
    'order' => 'ASC'
));
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
                    <td><code>bulletin_date</code></td>
                </tr>
                <tr>
                    <td><?php _e('주보 PDF 첨부 ID', 'dasom-church'); ?></td>
                    <td><code>bulletin_pdf</code></td>
                </tr>
                <tr>
                    <td><?php _e('주보 이미지 (JSON 배열)', 'dasom-church'); ?></td>
                    <td><code>bulletin_images</code></td>
                </tr>
                <tr>
                    <td rowspan="5">🎤 <?php _e('설교 (sermon)', 'dasom-church'); ?></td>
                    <td><?php _e('설교 제목', 'dasom-church'); ?></td>
                    <td><code>sermon_title</code></td>
                </tr>
                <tr>
                    <td><?php _e('성경구절', 'dasom-church'); ?></td>
                    <td><code>sermon_scripture</code></td>
                </tr>
                <tr>
                    <td><?php _e('YouTube URL', 'dasom-church'); ?></td>
                    <td><code>sermon_youtube</code></td>
                </tr>
                <tr>
                    <td><?php _e('설교 일자', 'dasom-church'); ?></td>
                    <td><code>sermon_date</code></td>
                </tr>
                <tr>
                    <td><?php _e('설교자', 'dasom-church'); ?></td>
                    <td><code>sermon_preacher</code></td>
                </tr>
                <tr>
                    <td rowspan="3">📷 <?php _e('교회앨범 (album)', 'dasom-church'); ?></td>
                    <td><?php _e('YouTube URL', 'dasom-church'); ?></td>
                    <td><code>album_youtube</code></td>
                </tr>
                <tr>
                    <td><?php _e('썸네일 이미지 ID', 'dasom-church'); ?></td>
                    <td><code>album_thumb_id</code></td>
                </tr>
                <tr>
                    <td><?php _e('앨범 이미지 (JSON 배열)', 'dasom-church'); ?></td>
                    <td><code>album_images</code></td>
                </tr>
                <tr>
                    <td rowspan="2">🖋 <?php _e('목회컬럼 (column)', 'dasom-church'); ?></td>
                    <td><?php _e('작성자', 'dasom-church'); ?></td>
                    <td><code>column_author</code></td>
                </tr>
                <tr>
                    <td><?php _e('주제', 'dasom-church'); ?></td>
                    <td><code>column_topic</code></td>
                </tr>
            </tbody>
        </table>
        
        <p style="color:#666;">
            <?php _e('※ JSON 배열 형태(album_images)는 Elementor 기본 Custom Field로는 그대로 출력되지 않습니다. Shortcode 또는 ACF Gallery 필드로 변환해서 사용하세요.', 'dasom-church'); ?>
        </p>
    <?php endif; ?>
    
    <hr>
    
    <!-- 최신 현황 카드 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;">
        <!-- 교회주보 -->
        <div class="card" style="background:#fff;padding:20px;border:1px solid #ccc;">
            <h2>📖 <?php _e('교회주보', 'dasom-church'); ?></h2>
            <?php
            $bulletins = get_posts(array(
                'post_type' => 'bulletin',
                'posts_per_page' => 5,
                'orderby' => 'date',
                'order' => 'DESC'
            ));
            if ($bulletins) {
                echo '<ul>';
                foreach ($bulletins as $post) {
                    $date = get_post_meta($post->ID, 'bulletin_date', true);
                    echo '<li><a href="' . get_edit_post_link($post->ID) . '">' . esc_html(get_the_title($post)) . '</a> ';
                    echo $date ? '(' . esc_html($date) . ')' : '';
                    echo '</li>';
                }
                echo '</ul>';
            } else {
                echo '<p>' . __('주보가 없습니다.', 'dasom-church') . '</p>';
            }
            ?>
        </div>
        
        <!-- 설교 -->
        <div class="card" style="background:#fff;padding:20px;border:1px solid #ccc;">
            <h2>🎤 <?php _e('설교', 'dasom-church'); ?></h2>
            <?php
            $sermons = get_posts(array(
                'post_type' => 'sermon',
                'posts_per_page' => 5,
                'orderby' => 'date',
                'order' => 'DESC'
            ));
            if ($sermons) {
                echo '<ul>';
                foreach ($sermons as $post) {
                    $scripture = get_post_meta($post->ID, 'sermon_scripture', true);
                    echo '<li><a href="' . get_edit_post_link($post->ID) . '">' . esc_html(get_the_title($post)) . '</a>';
                    echo $scripture ? ' - ' . esc_html($scripture) : '';
                    echo '</li>';
                }
                echo '</ul>';
            } else {
                echo '<p>' . __('설교가 없습니다.', 'dasom-church') . '</p>';
            }
            ?>
        </div>
        
        <!-- 목회컬럼 -->
        <div class="card" style="background:#fff;padding:20px;border:1px solid #ccc;">
            <h2>🖋 <?php _e('목회컬럼', 'dasom-church'); ?></h2>
            <?php
            $columns = get_posts(array(
                'post_type' => 'column',
                'posts_per_page' => 5,
                'orderby' => 'date',
                'order' => 'DESC'
            ));
            if ($columns) {
                echo '<ul>';
                foreach ($columns as $post) {
                    $excerpt = wp_trim_words(strip_tags($post->post_content), 10, '...');
                    echo '<li><a href="' . get_edit_post_link($post->ID) . '">' . esc_html(get_the_title($post)) . '</a>';
                    echo $excerpt ? ' - ' . esc_html($excerpt) : '';
                    echo '</li>';
                }
                echo '</ul>';
            } else {
                echo '<p>' . __('목회컬럼이 없습니다.', 'dasom-church') . '</p>';
            }
            ?>
        </div>
        
        <!-- 교회앨범 -->
        <div class="card" style="background:#fff;padding:20px;border:1px solid #ccc;">
            <h2>📷 <?php _e('교회앨범', 'dasom-church'); ?></h2>
            <?php
            $albums = get_posts(array(
                'post_type' => 'album',
                'posts_per_page' => 5,
                'orderby' => 'date',
                'order' => 'DESC'
            ));
            if ($albums) {
                echo '<ul>';
                foreach ($albums as $post) {
                    $youtube = get_post_meta($post->ID, 'album_youtube', true);
                    echo '<li><a href="' . get_edit_post_link($post->ID) . '">' . esc_html(get_the_title($post)) . '</a>';
                    echo $youtube ? ' - <a href="' . esc_url($youtube) . '" target="_blank">YouTube</a>' : '';
                    echo '</li>';
                }
                echo '</ul>';
            } else {
                echo '<p>' . __('앨범이 없습니다.', 'dasom-church') . '</p>';
            }
            ?>
        </div>
    </div>
</div>