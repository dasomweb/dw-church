<?php
/**
 * Class Test_Widgets
 *
 * @package DW_Church
 */

/**
 * Test Elementor widgets registration
 */
class Test_Widgets extends WP_UnitTestCase {

    /**
     * Setup test environment
     */
    public function setUp(): void {
        parent::setUp();
        
        // Mock Elementor if not available
        if (!class_exists('\Elementor\Plugin')) {
            $this->markTestSkipped('Elementor is not available in test environment');
        }
    }

    /**
     * Test widget class files exist
     */
    public function test_widget_files_exist() {
        $widget_files = [
            'class-dw-elementor-gallery-widget.php',
            'class-dw-elementor-bulletin-widget.php',
            'class-dw-elementor-sermon-widget.php',
            'class-dw-elementor-single-sermon-widget.php',
            'class-dw-elementor-column-widget.php',
            'class-dw-elementor-banner-slider-widget.php',
            'class-dw-elementor-banner-grid-widget.php',
            'class-dw-elementor-event-grid-widget.php',
            'class-dw-elementor-event-widget.php',
            'class-dw-elementor-recent-gallery-widget.php',
        ];

        foreach ($widget_files as $file) {
            $path = DW_Church_PLUGIN_PATH . 'includes/widgets/elementor/' . $file;
            $this->assertFileExists($path, "Widget file {$file} does not exist");
        }
    }

    /**
     * Test widgets class exists
     */
    public function test_widgets_class_exists() {
        $this->assertTrue(class_exists('DW_Church_Widgets'));
    }
}

