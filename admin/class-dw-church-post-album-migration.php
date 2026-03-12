<?php
/**
 * Post → 교회앨범(Album) 마이그레이션
 * 교회앨범 카테고리 Post 본문의 img src URL을 추출해 DW Church 앨범(dw_album_images)으로 옮김
 * 본문 예: <div class="frm_file_container"><img src="..."><img src="..."></div>
 *
 * @package DW_Church
 */

if (!defined('ABSPATH')) {
    exit;
}

class DW_Church_Post_Album_Migration {

    const OPTION_ENABLED = 'dw_enable_acf_bulletin_migration';

    /** 교회앨범으로 가져올 Post 카테고리 slug */
    const CATEGORY_SLUGS = array('album', '교회앨범');

    public static function init() {
        $self = new self();
        add_action('admin_menu', array($self, 'add_menu'), 28);
        add_action('admin_init', array($self, 'handle_migrate'));
    }

    public function add_menu() {
        if (!get_option(self::OPTION_ENABLED, '')) {
            return;
        }
        add_submenu_page(
            'dasom-church-admin',
            __('교회앨범 마이그레이션 (Post→Album)', 'dw-church'),
            __('교회앨범 마이그레이션', 'dw-church'),
            'edit_posts',
            'dasom-church-post-album-migration',
            array($this, 'render_page')
        );
    }

    public function handle_migrate() {
        if (!isset($_POST['dw_post_album_migrate_nonce']) ||
            !wp_verify_nonce($_POST['dw_post_album_migrate_nonce'], 'dw_post_album_migrate')) {
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

        if (!function_exists('media_sideload_image')) {
            require_once ABSPATH . 'wp-admin/includes/media.php';
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/image.php';
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

        set_transient('dw_post_album_migration_result', array(
            'created' => $created,
            'skipped' => $skipped,
            'errors' => $errors
        ), 30);
        wp_safe_redirect(admin_url('admin.php?page=dasom-church-post-album-migration&migrated=1'));
        exit;
    }

    /**
     * 본문 HTML에서 img 태그의 src URL 목록 추출 (나타난 순서 유지)
     */
    private function extract_image_urls_from_content($content) {
        if (empty($content) || !is_string($content)) {
            return array();
        }
        $urls = array();
        if (preg_match_all('/<img[^>]+src=(["\'])([^"\']+)\1/i', $content, $m)) {
            foreach ($m[2] as $url) {
                $url = trim($url);
                if ($url !== '' && (strpos($url, 'http://') === 0 || strpos($url, 'https://') === 0)) {
                    $urls[] = $url;
                }
            }
        }
        return array_unique($urls, SORT_REGULAR);
    }

    /**
     * 이미지 URL → 첨부 ID. 같은 사이트면 기존 첨부 사용, 외부/다른 경로면 sideload
     */
    private function url_to_attachment_id($url, $parent_post_id) {
        $url = esc_url_raw(trim($url));
        if (empty($url)) {
            return 0;
        }
        if (function_exists('attachment_url_to_postid')) {
            $aid = attachment_url_to_postid($url);
            if ($aid) {
                return (int) $aid;
            }
        }
        $tmp = download_url($url, 30);
        if (is_wp_error($tmp)) {
            return 0;
        }
        $file_array = array(
            'name' => basename(parse_url($url, PHP_URL_PATH)) ?: 'image.jpg',
            'tmp_name' => $tmp
        );
        $aid = media_handle_sideload($file_array, $parent_post_id, null, array('post_author' => get_current_user_id()));
        if (is_wp_error($aid)) {
            @unlink($tmp);
            return 0;
        }
        return (int) $aid;
    }

    private function migrate_one_post($source_post_id) {
        $source = get_post($source_post_id);
        if (!$source || $source->post_type !== 'post') {
            return false;
        }

        $urls = $this->extract_image_urls_from_content($source->post_content);
        if (empty($urls)) {
            return false;
        }

        $post_data = array(
            'post_type' => 'album',
            'post_title' => $source->post_title,
            'post_name' => $source->post_name,
            'post_content' => '',
            'post_status' => $source->post_status,
            'post_author' => $source->post_author,
            'post_date' => $source->post_date,
            'post_date_gmt' => $source->post_date_gmt,
            'comment_status' => $source->comment_status,
            'ping_status' => $source->ping_status,
        );
        $album_id = wp_insert_post($post_data, true);
        if (is_wp_error($album_id)) {
            return $album_id->get_error_message();
        }

        $image_ids = array();
        foreach ($urls as $url) {
            $aid = $this->url_to_attachment_id($url, $album_id);
            if ($aid) {
                $image_ids[] = $aid;
            }
        }

        if (empty($image_ids)) {
            wp_delete_post($album_id, true);
            return sprintf(__('이미지를 가져오지 못함 (Post ID: %d)', 'dw-church'), $source_post_id);
        }

        update_post_meta($album_id, 'dw_album_images', wp_json_encode($image_ids));
        update_post_meta($album_id, 'dw_album_thumb_id', $image_ids[0]);
        set_post_thumbnail($album_id, $image_ids[0]);

        return true;
    }

    private function get_posts_for_migration() {
        $args = array(
            'post_type' => 'post',
            'post_status' => array('publish', 'draft', 'private'),
            'numberposts' => -1,
            'orderby' => 'date',
            'order' => 'DESC',
        );
        if (!empty(self::CATEGORY_SLUGS)) {
            $args['tax_query'] = array(
                array(
                    'taxonomy' => 'category',
                    'field' => 'slug',
                    'terms' => self::CATEGORY_SLUGS,
                ),
            );
        }
        return get_posts($args);
    }

    public function render_page() {
        if (!current_user_can('edit_posts')) {
            wp_die(__('권한이 없습니다.', 'dw-church'));
        }

        $result = get_transient('dw_post_album_migration_result');
        if ($result && isset($_GET['migrated'])) {
            delete_transient('dw_post_album_migration_result');
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
            <h1><?php esc_html_e('Post → 교회앨범 마이그레이션', 'dw-church'); ?></h1>
            <p class="description">
                <?php esc_html_e('카테고리 "교회앨범"(album)에 속한 글만 목록에 표시됩니다. 본문에 들어 있는 img 태그의 이미지 주소를 추출해 DW 교회앨범(album)으로 옮기며, 같은 사이트 이미지는 기존 첨부를 쓰고 외부/경로가 다른 이미지는 미디어로 가져옵니다.', 'dw-church'); ?>
            </p>

            <?php if (empty($posts)) : ?>
                <p><?php esc_html_e('해당 카테고리(교회앨범)에 속한 글이 없습니다.', 'dw-church'); ?></p>
                <p><a href="<?php echo esc_url(admin_url('edit.php')); ?>"><?php esc_html_e('글 목록으로', 'dw-church'); ?></a></p>
            <?php else : ?>
                <form method="post" action="" id="dw-post-album-migrate-form">
                    <?php wp_nonce_field('dw_post_album_migrate', 'dw_post_album_migrate_nonce'); ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <td class="check-column"><input type="checkbox" id="select-all" /></td>
                                <th><?php esc_html_e('제목', 'dw-church'); ?></th>
                                <th><?php esc_html_e('본문 이미지 수', 'dw-church'); ?></th>
                                <th><?php esc_html_e('게시일', 'dw-church'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($posts as $p) :
                                $urls = $this->extract_image_urls_from_content($p->post_content);
                                $count = count($urls);
                            ?>
                                <tr>
                                    <th scope="row" class="check-column">
                                        <input type="checkbox" name="migrate_post_ids[]" value="<?php echo esc_attr($p->ID); ?>" <?php echo $count === 0 ? 'disabled' : ''; ?> />
                                    </th>
                                    <td>
                                        <a href="<?php echo esc_url(get_edit_post_link($p->ID)); ?>"><?php echo esc_html($p->post_title ?: __('(제목 없음)', 'dw-church')); ?></a>
                                        (ID: <?php echo (int) $p->ID; ?>)
                                    </td>
                                    <td><?php echo (int) $count; ?></td>
                                    <td><?php echo esc_html(get_the_date('', $p)); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                    <p class="submit">
                        <button type="submit" class="button button-primary"><?php esc_html_e('선택한 글을 교회앨범으로 마이그레이션', 'dw-church'); ?></button>
                    </p>
                </form>
                <script>
                document.getElementById('select-all').addEventListener('change', function() {
                    document.querySelectorAll('#dw-post-album-migrate-form input[name="migrate_post_ids[]"]:not([disabled])').forEach(function(cb) { cb.checked = this.checked; }, this);
                });
                </script>
            <?php endif; ?>
        </div>
        <?php
    }
}
