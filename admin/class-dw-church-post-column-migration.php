<?php
/**
 * Post → 목회컬럼(Column) 마이그레이션
 * ACF 없이 일반 Post(제목, 본문, 대표 이미지)를 DW Church 목회컬럼(column)으로 옮김
 *
 * @package DW_Church
 */

if (!defined('ABSPATH')) {
    exit;
}

class DW_Church_Post_Column_Migration {

    const OPTION_ENABLED = 'dw_enable_acf_bulletin_migration';

    public static function init() {
        $self = new self();
        add_action('admin_menu', array($self, 'add_menu'), 27);
        add_action('admin_init', array($self, 'handle_migrate'));
    }

    public function add_menu() {
        if (!get_option(self::OPTION_ENABLED, '')) {
            return;
        }
        add_submenu_page(
            'dasom-church-admin',
            __('목회컬럼 마이그레이션 (Post→Column)', 'dw-church'),
            __('목회컬럼 마이그레이션', 'dw-church'),
            'edit_posts',
            'dasom-church-post-column-migration',
            array($this, 'render_page')
        );
    }

    public function handle_migrate() {
        if (!isset($_POST['dw_post_column_migrate_nonce']) ||
            !wp_verify_nonce($_POST['dw_post_column_migrate_nonce'], 'dw_post_column_migrate')) {
            return;
        }
        if (!current_user_can('edit_posts')) {
            return;
        }
        $post_ids = isset($_POST['migrate_post_ids']) && is_array($_POST['migrate_post_ids'])
            ? array_map('absint', $_POST['migrate_post_ids'])
            : array();
        $post_ids = array_filter($post_ids);
        if (empty($post_ids)) {
            add_action('admin_notices', function() {
                echo '<div class="notice notice-warning is-dismissible"><p>' . esc_html__('선택된 글이 없습니다.', 'dw-church') . '</p></div>';
            });
            return;
        }

        $created = 0;
        $skipped = 0;
        $errors = array();

        foreach ($post_ids as $post_id) {
            $result = $this->migrate_one_post($post_id);
            if ($result === true) {
                $created++;
            } elseif ($result === false) {
                $skipped++;
            } else {
                $errors[] = $result;
            }
        }

        set_transient('dw_post_column_migration_result', array(
            'created' => $created,
            'skipped' => $skipped,
            'errors' => $errors
        ), 30);
        wp_safe_redirect(admin_url('admin.php?page=dasom-church-post-column-migration&migrated=1'));
        exit;
    }

    private function migrate_one_post($source_post_id) {
        $source = get_post($source_post_id);
        if (!$source || $source->post_type !== 'post') {
            return false;
        }

        $post_data = array(
            'post_type' => 'column',
            'post_title' => $source->post_title,
            'post_name' => $source->post_name,
            'post_content' => $source->post_content,
            'post_status' => $source->post_status,
            'post_author' => $source->post_author,
            'post_date' => $source->post_date,
            'post_date_gmt' => $source->post_date_gmt,
            'comment_status' => $source->comment_status,
            'ping_status' => $source->ping_status,
        );
        $column_id = wp_insert_post($post_data, true);
        if (is_wp_error($column_id)) {
            return $column_id->get_error_message();
        }

        $thumb_id = get_post_thumbnail_id($source_post_id);
        if ($thumb_id) {
            update_post_meta($column_id, 'dw_column_top_image', $thumb_id);
            set_post_thumbnail($column_id, $thumb_id);
        }

        $youtube = $this->extract_youtube_from_content($source->post_content);
        if ($youtube) {
            update_post_meta($column_id, 'dw_column_youtube', $youtube);
        }

        return true;
    }

    private function extract_youtube_from_content($content) {
        if (empty($content) || !is_string($content)) {
            return '';
        }
        if (preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})%i', $content, $m)) {
            return 'https://www.youtube.com/watch?v=' . $m[1];
        }
        return '';
    }

    private function get_posts_for_migration() {
        return get_posts(array(
            'post_type' => 'post',
            'post_status' => array('publish', 'draft', 'private'),
            'numberposts' => -1,
            'orderby' => 'date',
            'order' => 'DESC',
        ));
    }

    public function render_page() {
        if (!current_user_can('edit_posts')) {
            wp_die(__('권한이 없습니다.', 'dw-church'));
        }

        $result = get_transient('dw_post_column_migration_result');
        if ($result && isset($_GET['migrated'])) {
            delete_transient('dw_post_column_migration_result');
            echo '<div class="notice notice-success is-dismissible"><p>';
            echo esc_html(sprintf(
                __('마이그레이션 완료: %d건 생성, %d건 건너뜀.', 'dw-church'),
                $result['created'],
                $result['skipped']
            ));
            if (!empty($result['errors'])) {
                echo '<br>' . esc_html(implode(' ', $result['errors']));
            }
            echo '</p></div>';
        }

        $posts = $this->get_posts_for_migration();
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Post → 목회컬럼 마이그레이션', 'dw-church'); ?></h1>
            <p class="description">
                <?php esc_html_e('일반 글(Post)을 DW 교회 목회컬럼(column)으로 옮깁니다. ACF를 사용하지 않았어도 제목, 본문, 대표 이미지가 그대로 복사되며, 본문에 YouTube URL이 있으면 자동으로 추출해 넣습니다.', 'dw-church'); ?>
            </p>

            <?php if (empty($posts)) : ?>
                <p><?php esc_html_e('마이그레이션할 글이 없습니다.', 'dw-church'); ?></p>
                <p><a href="<?php echo esc_url(admin_url('edit.php')); ?>"><?php esc_html_e('글 목록으로', 'dw-church'); ?></a></p>
            <?php else : ?>
                <form method="post" action="" id="dw-post-column-migrate-form">
                    <?php wp_nonce_field('dw_post_column_migrate', 'dw_post_column_migrate_nonce'); ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <td class="check-column"><input type="checkbox" id="select-all" /></td>
                                <th><?php esc_html_e('제목', 'dw-church'); ?></th>
                                <th><?php esc_html_e('게시일', 'dw-church'); ?></th>
                                <th><?php esc_html_e('상태', 'dw-church'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($posts as $p) : ?>
                                <tr>
                                    <th scope="row" class="check-column">
                                        <input type="checkbox" name="migrate_post_ids[]" value="<?php echo esc_attr($p->ID); ?>" />
                                    </th>
                                    <td>
                                        <a href="<?php echo esc_url(get_edit_post_link($p->ID)); ?>"><?php echo esc_html($p->post_title ?: __('(제목 없음)', 'dw-church')); ?></a>
                                        (ID: <?php echo (int) $p->ID; ?>)
                                    </td>
                                    <td><?php echo esc_html(get_the_date('', $p)); ?></td>
                                    <td><?php
                                        $status_obj = get_post_status_object($p->post_status);
                                        echo esc_html($status_obj && isset($status_obj->label) ? $status_obj->label : $p->post_status);
                                    ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                    <p class="submit">
                        <button type="submit" class="button button-primary"><?php esc_html_e('선택한 글을 목회컬럼으로 마이그레이션', 'dw-church'); ?></button>
                    </p>
                </form>
                <script>
                document.getElementById('select-all').addEventListener('change', function() {
                    document.querySelectorAll('#dw-post-column-migrate-form input[name="migrate_post_ids[]"]').forEach(function(cb) { cb.checked = this.checked; }, this);
                });
                </script>
            <?php endif; ?>
        </div>
        <?php
    }
}
