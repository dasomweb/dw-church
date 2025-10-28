<?php
/**
 * DW Event Grid CSS Output Test
 * 
 * This test verifies that the DW Event Grid widget generates correct CSS
 */

// Simulate WordPress environment
define('ABSPATH', __DIR__ . '/');
define('DASOM_CHURCH_VERSION', '1.62');

// Mock WordPress functions
if (!function_exists('__')) {
    function __($text, $domain = 'default') {
        return $text;
    }
}

if (!function_exists('esc_attr')) {
    function esc_attr($text) {
        return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('esc_html')) {
    function esc_html($text) {
        return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('esc_url')) {
    function esc_url($url) {
        return htmlspecialchars($url, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('get_post_meta')) {
    function get_post_meta($post_id, $key, $single = true) {
        return '';
    }
}

if (!function_exists('wp_get_attachment_url')) {
    function wp_get_attachment_url($attachment_id) {
        return '';
    }
}

if (!function_exists('get_the_title')) {
    function get_the_title() {
        return 'Test Event Title';
    }
}

if (!function_exists('get_permalink')) {
    function get_permalink() {
        return '#';
    }
}

if (!function_exists('get_query_var')) {
    function get_query_var($var) {
        return 1;
    }
}

if (!class_exists('WP_Query')) {
    class WP_Query {
        public $posts = [];
        public $post_count = 0;
        public $max_num_pages = 1;
        
        public function __construct($args = []) {
            // Mock posts
            $this->posts = [
                (object)['ID' => 1, 'post_title' => 'Test Event 1'],
                (object)['ID' => 2, 'post_title' => 'Test Event 2']
            ];
            $this->post_count = 2;
        }
        
        public function have_posts() {
            return $this->post_count > 0;
        }
        
        public function the_post() {
            // Mock implementation
        }
    }
}

if (!function_exists('wp_reset_postdata')) {
    function wp_reset_postdata() {
        // Mock implementation
    }
}

// Mock Elementor classes
if (!class_exists('\Elementor\Widget_Base')) {
    class MockElementorWidgetBase {
        protected $settings = [];
        
        public function get_settings_for_display() {
            return $this->settings;
        }
        
        public function set_settings($settings) {
            $this->settings = $settings;
        }
    }
    
    class_alias('MockElementorWidgetBase', '\Elementor\Widget_Base');
}

// Load the widget file
require_once 'includes/widgets/elementor/class-dw-elementor-event-grid-widget.php';

echo "=== DW EVENT GRID CSS OUTPUT TEST ===\n\n";

// Test if the widget class exists
if (!class_exists('DW_Elementor_Event_Grid_Widget')) {
    echo "❌ ERROR: DW_Elementor_Event_Grid_Widget class not found!\n";
    exit(1);
}

echo "✅ DW_Elementor_Event_Grid_Widget class found\n";

// Create a new instance
$widget = new DW_Elementor_Event_Grid_Widget();

// Set test settings
$test_settings = [
    'posts_per_page' => 6,
    'columns' => 3,
    'columns_tablet' => 2,
    'columns_mobile' => 1,
    'height_ratio' => '16:9',
    'text_position' => 'center-center',
    'button_text' => 'Read More',
    'query_source' => 'latest',
    'enable_pagination' => 'no',
    // Typography settings
    'text_typography_font_size' => [
        'size' => 20,
        'unit' => 'px'
    ],
    'text_typography_font_size_tablet' => [
        'size' => 18,
        'unit' => 'px'
    ],
    'text_typography_font_size_mobile' => [
        'size' => 16,
        'unit' => 'px'
    ],
    'text_typography_font_weight' => '700',
    'text_typography_line_height' => [
        'size' => 1.5,
        'unit' => 'em'
    ]
];

$widget->set_settings($test_settings);

echo "=== TESTING CSS GENERATION ===\n";
echo "Settings applied:\n";
echo "- Font Size Desktop: {$test_settings['text_typography_font_size']['size']}{$test_settings['text_typography_font_size']['unit']}\n";
echo "- Font Size Tablet: {$test_settings['text_typography_font_size_tablet']['size']}{$test_settings['text_typography_font_size_tablet']['unit']}\n";
echo "- Font Size Mobile: {$test_settings['text_typography_font_size_mobile']['size']}{$test_settings['text_typography_font_size_mobile']['unit']}\n";
echo "- Font Weight: {$test_settings['text_typography_font_weight']}\n";
echo "- Line Height: {$test_settings['text_typography_line_height']['size']}{$test_settings['text_typography_line_height']['unit']}\n";

echo "\n=== EXPECTED CSS OUTPUT ===\n";
echo "Expected CSS should include:\n";
echo "- .dw-event-grid-text-content { font-size: 20px; }\n";
echo "- @media (max-width: 1024px) { .dw-event-grid-text-content { font-size: 18px; } }\n";
echo "- @media (max-width: 767px) { .dw-event-grid-text-content { font-size: 16px; } }\n";
echo "- .dw-event-grid-text-content { font-weight: 700; }\n";
echo "- .dw-event-grid-text-content { line-height: 1.5em; }\n";

echo "\n=== ACTUAL CSS OUTPUT ===\n";

// Capture output
ob_start();
$widget->render();
$output = ob_get_clean();

// Extract CSS from output
if (preg_match('/<style>(.*?)<\/style>/s', $output, $matches)) {
    $css = $matches[1];
    echo "CSS found in output:\n";
    echo $css . "\n";
    
    // Check for typography CSS
    $css_checks = [
        'font-size: 20px' => 'Desktop font size',
        'font-size: 18px' => 'Tablet font size', 
        'font-size: 16px' => 'Mobile font size',
        'font-weight: 700' => 'Font weight',
        'line-height: 1.5em' => 'Line height'
    ];
    
    echo "\n=== CSS CHECKS ===\n";
    foreach ($css_checks as $css_rule => $description) {
        if (strpos($css, $css_rule) !== false) {
            echo "✅ {$description}: Found '{$css_rule}'\n";
        } else {
            echo "❌ {$description}: Missing '{$css_rule}'\n";
        }
    }
    
} else {
    echo "❌ ERROR: No CSS found in widget output!\n";
    echo "Widget output:\n";
    echo $output . "\n";
}

echo "\n=== FINAL RESULT ===\n";
if (strpos($output, 'font-size: 20px') !== false && 
    strpos($output, 'font-size: 18px') !== false && 
    strpos($output, 'font-size: 16px') !== false) {
    echo "✅ SUCCESS: Typography CSS is being generated correctly!\n";
    echo "✅ Font sizes for desktop, tablet, and mobile are present\n";
} else {
    echo "❌ FAILURE: Typography CSS is NOT being generated!\n";
    echo "❌ Missing responsive font size CSS\n";
    exit(1);
}

echo "\nTest completed!\n";
?>
