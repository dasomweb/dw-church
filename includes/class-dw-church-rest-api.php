<?php
/**
 * DW Church REST API — Custom Endpoints
 *
 * Provides /dw-church/v1/ namespace with structured JSON responses
 * for all 8 CPTs, related posts, settings, and image URL auto-conversion.
 *
 * @package DW_Church
 * @since   3.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DW_Church_REST_API {

    const NAMESPACE = 'dw-church/v1';

    public static function init() {
        add_action('rest_api_init', array(__CLASS__, 'register_routes'));
        add_action('rest_api_init', array(__CLASS__, 'register_rest_fields'));
        add_filter('rest_pre_serve_request', array(__CLASS__, 'add_cors_headers'), 10, 4);
    }

    /* ──────────────────────────────────────────────────────────
     *  CORS
     * ────────────────────────────────────────────────────────── */

    public static function add_cors_headers($served, $result, $request, $server) {
        $origin = get_http_origin();
        if ($origin) {
            header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
        } else {
            header('Access-Control-Allow-Origin: *');
        }
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
        header('Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages');
        return $served;
    }

    /* ──────────────────────────────────────────────────────────
     *  Route Registration
     * ────────────────────────────────────────────────────────── */

    public static function register_routes() {
        $ns = self::NAMESPACE;

        // ─── Bulletins ────────────────────────────────────
        register_rest_route($ns, '/bulletins', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_bulletins'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route($ns, '/bulletins/(?P<id>\d+)', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_bulletin'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route($ns, '/bulletins/(?P<id>\d+)/related', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_related_bulletins'),
            'permission_callback' => '__return_true',
        ));

        // ─── Sermons ─────────────────────────────────────
        register_rest_route($ns, '/sermons', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_sermons'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route($ns, '/sermons/(?P<id>\d+)', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_sermon'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route($ns, '/sermons/(?P<id>\d+)/related', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_related_sermons'),
            'permission_callback' => '__return_true',
        ));

        // ─── Columns ─────────────────────────────────────
        register_rest_route($ns, '/columns', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_columns'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route($ns, '/columns/(?P<id>\d+)', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_column'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route($ns, '/columns/(?P<id>\d+)/related', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_related_columns'),
            'permission_callback' => '__return_true',
        ));

        // ─── Albums ──────────────────────────────────────
        register_rest_route($ns, '/albums', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_albums'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route($ns, '/albums/(?P<id>\d+)', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_album'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route($ns, '/albums/(?P<id>\d+)/related', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_related_albums'),
            'permission_callback' => '__return_true',
        ));

        // ─── Banners ─────────────────────────────────────
        register_rest_route($ns, '/banners', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_banners'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route($ns, '/banners/(?P<id>\d+)', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_banner'),
            'permission_callback' => '__return_true',
        ));

        // ─── Events ──────────────────────────────────────
        register_rest_route($ns, '/events', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_events'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route($ns, '/events/(?P<id>\d+)', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_event'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route($ns, '/events/(?P<id>\d+)/related', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_related_events'),
            'permission_callback' => '__return_true',
        ));

        // ─── Staff ───────────────────────────────────────
        register_rest_route($ns, '/staff', array(
            array(
                'methods'  => 'GET',
                'callback' => array(__CLASS__, 'get_staff'),
                'permission_callback' => '__return_true',
            ),
            array(
                'methods'  => 'POST',
                'callback' => array(__CLASS__, 'create_staff'),
                'permission_callback' => array(__CLASS__, 'check_edit_permission'),
            ),
        ));
        register_rest_route($ns, '/staff/(?P<id>\d+)', array(
            array(
                'methods'  => 'GET',
                'callback' => array(__CLASS__, 'get_staff_member'),
                'permission_callback' => '__return_true',
            ),
            array(
                'methods'  => 'PUT,PATCH',
                'callback' => array(__CLASS__, 'update_staff'),
                'permission_callback' => array(__CLASS__, 'check_edit_permission'),
            ),
            array(
                'methods'  => 'DELETE',
                'callback' => array(__CLASS__, 'delete_staff'),
                'permission_callback' => array(__CLASS__, 'check_edit_permission'),
            ),
        ));
        register_rest_route($ns, '/staff/reorder', array(
            'methods'  => 'POST',
            'callback' => array(__CLASS__, 'reorder_staff'),
            'permission_callback' => array(__CLASS__, 'check_edit_permission'),
        ));

        // ─── History ─────────────────────────────────────
        register_rest_route($ns, '/history', array(
            array(
                'methods'  => 'GET',
                'callback' => array(__CLASS__, 'get_history'),
                'permission_callback' => '__return_true',
            ),
            array(
                'methods'  => 'POST',
                'callback' => array(__CLASS__, 'create_history'),
                'permission_callback' => array(__CLASS__, 'check_edit_permission'),
            ),
        ));
        register_rest_route($ns, '/history/years', array(
            'methods'  => 'GET',
            'callback' => array(__CLASS__, 'get_history_years'),
            'permission_callback' => '__return_true',
        ));
        register_rest_route($ns, '/history/(?P<id>\d+)', array(
            array(
                'methods'  => 'GET',
                'callback' => array(__CLASS__, 'get_history_entry'),
                'permission_callback' => '__return_true',
            ),
            array(
                'methods'  => 'PUT,PATCH',
                'callback' => array(__CLASS__, 'update_history'),
                'permission_callback' => array(__CLASS__, 'check_edit_permission'),
            ),
            array(
                'methods'  => 'DELETE',
                'callback' => array(__CLASS__, 'delete_history'),
                'permission_callback' => array(__CLASS__, 'check_edit_permission'),
            ),
        ));

        // ─── Settings ────────────────────────────────────
        register_rest_route($ns, '/settings', array(
            array(
                'methods'  => 'GET',
                'callback' => array(__CLASS__, 'get_settings'),
                'permission_callback' => '__return_true',
            ),
            array(
                'methods'  => 'POST',
                'callback' => array(__CLASS__, 'update_settings'),
                'permission_callback' => array(__CLASS__, 'check_manage_permission'),
            ),
        ));
    }

    /* ──────────────────────────────────────────────────────────
     *  Permission Callbacks
     * ────────────────────────────────────────────────────────── */

    public static function check_edit_permission() {
        return current_user_can('edit_posts');
    }

    public static function check_manage_permission() {
        return current_user_can('manage_options');
    }

    /* ──────────────────────────────────────────────────────────
     *  Helper: standard list query params
     * ────────────────────────────────────────────────────────── */

    private static function list_args($request) {
        return array(
            'page'     => max(1, (int) $request->get_param('page') ?: 1),
            'per_page' => min(100, max(1, (int) $request->get_param('per_page') ?: 10)),
            'search'   => sanitize_text_field($request->get_param('search') ?: ''),
            'orderby'  => sanitize_text_field($request->get_param('orderby') ?: 'date'),
            'order'    => strtoupper(sanitize_text_field($request->get_param('order') ?: 'DESC')) === 'ASC' ? 'ASC' : 'DESC',
            'status'   => sanitize_text_field($request->get_param('status') ?: 'publish'),
        );
    }

    private static function paginated_response($posts, $query, $formatter) {
        $data = array_map($formatter, $posts);
        $response = new WP_REST_Response($data, 200);
        $response->header('X-WP-Total', $query->found_posts);
        $response->header('X-WP-TotalPages', $query->max_num_pages);
        return $response;
    }

    private static function attachment_url($attachment_id) {
        if (empty($attachment_id)) return '';
        $url = wp_get_attachment_url((int) $attachment_id);
        return $url ? $url : '';
    }

    private static function image_ids_to_urls($json_or_array) {
        if (is_string($json_or_array)) {
            $json_or_array = json_decode($json_or_array, true);
        }
        if (!is_array($json_or_array)) return array();
        $urls = array();
        foreach ($json_or_array as $id) {
            $url = wp_get_attachment_url((int) $id);
            if ($url) $urls[] = $url;
        }
        return $urls;
    }

    private static function get_thumbnail_url($post_id, $thumb_meta_key = '') {
        // Try custom thumb meta first
        if ($thumb_meta_key) {
            $thumb_id = get_post_meta($post_id, $thumb_meta_key, true);
            if ($thumb_id) {
                $url = self::attachment_url($thumb_id);
                if ($url) return $url;
            }
        }
        // Fallback to featured image
        $thumb_url = get_the_post_thumbnail_url($post_id, 'large');
        return $thumb_url ? $thumb_url : '';
    }

    /* ──────────────────────────────────────────────────────────
     *  Bulletin Endpoints
     * ────────────────────────────────────────────────────────── */

    public static function get_bulletins($request) {
        $args = self::list_args($request);
        $query = new WP_Query(array(
            'post_type'      => 'bulletin',
            'post_status'    => $args['status'],
            'posts_per_page' => $args['per_page'],
            'paged'          => $args['page'],
            's'              => $args['search'],
            'meta_key'       => DW_Meta_Keys::BULLETIN_DATE,
            'orderby'        => 'meta_value',
            'order'          => $args['order'],
            'meta_type'      => 'DATE',
        ));
        return self::paginated_response($query->posts, $query, array(__CLASS__, 'format_bulletin'));
    }

    public static function get_bulletin($request) {
        $post = get_post((int) $request['id']);
        if (!$post || $post->post_type !== 'bulletin') {
            return new WP_Error('not_found', 'Bulletin not found', array('status' => 404));
        }
        return rest_ensure_response(self::format_bulletin($post));
    }

    public static function get_related_bulletins($request) {
        $id = (int) $request['id'];
        $limit = min(10, max(1, (int) ($request->get_param('limit') ?: 4)));
        $posts = get_posts(array(
            'post_type'      => 'bulletin',
            'post_status'    => 'publish',
            'posts_per_page' => $limit,
            'post__not_in'   => array($id),
            'meta_key'       => DW_Meta_Keys::BULLETIN_DATE,
            'orderby'        => 'meta_value',
            'order'          => 'DESC',
            'meta_type'      => 'DATE',
        ));
        return rest_ensure_response(array_map(array(__CLASS__, 'format_bulletin'), $posts));
    }

    public static function format_bulletin($post) {
        $id = $post->ID;
        return array(
            'id'           => $id,
            'title'        => get_the_title($id),
            'date'         => get_post_meta($id, DW_Meta_Keys::BULLETIN_DATE, true) ?: '',
            'pdfUrl'       => self::attachment_url(get_post_meta($id, DW_Meta_Keys::BULLETIN_PDF, true)),
            'images'       => self::image_ids_to_urls(get_post_meta($id, DW_Meta_Keys::BULLETIN_IMAGES, true)),
            'thumbnailUrl' => self::get_thumbnail_url($id),
            'status'       => $post->post_status,
            'createdAt'    => $post->post_date_gmt,
            'modifiedAt'   => $post->post_modified_gmt,
        );
    }

    /* ──────────────────────────────────────────────────────────
     *  Sermon Endpoints
     * ────────────────────────────────────────────────────────── */

    public static function get_sermons($request) {
        $args = self::list_args($request);
        $query_args = array(
            'post_type'      => 'sermon',
            'post_status'    => $args['status'],
            'posts_per_page' => $args['per_page'],
            'paged'          => $args['page'],
            's'              => $args['search'],
            'meta_key'       => DW_Meta_Keys::SERMON_DATE,
            'orderby'        => 'meta_value',
            'order'          => $args['order'],
            'meta_type'      => 'DATE',
        );

        $category = sanitize_text_field($request->get_param('category') ?: '');
        if ($category) {
            $query_args['tax_query'] = array(
                array(
                    'taxonomy' => 'sermon_category',
                    'field'    => 'slug',
                    'terms'    => $category,
                ),
            );
        }

        $preacher = (int) $request->get_param('preacher');
        if ($preacher) {
            $query_args['tax_query'] = isset($query_args['tax_query']) ? $query_args['tax_query'] : array();
            $query_args['tax_query']['relation'] = 'AND';
            $query_args['tax_query'][] = array(
                'taxonomy' => 'dw_sermon_preacher',
                'field'    => 'term_id',
                'terms'    => $preacher,
            );
        }

        $query = new WP_Query($query_args);
        return self::paginated_response($query->posts, $query, array(__CLASS__, 'format_sermon'));
    }

    public static function get_sermon($request) {
        $post = get_post((int) $request['id']);
        if (!$post || $post->post_type !== 'sermon') {
            return new WP_Error('not_found', 'Sermon not found', array('status' => 404));
        }
        return rest_ensure_response(self::format_sermon($post));
    }

    public static function get_related_sermons($request) {
        $id = (int) $request['id'];
        $limit = min(10, max(1, (int) ($request->get_param('limit') ?: 4)));
        $taxonomy = sanitize_text_field($request->get_param('taxonomy') ?: 'sermon_category');
        return rest_ensure_response(self::find_related($id, 'sermon', $taxonomy, $limit));
    }

    public static function format_sermon($post) {
        $id = $post->ID;
        $categories = wp_get_post_terms($id, 'sermon_category', array('fields' => 'ids'));
        $cat_names  = wp_get_post_terms($id, 'sermon_category', array('fields' => 'names'));
        $preachers  = wp_get_post_terms($id, 'dw_sermon_preacher', array('fields' => 'names'));
        return array(
            'id'           => $id,
            'title'        => get_post_meta($id, DW_Meta_Keys::SERMON_TITLE, true) ?: get_the_title($id),
            'youtubeUrl'   => get_post_meta($id, DW_Meta_Keys::SERMON_YOUTUBE, true) ?: '',
            'scripture'    => get_post_meta($id, DW_Meta_Keys::SERMON_SCRIPTURE, true) ?: '',
            'preacher'     => (!is_wp_error($preachers) && !empty($preachers)) ? implode(', ', $preachers) : '',
            'date'         => get_post_meta($id, DW_Meta_Keys::SERMON_DATE, true) ?: '',
            'thumbnailUrl' => self::get_thumbnail_url($id, DW_Meta_Keys::SERMON_THUMB_ID),
            'categoryIds'  => is_wp_error($categories) ? array() : $categories,
            'category'     => (!is_wp_error($cat_names) && !empty($cat_names)) ? implode(', ', $cat_names) : '',
            'status'       => $post->post_status,
            'createdAt'    => $post->post_date_gmt,
            'modifiedAt'   => $post->post_modified_gmt,
        );
    }

    /* ──────────────────────────────────────────────────────────
     *  Column Endpoints
     * ────────────────────────────────────────────────────────── */

    public static function get_columns($request) {
        $args = self::list_args($request);
        $query = new WP_Query(array(
            'post_type'      => 'column',
            'post_status'    => $args['status'],
            'posts_per_page' => $args['per_page'],
            'paged'          => $args['page'],
            's'              => $args['search'],
            'orderby'        => $args['orderby'],
            'order'          => $args['order'],
        ));
        return self::paginated_response($query->posts, $query, array(__CLASS__, 'format_column'));
    }

    public static function get_column($request) {
        $post = get_post((int) $request['id']);
        if (!$post || $post->post_type !== 'column') {
            return new WP_Error('not_found', 'Column not found', array('status' => 404));
        }
        return rest_ensure_response(self::format_column($post));
    }

    public static function get_related_columns($request) {
        $id = (int) $request['id'];
        $limit = min(10, max(1, (int) ($request->get_param('limit') ?: 4)));
        $posts = get_posts(array(
            'post_type'      => 'column',
            'post_status'    => 'publish',
            'posts_per_page' => $limit,
            'post__not_in'   => array($id),
            'orderby'        => 'date',
            'order'          => 'DESC',
        ));
        return rest_ensure_response(array_map(array(__CLASS__, 'format_column'), $posts));
    }

    public static function format_column($post) {
        $id = $post->ID;
        return array(
            'id'             => $id,
            'title'          => get_post_meta($id, DW_Meta_Keys::COLUMN_TITLE, true) ?: get_the_title($id),
            'content'        => get_post_meta($id, DW_Meta_Keys::COLUMN_CONTENT, true) ?: $post->post_content,
            'topImageUrl'    => self::attachment_url(get_post_meta($id, DW_Meta_Keys::COLUMN_TOP_IMAGE, true)),
            'bottomImageUrl' => self::attachment_url(get_post_meta($id, DW_Meta_Keys::COLUMN_BOTTOM_IMAGE, true)),
            'youtubeUrl'     => get_post_meta($id, DW_Meta_Keys::COLUMN_YOUTUBE, true) ?: '',
            'thumbnailUrl'   => self::get_thumbnail_url($id, DW_Meta_Keys::COLUMN_THUMB_ID),
            'status'         => $post->post_status,
            'createdAt'      => $post->post_date_gmt,
            'modifiedAt'     => $post->post_modified_gmt,
        );
    }

    /* ──────────────────────────────────────────────────────────
     *  Album Endpoints
     * ────────────────────────────────────────────────────────── */

    public static function get_albums($request) {
        $args = self::list_args($request);
        $query_args = array(
            'post_type'      => 'album',
            'post_status'    => $args['status'],
            'posts_per_page' => $args['per_page'],
            'paged'          => $args['page'],
            's'              => $args['search'],
            'orderby'        => $args['orderby'],
            'order'          => $args['order'],
        );
        $category = sanitize_text_field($request->get_param('category') ?: '');
        if ($category) {
            $query_args['tax_query'] = array(array(
                'taxonomy' => 'album_category',
                'field'    => 'slug',
                'terms'    => $category,
            ));
        }
        $query = new WP_Query($query_args);
        return self::paginated_response($query->posts, $query, array(__CLASS__, 'format_album'));
    }

    public static function get_album($request) {
        $post = get_post((int) $request['id']);
        if (!$post || $post->post_type !== 'album') {
            return new WP_Error('not_found', 'Album not found', array('status' => 404));
        }
        return rest_ensure_response(self::format_album($post));
    }

    public static function get_related_albums($request) {
        $id = (int) $request['id'];
        $limit = min(10, max(1, (int) ($request->get_param('limit') ?: 4)));
        return rest_ensure_response(self::find_related($id, 'album', 'album_category', $limit));
    }

    public static function format_album($post) {
        $id = $post->ID;
        $categories = wp_get_post_terms($id, 'album_category', array('fields' => 'ids'));
        return array(
            'id'           => $id,
            'title'        => get_the_title($id),
            'images'       => self::image_ids_to_urls(get_post_meta($id, DW_Meta_Keys::ALBUM_IMAGES, true)),
            'youtubeUrl'   => get_post_meta($id, DW_Meta_Keys::ALBUM_YOUTUBE, true) ?: '',
            'thumbnailUrl' => self::get_thumbnail_url($id, DW_Meta_Keys::ALBUM_THUMB_ID),
            'categoryIds'  => is_wp_error($categories) ? array() : $categories,
            'status'       => $post->post_status,
            'createdAt'    => $post->post_date_gmt,
            'modifiedAt'   => $post->post_modified_gmt,
        );
    }

    /* ──────────────────────────────────────────────────────────
     *  Banner Endpoints
     * ────────────────────────────────────────────────────────── */

    public static function get_banners($request) {
        $args = self::list_args($request);
        $query_args = array(
            'post_type'      => 'banner',
            'post_status'    => $args['status'],
            'posts_per_page' => $args['per_page'],
            'paged'          => $args['page'],
            'orderby'        => $args['orderby'],
            'order'          => $args['order'],
        );

        $category = sanitize_text_field($request->get_param('category') ?: '');
        if ($category) {
            $query_args['tax_query'] = array(array(
                'taxonomy' => 'banner_category',
                'field'    => 'slug',
                'terms'    => $category,
            ));
        }

        $active = $request->get_param('active');
        if ($active === 'true' || $active === '1') {
            $today = current_time('Y-m-d');
            $query_args['meta_query'] = array(
                'relation' => 'OR',
                array('key' => DW_Meta_Keys::BANNER_END_DATE, 'compare' => 'NOT EXISTS'),
                array('key' => DW_Meta_Keys::BANNER_END_DATE, 'value' => '', 'compare' => '='),
                array('key' => DW_Meta_Keys::BANNER_END_DATE, 'value' => $today, 'compare' => '>=', 'type' => 'DATE'),
            );
        }

        $query = new WP_Query($query_args);
        return self::paginated_response($query->posts, $query, array(__CLASS__, 'format_banner'));
    }

    public static function get_banner($request) {
        $post = get_post((int) $request['id']);
        if (!$post || $post->post_type !== 'banner') {
            return new WP_Error('not_found', 'Banner not found', array('status' => 404));
        }
        return rest_ensure_response(self::format_banner($post));
    }

    public static function format_banner($post) {
        $id = $post->ID;
        $cat_terms = wp_get_post_terms($id, 'banner_category', array('fields' => 'slugs'));
        $category  = (!is_wp_error($cat_terms) && !empty($cat_terms)) ? $cat_terms[0] : '';

        return array(
            'id'             => $id,
            'title'          => get_the_title($id),
            'pcImageUrl'     => self::attachment_url(get_post_meta($id, 'dw_banner_pc_image', true)),
            'mobileImageUrl' => self::attachment_url(get_post_meta($id, 'dw_banner_mobile_image', true)),
            'subImageUrl'    => self::attachment_url(get_post_meta($id, 'dw_banner_sub_image', true)),
            'linkUrl'        => get_post_meta($id, 'dw_banner_link_url', true) ?: '',
            'linkTarget'     => get_post_meta($id, 'dw_banner_link_target', true) ?: '_self',
            'startDate'      => get_post_meta($id, 'dw_banner_start_date', true) ?: '',
            'endDate'        => get_post_meta($id, DW_Meta_Keys::BANNER_END_DATE, true) ?: '',
            'textOverlay'    => array(
                'heading'     => get_post_meta($id, 'dw_banner_heading', true) ?: '',
                'subheading'  => get_post_meta($id, 'dw_banner_subheading', true) ?: '',
                'description' => get_post_meta($id, 'dw_banner_description', true) ?: '',
                'position'    => get_post_meta($id, 'dw_banner_text_position', true) ?: 'center-center',
                'align'       => get_post_meta($id, 'dw_banner_text_align', true) ?: 'center',
                'widths'      => array(
                    'pc'     => get_post_meta($id, 'dw_banner_text_width_pc', true) ?: '100%',
                    'laptop' => get_post_meta($id, 'dw_banner_text_width_laptop', true) ?: '100%',
                    'tablet' => get_post_meta($id, 'dw_banner_text_width_tablet', true) ?: '100%',
                    'mobile' => get_post_meta($id, 'dw_banner_text_width_mobile', true) ?: '100%',
                ),
            ),
            'category'       => $category,
            'status'         => $post->post_status,
            'createdAt'      => $post->post_date_gmt,
            'modifiedAt'     => $post->post_modified_gmt,
        );
    }

    /* ──────────────────────────────────────────────────────────
     *  Event Endpoints
     * ────────────────────────────────────────────────────────── */

    public static function get_events($request) {
        $args = self::list_args($request);
        $query = new WP_Query(array(
            'post_type'      => 'event',
            'post_status'    => $args['status'],
            'posts_per_page' => $args['per_page'],
            'paged'          => $args['page'],
            's'              => $args['search'],
            'orderby'        => $args['orderby'],
            'order'          => $args['order'],
        ));
        return self::paginated_response($query->posts, $query, array(__CLASS__, 'format_event'));
    }

    public static function get_event($request) {
        $post = get_post((int) $request['id']);
        if (!$post || $post->post_type !== 'event') {
            return new WP_Error('not_found', 'Event not found', array('status' => 404));
        }
        return rest_ensure_response(self::format_event($post));
    }

    public static function get_related_events($request) {
        $id = (int) $request['id'];
        $limit = min(10, max(1, (int) ($request->get_param('limit') ?: 4)));
        $posts = get_posts(array(
            'post_type'      => 'event',
            'post_status'    => 'publish',
            'posts_per_page' => $limit,
            'post__not_in'   => array($id),
            'orderby'        => 'date',
            'order'          => 'DESC',
        ));
        return rest_ensure_response(array_map(array(__CLASS__, 'format_event'), $posts));
    }

    public static function format_event($post) {
        $id = $post->ID;
        return array(
            'id'                 => $id,
            'title'              => get_the_title($id),
            'backgroundImageUrl' => self::attachment_url(get_post_meta($id, 'dw_event_bg_image', true)),
            'imageOnly'          => (bool) get_post_meta($id, 'dw_event_image_only', true),
            'department'         => get_post_meta($id, 'dw_event_department', true) ?: '',
            'eventDate'          => get_post_meta($id, DW_Meta_Keys::EVENT_DATE, true) ?: '',
            'location'           => get_post_meta($id, DW_Meta_Keys::EVENT_LOCATION, true) ?: '',
            'linkUrl'            => get_post_meta($id, DW_Meta_Keys::EVENT_URL, true) ?: '',
            'description'        => get_post_meta($id, 'dw_event_description', true) ?: '',
            'youtubeUrl'         => get_post_meta($id, 'dw_event_youtube', true) ?: '',
            'thumbnailUrl'       => self::get_thumbnail_url($id),
            'status'             => $post->post_status,
            'createdAt'          => $post->post_date_gmt,
            'modifiedAt'         => $post->post_modified_gmt,
        );
    }

    /* ──────────────────────────────────────────────────────────
     *  Staff Endpoints (New)
     * ────────────────────────────────────────────────────────── */

    public static function get_staff($request) {
        $query_args = array(
            'post_type'      => 'dw_staff',
            'post_status'    => 'publish',
            'posts_per_page' => 100,
            'meta_key'       => DW_Meta_Keys::STAFF_ORDER,
            'orderby'        => 'meta_value_num',
            'order'          => 'ASC',
        );

        $department = sanitize_text_field($request->get_param('department') ?: '');
        if ($department) {
            $query_args['tax_query'] = array(array(
                'taxonomy' => 'dw_staff_department',
                'field'    => 'slug',
                'terms'    => $department,
            ));
        }

        $active_only = $request->get_param('active_only');
        if ($active_only === 'true' || $active_only === '1') {
            $query_args['meta_query'] = array(
                array('key' => DW_Meta_Keys::STAFF_IS_ACTIVE, 'value' => '1', 'compare' => '='),
            );
        }

        $posts = get_posts($query_args);
        return rest_ensure_response(array_map(array(__CLASS__, 'format_staff'), $posts));
    }

    public static function get_staff_member($request) {
        $post = get_post((int) $request['id']);
        if (!$post || $post->post_type !== 'dw_staff') {
            return new WP_Error('not_found', 'Staff not found', array('status' => 404));
        }
        return rest_ensure_response(self::format_staff($post));
    }

    public static function create_staff($request) {
        $data = $request->get_json_params();
        $post_id = wp_insert_post(array(
            'post_type'   => 'dw_staff',
            'post_title'  => sanitize_text_field($data['name'] ?? ''),
            'post_status' => 'publish',
        ));
        if (is_wp_error($post_id)) return $post_id;
        self::save_staff_meta($post_id, $data);
        return rest_ensure_response(self::format_staff(get_post($post_id)));
    }

    public static function update_staff($request) {
        $post = get_post((int) $request['id']);
        if (!$post || $post->post_type !== 'dw_staff') {
            return new WP_Error('not_found', 'Staff not found', array('status' => 404));
        }
        $data = $request->get_json_params();
        if (isset($data['name'])) {
            wp_update_post(array('ID' => $post->ID, 'post_title' => sanitize_text_field($data['name'])));
        }
        self::save_staff_meta($post->ID, $data);
        return rest_ensure_response(self::format_staff(get_post($post->ID)));
    }

    public static function delete_staff($request) {
        $post = get_post((int) $request['id']);
        if (!$post || $post->post_type !== 'dw_staff') {
            return new WP_Error('not_found', 'Staff not found', array('status' => 404));
        }
        wp_delete_post($post->ID, true);
        return rest_ensure_response(array('deleted' => true));
    }

    public static function reorder_staff($request) {
        $data = $request->get_json_params();
        $ids = isset($data['ids']) && is_array($data['ids']) ? array_map('intval', $data['ids']) : array();
        foreach ($ids as $order => $id) {
            update_post_meta($id, DW_Meta_Keys::STAFF_ORDER, $order);
        }
        return rest_ensure_response(array('reordered' => true));
    }

    private static function save_staff_meta($post_id, $data) {
        $fields = array(
            'role'       => DW_Meta_Keys::STAFF_ROLE,
            'email'      => DW_Meta_Keys::STAFF_EMAIL,
            'phone'      => DW_Meta_Keys::STAFF_PHONE,
            'bio'        => DW_Meta_Keys::STAFF_BIO,
            'order'      => DW_Meta_Keys::STAFF_ORDER,
            'photoUrl'   => DW_Meta_Keys::STAFF_PHOTO_ID,
            'isActive'   => DW_Meta_Keys::STAFF_IS_ACTIVE,
        );
        foreach ($fields as $key => $meta_key) {
            if (isset($data[$key])) {
                $value = $data[$key];
                if ($key === 'isActive') $value = $value ? '1' : '0';
                if ($key === 'order') $value = (int) $value;
                update_post_meta($post_id, $meta_key, sanitize_text_field((string) $value));
            }
        }
        if (isset($data['snsLinks']) && is_array($data['snsLinks'])) {
            update_post_meta($post_id, DW_Meta_Keys::STAFF_SNS_LINKS, wp_json_encode($data['snsLinks']));
        }
        if (isset($data['department'])) {
            wp_set_object_terms($post_id, sanitize_text_field($data['department']), 'dw_staff_department');
        }
    }

    public static function format_staff($post) {
        $id = $post->ID;
        $sns_raw = get_post_meta($id, DW_Meta_Keys::STAFF_SNS_LINKS, true);
        $sns = $sns_raw ? json_decode($sns_raw, true) : array();
        $dept_terms = wp_get_post_terms($id, 'dw_staff_department', array('fields' => 'names'));
        return array(
            'id'         => $id,
            'name'       => get_the_title($id),
            'role'       => get_post_meta($id, DW_Meta_Keys::STAFF_ROLE, true) ?: '',
            'department' => (!is_wp_error($dept_terms) && !empty($dept_terms)) ? $dept_terms[0] : '',
            'email'      => get_post_meta($id, DW_Meta_Keys::STAFF_EMAIL, true) ?: '',
            'phone'      => get_post_meta($id, DW_Meta_Keys::STAFF_PHONE, true) ?: '',
            'bio'        => get_post_meta($id, DW_Meta_Keys::STAFF_BIO, true) ?: '',
            'order'      => (int) get_post_meta($id, DW_Meta_Keys::STAFF_ORDER, true),
            'photoUrl'   => self::get_thumbnail_url($id, DW_Meta_Keys::STAFF_PHOTO_ID),
            'snsLinks'   => is_array($sns) ? $sns : array(),
            'isActive'   => (bool) get_post_meta($id, DW_Meta_Keys::STAFF_IS_ACTIVE, true),
        );
    }

    /* ──────────────────────────────────────────────────────────
     *  History Endpoints (New)
     * ────────────────────────────────────────────────────────── */

    public static function get_history($request) {
        $query_args = array(
            'post_type'      => 'dw_history',
            'post_status'    => 'publish',
            'posts_per_page' => 100,
            'meta_key'       => DW_Meta_Keys::HISTORY_YEAR,
            'orderby'        => 'meta_value_num',
            'order'          => 'DESC',
        );
        $year = (int) $request->get_param('year');
        if ($year) {
            $query_args['meta_query'] = array(
                array('key' => DW_Meta_Keys::HISTORY_YEAR, 'value' => $year, 'compare' => '=', 'type' => 'NUMERIC'),
            );
        }
        $posts = get_posts($query_args);
        return rest_ensure_response(array_map(array(__CLASS__, 'format_history'), $posts));
    }

    public static function get_history_years() {
        global $wpdb;
        $years = $wpdb->get_col($wpdb->prepare(
            "SELECT DISTINCT pm.meta_value FROM {$wpdb->postmeta} pm
             INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE pm.meta_key = %s AND p.post_type = 'dw_history' AND p.post_status = 'publish'
             ORDER BY pm.meta_value DESC",
            DW_Meta_Keys::HISTORY_YEAR
        ));
        return rest_ensure_response(array_map('intval', $years));
    }

    public static function get_history_entry($request) {
        $post = get_post((int) $request['id']);
        if (!$post || $post->post_type !== 'dw_history') {
            return new WP_Error('not_found', 'History not found', array('status' => 404));
        }
        return rest_ensure_response(self::format_history($post));
    }

    public static function create_history($request) {
        $data = $request->get_json_params();
        $year = (int) ($data['year'] ?? 0);
        if (!$year) {
            return new WP_Error('invalid_year', 'Year is required', array('status' => 400));
        }
        $post_id = wp_insert_post(array(
            'post_type'   => 'dw_history',
            'post_title'  => (string) $year . '년 연혁',
            'post_status' => 'publish',
        ));
        if (is_wp_error($post_id)) return $post_id;
        update_post_meta($post_id, DW_Meta_Keys::HISTORY_YEAR, $year);
        if (isset($data['items'])) {
            update_post_meta($post_id, DW_Meta_Keys::HISTORY_ITEMS, wp_json_encode($data['items']));
        }
        return rest_ensure_response(self::format_history(get_post($post_id)));
    }

    public static function update_history($request) {
        $post = get_post((int) $request['id']);
        if (!$post || $post->post_type !== 'dw_history') {
            return new WP_Error('not_found', 'History not found', array('status' => 404));
        }
        $data = $request->get_json_params();
        if (isset($data['year'])) {
            $year = (int) $data['year'];
            update_post_meta($post->ID, DW_Meta_Keys::HISTORY_YEAR, $year);
            wp_update_post(array('ID' => $post->ID, 'post_title' => $year . '년 연혁'));
        }
        if (isset($data['items'])) {
            update_post_meta($post->ID, DW_Meta_Keys::HISTORY_ITEMS, wp_json_encode($data['items']));
        }
        return rest_ensure_response(self::format_history(get_post($post->ID)));
    }

    public static function delete_history($request) {
        $post = get_post((int) $request['id']);
        if (!$post || $post->post_type !== 'dw_history') {
            return new WP_Error('not_found', 'History not found', array('status' => 404));
        }
        wp_delete_post($post->ID, true);
        return rest_ensure_response(array('deleted' => true));
    }

    public static function format_history($post) {
        $id = $post->ID;
        $items_raw = get_post_meta($id, DW_Meta_Keys::HISTORY_ITEMS, true);
        $items = $items_raw ? json_decode($items_raw, true) : array();
        // Convert photo_id to photo_url for each item
        if (is_array($items)) {
            foreach ($items as &$item) {
                if (isset($item['photo_id']) && $item['photo_id']) {
                    $item['photoUrl'] = self::attachment_url($item['photo_id']);
                } else {
                    $item['photoUrl'] = isset($item['photoUrl']) ? $item['photoUrl'] : '';
                }
            }
            unset($item);
        }
        return array(
            'id'    => $id,
            'year'  => (int) get_post_meta($id, DW_Meta_Keys::HISTORY_YEAR, true),
            'items' => is_array($items) ? $items : array(),
        );
    }

    /* ──────────────────────────────────────────────────────────
     *  Settings Endpoints
     * ────────────────────────────────────────────────────────── */

    public static function get_settings() {
        return rest_ensure_response(array(
            'name'                  => dasom_church_get_setting('name', ''),
            'address'               => dasom_church_get_setting('address', ''),
            'phone'                 => dasom_church_get_setting('phone', ''),
            'email'                 => dasom_church_get_setting('email', ''),
            'website'               => dasom_church_get_setting('website', ''),
            'socialYoutube'         => dasom_church_get_setting('social_youtube', ''),
            'socialInstagram'       => dasom_church_get_setting('social_instagram', ''),
            'socialFacebook'        => dasom_church_get_setting('social_facebook', ''),
            'socialLinkedin'        => dasom_church_get_setting('social_linkedin', ''),
            'socialTiktok'          => dasom_church_get_setting('social_tiktok', ''),
            'socialKakaotalk'       => dasom_church_get_setting('social_kakaotalk', ''),
            'socialKakaotalkChannel' => dasom_church_get_setting('social_kakaotalk_channel', ''),
        ));
    }

    public static function update_settings($request) {
        $data = $request->get_json_params();
        $map = array(
            'name'                   => 'name',
            'address'                => 'address',
            'phone'                  => 'phone',
            'email'                  => 'email',
            'website'                => 'website',
            'socialYoutube'          => 'social_youtube',
            'socialInstagram'        => 'social_instagram',
            'socialFacebook'         => 'social_facebook',
            'socialLinkedin'         => 'social_linkedin',
            'socialTiktok'           => 'social_tiktok',
            'socialKakaotalk'        => 'social_kakaotalk',
            'socialKakaotalkChannel' => 'social_kakaotalk_channel',
        );
        foreach ($map as $api_key => $setting_key) {
            if (isset($data[$api_key])) {
                dasom_church_update_setting($setting_key, sanitize_text_field($data[$api_key]));
            }
        }
        return self::get_settings();
    }

    /* ──────────────────────────────────────────────────────────
     *  Related Posts Helper
     * ────────────────────────────────────────────────────────── */

    private static function find_related($post_id, $post_type, $taxonomy, $limit) {
        $collected = array();
        $exclude   = array($post_id);

        // 1. Same taxonomy terms
        $terms = wp_get_post_terms($post_id, $taxonomy, array('fields' => 'ids'));
        if (!is_wp_error($terms) && !empty($terms)) {
            $tax_posts = get_posts(array(
                'post_type'      => $post_type,
                'post_status'    => 'publish',
                'posts_per_page' => $limit,
                'post__not_in'   => $exclude,
                'tax_query'      => array(array(
                    'taxonomy' => $taxonomy,
                    'field'    => 'term_id',
                    'terms'    => $terms,
                )),
                'orderby'        => 'date',
                'order'          => 'DESC',
            ));
            foreach ($tax_posts as $p) {
                $collected[$p->ID] = $p;
                $exclude[] = $p->ID;
            }
        }

        // 2. Fill remaining with latest from same CPT
        if (count($collected) < $limit) {
            $remaining = $limit - count($collected);
            $fill = get_posts(array(
                'post_type'      => $post_type,
                'post_status'    => 'publish',
                'posts_per_page' => $remaining,
                'post__not_in'   => $exclude,
                'orderby'        => 'date',
                'order'          => 'DESC',
            ));
            foreach ($fill as $p) {
                $collected[$p->ID] = $p;
            }
        }

        // Format using the appropriate formatter
        $formatters = array(
            'bulletin' => 'format_bulletin',
            'sermon'   => 'format_sermon',
            'column'   => 'format_column',
            'album'    => 'format_album',
            'event'    => 'format_event',
        );
        $formatter = isset($formatters[$post_type]) ? $formatters[$post_type] : null;
        if (!$formatter) return array_values($collected);

        return array_values(array_map(array(__CLASS__, $formatter), $collected));
    }

    /* ──────────────────────────────────────────────────────────
     *  REST Fields — Image URL auto-conversion on standard WP REST
     * ────────────────────────────────────────────────────────── */

    public static function register_rest_fields() {
        // Bulletin images
        register_rest_field('bulletin', 'dw_images_urls', array(
            'get_callback' => function ($post) {
                return self::image_ids_to_urls(get_post_meta($post['id'], DW_Meta_Keys::BULLETIN_IMAGES, true));
            },
            'schema' => array('type' => 'array', 'items' => array('type' => 'string')),
        ));

        // Bulletin PDF URL
        register_rest_field('bulletin', 'dw_pdf_url', array(
            'get_callback' => function ($post) {
                return self::attachment_url(get_post_meta($post['id'], DW_Meta_Keys::BULLETIN_PDF, true));
            },
            'schema' => array('type' => 'string'),
        ));

        // Album images
        register_rest_field('album', 'dw_images_urls', array(
            'get_callback' => function ($post) {
                return self::image_ids_to_urls(get_post_meta($post['id'], DW_Meta_Keys::ALBUM_IMAGES, true));
            },
            'schema' => array('type' => 'array', 'items' => array('type' => 'string')),
        ));

        // Sermon thumbnail
        register_rest_field('sermon', 'dw_thumbnail_url', array(
            'get_callback' => function ($post) {
                return self::get_thumbnail_url($post['id'], DW_Meta_Keys::SERMON_THUMB_ID);
            },
            'schema' => array('type' => 'string'),
        ));

        // Staff photo
        register_rest_field('dw_staff', 'dw_photo_url', array(
            'get_callback' => function ($post) {
                return self::get_thumbnail_url($post['id'], DW_Meta_Keys::STAFF_PHOTO_ID);
            },
            'schema' => array('type' => 'string'),
        ));
    }
}

// Initialize
DW_Church_REST_API::init();
