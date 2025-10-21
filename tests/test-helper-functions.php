<?php
/**
 * Class Test_Helper_Functions
 *
 * @package Dasom_Church
 */

/**
 * Test helper functions
 */
class Test_Helper_Functions extends WP_UnitTestCase {

    /**
     * Test helper functions file exists
     */
    public function test_helper_functions_file_exists() {
        $file = DASOM_CHURCH_PLUGIN_PATH . 'includes/functions-helpers.php';
        $this->assertFileExists($file);
    }

    /**
     * Test date formatting functions work correctly
     */
    public function test_date_functions() {
        // Test if WordPress date functions are available
        $this->assertTrue(function_exists('date_i18n'));
        
        // Test basic date format
        $date = date_i18n('Y-m-d', strtotime('2025-10-20'));
        $this->assertEquals('2025-10-20', $date);
    }

    /**
     * Test URL validation
     */
    public function test_url_validation() {
        // Valid URLs
        $this->assertTrue(filter_var('https://example.com', FILTER_VALIDATE_URL) !== false);
        $this->assertTrue(filter_var('http://example.com', FILTER_VALIDATE_URL) !== false);
        
        // Invalid URLs
        $this->assertFalse(filter_var('not-a-url', FILTER_VALIDATE_URL) !== false);
        $this->assertFalse(filter_var('', FILTER_VALIDATE_URL) !== false);
    }

    /**
     * Test escaping functions
     */
    public function test_escaping_functions() {
        $this->assertTrue(function_exists('esc_html'));
        $this->assertTrue(function_exists('esc_attr'));
        $this->assertTrue(function_exists('esc_url'));
        
        // Test actual escaping
        $html = '<script>alert("xss")</script>';
        $escaped = esc_html($html);
        $this->assertStringNotContainsString('<script>', $escaped);
    }
}

