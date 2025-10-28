<?php
/**
 * DW Event Grid Typography Test - Fixed Version
 * 
 * This test verifies that the DW Event Grid widget's typography controls work correctly
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

// Mock Elementor classes
if (!class_exists('\Elementor\Widget_Base')) {
    class MockElementorWidgetBase {
        protected $controls = [];
        
        public function add_group_control($type, $args) {
            $this->controls[$args['name']] = [
                'type' => 'typography',
                'name' => $args['name'],
                'label' => $args['label'],
                'selector' => $args['selector']
            ];
        }
        
        public function add_control($control_id, $args) {
            $this->controls[$control_id] = $args;
        }
        
        public function add_responsive_control($control_id, $args) {
            $this->controls[$control_id] = $args;
        }
        
        public function start_controls_section($section_id, $args) {
            // Mock implementation
        }
        
        public function end_controls_section() {
            // Mock implementation
        }
        
        public function get_controls() {
            return $this->controls;
        }
    }
    
    class_alias('MockElementorWidgetBase', '\Elementor\Widget_Base');
}

if (!class_exists('\Elementor\Group_Control_Typography')) {
    class MockGroupControlTypography {
        public static function get_type() {
            return 'typography';
        }
    }
    
    class_alias('MockGroupControlTypography', '\Elementor\Group_Control_Typography');
}

if (!class_exists('\Elementor\Controls_Manager')) {
    class MockControlsManager {
        const SELECT = 'select';
        const TAB_STYLE = 'style';
        const TAB_CONTENT = 'content';
        const NUMBER = 'number';
        const SWITCHER = 'switcher';
        const COLOR = 'color';
        const SLIDER = 'slider';
        const DIMENSIONS = 'dimensions';
        const DIVIDER = 'divider';
    }
    
    class_alias('MockControlsManager', '\Elementor\Controls_Manager');
}

// Load the widget file
require_once 'includes/widgets/elementor/class-dw-elementor-event-grid-widget.php';

echo "=== DW EVENT GRID TYPOGRAPHY TEST ===\n\n";

// Test if the widget class exists
if (!class_exists('DW_Elementor_Event_Grid_Widget')) {
    echo "❌ ERROR: DW_Elementor_Event_Grid_Widget class not found!\n";
    exit(1);
}

echo "✅ DW_Elementor_Event_Grid_Widget class found\n";

// Create a new instance
$widget = new DW_Elementor_Event_Grid_Widget();

// Test widget basic info
echo "Widget Name: " . $widget->get_name() . "\n";
echo "Widget Title: " . $widget->get_title() . "\n";

// Manually call register_controls to populate controls
echo "\n=== REGISTERING CONTROLS ===\n";
$widget->register_controls();

// Get all controls
$controls = $widget->get_controls();

echo "\n=== TYPOGRAPHY CONTROLS CHECK ===\n";

// Check for typography controls
$typography_controls = [];
foreach ($controls as $control_id => $control) {
    if (isset($control['type']) && $control['type'] === 'typography') {
        $typography_controls[] = $control_id;
        echo "✅ Found Typography Control: {$control_id}\n";
        if (isset($control['selector'])) {
            echo "   Selector: {$control['selector']}\n";
        }
    }
}

if (empty($typography_controls)) {
    echo "❌ ERROR: No typography controls found!\n";
    echo "Total controls registered: " . count($controls) . "\n";
    echo "Available controls:\n";
    foreach ($controls as $control_id => $control) {
        echo "   - {$control_id} (type: " . (isset($control['type']) ? $control['type'] : 'unknown') . ")\n";
    }
    exit(1);
}

echo "\n=== TEXT TYPOGRAPHY SPECIFIC CHECK ===\n";

// Check specifically for text_typography
if (isset($controls['text_typography'])) {
    echo "✅ text_typography control found\n";
    $text_typography = $controls['text_typography'];
    if (isset($text_typography['selector'])) {
        echo "   Selector: {$text_typography['selector']}\n";
        if ($text_typography['selector'] === '{{WRAPPER}} .dw-event-grid-text-content') {
            echo "✅ Correct selector for text content\n";
        } else {
            echo "❌ ERROR: Wrong selector! Expected: {{WRAPPER}} .dw-event-grid-text-content\n";
            echo "   Got: {$text_typography['selector']}\n";
        }
    } else {
        echo "❌ ERROR: No selector found for text_typography\n";
    }
} else {
    echo "❌ ERROR: text_typography control not found!\n";
    echo "Available typography controls:\n";
    foreach ($controls as $control_id => $control) {
        if (isset($control['type']) && $control['type'] === 'typography') {
            echo "   - {$control_id}\n";
        }
    }
}

echo "\n=== ALL TYPOGRAPHY CONTROLS LIST ===\n";
foreach ($controls as $control_id => $control) {
    if (isset($control['type']) && $control['type'] === 'typography') {
        echo "Typography Control: {$control_id}\n";
        if (isset($control['selector'])) {
            echo "  Selector: {$control['selector']}\n";
        }
        if (isset($control['label'])) {
            echo "  Label: {$control['label']}\n";
        }
    }
}

echo "\n=== FINAL RESULT ===\n";
if (isset($controls['text_typography']) && 
    isset($controls['text_typography']['selector']) && 
    $controls['text_typography']['selector'] === '{{WRAPPER}} .dw-event-grid-text-content') {
    echo "✅ SUCCESS: DW Event Grid typography controls are properly configured!\n";
    echo "✅ text_typography control exists with correct selector\n";
    echo "✅ Should work with Elementor's responsive system\n";
} else {
    echo "❌ FAILURE: DW Event Grid typography controls are NOT properly configured!\n";
    echo "❌ Missing text_typography control or wrong selector\n";
    exit(1);
}

echo "\nTest completed successfully!\n";
?>