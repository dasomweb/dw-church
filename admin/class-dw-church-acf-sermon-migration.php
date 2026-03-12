<?php
/**
 * ACF Sermon → DW Church Sermon Migration
 * Post의 ACF Sermon 필드(일자, 설교자, 성경구절, YouTube)를 교회 설교(sermon)로 마이그레이션
 *
 * ACF 필드: date(일자), preacher(설교자), Bibleverse(성경구절), youtube
 * 대상: post type 'sermon', meta: dw_sermon_date, dw_sermon_title, dw_sermon_scripture, dw_sermon_youtube, taxonomy: dw_sermon_preacher
 *
 * @package DW_Church
 */

if (!defined('ABSPATH')) {
    exit;
}

class DW_Church_ACF_Sermon_Migration {

    const OPTION_ENABLED = 'dw_enable_acf_bulletin_migration';
    const ACF_FIELD_DATE = 'date';
    const ACF_FIELD_PREACHER = 'preacher';
    const ACF_FIELD_SCRIPTURE = 'Bibleverse';
    const ACF_FIELD_YOUTUBE = 'youtube';
    const TAXONOMY_PREACHER = 'dw_sermon_preacher';

    public static function init() {
        $self = new self();
        add_action('admin_menu', array($self, 'add_menu'), 26);
        add_action('admin_init', array($self, 'handle_migrate'));
    }

    public function add_menu() {
        if (!get_option(self::OPTION_ENABLED, '')) {
            return;
        }
        add_submenu_page(
            'dasom-church-admin',
            __('ACF 설교 마이그레이션', 'dw-church'),
            __('ACF 설교 마이그레이션', 'dw-church'),
            'edit_posts',
            'dasom-church-acf-sermon-migration',
            array($this, 'render_page')
        );
    }

    public function handle_migrate() {
        if (!isset($_POST['dw_acf_sermon_migrate_nonce']) ||
            !wp_verify_nonce($_POST['dw_acf_sermon_migrate_nonce'], 'dw_acf_sermon_migrate')) {
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
        if (!function_exists('get_field')) {
            add_action('admin_notices', function() {
                echo '<div class="notice notice-error is-dismissible"><p>' . esc_html__('ACF(Advanced Custom Fields) 플러그인이 필요합니다.', 'dw-church') . '</p></div>';
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

        set_transient('dw_acf_sermon_migration_result', array(
            'created' => $created,
            'skipped' => $skipped,
            'errors' => $errors
        ), 30);
        wp_safe_redirect(admin_url('admin.php?page=dasom-church-acf-sermon-migration&migrated=1'));
        exit;
    }

    private function migrate_one_post($source_post_id) {
        $date_val = get_field(self::ACF_FIELD_DATE, $source_post_id);
        $preacher = get_field(self::ACF_FIELD_PREACHER, $source_post_id);
        $scripture = get_field(self::ACF_FIELD_SCRIPTURE, $source_post_id);
        if (empty($scripture)) {
            $scripture = get_field('bibleverse', $source_post_id);
        }
        $youtube = get_field(self::ACF_FIELD_YOUTUBE, $source_post_id);

        if (empty($date_val) && empty($preacher) && empty($scripture) && empty($youtube)) {
            return false;
        }

        $sermon_date = $this->normalize_date($date_val);
        if (!$sermon_date && !empty($date_val)) {
            return sprintf(__('날짜 형식 오류 (Post ID: %d)', 'dw-church'), $source_post_id);
        }
        if (!$sermon_date) {
            $sermon_date = date('Y-m-d', strtotime(get_the_date('Y-m-d', $source_post_id)));
        }

        $source_post = get_post($source_post_id);
        $title = $source_post && $source_post->post_title ? $source_post->post_title : ($scripture ? wp_trim_words($scripture, 10) : $sermon_date . ' ' . __('설교', 'dw-church'));

        $post_data = array(
            'post_type' => 'sermon',
            'post_title' => $title,
            'post_name' => sanitize_title($title),
            'post_status' => 'publish',
            'post_author' => get_current_user_id(),
        );
        $sermon_id = wp_insert_post($post_data, true);
        if (is_wp_error($sermon_id)) {
            return $sermon_id->get_error_message();
        }

        update_post_meta($sermon_id, 'dw_sermon_title', $title);
        update_post_meta($sermon_id, 'dw_sermon_date', $sermon_date);
        update_post_meta($sermon_id, 'dw_sermon_scripture', is_string($scripture) ? $scripture : '');
        update_post_meta($sermon_id, 'dw_sermon_youtube', is_string($youtube) ? esc_url_raw($youtube) : '');

        $preacher_name = is_string($preacher) ? trim($preacher) : '';
        if ($preacher_name !== '') {
            $term = term_exists($preacher_name, self::TAXONOMY_PREACHER);
            if (!$term) {
                $term = wp_insert_term($preacher_name, self::TAXONOMY_PREACHER);
            }
            if (!is_wp_error($term) && isset($term['term_id'])) {
                wp_set_post_terms($sermon_id, array((int) $term['term_id']), self::TAXONOMY_PREACHER, false);
            }
        } else {
            $def = get_option('default_sermon_preacher', __('담임목사', 'dw-church'));
            if ($def) {
                $term = get_term_by('name', $def, self::TAXONOMY_PREACHER);
                if ($term) {
                    wp_set_post_terms($sermon_id, array((int) $term->term_id), self::TAXONOMY_PREACHER, false);
                }
            }
        }

        return true;
    }

    /**
     * ACF Date Picker 값 → Y-m-d 정규화 (주보 마이그레이션과 동일 로직)
     */
    private function normalize_date($value) {
        if (empty($value) && $value !== 0 && $value !== '0') {
            return '';
        }
        if (is_array($value)) {
            if (isset($value['date']) && $value['date'] !== '') {
                $value = $value['date'];
            } elseif (isset($value['Y'], $value['m'], $value['d'])) {
                $y = (int) $value['Y'];
                $m = (int) $value['m'];
                $d = (int) $value['d'];
                if ($y >= 1970 && $y <= 2100 && $m >= 1 && $m <= 12 && $d >= 1 && $d <= 31) {
                    return sprintf('%04d-%02d-%02d', $y, $m, $d);
                }
                return '';
            } else {
                return '';
            }
        }
        if (is_numeric($value)) {
            $ts = (int) $value;
            if ($ts > 0) {
                return date('Y-m-d', $ts);
            }
            return '';
        }
        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            $ts = strtotime($value);
            return $ts !== false ? date('Y-m-d', $ts) : '';
        }
        if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $value, $ymd)) {
            $y = (int) $ymd[1];
            $mo = (int) $ymd[2];
            $d = (int) $ymd[3];
            if ($mo >= 1 && $mo <= 12 && $d >= 1 && $d <= 31) {
                return sprintf('%04d-%02d-%02d', $y, $mo, $d);
            }
        }
        $value_normalized = preg_replace('/년\s*/', '-', $value);
        $value_normalized = preg_replace('/월\s*/', '-', $value_normalized);
        $value_normalized = preg_replace('/일\s*$/', '', $value_normalized);
        $value_normalized = trim($value_normalized);
        if (preg_match('/^\d{1,4}-\d{1,2}-\d{1,2}$/', $value_normalized)) {
            $ts = strtotime($value_normalized);
            if ($ts !== false) {
                return date('Y-m-d', $ts);
            }
        }
        $ts = strtotime($value);
        if ($ts !== false && $ts > 0) {
            return date('Y-m-d', $ts);
        }
        $formats = array('Y-m-d', 'd/m/Y', 'm/d/Y', 'Y/m/d', 'd-m-Y', 'm-d-Y', 'F j, Y', 'j F Y', 'Y.n.j', 'Y.m.d');
        foreach ($formats as $fmt) {
            $dt = \DateTime::createFromFormat($fmt, $value);
            if ($dt instanceof \DateTime) {
                return $dt->format('Y-m-d');
            }
        }
        return '';
    }

    private function get_acf_sermon_posts() {
        global $wpdb;
        $meta_keys = array(self::ACF_FIELD_DATE, self::ACF_FIELD_PREACHER, self::ACF_FIELD_YOUTUBE);
        $placeholders = implode(',', array_fill(0, count($meta_keys), '%s'));
        $query = $wpdb->prepare(
            "SELECT DISTINCT p.ID, p.post_title, p.post_date
             FROM {$wpdb->posts} p
             INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key IN ($placeholders)
             WHERE p.post_type = 'post' AND p.post_status IN ('publish','draft','private')
             ORDER BY p.post_date DESC",
            ...$meta_keys
        );
        return $wpdb->get_results($query);
    }

    public function render_page() {
        if (!current_user_can('edit_posts')) {
            wp_die(__('권한이 없습니다.', 'dw-church'));
        }

        $result = get_transient('dw_acf_sermon_migration_result');
        if ($result && isset($_GET['migrated'])) {
            delete_transient('dw_acf_sermon_migration_result');
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

        if (!function_exists('get_field')) {
            echo '<div class="wrap"><h1>' . esc_html__('ACF 설교 마이그레이션', 'dw-church') . '</h1>';
            echo '<div class="notice notice-error"><p>' . esc_html__('Advanced Custom Fields(ACF) 플러그인이 필요합니다. ACF 필드 그룹 "Sermon"(일자, 설교자, 성경구절, YouTube)이 있는 포스트를 교회 설교로 옮길 수 있습니다.', 'dw-church') . '</p></div></div>';
            return;
        }

        $posts = $this->get_acf_sermon_posts();
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('ACF 설교 → 교회 설교 마이그레이션', 'dw-church'); ?></h1>
            <p class="description">
                <?php esc_html_e('Post에 있는 ACF Sermon 필드(일자, 설교자, 성경구절, YouTube)를 DW 교회 설교(sermon)로 옮깁니다. 마이그레이션할 글을 선택한 뒤 실행하세요.', 'dw-church'); ?>
            </p>

            <?php if (empty($posts)) : ?>
                <p><?php esc_html_e('ACF Sermon 필드(date, preacher, youtube 등)가 있는 글이 없습니다.', 'dw-church'); ?></p>
                <p><a href="<?php echo esc_url(admin_url('edit.php?post_type=post')); ?>"><?php esc_html_e('글 목록으로', 'dw-church'); ?></a></p>
            <?php else : ?>
                <form method="post" action="" id="dw-acf-sermon-migrate-form">
                    <?php wp_nonce_field('dw_acf_sermon_migrate', 'dw_acf_sermon_migrate_nonce'); ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <td class="check-column"><input type="checkbox" id="select-all" /></td>
                                <th><?php esc_html_e('제목', 'dw-church'); ?></th>
                                <th><?php esc_html_e('일자 (date)', 'dw-church'); ?></th>
                                <th><?php esc_html_e('설교자 (preacher)', 'dw-church'); ?></th>
                                <th><?php esc_html_e('YouTube', 'dw-church'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($posts as $p) :
                                $date_val = get_field(self::ACF_FIELD_DATE, $p->ID);
                                $preacher = get_field(self::ACF_FIELD_PREACHER, $p->ID);
                                $youtube = get_field(self::ACF_FIELD_YOUTUBE, $p->ID);
                                $date_display = is_array($date_val) ? ($date_val['date'] ?? '') : $date_val;
                                $preacher_display = is_string($preacher) ? $preacher : '';
                                $youtube_display = is_string($youtube) ? wp_trim_words($youtube, 6) : '';
                            ?>
                                <tr>
                                    <th scope="row" class="check-column">
                                        <input type="checkbox" name="migrate_post_ids[]" value="<?php echo esc_attr($p->ID); ?>" />
                                    </th>
                                    <td>
                                        <a href="<?php echo esc_url(get_edit_post_link($p->ID)); ?>"><?php echo esc_html($p->post_title ?: __('(제목 없음)', 'dw-church')); ?></a>
                                        (ID: <?php echo (int) $p->ID; ?>)
                                    </td>
                                    <td><?php echo esc_html($date_display); ?></td>
                                    <td><?php echo esc_html($preacher_display); ?></td>
                                    <td><?php echo $youtube_display ? esc_html($youtube_display) : '—'; ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                    <p class="submit">
                        <button type="submit" class="button button-primary"><?php esc_html_e('선택한 글을 교회 설교로 마이그레이션', 'dw-church'); ?></button>
                    </p>
                </form>
                <script>
                document.getElementById('select-all').addEventListener('change', function() {
                    document.querySelectorAll('#dw-acf-sermon-migrate-form input[name="migrate_post_ids[]"]').forEach(function(cb) { cb.checked = this.checked; }, this);
                });
                </script>
            <?php endif; ?>
        </div>
        <?php
    }
}
