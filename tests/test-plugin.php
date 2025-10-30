<?php
/**
 * Class Test_Plugin
 *
 * @package DW_Church
 */

/**
 * Test basic plugin functionality
 */
class Test_Plugin extends WP_UnitTestCase {

    /**
     * Test plugin constants are defined
     */
    public function test_plugin_constants() {
        $this->assertTrue(defined('DW_Church_VERSION'));
        $this->assertTrue(defined('DW_Church_PLUGIN_URL'));
        $this->assertTrue(defined('DW_Church_PLUGIN_PATH'));
        $this->assertTrue(defined('DW_Church_PLUGIN_FILE'));
    }

    /**
     * Test plugin version
     */
    public function test_plugin_version() {
        $this->assertNotEmpty(DW_Church_VERSION);
        $this->assertMatchesRegularExpression('/^\d+\.\d+\.\d+$/', DW_Church_VERSION);
    }

    /**
     * Test plugin activation
     */
    public function test_plugin_activated() {
        // Test that main plugin class exists
        $this->assertTrue(class_exists('DW_Church_Admin'));
    }
}

