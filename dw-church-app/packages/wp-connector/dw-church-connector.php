<?php
/**
 * Plugin Name: DW Church Connector
 * Description: Connects your WordPress site to DW Church SaaS for sermons, bulletins, albums, and more.
 * Version: 1.0.0
 * Author: DasomWeb
 * License: GPL-3.0
 * Text Domain: dw-church-connector
 *
 * @package DW_Church_Connector
 */

defined( 'ABSPATH' ) || exit;

define( 'DWC_VERSION', '1.0.0' );
define( 'DWC_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'DWC_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// ─── Include core files ────────────────────────────────────────
require_once DWC_PLUGIN_DIR . 'includes/class-api-client.php';
require_once DWC_PLUGIN_DIR . 'includes/class-settings.php';
require_once DWC_PLUGIN_DIR . 'includes/class-shortcodes.php';

/**
 * Initialize the plugin.
 *
 * @return void
 */
function dwc_init() {
	// Initialize settings page.
	new DW_Church_Settings();

	// Initialize shortcodes.
	new DW_Church_Shortcodes();
}
add_action( 'plugins_loaded', 'dwc_init' );

/**
 * Enqueue front-end assets.
 *
 * @return void
 */
function dwc_enqueue_assets() {
	wp_enqueue_style(
		'dw-church-connector',
		DWC_PLUGIN_URL . 'assets/css/dw-church-connector.css',
		array(),
		DWC_VERSION
	);

	wp_enqueue_script(
		'dw-church-connector',
		DWC_PLUGIN_URL . 'assets/js/dw-church-connector.js',
		array(),
		DWC_VERSION,
		true
	);
}
add_action( 'wp_enqueue_scripts', 'dwc_enqueue_assets' );

/**
 * Plugin activation hook.
 *
 * @return void
 */
function dwc_activate() {
	// Set default options if they don't exist.
	if ( false === get_option( 'dw_church_api_url' ) ) {
		add_option( 'dw_church_api_url', '' );
	}
	if ( false === get_option( 'dw_church_api_key' ) ) {
		add_option( 'dw_church_api_key', '' );
	}
	if ( false === get_option( 'dw_church_cache_ttl' ) ) {
		add_option( 'dw_church_cache_ttl', 300 );
	}
}
register_activation_hook( __FILE__, 'dwc_activate' );

/**
 * Plugin deactivation hook.
 *
 * Clears all plugin transients.
 *
 * @return void
 */
function dwc_deactivate() {
	global $wpdb;

	// Delete all transients created by this plugin.
	$wpdb->query(
		$wpdb->prepare(
			"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
			'_transient_dwc_%',
			'_transient_timeout_dwc_%'
		)
	);
}
register_deactivation_hook( __FILE__, 'dwc_deactivate' );
