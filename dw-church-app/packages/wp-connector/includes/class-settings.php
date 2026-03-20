<?php
/**
 * DW Church Settings Page
 *
 * Admin settings page for configuring the DW Church SaaS connection.
 *
 * @package DW_Church_Connector
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class DW_Church_Settings
 */
class DW_Church_Settings {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'wp_ajax_dwc_test_connection', array( $this, 'ajax_test_connection' ) );
		add_action( 'wp_ajax_dwc_clear_cache', array( $this, 'ajax_clear_cache' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );
	}

	/**
	 * Add settings page under Settings menu.
	 *
	 * @return void
	 */
	public function add_settings_page() {
		add_options_page(
			__( 'DW Church Settings', 'dw-church-connector' ),
			__( 'DW Church', 'dw-church-connector' ),
			'manage_options',
			'dw-church-settings',
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * Register plugin settings.
	 *
	 * @return void
	 */
	public function register_settings() {
		register_setting( 'dwc_settings_group', 'dw_church_api_url', array(
			'type'              => 'string',
			'sanitize_callback' => 'esc_url_raw',
			'default'           => '',
		) );

		register_setting( 'dwc_settings_group', 'dw_church_api_key', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => '',
		) );

		register_setting( 'dwc_settings_group', 'dw_church_cache_ttl', array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'default'           => 300,
		) );

		// API Connection section.
		add_settings_section(
			'dwc_connection_section',
			__( 'API Connection', 'dw-church-connector' ),
			array( $this, 'render_connection_section' ),
			'dw-church-settings'
		);

		add_settings_field(
			'dw_church_api_url',
			__( 'API URL', 'dw-church-connector' ),
			array( $this, 'render_api_url_field' ),
			'dw-church-settings',
			'dwc_connection_section'
		);

		add_settings_field(
			'dw_church_api_key',
			__( 'API Key', 'dw-church-connector' ),
			array( $this, 'render_api_key_field' ),
			'dw-church-settings',
			'dwc_connection_section'
		);

		// Cache section.
		add_settings_section(
			'dwc_cache_section',
			__( 'Cache Settings', 'dw-church-connector' ),
			array( $this, 'render_cache_section' ),
			'dw-church-settings'
		);

		add_settings_field(
			'dw_church_cache_ttl',
			__( 'Cache TTL (seconds)', 'dw-church-connector' ),
			array( $this, 'render_cache_ttl_field' ),
			'dw-church-settings',
			'dwc_cache_section'
		);
	}

	/**
	 * Enqueue admin scripts on the settings page only.
	 *
	 * @param string $hook_suffix Current admin page hook suffix.
	 * @return void
	 */
	public function enqueue_admin_assets( $hook_suffix ) {
		if ( 'settings_page_dw-church-settings' !== $hook_suffix ) {
			return;
		}

		wp_enqueue_script(
			'dwc-admin',
			DWC_PLUGIN_URL . 'assets/js/dw-church-connector.js',
			array(),
			DWC_VERSION,
			true
		);

		wp_localize_script( 'dwc-admin', 'dwcAdmin', array(
			'ajaxUrl' => admin_url( 'admin-ajax.php' ),
			'nonce'   => wp_create_nonce( 'dwc_admin_nonce' ),
		) );
	}

	/**
	 * Render the connection section description.
	 *
	 * @return void
	 */
	public function render_connection_section() {
		echo '<p>' . esc_html__(
			'Enter your DW Church SaaS API URL and API key to connect your WordPress site.',
			'dw-church-connector'
		) . '</p>';
	}

	/**
	 * Render the cache section description.
	 *
	 * @return void
	 */
	public function render_cache_section() {
		echo '<p>' . esc_html__(
			'Configure how long API responses are cached to improve performance.',
			'dw-church-connector'
		) . '</p>';
	}

	/**
	 * Render API URL field.
	 *
	 * @return void
	 */
	public function render_api_url_field() {
		$value = get_option( 'dw_church_api_url', '' );
		printf(
			'<input type="url" id="dw_church_api_url" name="dw_church_api_url" value="%s" class="regular-text" placeholder="https://your-church.dw-church.app" />',
			esc_attr( $value )
		);
		echo '<p class="description">' . esc_html__(
			'Your DW Church SaaS URL (e.g., https://mychurch.dw-church.app)',
			'dw-church-connector'
		) . '</p>';
	}

	/**
	 * Render API Key field.
	 *
	 * @return void
	 */
	public function render_api_key_field() {
		$value = get_option( 'dw_church_api_key', '' );
		printf(
			'<input type="password" id="dw_church_api_key" name="dw_church_api_key" value="%s" class="regular-text" />',
			esc_attr( $value )
		);
		echo '<p class="description">' . esc_html__(
			'Your API key or JWT token for authentication.',
			'dw-church-connector'
		) . '</p>';
	}

	/**
	 * Render Cache TTL field.
	 *
	 * @return void
	 */
	public function render_cache_ttl_field() {
		$value = get_option( 'dw_church_cache_ttl', 300 );
		printf(
			'<input type="number" id="dw_church_cache_ttl" name="dw_church_cache_ttl" value="%d" class="small-text" min="0" max="86400" />',
			(int) $value
		);
		echo '<p class="description">' . esc_html__(
			'Time in seconds to cache API responses. Set to 0 to disable caching. Default: 300 (5 minutes).',
			'dw-church-connector'
		) . '</p>';
	}

	/**
	 * Render the settings page.
	 *
	 * @return void
	 */
	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

			<form action="options.php" method="post">
				<?php
				settings_fields( 'dwc_settings_group' );
				do_settings_sections( 'dw-church-settings' );
				submit_button();
				?>
			</form>

			<hr />

			<h2><?php esc_html_e( 'Tools', 'dw-church-connector' ); ?></h2>
			<table class="form-table">
				<tr>
					<th scope="row"><?php esc_html_e( 'Connection Test', 'dw-church-connector' ); ?></th>
					<td>
						<button type="button" id="dwc-test-connection" class="button button-secondary">
							<?php esc_html_e( 'Test Connection', 'dw-church-connector' ); ?>
						</button>
						<span id="dwc-test-result" style="margin-left: 10px;"></span>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Clear Cache', 'dw-church-connector' ); ?></th>
					<td>
						<button type="button" id="dwc-clear-cache" class="button button-secondary">
							<?php esc_html_e( 'Clear All Cache', 'dw-church-connector' ); ?>
						</button>
						<span id="dwc-cache-result" style="margin-left: 10px;"></span>
					</td>
				</tr>
			</table>
		</div>
		<?php
	}

	/**
	 * AJAX handler: test API connection.
	 *
	 * @return void
	 */
	public function ajax_test_connection() {
		check_ajax_referer( 'dwc_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( __( 'Unauthorized.', 'dw-church-connector' ) );
		}

		$client = DW_Church_API_Client::instance();
		$result = $client->test_connection();

		if ( is_wp_error( $result ) ) {
			wp_send_json_error( $result->get_error_message() );
		}

		wp_send_json_success( __( 'Connection successful!', 'dw-church-connector' ) );
	}

	/**
	 * AJAX handler: clear all transient caches.
	 *
	 * @return void
	 */
	public function ajax_clear_cache() {
		check_ajax_referer( 'dwc_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( __( 'Unauthorized.', 'dw-church-connector' ) );
		}

		DW_Church_API_Client::clear_cache();

		wp_send_json_success( __( 'Cache cleared successfully.', 'dw-church-connector' ) );
	}
}
