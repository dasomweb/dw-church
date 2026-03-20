<?php
/**
 * DW Church API Client
 *
 * HTTP client for communicating with the DW Church SaaS API.
 * Uses WordPress HTTP API and transient caching.
 *
 * @package DW_Church_Connector
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class DW_Church_API_Client
 */
class DW_Church_API_Client {

	/**
	 * Base API URL.
	 *
	 * @var string
	 */
	private $api_url;

	/**
	 * API key for authentication.
	 *
	 * @var string
	 */
	private $api_key;

	/**
	 * Cache TTL in seconds.
	 *
	 * @var int
	 */
	private $cache_ttl;

	/**
	 * Singleton instance.
	 *
	 * @var DW_Church_API_Client|null
	 */
	private static $instance = null;

	/**
	 * Constructor.
	 *
	 * @param string $api_url  Base API URL.
	 * @param string $api_key  Optional API key.
	 * @param int    $cache_ttl Cache TTL in seconds.
	 */
	public function __construct( $api_url = '', $api_key = '', $cache_ttl = 300 ) {
		$this->api_url   = rtrim( $api_url, '/' );
		$this->api_key   = $api_key;
		$this->cache_ttl = (int) $cache_ttl;
	}

	/**
	 * Get a singleton instance using wp_options values.
	 *
	 * @return DW_Church_API_Client
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self(
				get_option( 'dw_church_api_url', '' ),
				get_option( 'dw_church_api_key', '' ),
				get_option( 'dw_church_cache_ttl', 300 )
			);
		}

		return self::$instance;
	}

	/**
	 * Build request headers.
	 *
	 * @return array
	 */
	private function get_headers() {
		$headers = array(
			'Content-Type' => 'application/json',
			'Accept'       => 'application/json',
		);

		if ( ! empty( $this->api_key ) ) {
			$headers['Authorization'] = 'Bearer ' . $this->api_key;
		}

		return $headers;
	}

	/**
	 * Perform a GET request.
	 *
	 * @param string $endpoint API endpoint (e.g. "/api/v1/sermons").
	 * @param array  $params   Query parameters.
	 * @return array|WP_Error Decoded JSON response or WP_Error.
	 */
	public function get( $endpoint, $params = array() ) {
		$url = $this->build_url( $endpoint, $params );

		$response = wp_remote_get(
			$url,
			array(
				'headers' => $this->get_headers(),
				'timeout' => 15,
			)
		);

		return $this->parse_response( $response );
	}

	/**
	 * Perform a POST request.
	 *
	 * @param string $endpoint API endpoint.
	 * @param array  $data     Request body data.
	 * @return array|WP_Error Decoded JSON response or WP_Error.
	 */
	public function post( $endpoint, $data = array() ) {
		$url = $this->build_url( $endpoint );

		$response = wp_remote_post(
			$url,
			array(
				'headers' => $this->get_headers(),
				'body'    => wp_json_encode( $data ),
				'timeout' => 15,
			)
		);

		return $this->parse_response( $response );
	}

	/**
	 * Perform a cached GET request.
	 *
	 * Results are stored as WordPress transients.
	 *
	 * @param string $endpoint API endpoint.
	 * @param array  $params   Query parameters.
	 * @param int    $ttl      Cache TTL in seconds. Uses default if 0.
	 * @return array|WP_Error Decoded JSON response or WP_Error.
	 */
	public function get_cached( $endpoint, $params = array(), $ttl = 0 ) {
		if ( 0 === $ttl ) {
			$ttl = $this->cache_ttl;
		}

		$cache_key = $this->build_cache_key( $endpoint, $params );
		$cached    = get_transient( $cache_key );

		if ( false !== $cached ) {
			return $cached;
		}

		$result = $this->get( $endpoint, $params );

		if ( ! is_wp_error( $result ) ) {
			set_transient( $cache_key, $result, $ttl );
		}

		return $result;
	}

	/**
	 * Test the API connection.
	 *
	 * @return array|WP_Error Settings data on success, WP_Error on failure.
	 */
	public function test_connection() {
		return $this->get( '/api/v1/settings' );
	}

	/**
	 * Build the full URL for a request.
	 *
	 * @param string $endpoint API endpoint.
	 * @param array  $params   Query parameters.
	 * @return string Full URL.
	 */
	private function build_url( $endpoint, $params = array() ) {
		$url = $this->api_url . $endpoint;

		// Filter out empty params.
		$params = array_filter(
			$params,
			function ( $value ) {
				return '' !== $value && null !== $value;
			}
		);

		if ( ! empty( $params ) ) {
			$url = add_query_arg( $params, $url );
		}

		return $url;
	}

	/**
	 * Parse a WordPress HTTP response.
	 *
	 * @param array|WP_Error $response wp_remote_get/post response.
	 * @return array|WP_Error Decoded JSON or WP_Error.
	 */
	private function parse_response( $response ) {
		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = wp_remote_retrieve_body( $response );

		if ( $code < 200 || $code >= 300 ) {
			return new WP_Error(
				'dwc_api_error',
				sprintf(
					/* translators: 1: HTTP status code, 2: response body */
					__( 'API request failed with status %1$d: %2$s', 'dw-church-connector' ),
					$code,
					$body
				),
				array( 'status' => $code )
			);
		}

		$data = json_decode( $body, true );

		if ( null === $data && '' !== $body ) {
			return new WP_Error(
				'dwc_json_error',
				__( 'Failed to parse API response as JSON.', 'dw-church-connector' )
			);
		}

		return $data;
	}

	/**
	 * Build a transient cache key.
	 *
	 * @param string $endpoint API endpoint.
	 * @param array  $params   Query parameters.
	 * @return string Transient key (max 172 chars).
	 */
	private function build_cache_key( $endpoint, $params = array() ) {
		$raw = $endpoint . '|' . wp_json_encode( $params );
		return 'dwc_' . md5( $raw );
	}

	/**
	 * Clear all plugin caches.
	 *
	 * @return void
	 */
	public static function clear_cache() {
		global $wpdb;

		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
				'_transient_dwc_%',
				'_transient_timeout_dwc_%'
			)
		);
	}
}
