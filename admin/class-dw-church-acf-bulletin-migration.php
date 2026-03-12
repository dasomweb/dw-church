<?php
/**
 * ACF Jubo → DW Church Bulletin Migration
 * 선택적 기능: 특정 사이트에서만 ACF 주보 데이터를 교회주보(bulletin)로 마이그레이션
 *
 * ACF 필드: Sunday(주보 날짜), Jubo File Url(PDF), Image 01~04
 * 대상: post type 'bulletin', meta: dw_bulletin_date, dw_bulletin_pdf, dw_bulletin_images
 *
 * @package DW_Church
 */

if (!defined('ABSPATH')) {
    exit;
}

class DW_Church_ACF_Bulletin_Migration {

    const OPTION_ENABLED = 'dw_enable_acf_bulletin_migration';
    const ACF_FIELD_DATE = 'sunday';
    const ACF_FIELD_PDF = 'jubo_file_url';
    const ACF_FIELD_IMAGES = array('image_01', 'image_02', 'image_03', 'image_04');

    public static function init() {
        $self = new self();
        add_action('admin_menu', array($self, 'add_menu'), 25);
        add_action('admin_init', array($self, 'handle_migrate'));
    }

    /**
     * 마이그레이션 메뉴는 옵션이 켜진 경우에만 표시
     */
    public function add_menu() {
        if (!get_option(self::OPTION_ENABLED, '')) {
            return;
        }
        add_submenu_page(
            'dasom-church-admin',
            __('ACF 주보 마이그레이션', 'dw-church'),
            __('ACF 주보 마이그레이션', 'dw-church'),
            'edit_posts',
            'dasom-church-acf-bulletin-migration',
            array($this, 'render_page')
        );
    }

    /**
     * 마이그레이션 실행 처리
     */
    public function handle_migrate() {
        if (!isset($_POST['dw_acf_bulletin_migrate_nonce']) ||
            !wp_verify_nonce($_POST['dw_acf_bulletin_migrate_nonce'], 'dw_acf_bulletin_migrate')) {
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

        set_transient('dw_acf_bulletin_migration_result', array(
            'created' => $created,
            'skipped' => $skipped,
            'errors' => $errors
        ), 30);
        wp_safe_redirect(admin_url('admin.php?page=dasom-church-acf-bulletin-migration&migrated=1'));
        exit;
    }

    /**
     * 단일 Post를 bulletin으로 마이그레이션
     * @param int $source_post_id Post ID
     * @return true|false|string true=생성됨, false=건너뜀, string=에러 메시지
     */
    private function migrate_one_post($source_post_id) {
        $sunday = get_field(self::ACF_FIELD_DATE, $source_post_id);
        if (empty($sunday)) {
            return false;
        }
        $sunday = $this->normalize_date($sunday);
        if (!$sunday) {
            return sprintf(__('날짜 형식 오류 (Post ID: %d)', 'dw-church'), $source_post_id);
        }

        $title = date_i18n(__('Y년 n월 j일', 'dw-church'), strtotime($sunday)) . ' ' . __('교회주보', 'dw-church');

        $pdf_value = get_field(self::ACF_FIELD_PDF, $source_post_id);
        $pdf_attachment_id = $this->get_pdf_attachment_id($pdf_value);

        $image_ids = array();
        foreach (self::ACF_FIELD_IMAGES as $key) {
            $img = get_field($key, $source_post_id);
            $id = $this->get_image_id($img);
            if ($id) {
                $image_ids[] = $id;
            }
        }

        $post_data = array(
            'post_type' => 'bulletin',
            'post_title' => $title,
            'post_name' => sanitize_title($title),
            'post_status' => 'publish',
            'post_author' => get_current_user_id(),
        );
        $bulletin_id = wp_insert_post($post_data, true);
        if (is_wp_error($bulletin_id)) {
            return $bulletin_id->get_error_message();
        }

        update_post_meta($bulletin_id, 'dw_bulletin_date', $sunday);
        if ($pdf_attachment_id) {
            update_post_meta($bulletin_id, 'dw_bulletin_pdf', $pdf_attachment_id);
        }
        if (!empty($image_ids)) {
            update_post_meta($bulletin_id, 'dw_bulletin_images', wp_json_encode($image_ids));
            set_post_thumbnail($bulletin_id, $image_ids[0]);
        }

        return true;
    }

    /**
     * ACF Date Picker 값 → Y-m-d 정규화.
     * 배열(date/Ymd), Ymd 문자열, 타임스탬프, 다양한 표시 형식 지원.
     */
    private function normalize_date($value) {
        if (empty($value) && $value !== 0 && $value !== '0') {
            return '';
        }
        // ACF 배열: array('date' => '...') 또는 array('Y' => 2024, 'm' => 3, 'd' => 17)
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
        // 숫자 타임스탬프
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
        // 이미 Y-m-d 형식
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            $ts = strtotime($value);
            return $ts !== false ? date('Y-m-d', $ts) : '';
        }
        // Ymd (8자리, ACF 저장 형식)
        if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $value, $ymd)) {
            $y = (int) $ymd[1];
            $mo = (int) $ymd[2];
            $d = (int) $ymd[3];
            if ($mo >= 1 && $mo <= 12 && $d >= 1 && $d <= 31) {
                return sprintf('%04d-%02d-%02d', $y, $mo, $d);
            }
        }
        // 한글 형식 보조: "2024년 3월 17일" → "2024-03-17"
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
        // d/m/Y, m/d/Y 등 strtotime으로 시도
        $ts = strtotime($value);
        if ($ts !== false && $ts > 0) {
            return date('Y-m-d', $ts);
        }
        // DateTime으로 여러 형식 시도
        $formats = array('Y-m-d', 'd/m/Y', 'm/d/Y', 'Y/m/d', 'd-m-Y', 'm-d-Y', 'F j, Y', 'j F Y', 'Y.n.j', 'Y.m.d');
        foreach ($formats as $fmt) {
            $dt = \DateTime::createFromFormat($fmt, $value);
            if ($dt instanceof \DateTime) {
                return $dt->format('Y-m-d');
            }
        }
        return '';
    }

    /**
     * ACF File 필드 값에서 첨부 ID 반환 (URL/배열/ID 모두 처리)
     */
    private function get_pdf_attachment_id($value) {
        if (empty($value)) {
            return 0;
        }
        if (is_numeric($value)) {
            return (int) $value;
        }
        if (is_array($value)) {
            if (isset($value['ID'])) {
                return (int) $value['ID'];
            }
            if (isset($value['id'])) {
                return (int) $value['id'];
            }
            if (isset($value['url']) && function_exists('attachment_url_to_postid')) {
                return (int) attachment_url_to_postid($value['url']);
            }
            return 0;
        }
        if (is_string($value) && function_exists('attachment_url_to_postid')) {
            return (int) attachment_url_to_postid($value);
        }
        return 0;
    }

    /**
     * ACF Image 필드 값에서 첨부 ID 반환
     */
    private function get_image_id($value) {
        if (empty($value)) {
            return 0;
        }
        if (is_numeric($value)) {
            return (int) $value;
        }
        if (is_array($value)) {
            if (isset($value['ID'])) {
                return (int) $value['ID'];
            }
            if (isset($value['id'])) {
                return (int) $value['id'];
            }
        }
        return 0;
    }

    /**
     * ACF Jubo 필드가 있는 Post 목록 조회 (meta: sunday 또는 jubo_file_url)
     */
    private function get_acf_jubo_posts() {
        global $wpdb;
        $meta_keys = array(self::ACF_FIELD_DATE, self::ACF_FIELD_PDF);
        $placeholders = implode(',', array_fill(0, count($meta_keys), '%s'));
        $query = $wpdb->prepare(
            "SELECT DISTINCT p.ID, p.post_title, p.post_date
             FROM {$wpdb->posts} p
             INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key IN ($placeholders)
             WHERE p.post_type = 'post' AND p.post_status IN ('publish','draft','private')
             ORDER BY p.post_date ASC",
            ...$meta_keys
        );
        return $wpdb->get_results($query);
    }

    public function render_page() {
        if (!current_user_can('edit_posts')) {
            wp_die(__('권한이 없습니다.', 'dw-church'));
        }

        $result = get_transient('dw_acf_bulletin_migration_result');
        if ($result && isset($_GET['migrated'])) {
            delete_transient('dw_acf_bulletin_migration_result');
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
            echo '<div class="wrap"><h1>' . esc_html__('ACF 주보 마이그레이션', 'dw-church') . '</h1>';
            echo '<div class="notice notice-error"><p>' . esc_html__('Advanced Custom Fields(ACF) 플러그인이 설치·활성화되어 있지 않습니다. 이 도구는 ACF 필드 그룹 "Jubo"(Sunday, Jubo File Url 등)가 있는 포스트를 교회주보로 옮길 때 사용합니다.', 'dw-church') . '</p></div></div>';
            return;
        }

        $posts = $this->get_acf_jubo_posts();
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('ACF 주보 → 교회주보 마이그레이션', 'dw-church'); ?></h1>
            <p class="description">
                <?php esc_html_e('Post에 있는 ACF Jubo 필드(Sunday=주보 날짜, Jubo File Url=주보 PDF)를 DW 교회주보(bulletin)로 옮깁니다. 마이그레이션할 글을 선택한 뒤 실행하세요.', 'dw-church'); ?>
            </p>

            <?php if (empty($posts)) : ?>
                <p><?php esc_html_e('ACF Jubo 필드(sunday 또는 jubo_file_url)가 있는 글이 없습니다.', 'dw-church'); ?></p>
                <p><a href="<?php echo esc_url(admin_url('edit.php?post_type=post')); ?>"><?php esc_html_e('글 목록으로', 'dw-church'); ?></a></p>
            <?php else : ?>
                <form method="post" action="" id="dw-acf-bulletin-migrate-form">
                    <?php wp_nonce_field('dw_acf_bulletin_migrate', 'dw_acf_bulletin_migrate_nonce'); ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <td class="check-column"><input type="checkbox" id="select-all" /></td>
                                <th><?php esc_html_e('제목', 'dw-church'); ?></th>
                                <th><?php esc_html_e('ACF Sunday (주보 날짜)', 'dw-church'); ?></th>
                                <th><?php esc_html_e('Jubo File Url (PDF)', 'dw-church'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($posts as $p) :
                                $sunday = get_field(self::ACF_FIELD_DATE, $p->ID);
                                $pdf = get_field(self::ACF_FIELD_PDF, $p->ID);
                                $sunday_display = is_array($sunday) ? ($sunday['date'] ?? '') : $sunday;
                                $pdf_display = '';
                                if (is_array($pdf) && !empty($pdf['url'])) {
                                    $pdf_display = $pdf['url'];
                                } elseif (is_string($pdf)) {
                                    $pdf_display = $pdf;
                                } elseif (!empty($pdf)) {
                                    $pdf_display = __('설정됨', 'dw-church');
                                }
                            ?>
                                <tr>
                                    <th scope="row" class="check-column">
                                        <input type="checkbox" name="migrate_post_ids[]" value="<?php echo esc_attr($p->ID); ?>" />
                                    </th>
                                    <td>
                                        <a href="<?php echo esc_url(get_edit_post_link($p->ID)); ?>"><?php echo esc_html($p->post_title ?: __('(제목 없음)', 'dw-church')); ?></a>
                                        (ID: <?php echo (int) $p->ID; ?>)
                                    </td>
                                    <td><?php echo esc_html($sunday_display); ?></td>
                                    <td><?php echo $pdf_display ? esc_html(wp_trim_words($pdf_display, 8)) : '—'; ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                    <p class="submit">
                        <button type="submit" class="button button-primary"><?php esc_html_e('선택한 글을 교회주보로 마이그레이션', 'dw-church'); ?></button>
                    </p>
                </form>
                <script>
                document.getElementById('select-all').addEventListener('change', function() {
                    document.querySelectorAll('input[name="migrate_post_ids[]"]').forEach(function(cb) { cb.checked = this.checked; }, this);
                });
                </script>
            <?php endif; ?>
        </div>
        <?php
    }
}
