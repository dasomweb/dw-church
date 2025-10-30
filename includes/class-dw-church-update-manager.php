<?php
/**
 * DW Church Update Manager
 * 
 * Handles self-hosted updates for the DW Church Management System plugin
 * 
 * @package DW_Church_Management
 * @since 2.22
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

class DW_Church_Update_Manager {
    
    private static $instance = null;
    private $update_uri = 'https://github.com/dasomweb/dasom-church-management-system';
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('init', array($this, 'init'));
    }
    
    public function init() {
        // Only run for admin users
        if (!is_admin()) {
            return;
        }
        
        // Add update filters
        add_filter('update_plugins_github.com', array($this, 'check_for_updates'), 10, 3);
        add_filter('plugins_api', array($this, 'get_plugin_info'), 10, 3);
        add_filter('site_transient_update_plugins', array($this, 'modify_update_transient'));
    }
    
    /**
     * Check for updates from GitHub
     */
    public function check_for_updates($update, $plugin_data, $plugin_file) {
        if ($plugin_file !== DASOM_CHURCH_PLUGIN_BASENAME) {
            return $update;
        }
        
        $remote_version = $this->get_remote_version();
        if (!$remote_version) {
            return $update;
        }
        
        if (version_compare(DASOM_CHURCH_VERSION, $remote_version, '<')) {
            $update = new stdClass();
            $update->slug = 'dw-church';
            $update->plugin = DASOM_CHURCH_PLUGIN_BASENAME;
            $update->new_version = $remote_version;
            $update->url = $this->update_uri;
            $update->package = $this->get_download_url($remote_version);
            $update->icons = array();
            $update->banners = array();
            $update->banners_rtl = array();
            $update->tested = '6.8';
            $update->requires_php = '8.0';
            $update->compatibility = new stdClass();
        }
        
        return $update;
    }
    
    /**
     * Get plugin information for update screen
     */
    public function get_plugin_info($result, $action, $args) {
        if ($action !== 'plugin_information' || $args->slug !== 'dw-church') {
            return $result;
        }
        
        $remote_info = $this->get_remote_info();
        if (!$remote_info) {
            return $result;
        }
        
        $result = new stdClass();
        $result->name = 'DW Church';
        $result->slug = 'dw-church';
        $result->version = $remote_info['version'];
        $result->tested = '6.8';
        $result->requires = '6.0';
        $result->requires_php = '8.0';
        $result->last_updated = $remote_info['last_updated'];
        $result->homepage = $this->update_uri;
        $result->download_link = $this->get_download_url($remote_info['version']);
        $result->sections = array(
            'description' => 'DW Church Management System - Complete church management system for bulletins, sermons, columns, and albums with modern security practices.',
            'changelog' => $this->get_changelog($remote_info['version'])
        );
        
        return $result;
    }
    
    /**
     * Modify update transient
     */
    public function modify_update_transient($transient) {
        if (!isset($transient->response)) {
            return $transient;
        }
        
        $update = $this->check_for_updates(false, array(), DASOM_CHURCH_PLUGIN_BASENAME);
        if ($update) {
            $transient->response[DASOM_CHURCH_PLUGIN_BASENAME] = $update;
        }
        
        return $transient;
    }
    
    /**
     * Get remote version from GitHub API
     */
    private function get_remote_version() {
        $cache_key = 'dasom_church_remote_version';
        $cached_version = get_transient($cache_key);
        
        if ($cached_version !== false) {
            return $cached_version;
        }
        
        $response = wp_remote_get('https://api.github.com/repos/dasomweb/dasom-church-management-system/releases/latest', array(
            'timeout' => 10,
            'headers' => array(
                'Accept' => 'application/vnd.github.v3+json',
                'User-Agent' => 'WordPress/' . get_bloginfo('version')
            )
        ));
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (isset($data['tag_name'])) {
            $version = ltrim($data['tag_name'], 'v');
            set_transient($cache_key, $version, HOUR_IN_SECONDS);
            return $version;
        }
        
        return false;
    }
    
    /**
     * Get remote plugin info
     */
    private function get_remote_info() {
        $cache_key = 'dasom_church_remote_info';
        $cached_info = get_transient($cache_key);
        
        if ($cached_info !== false) {
            return $cached_info;
        }
        
        $response = wp_remote_get('https://api.github.com/repos/dasomweb/dasom-church-management-system/releases/latest', array(
            'timeout' => 10,
            'headers' => array(
                'Accept' => 'application/vnd.github.v3+json',
                'User-Agent' => 'WordPress/' . get_bloginfo('version')
            )
        ));
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (isset($data['tag_name'])) {
            $info = array(
                'version' => ltrim($data['tag_name'], 'v'),
                'last_updated' => $data['published_at']
            );
            set_transient($cache_key, $info, HOUR_IN_SECONDS);
            return $info;
        }
        
        return false;
    }
    
    /**
     * Get download URL for specific version
     */
    private function get_download_url($version) {
        return "https://github.com/dasomweb/dasom-church-management-system/archive/refs/tags/v{$version}.zip";
    }
    
    /**
     * Get changelog for specific version
     */
    private function get_changelog($version) {
        $cache_key = 'dasom_church_changelog_' . $version;
        $cached_changelog = get_transient($cache_key);
        
        if ($cached_changelog !== false) {
            return $cached_changelog;
        }
        
        $response = wp_remote_get("https://api.github.com/repos/dasomweb/dasom-church-management-system/releases/tags/v{$version}", array(
            'timeout' => 10,
            'headers' => array(
                'Accept' => 'application/vnd.github.v3+json',
                'User-Agent' => 'WordPress/' . get_bloginfo('version')
            )
        ));
        
        if (is_wp_error($response)) {
            return 'Changelog not available.';
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (isset($data['body'])) {
            $changelog = $data['body'];
            set_transient($cache_key, $changelog, DAY_IN_SECONDS);
            return $changelog;
        }
        
        return 'Changelog not available.';
    }
}

// Initialize update manager
Dasom_Church_Update_Manager::get_instance();
