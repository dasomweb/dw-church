<?php
/**
 * Class Test_Plugin
 *
 * @package Dasom_Church
 */

/**
 * Test basic plugin functionality
 */
class Test_Plugin extends WP_UnitTestCase {

    /**
     * Test plugin constants are defined
     */
    public function test_plugin_constants() {
        $this->assertTrue(defined('DASOM_CHURCH_VERSION'));
        $this->assertTrue(defined('DASOM_CHURCH_PLUGIN_URL'));
        $this->assertTrue(defined('DASOM_CHURCH_PLUGIN_PATH'));
        $this->assertTrue(defined('DASOM_CHURCH_PLUGIN_FILE'));
    }

    /**
     * Test plugin version
     */
    public function test_plugin_version() {
        $this->assertNotEmpty(DASOM_CHURCH_VERSION);
        $this->assertMatchesRegularExpression('/^\d+\.\d+\.\d+$/', DASOM_CHURCH_VERSION);
    }

    /**
     * Test plugin activation
     */
    public function test_plugin_activated() {
        // Test that main plugin class exists
        $this->assertTrue(class_exists('Dasom_Church_Admin'));
    }
}

