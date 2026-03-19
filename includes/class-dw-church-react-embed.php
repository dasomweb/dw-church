<?php
/**
 * DW Church React Embed Layer
 *
 * Registers shortcodes and Gutenberg blocks that mount React components
 * inside WordPress pages. Also enqueues the admin React app on CPT edit screens.
 *
 * @package DW_Church
 * @since   2.72.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DW_Church_React_Embed {

    /**
     * Whether the public React bundle has already been enqueued.
     *
     * @var bool
     */
    private static $enqueued = false;

    /**
     * Monotonic counter used to generate unique mount-point IDs.
     *
     * @var int
     */
    private static $instance_counter = 0;

    /* ------------------------------------------------------------------
     * 1. Bootstrap
     * ----------------------------------------------------------------*/

    /**
     * Called on the WordPress 'init' action.
     * Registers every shortcode, enqueue hooks, and Gutenberg blocks.
     */
    public static function init() {
        // --- Shortcodes ---------------------------------------------------
        $shortcodes = self::get_shortcode_definitions();
        foreach ($shortcodes as $tag => $def) {
            add_shortcode($tag, array(__CLASS__, 'render_shortcode'));
        }

        // --- Gutenberg blocks --------------------------------------------
        self::register_blocks();

        // --- Admin React app ---------------------------------------------
        add_action('admin_enqueue_scripts', array(__CLASS__, 'enqueue_admin_app'));
        add_action('add_meta_boxes', array(__CLASS__, 'add_admin_meta_box'));
    }

    /* ------------------------------------------------------------------
     * 2. Shortcode definitions
     * ----------------------------------------------------------------*/

    /**
     * Return the canonical list of shortcode definitions.
     *
     * Each key is the shortcode tag. Values carry:
     *   - component  : React component name
     *   - params     : accepted shortcode attributes (with defaults)
     *   - auto_id    : whether to auto-detect the current post ID
     *
     * @return array<string, array>
     */
    private static function get_shortcode_definitions() {
        return array(
            'dw_bulletin_list'  => array(
                'component' => 'BulletinList',
                'params'    => array('limit' => '10', 'page' => '1'),
                'auto_id'   => false,
            ),
            'dw_single_bulletin' => array(
                'component' => 'SingleBulletin',
                'params'    => array(),
                'auto_id'   => true,
            ),
            'dw_sermon_list'    => array(
                'component' => 'SermonList',
                'params'    => array('category' => '', 'preacher' => '', 'limit' => '10'),
                'auto_id'   => false,
            ),
            'dw_single_sermon'  => array(
                'component' => 'SingleSermon',
                'params'    => array(),
                'auto_id'   => true,
            ),
            'dw_column_grid'    => array(
                'component' => 'ColumnGrid',
                'params'    => array('limit' => '10'),
                'auto_id'   => false,
            ),
            'dw_single_column'  => array(
                'component' => 'PastoralColumn',
                'params'    => array(),
                'auto_id'   => true,
            ),
            'dw_gallery_grid'   => array(
                'component' => 'GalleryGrid',
                'params'    => array('category' => '', 'limit' => '12'),
                'auto_id'   => false,
            ),
            'dw_single_album'   => array(
                'component' => 'SingleAlbum',
                'params'    => array(),
                'auto_id'   => true,
            ),
            'dw_recent_gallery' => array(
                'component' => 'RecentGallery',
                'params'    => array('limit' => '6'),
                'auto_id'   => false,
            ),
            'dw_banner_slider'  => array(
                'component' => 'BannerSlider',
                'params'    => array('category' => ''),
                'auto_id'   => false,
            ),
            'dw_banner_grid'    => array(
                'component' => 'BannerGrid',
                'params'    => array('category' => '', 'limit' => '8'),
                'auto_id'   => false,
            ),
            'dw_event_grid'     => array(
                'component' => 'EventGrid',
                'params'    => array('limit' => '10'),
                'auto_id'   => false,
            ),
            'dw_single_event'   => array(
                'component' => 'SingleEvent',
                'params'    => array(),
                'auto_id'   => true,
            ),
            'dw_staff_grid'     => array(
                'component' => 'StaffGrid',
                'params'    => array('department' => ''),
                'auto_id'   => false,
            ),
            'dw_history_timeline' => array(
                'component' => 'HistoryTimeline',
                'params'    => array('layout' => ''),
                'auto_id'   => false,
            ),
        );
    }

    /* ------------------------------------------------------------------
     * 3. Shortcode renderer
     * ----------------------------------------------------------------*/

    /**
     * Universal shortcode callback.
     *
     * WordPress passes the matched tag via the third argument.
     *
     * @param array|string $atts    User-supplied attributes.
     * @param string|null  $content Enclosed content (unused).
     * @param string       $tag     The shortcode tag that was matched.
     * @return string HTML to embed in the page.
     */
    public static function render_shortcode($atts, $content, $tag) {
        $definitions = self::get_shortcode_definitions();

        if (!isset($definitions[$tag])) {
            return '';
        }

        $def = $definitions[$tag];

        // Merge user attributes with defaults.
        $defaults = $def['params'];
        $atts     = shortcode_atts($defaults, (array) $atts, $tag);

        // Auto-detect post ID for single-item shortcodes.
        if ($def['auto_id']) {
            $atts['postId'] = (int) get_the_ID();
        }

        // Ensure the React bundle is enqueued (once per page).
        self::enqueue_public_assets();

        // Build the mount point.
        ++self::$instance_counter;
        $mount_id  = 'dw-react-' . esc_attr($tag) . '-' . self::$instance_counter;
        $component = esc_attr($def['component']);
        $props     = esc_attr(wp_json_encode($atts));

        return sprintf(
            '<div id="%s" class="dw-church-react-mount" data-component="%s" data-props=\'%s\'></div>',
            $mount_id,
            $component,
            $props
        );
    }

    /* ------------------------------------------------------------------
     * 4. Public asset enqueue
     * ----------------------------------------------------------------*/

    /**
     * Register and enqueue the public React bundle and bootstrapper.
     */
    private static function enqueue_public_assets() {
        if (self::$enqueued) {
            return;
        }
        self::$enqueued = true;

        $base_url = DASOM_CHURCH_PLUGIN_URL . 'dw-church-app/packages/ui-components/dist/';

        // Main React bundle.
        wp_enqueue_script(
            'dw-church-public-react',
            $base_url . 'index.js',
            array(),
            DASOM_CHURCH_VERSION,
            true // load in footer
        );

        // Stylesheet.
        wp_enqueue_style(
            'dw-church-public-react',
            $base_url . 'styles.css',
            array(),
            DASOM_CHURCH_VERSION
        );

        // Pass REST configuration to the client.
        wp_localize_script('dw-church-public-react', 'dwChurchReact', array(
            'restUrl' => esc_url_raw(rest_url()),
            'nonce'   => wp_create_nonce('wp_rest'),
        ));

        // Bootstrapper: iterate mount points and render React components.
        $bootstrapper = <<<'JS'
(function () {
    function boot() {
        var mountPoints = document.querySelectorAll('[data-component]');
        if (!mountPoints.length || typeof window.DWChurchComponents === 'undefined' || typeof window.ReactDOM === 'undefined') {
            return;
        }
        mountPoints.forEach(function (el) {
            var componentName = el.getAttribute('data-component');
            var propsRaw      = el.getAttribute('data-props');
            var Component     = window.DWChurchComponents[componentName];
            if (!Component) {
                console.warn('DW Church: unknown component "' + componentName + '"');
                return;
            }
            var props = {};
            try { props = JSON.parse(propsRaw || '{}'); } catch (e) { /* ignore */ }
            var root = window.ReactDOM.createRoot(el);
            root.render(window.React.createElement(Component, props));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
JS;

        wp_add_inline_script('dw-church-public-react', $bootstrapper, 'after');
    }

    /* ------------------------------------------------------------------
     * 5. Gutenberg block registration
     * ----------------------------------------------------------------*/

    /**
     * Register server-side rendered Gutenberg blocks.
     */
    private static function register_blocks() {
        // Register custom block category.
        add_filter('block_categories_all', array(__CLASS__, 'register_block_category'), 10, 2);

        $blocks = array(
            'dw-church/sermon-list'     => array(
                'shortcode'  => 'dw_sermon_list',
                'attributes' => array(
                    'category' => array('type' => 'string', 'default' => ''),
                    'preacher' => array('type' => 'string', 'default' => ''),
                    'limit'    => array('type' => 'string', 'default' => '10'),
                ),
            ),
            'dw-church/bulletin-list'   => array(
                'shortcode'  => 'dw_bulletin_list',
                'attributes' => array(
                    'limit' => array('type' => 'string', 'default' => '10'),
                    'page'  => array('type' => 'string', 'default' => '1'),
                ),
            ),
            'dw-church/banner-slider'   => array(
                'shortcode'  => 'dw_banner_slider',
                'attributes' => array(
                    'category' => array('type' => 'string', 'default' => ''),
                ),
            ),
            'dw-church/staff-grid'      => array(
                'shortcode'  => 'dw_staff_grid',
                'attributes' => array(
                    'department' => array('type' => 'string', 'default' => ''),
                ),
            ),
            'dw-church/history-timeline' => array(
                'shortcode'  => 'dw_history_timeline',
                'attributes' => array(
                    'layout' => array('type' => 'string', 'default' => ''),
                ),
            ),
            'dw-church/event-grid'      => array(
                'shortcode'  => 'dw_event_grid',
                'attributes' => array(
                    'limit' => array('type' => 'string', 'default' => '10'),
                ),
            ),
            'dw-church/gallery-grid'    => array(
                'shortcode'  => 'dw_gallery_grid',
                'attributes' => array(
                    'category' => array('type' => 'string', 'default' => ''),
                    'limit'    => array('type' => 'string', 'default' => '12'),
                ),
            ),
        );

        foreach ($blocks as $block_name => $config) {
            register_block_type($block_name, array(
                'attributes'      => $config['attributes'],
                'render_callback' => self::make_block_renderer($config['shortcode'], $config['attributes']),
            ));
        }
    }

    /**
     * Register the 'dw-church' block category.
     *
     * @param array    $categories Existing categories.
     * @param WP_Block_Editor_Context $context Block editor context.
     * @return array
     */
    public static function register_block_category($categories, $context) {
        return array_merge(
            array(
                array(
                    'slug'  => 'dw-church',
                    'title' => __('DW Church', 'dw-church'),
                    'icon'  => 'church',
                ),
            ),
            $categories
        );
    }

    /**
     * Build a render_callback closure for a given shortcode.
     *
     * @param string $shortcode_tag Shortcode to delegate to.
     * @param array  $attr_defs     Attribute definitions (for keys).
     * @return callable
     */
    private static function make_block_renderer($shortcode_tag, $attr_defs) {
        return function ($attributes) use ($shortcode_tag, $attr_defs) {
            // Only pass known attributes.
            $atts = array();
            foreach (array_keys($attr_defs) as $key) {
                if (isset($attributes[$key])) {
                    $atts[$key] = $attributes[$key];
                }
            }
            return self::render_shortcode($atts, null, $shortcode_tag);
        };
    }

    /* ------------------------------------------------------------------
     * 6. Admin React App
     * ----------------------------------------------------------------*/

    /**
     * CPT screen slugs that should load the admin React app.
     *
     * @return string[]
     */
    private static function get_admin_post_types() {
        return array(
            'bulletin',
            'sermon',
            'column',
            'album',
            'banner',
            'event',
            'dw_staff',
            'dw_history',
        );
    }

    /**
     * Enqueue the admin React app JS/CSS on matching CPT screens.
     *
     * @param string $hook_suffix Current admin page hook suffix.
     */
    public static function enqueue_admin_app($hook_suffix) {
        // Only act on post-edit and post-new screens.
        if (!in_array($hook_suffix, array('post.php', 'post-new.php'), true)) {
            return;
        }

        $screen = get_current_screen();
        if (!$screen || !in_array($screen->post_type, self::get_admin_post_types(), true)) {
            return;
        }

        $admin_base_url = DASOM_CHURCH_PLUGIN_URL . 'dw-church-app/packages/admin-app/dist/';

        wp_enqueue_script(
            'dw-church-admin-react',
            $admin_base_url . 'index.js',
            array(),
            DASOM_CHURCH_VERSION,
            true
        );

        wp_enqueue_style(
            'dw-church-admin-react',
            $admin_base_url . 'styles.css',
            array(),
            DASOM_CHURCH_VERSION
        );

        wp_localize_script('dw-church-admin-react', 'dwChurchAdmin', array(
            'restUrl' => esc_url_raw(rest_url()),
            'nonce'   => wp_create_nonce('wp_rest'),
        ));
    }

    /**
     * Register a meta box that renders the admin React mount point.
     */
    public static function add_admin_meta_box() {
        $post_types = self::get_admin_post_types();

        foreach ($post_types as $post_type) {
            add_meta_box(
                'dw-admin-app',
                __('DW Church Admin', 'dw-church'),
                array(__CLASS__, 'render_admin_meta_box'),
                $post_type,
                'normal',
                'high'
            );
        }
    }

    /**
     * Meta box callback: outputs the admin React root div.
     *
     * @param WP_Post $post Current post object.
     */
    public static function render_admin_meta_box($post) {
        printf(
            '<div id="dw-church-admin-root" data-post-id="%s" data-post-type="%s" data-rest-url="%s" data-nonce="%s"></div>',
            esc_attr($post->ID),
            esc_attr($post->post_type),
            esc_attr(rest_url()),
            esc_attr(wp_create_nonce('wp_rest'))
        );
    }
}
