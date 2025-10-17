<?php
/**
 * GitHub Update Settings - 독립적 설정 페이지
 * WordPress Settings 메뉴에 표시됨 (플러그인 업데이트에 영향받지 않음)
 *
 * @package Dasom_Church
 * @since 1.5.4
 */

// Block direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get current values
$github_token = get_option('dw_github_access_token', '');
?>

<div class="wrap">
    <h1><?php echo esc_html__('DW Church - GitHub 업데이트 설정', 'dasom-church'); ?></h1>
    
    <p class="description" style="font-size:14px;margin-top:10px;">
        <?php echo esc_html__('이 설정은 WordPress Settings 메뉴에 있어 플러그인 업데이트에 영향받지 않습니다.', 'dasom-church'); ?>
    </p>
    
    <form method="post" action="">
        <?php wp_nonce_field('dasom_church_settings_action', 'dasom_church_settings_nonce'); ?>
        
        <h2><?php echo esc_html__('GitHub Personal Access Token', 'dasom-church'); ?></h2>
        <p><?php echo esc_html__('비공개(Private) GitHub 저장소에서 플러그인 업데이트를 받으려면 Personal Access Token이 필요합니다.', 'dasom-church'); ?></p>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_github_access_token"><?php echo esc_html__('GitHub Token', 'dasom-church'); ?></label>
                </th>
                <td>
                    <input type="password" id="dw_github_access_token" name="dw_github_access_token" value="<?php echo esc_attr($github_token); ?>" class="regular-text" placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                    <p class="description">
                        <?php echo esc_html__('공개(Public) 저장소의 경우 이 필드를 비워두세요.', 'dasom-church'); ?><br><br>
                        <strong><?php echo esc_html__('📝 토큰 생성 방법:', 'dasom-church'); ?></strong><br>
                        1. <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener" class="button button-secondary" style="margin:8px 0;display:inline-block;"><?php echo esc_html__('→ GitHub Token 생성하기', 'dasom-church'); ?></a><br>
                        2. <strong>Note:</strong> "DW Church Plugin Updates" 입력<br>
                        3. <strong>Expiration:</strong> 만료 기간 선택 (권장: No expiration 또는 1 year)<br>
                        4. <strong>Scopes:</strong> <code>repo</code> 체크 (Full control of private repositories)<br>
                        5. "Generate token" 클릭 후 토큰을 복사하여 위 필드에 붙여넣기<br>
                        6. "변경사항 저장" 버튼 클릭<br><br>
                        <strong style="color:#d63638;">⚠️ <?php echo esc_html__('중요:', 'dasom-church'); ?></strong> <?php echo esc_html__('토큰은 한 번만 표시되므로 안전한 곳에 보관하세요.', 'dasom-church'); ?>
                    </p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <?php echo esc_html__('업데이트 캐시', 'dasom-church'); ?>
                </th>
                <td>
                    <a href="<?php echo esc_url(admin_url('plugins.php?dasom_check_update=1')); ?>" class="button button-secondary">
                        <?php echo esc_html__('🔄 업데이트 강제 확인', 'dasom-church'); ?>
                    </a>
                    <p class="description">
                        <?php echo esc_html__('GitHub에서 최신 릴리스를 즉시 확인합니다. (캐시 무시)', 'dasom-church'); ?><br>
                        <?php echo esc_html__('Token을 변경한 후 또는 업데이트가 감지되지 않을 때 사용하세요.', 'dasom-church'); ?>
                    </p>
                </td>
            </tr>
        </table>
        
        <div class="notice notice-info inline" style="margin:20px 0;padding:12px;">
            <p>
                <strong>💡 <?php echo esc_html__('사용 팁:', 'dasom-church'); ?></strong><br>
                • <?php echo esc_html__('Token 저장 후 "업데이트 강제 확인" 버튼을 클릭하여 연결을 테스트하세요.', 'dasom-church'); ?><br>
                • <?php echo esc_html__('플러그인 → DW Church Management System에서 자동 업데이트를 활성화할 수 있습니다.', 'dasom-church'); ?><br>
                • <?php echo esc_html__('업데이트 실패 시 에러 메시지에서 자세한 정보를 확인할 수 있습니다.', 'dasom-church'); ?><br>
                • <strong style="color:#2271b1;">✅ <?php echo esc_html__('이 설정은 WordPress Settings에 있어 플러그인 업데이트 시에도 유지됩니다!', 'dasom-church'); ?></strong>
            </p>
        </div>
        
        <div class="notice notice-warning inline" style="margin:20px 0;padding:12px;">
            <p>
                <strong>🔒 <?php echo esc_html__('보안:', 'dasom-church'); ?></strong><br>
                • <?php echo esc_html__('Token은 WordPress 데이터베이스에 안전하게 저장됩니다.', 'dasom-church'); ?><br>
                • <?php echo esc_html__('Token이 유출되면 즉시 GitHub에서 삭제하고 새로 생성하세요.', 'dasom-church'); ?><br>
                • <?php echo esc_html__('Token은 repo scope만 필요합니다 (최소 권한 원칙).', 'dasom-church'); ?>
            </p>
        </div>
        
        <?php submit_button(); ?>
    </form>
    
    <hr>
    
    <h2><?php echo esc_html__('플러그인 정보', 'dasom-church'); ?></h2>
    <table class="widefat striped" style="max-width:600px;">
        <tbody>
            <tr>
                <th style="width:200px;"><?php echo esc_html__('플러그인 이름', 'dasom-church'); ?></th>
                <td>DW Church Management System</td>
            </tr>
            <tr>
                <th><?php echo esc_html__('현재 버전', 'dasom-church'); ?></th>
                <td><strong><?php echo esc_html(DASOM_CHURCH_VERSION); ?></strong></td>
            </tr>
            <tr>
                <th><?php echo esc_html__('GitHub Repository', 'dasom-church'); ?></th>
                <td><a href="https://github.com/dasomweb/dasom-church-management-system" target="_blank" rel="noopener">dasomweb/dasom-church-management-system</a></td>
            </tr>
            <tr>
                <th><?php echo esc_html__('저장소 타입', 'dasom-church'); ?></th>
                <td><?php echo esc_html__('🔒 Private (비공개)', 'dasom-church'); ?></td>
            </tr>
            <tr>
                <th><?php echo esc_html__('Token 상태', 'dasom-church'); ?></th>
                <td>
                    <?php if (!empty($github_token)): ?>
                        <span style="color:#46b450;">✅ <?php echo esc_html__('설정됨', 'dasom-church'); ?></span>
                        <span style="color:#666;"> (<?php echo esc_html(substr($github_token, 0, 10)); ?>...)</span>
                    <?php else: ?>
                        <span style="color:#d63638;">❌ <?php echo esc_html__('미설정', 'dasom-church'); ?></span>
                    <?php endif; ?>
                </td>
            </tr>
        </tbody>
    </table>
</div>

