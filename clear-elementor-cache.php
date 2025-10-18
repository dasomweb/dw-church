<?php
/**
 * Elementor Cache Clear Script
 * 
 * 이 스크립트를 WordPress 루트에 업로드하고 브라우저에서 실행하세요.
 * 실행 후 반드시 삭제하세요!
 */

// WordPress 로드
require_once('wp-load.php');

// 관리자 권한 확인
if (!current_user_can('manage_options')) {
    die('관리자 권한이 필요합니다.');
}

echo '<h1>Elementor 캐시 클리어</h1>';

// 1. Elementor 캐시 클리어
if (class_exists('\Elementor\Plugin')) {
    \Elementor\Plugin::instance()->files_manager->clear_cache();
    echo '<p>✅ Elementor 파일 캐시 클리어됨</p>';
}

// 2. WordPress 객체 캐시 클리어
wp_cache_flush();
echo '<p>✅ WordPress 캐시 클리어됨</p>';

// 3. 위젯 재생성
if (class_exists('\Elementor\Plugin')) {
    $widgets_manager = \Elementor\Plugin::instance()->widgets_manager;
    $widgets_manager->unregister_widget_type('dw-banner-slider');
    $widgets_manager->unregister_widget_type('dw-banner-grid');
    echo '<p>✅ 위젯 등록 해제됨</p>';
    
    // 재등록
    if (file_exists(WP_PLUGIN_DIR . '/dasom-church-management/includes/widgets/elementor/class-dw-elementor-banner-slider-widget.php')) {
        require_once WP_PLUGIN_DIR . '/dasom-church-management/includes/widgets/elementor/class-dw-elementor-banner-slider-widget.php';
        require_once WP_PLUGIN_DIR . '/dasom-church-management/includes/widgets/elementor/class-dw-elementor-banner-grid-widget.php';
        $widgets_manager->register(new DW_Elementor_Banner_Slider_Widget());
        $widgets_manager->register(new DW_Elementor_Banner_Grid_Widget());
        echo '<p>✅ 위젯 재등록됨</p>';
    }
}

// 4. 플러그인 버전 확인
if (defined('DASOM_CHURCH_VERSION')) {
    echo '<p>📌 현재 플러그인 버전: <strong>' . DASOM_CHURCH_VERSION . '</strong></p>';
}

echo '<hr>';
echo '<h2>다음 단계:</h2>';
echo '<ol>';
echo '<li>Elementor 편집기를 열고 페이지를 새로고침하세요 (Ctrl + Shift + R)</li>';
echo '<li>배너 위젯을 삭제하고 다시 추가하세요</li>';
echo '<li>왼쪽 패널에서 "Query Settings" 또는 "Settings" 섹션을 확인하세요</li>';
echo '<li><strong>이 파일을 삭제하세요!</strong></li>';
echo '</ol>';

echo '<hr>';
echo '<p style="color: red; font-weight: bold;">⚠️ 보안을 위해 이 파일을 즉시 삭제하세요!</p>';

