<?php
/**
 * Widget Version Check Script
 * 
 * 현재 서버에 있는 위젯 파일이 최신 버전인지 확인합니다.
 * 브라우저에서 실행 후 반드시 삭제하세요!
 */

// WordPress 로드
require_once('wp-load.php');

// 관리자 권한 확인
if (!current_user_can('manage_options')) {
    die('관리자 권한이 필요합니다.');
}

echo '<h1>DW 배너 위젯 버전 체크</h1>';
echo '<hr>';

// 플러그인 버전 확인
echo '<h2>1. 플러그인 버전</h2>';
if (defined('DASOM_CHURCH_VERSION')) {
    echo '<p>✅ 현재 플러그인 버전: <strong>' . DASOM_CHURCH_VERSION . '</strong></p>';
} else {
    echo '<p>❌ 플러그인 버전을 찾을 수 없습니다.</p>';
}

// 파일 존재 확인
echo '<h2>2. 위젯 파일 확인</h2>';
$slider_file = WP_PLUGIN_DIR . '/dasom-church-management/includes/widgets/elementor/class-dw-elementor-banner-slider-widget.php';
$grid_file = WP_PLUGIN_DIR . '/dasom-church-management/includes/widgets/elementor/class-dw-elementor-banner-grid-widget.php';

if (file_exists($slider_file)) {
    echo '<p>✅ Banner Slider 파일 존재</p>';
    echo '<p>파일 경로: <code>' . $slider_file . '</code></p>';
    echo '<p>마지막 수정: ' . date('Y-m-d H:i:s', filemtime($slider_file)) . '</p>';
} else {
    echo '<p>❌ Banner Slider 파일을 찾을 수 없습니다!</p>';
}

if (file_exists($grid_file)) {
    echo '<p>✅ Banner Grid 파일 존재</p>';
    echo '<p>파일 경로: <code>' . $grid_file . '</code></p>';
    echo '<p>마지막 수정: ' . date('Y-m-d H:i:s', filemtime($grid_file)) . '</p>';
} else {
    echo '<p>❌ Banner Grid 파일을 찾을 수 없습니다!</p>';
}

// 파일 내용 확인 - Order, OrderBy가 있는지
echo '<h2>3. 컨트롤 코드 확인</h2>';

if (file_exists($slider_file)) {
    $slider_content = file_get_contents($slider_file);
    
    echo '<h3>Banner Slider Widget:</h3>';
    if (strpos($slider_content, "'order'") !== false) {
        echo '<p>✅ Order 컨트롤 발견</p>';
    } else {
        echo '<p>❌ Order 컨트롤 없음</p>';
    }
    
    if (strpos($slider_content, "'orderby'") !== false) {
        echo '<p>✅ OrderBy 컨트롤 발견</p>';
    } else {
        echo '<p>❌ OrderBy 컨트롤 없음</p>';
    }
    
    if (strpos($slider_content, "'banner_category'") !== false) {
        echo '<p>✅ Banner Category 컨트롤 발견</p>';
    } else {
        echo '<p>❌ Banner Category 컨트롤 없음</p>';
    }
    
    // 라인 수 확인
    $line_count = substr_count($slider_content, "\n");
    echo '<p>📄 파일 라인 수: ' . $line_count . '</p>';
    echo '<p><small>(최신 버전은 약 540+ 라인입니다)</small></p>';
}

if (file_exists($grid_file)) {
    $grid_content = file_get_contents($grid_file);
    
    echo '<h3>Banner Grid Widget:</h3>';
    if (strpos($grid_content, "'order'") !== false) {
        echo '<p>✅ Order 컨트롤 발견</p>';
    } else {
        echo '<p>❌ Order 컨트롤 없음</p>';
    }
    
    if (strpos($grid_content, "'orderby'") !== false) {
        echo '<p>✅ OrderBy 컨트롤 발견</p>';
    } else {
        echo '<p>❌ OrderBy 컨트롤 없음</p>';
    }
    
    if (strpos($grid_content, "'banner_category'") !== false) {
        echo '<p>✅ Banner Category 컨트롤 발견</p>';
    } else {
        echo '<p>❌ Banner Category 컨트롤 없음</p>';
    }
    
    // 라인 수 확인
    $line_count = substr_count($grid_content, "\n");
    echo '<p>📄 파일 라인 수: ' . $line_count . '</p>';
    echo '<p><small>(최신 버전은 약 530+ 라인입니다)</small></p>';
}

// Elementor 위젯 등록 확인
echo '<h2>4. Elementor 위젯 등록 상태</h2>';
if (class_exists('\Elementor\Plugin')) {
    $widgets_manager = \Elementor\Plugin::instance()->widgets_manager;
    $registered_widgets = $widgets_manager->get_widget_types();
    
    if (isset($registered_widgets['dw-banner-slider'])) {
        echo '<p>✅ Banner Slider 위젯 등록됨</p>';
    } else {
        echo '<p>❌ Banner Slider 위젯 미등록</p>';
    }
    
    if (isset($registered_widgets['dw-banner-grid'])) {
        echo '<p>✅ Banner Grid 위젯 등록됨</p>';
    } else {
        echo '<p>❌ Banner Grid 위젯 미등록</p>';
    }
} else {
    echo '<p>❌ Elementor가 활성화되지 않았습니다.</p>';
}

// 해결 방법
echo '<hr>';
echo '<h2>🔧 해결 방법</h2>';
echo '<ol>';
echo '<li><strong>플러그인 재업로드:</strong> GitHub에서 최신 버전을 다운로드하여 FTP로 업로드하세요.</li>';
echo '<li><strong>플러그인 재활성화:</strong> WordPress 관리자 → 플러그인 → DW Church Management → 비활성화 후 다시 활성화</li>';
echo '<li><strong>Elementor 캐시 클리어:</strong> Elementor → 도구 → 캐시 재생성</li>';
echo '<li><strong>파일 권한 확인:</strong> 위젯 파일에 읽기 권한이 있는지 확인 (644 권장)</li>';
echo '<li><strong>PHP 오류 로그 확인:</strong> 서버의 PHP 오류 로그에서 파싱 에러가 있는지 확인</li>';
echo '</ol>';

echo '<hr>';
echo '<p style="color: red; font-weight: bold;">⚠️ 이 파일을 즉시 삭제하세요!</p>';

