<?php
/**
 * Force Reload Widgets Script
 * 
 * 위젯을 강제로 재등록합니다.
 * 브라우저에서 실행 후 반드시 삭제하세요!
 */

// WordPress 로드
require_once('wp-load.php');

// 관리자 권한 확인
if (!current_user_can('manage_options')) {
    die('관리자 권한이 필요합니다.');
}

echo '<h1>위젯 강제 재로드</h1>';
echo '<hr>';

// 1. Elementor 캐시 완전 삭제
if (class_exists('\Elementor\Plugin')) {
    echo '<h2>1. Elementor 캐시 삭제 중...</h2>';
    
    // CSS 캐시 삭제
    \Elementor\Plugin::instance()->files_manager->clear_cache();
    echo '<p>✅ CSS 캐시 삭제됨</p>';
    
    // 위젯 캐시 삭제
    delete_transient('elementor_remote_info_api_data');
    delete_transient('elementor_widgets_config');
    echo '<p>✅ 위젯 캐시 삭제됨</p>';
}

// 2. WordPress 캐시 클리어
wp_cache_flush();
echo '<p>✅ WordPress 캐시 클리어됨</p>';

// 3. 위젯 파일 강제 재로드
echo '<h2>2. 위젯 파일 재로드 중...</h2>';

$plugin_path = WP_PLUGIN_DIR . '/dasom-church-management';
$slider_file = $plugin_path . '/includes/widgets/elementor/class-dw-elementor-banner-slider-widget.php';
$grid_file = $plugin_path . '/includes/widgets/elementor/class-dw-elementor-banner-grid-widget.php';

// PHP 캐시 무효화
if (function_exists('opcache_invalidate')) {
    if (file_exists($slider_file)) {
        opcache_invalidate($slider_file, true);
        echo '<p>✅ Slider 위젯 OPCache 무효화됨</p>';
    }
    if (file_exists($grid_file)) {
        opcache_invalidate($grid_file, true);
        echo '<p>✅ Grid 위젯 OPCache 무효화됨</p>';
    }
}

// 4. 위젯 재등록
if (class_exists('\Elementor\Plugin')) {
    echo '<h2>3. 위젯 재등록 중...</h2>';
    
    $widgets_manager = \Elementor\Plugin::instance()->widgets_manager;
    
    // 기존 위젯 해제
    $widgets_manager->unregister_widget_type('dw-banner-slider');
    $widgets_manager->unregister_widget_type('dw-banner-grid');
    echo '<p>✅ 기존 위젯 해제됨</p>';
    
    // 새로 등록
    if (file_exists($slider_file) && file_exists($grid_file)) {
        // 클래스 다시 로드
        require_once $slider_file;
        require_once $grid_file;
        
        try {
            $widgets_manager->register(new DW_Elementor_Banner_Slider_Widget());
            echo '<p>✅ Banner Slider 위젯 재등록 성공</p>';
        } catch (Exception $e) {
            echo '<p>❌ Banner Slider 등록 실패: ' . $e->getMessage() . '</p>';
        }
        
        try {
            $widgets_manager->register(new DW_Elementor_Banner_Grid_Widget());
            echo '<p>✅ Banner Grid 위젯 재등록 성공</p>';
        } catch (Exception $e) {
            echo '<p>❌ Banner Grid 등록 실패: ' . $e->getMessage() . '</p>';
        }
    } else {
        echo '<p>❌ 위젯 파일을 찾을 수 없습니다!</p>';
    }
}

// 5. 파일 수정 시간 확인
echo '<h2>4. 파일 정보</h2>';
if (file_exists($slider_file)) {
    echo '<p><strong>Banner Slider:</strong><br>';
    echo '마지막 수정: ' . date('Y-m-d H:i:s', filemtime($slider_file)) . '<br>';
    echo '파일 크기: ' . number_format(filesize($slider_file)) . ' bytes</p>';
}

if (file_exists($grid_file)) {
    echo '<p><strong>Banner Grid:</strong><br>';
    echo '마지막 수정: ' . date('Y-m-d H:i:s', filemtime($grid_file)) . '<br>';
    echo '파일 크기: ' . number_format(filesize($grid_file)) . ' bytes</p>';
}

echo '<hr>';
echo '<h2>✅ 완료!</h2>';
echo '<ol>';
echo '<li>Elementor 편집기를 새로고침하세요 (Ctrl + Shift + R)</li>';
echo '<li>페이지를 다시 로드하고 Banner 위젯을 확인하세요</li>';
echo '<li>위젯을 삭제하고 다시 추가해보세요</li>';
echo '<li><strong>이 파일을 즉시 삭제하세요!</strong></li>';
echo '</ol>';

echo '<hr>';
echo '<p style="color: red; font-weight: bold;">⚠️ 보안을 위해 이 파일을 즉시 삭제하세요!</p>';

