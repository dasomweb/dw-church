<?php
/**
 * Manual Migration Script for DW Church Management System
 * 
 * IMPORTANT: Delete this file after running!
 * 
 * Usage: Upload to plugin root directory and access via browser:
 * http://your-site.com/wp-content/plugins/dasom-church-management-system/manual-migration.php
 */

// Load WordPress
$wp_load_paths = array(
    '../../../wp-load.php',
    '../../../../wp-load.php',
    '../../../../../wp-load.php',
);

$wp_loaded = false;
foreach ($wp_load_paths as $path) {
    if (file_exists(__DIR__ . '/' . $path)) {
        require_once(__DIR__ . '/' . $path);
        $wp_loaded = true;
        break;
    }
}

if (!$wp_loaded) {
    die('Could not find wp-load.php');
}

// Check permissions
if (!current_user_can('manage_options')) {
    wp_die('You do not have sufficient permissions to run this migration.');
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>DW Church - Manual Migration</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { color: #2271b1; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 12px; margin: 10px 0; border-radius: 4px; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 12px; margin: 10px 0; border-radius: 4px; }
        .info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 12px; margin: 10px 0; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .button { background: #2271b1; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; }
        .button:hover { background: #135e96; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>🔧 DW Church Management System - Manual Migration</h1>
    
    <?php
    echo '<div class="info"><strong>현재 상태:</strong><br>';
    echo '마이그레이션 버전: <code>' . get_option('dasom_church_migration_version', '없음') . '</code><br>';
    echo '플러그인 버전: <code>' . (defined('DASOM_CHURCH_VERSION') ? DASOM_CHURCH_VERSION : '알 수 없음') . '</code>';
    echo '</div>';
    
    if (isset($_GET['run']) && $_GET['run'] === 'migration') {
        echo '<h2>📊 마이그레이션 실행 중...</h2>';
        
        // Check old settings
        echo '<h3>1. 기존 데이터 확인</h3>';
        echo '<table>';
        echo '<tr><th>옵션 키</th><th>값</th></tr>';
        
        $old_settings = array(
            'dasom_church_name',
            'dasom_church_address',
            'dasom_church_phone',
            'dasom_church_email',
            'dasom_church_website',
            'dasom_social_youtube',
            'dasom_social_instagram',
            'dasom_social_facebook',
            'dasom_social_linkedin',
            'dasom_social_tiktok',
            'dasom_social_kakaotalk',
            'dasom_social_kakaotalk_channel',
        );
        
        $found_old_data = false;
        foreach ($old_settings as $old_key) {
            $value = get_option($old_key, '');
            if (!empty($value)) {
                $found_old_data = true;
                echo '<tr><td><code>' . esc_html($old_key) . '</code></td><td>' . esc_html(substr($value, 0, 50)) . (strlen($value) > 50 ? '...' : '') . '</td></tr>';
            }
        }
        echo '</table>';
        
        if (!$found_old_data) {
            echo '<div class="error">⚠️ 기존 데이터를 찾을 수 없습니다. 이미 마이그레이션이 완료되었거나 데이터가 없습니다.</div>';
        }
        
        // Run migration
        echo '<h3>2. 마이그레이션 실행</h3>';
        
        $migrated = 0;
        foreach ($old_settings as $old_key) {
            $value = get_option($old_key, false);
            if ($value !== false && $value !== '') {
                $new_key = str_replace('dasom_', 'dw_', $old_key);
                $existing_value = get_option($new_key, '');
                
                if (empty($existing_value)) {
                    update_option($new_key, $value);
                    echo '<div class="success">✓ <code>' . esc_html($old_key) . '</code> → <code>' . esc_html($new_key) . '</code></div>';
                    $migrated++;
                } else {
                    echo '<div class="info">ℹ️ <code>' . esc_html($new_key) . '</code>는 이미 값이 있습니다. 건너뜁니다.</div>';
                }
            }
        }
        
        // Update migration version
        update_option('dasom_church_migration_version', '1.3.4');
        
        echo '<h3>3. 완료</h3>';
        echo '<div class="success"><strong>✓ 마이그레이션 완료!</strong><br>';
        echo '총 ' . $migrated . '개 항목이 마이그레이션되었습니다.<br>';
        echo '마이그레이션 버전: <code>1.3.4</code></div>';
        
        // Show new data
        echo '<h3>4. 새로운 데이터 확인</h3>';
        echo '<table>';
        echo '<tr><th>옵션 키</th><th>값</th></tr>';
        
        foreach ($old_settings as $old_key) {
            $new_key = str_replace('dasom_', 'dw_', $old_key);
            $value = get_option($new_key, '');
            if (!empty($value)) {
                echo '<tr><td><code>' . esc_html($new_key) . '</code></td><td>' . esc_html(substr($value, 0, 50)) . (strlen($value) > 50 ? '...' : '') . '</td></tr>';
            }
        }
        echo '</table>';
        
        echo '<div class="info"><strong>다음 단계:</strong><br>';
        echo '1. 이 파일을 서버에서 삭제하세요 (보안상 중요!)<br>';
        echo '2. DW 교회관리 → 설정 → 교회 정보 페이지를 확인하세요<br>';
        echo '3. 모든 데이터가 정상적으로 표시되는지 확인하세요</div>';
        
    } else {
        echo '<h2>📋 마이그레이션 준비</h2>';
        echo '<p>이 스크립트는 기존 교회 설정 데이터를 새로운 형식으로 마이그레이션합니다.</p>';
        echo '<p><strong>마이그레이션 대상:</strong></p>';
        echo '<ul>';
        echo '<li>교회 기본 정보 (이름, 주소, 전화번호, 이메일, 웹사이트)</li>';
        echo '<li>소셜 미디어 URL (YouTube, Instagram, Facebook, LinkedIn, TikTok, KakaoTalk, KakaoTalk Channel)</li>';
        echo '</ul>';
        
        echo '<p><a href="?run=migration" class="button">🚀 마이그레이션 시작</a></p>';
        
        echo '<div class="info"><strong>⚠️ 주의사항:</strong><br>';
        echo '1. 마이그레이션 실행 전 데이터베이스 백업을 권장합니다<br>';
        echo '2. 마이그레이션 완료 후 이 파일을 반드시 삭제하세요<br>';
        echo '3. 관리자 권한이 필요합니다</div>';
    }
    ?>
    
</body>
</html>

