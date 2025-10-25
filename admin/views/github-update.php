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
    <h1><?php echo esc_html__('DW 설정', 'dasom-church'); ?></h1>
    
    <?php
    $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'custom_fields';
    ?>
    
    <h2 class="nav-tab-wrapper">
        <a href="?page=dasom-church-github-update&tab=custom_fields" class="nav-tab <?php echo $active_tab == 'custom_fields' ? 'nav-tab-active' : ''; ?>">
            <?php _e('커스텀 필드 안내', 'dasom-church'); ?>
        </a>
        <a href="?page=dasom-church-github-update&tab=user_role_control" class="nav-tab <?php echo $active_tab == 'user_role_control' ? 'nav-tab-active' : ''; ?>">
            <?php _e('사용자 권한 관리', 'dasom-church'); ?>
        </a>
        <a href="?page=dasom-church-github-update&tab=github_update" class="nav-tab <?php echo $active_tab == 'github_update' ? 'nav-tab-active' : ''; ?>">
            <?php _e('GitHub 업데이트', 'dasom-church'); ?>
        </a>
        <a href="?page=dasom-church-github-update&tab=widgets" class="nav-tab <?php echo $active_tab == 'widgets' ? 'nav-tab-active' : ''; ?>">
            <?php _e('위젯 설정', 'dasom-church'); ?>
        </a>
        <a href="?page=dasom-church-github-update&tab=plugin_settings" class="nav-tab <?php echo $active_tab == 'plugin_settings' ? 'nav-tab-active' : ''; ?>">
            <?php _e('플러그인 설정', 'dasom-church'); ?>
        </a>
        <a href="?page=dasom-church-github-update&tab=admin_customization" class="nav-tab <?php echo $active_tab == 'admin_customization' ? 'nav-tab-active' : ''; ?>">
            <?php _e('관리자 커스터마이징', 'dasom-church'); ?>
        </a>
    </h2>
    
    <?php if ($active_tab == 'custom_fields'): ?>
    <!-- 커스텀 필드 안내 탭 -->
    <h2>📌 <?php _e('Elementor에서 사용할 커스텀 필드 안내', 'dasom-church'); ?></h2>
    <p><?php _e('아래 커스텀 필드 키를 Elementor → Dynamic Tags → Post Custom Field → Custom Key 입력칸에 넣어 사용하세요.', 'dasom-church'); ?></p>
    
    <table class="widefat striped" style="max-width:900px;margin:20px 0;">
        <thead>
            <tr>
                <th style="width:180px;"><?php _e('포스트 타입', 'dasom-church'); ?></th>
                <th style="width:200px;"><?php _e('필드 설명', 'dasom-church'); ?></th>
                <th><?php _e('커스텀 필드 키', 'dasom-church'); ?></th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td rowspan="4">📖 <?php _e('교회주보 (bulletin)', 'dasom-church'); ?></td>
                <td><?php _e('주보 날짜 (YYYY-MM-DD)', 'dasom-church'); ?></td>
                <td><code>dw_bulletin_date</code></td>
            </tr>
            <tr>
                <td><?php _e('주보 날짜 (한글)', 'dasom-church'); ?></td>
                <td><code>dw_bulletin_date_formatted</code></td>
            </tr>
            <tr>
                <td><?php _e('주보 PDF 첨부 ID', 'dasom-church'); ?></td>
                <td><code>dw_bulletin_pdf</code></td>
            </tr>
            <tr>
                <td><?php _e('주보 이미지 (JSON 배열)', 'dasom-church'); ?></td>
                <td><code>dw_bulletin_images</code></td>
            </tr>
            <tr>
                <td rowspan="5">🎤 <?php _e('설교 (sermon)', 'dasom-church'); ?></td>
                <td><?php _e('설교 제목', 'dasom-church'); ?></td>
                <td><code>dw_sermon_title</code></td>
            </tr>
            <tr>
                <td><?php _e('성경구절', 'dasom-church'); ?></td>
                <td><code>dw_sermon_scripture</code></td>
            </tr>
            <tr>
                <td><?php _e('YouTube URL', 'dasom-church'); ?></td>
                <td><code>dw_sermon_youtube</code></td>
            </tr>
            <tr>
                <td><?php _e('설교 일자', 'dasom-church'); ?></td>
                <td><code>dw_sermon_date</code></td>
            </tr>
            <tr>
                <td><?php _e('설교자', 'dasom-church'); ?></td>
                <td><code>dw_sermon_preacher</code></td>
            </tr>
            <tr>
                <td rowspan="3">📷 <?php _e('교회앨범 (album)', 'dasom-church'); ?></td>
                <td><?php _e('YouTube URL', 'dasom-church'); ?></td>
                <td><code>dw_album_youtube</code></td>
            </tr>
            <tr>
                <td><?php _e('썸네일 이미지 ID', 'dasom-church'); ?></td>
                <td><code>dw_album_thumb_id</code></td>
            </tr>
            <tr>
                <td><?php _e('앨범 이미지 (JSON 배열)', 'dasom-church'); ?></td>
                <td><code>dw_album_images</code></td>
            </tr>
            <tr>
                <td rowspan="6">🎯 <?php _e('배너 (banner)', 'dasom-church'); ?></td>
                <td><?php _e('PC용 배너 이미지 ID', 'dasom-church'); ?></td>
                <td><code>dw_banner_pc_image</code></td>
            </tr>
            <tr>
                <td><?php _e('모바일용 배너 이미지 ID', 'dasom-church'); ?></td>
                <td><code>dw_banner_mobile_image</code></td>
            </tr>
            <tr>
                <td><?php _e('링크 URL', 'dasom-church'); ?></td>
                <td><code>dw_banner_link_url</code></td>
            </tr>
            <tr>
                <td><?php _e('링크 타겟', 'dasom-church'); ?></td>
                <td><code>dw_banner_link_target</code></td>
            </tr>
            <tr>
                <td><?php _e('시작 날짜', 'dasom-church'); ?></td>
                <td><code>dw_banner_start_date</code></td>
            </tr>
            <tr>
                <td><?php _e('종료 날짜', 'dasom-church'); ?></td>
                <td><code>dw_banner_end_date</code></td>
            </tr>
            <tr>
                <td rowspan="4">🖋 <?php _e('목회컬럼 (column)', 'dasom-church'); ?></td>
                <td><?php _e('상단 이미지 ID', 'dasom-church'); ?></td>
                <td><code>dw_column_top_image</code></td>
            </tr>
            <tr>
                <td><?php _e('하단 이미지 ID', 'dasom-church'); ?></td>
                <td><code>dw_column_bottom_image</code></td>
            </tr>
            <tr>
                <td><?php _e('YouTube URL', 'dasom-church'); ?></td>
                <td><code>dw_column_youtube</code></td>
            </tr>
            <tr>
                <td><?php _e('YouTube 썸네일 ID', 'dasom-church'); ?></td>
                <td><code>dw_column_thumb_id</code></td>
            </tr>
            <tr>
                <td rowspan="5">🎉 <?php _e('이벤트 (event)', 'dasom-church'); ?></td>
                <td><?php _e('이벤트 시작 날짜', 'dasom-church'); ?></td>
                <td><code>dw_event_start_date</code></td>
            </tr>
            <tr>
                <td><?php _e('이벤트 종료 날짜', 'dasom-church'); ?></td>
                <td><code>dw_event_end_date</code></td>
            </tr>
            <tr>
                <td><?php _e('이벤트 시간', 'dasom-church'); ?></td>
                <td><code>dw_event_time</code></td>
            </tr>
            <tr>
                <td><?php _e('이벤트 장소', 'dasom-church'); ?></td>
                <td><code>dw_event_location</code></td>
            </tr>
            <tr>
                <td><?php _e('이벤트 썸네일 이미지 ID', 'dasom-church'); ?></td>
                <td><code>dw_event_thumbnail</code></td>
            </tr>
        </tbody>
    </table>
    
    <p style="margin-top:20px;padding:12px;background:#f0f0f1;border-left:4px solid #2271b1;">
        <strong><?php _e('💡 Elementor 사용 팁:', 'dasom-church'); ?></strong><br>
        <?php _e('Dynamic Tags → Post → Post Custom Field에서 위 키를 입력하여 사용하세요.', 'dasom-church'); ?><br><br>
        <strong><?php _e('📎 이미지/PDF ID를 URL로 변환:', 'dasom-church'); ?></strong><br>
        • <?php _e('이미지 URL:', 'dasom-church'); ?> <code>wp_get_attachment_image_url( get_post_meta( get_the_ID(), 'dw_column_top_image', true ), 'full' )</code><br>
        • <?php _e('PDF URL:', 'dasom-church'); ?> <code>wp_get_attachment_url( get_post_meta( get_the_ID(), 'dw_bulletin_pdf', true ) )</code><br>
        • <?php _e('썸네일 URL:', 'dasom-church'); ?> <code>wp_get_attachment_image_url( get_post_meta( get_the_ID(), 'dw_sermon_thumb_id', true ), 'large' )</code><br><br>
        <strong><?php _e('⚠️ JSON 배열 데이터:', 'dasom-church'); ?></strong><br>
        <?php _e('dw_bulletin_images, dw_album_images는 JSON 배열 형태로 저장되어 Elementor 기본 Custom Field로는 그대로 출력되지 않습니다. Shortcode 또는 커스텀 PHP 코드로 처리하세요.', 'dasom-church'); ?>
    </p>
    
    <!-- 교회설정 커스텀 필드 안내 -->
    <hr>
    <h2>🏛️ <?php _e('교회설정 커스텀 필드 안내', 'dasom-church'); ?></h2>
    <p><?php _e('아래 커스텀 필드 키를 Elementor → Dynamic Tags → Post Custom Field → Custom Key 입력칸에 넣어 사용하세요.', 'dasom-church'); ?></p>
    
    <table class="widefat striped" style="max-width:900px;margin:20px 0;">
        <thead>
            <tr>
                <th style="width:200px;"><?php _e('설정 분류', 'dasom-church'); ?></th>
                <th style="width:200px;"><?php _e('필드 설명', 'dasom-church'); ?></th>
                <th><?php _e('커스텀 필드 키', 'dasom-church'); ?></th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td rowspan="5">🏢 <?php _e('기본 정보', 'dasom-church'); ?></td>
                <td><?php _e('교회명', 'dasom-church'); ?></td>
                <td><code>dw_church_name</code></td>
            </tr>
            <tr>
                <td><?php _e('교회 주소', 'dasom-church'); ?></td>
                <td><code>dw_church_address</code></td>
            </tr>
            <tr>
                <td><?php _e('전화번호', 'dasom-church'); ?></td>
                <td><code>dw_church_phone</code></td>
            </tr>
            <tr>
                <td><?php _e('이메일', 'dasom-church'); ?></td>
                <td><code>dw_church_email</code></td>
            </tr>
            <tr>
                <td><?php _e('웹사이트 URL', 'dasom-church'); ?></td>
                <td><code>dw_church_website</code></td>
            </tr>
            <tr>
                <td rowspan="7">📱 <?php _e('소셜미디어', 'dasom-church'); ?></td>
                <td><?php _e('YouTube 채널', 'dasom-church'); ?></td>
                <td><code>dw_social_youtube</code></td>
            </tr>
            <tr>
                <td><?php _e('Instagram', 'dasom-church'); ?></td>
                <td><code>dw_social_instagram</code></td>
            </tr>
            <tr>
                <td><?php _e('Facebook', 'dasom-church'); ?></td>
                <td><code>dw_social_facebook</code></td>
            </tr>
            <tr>
                <td><?php _e('LinkedIn', 'dasom-church'); ?></td>
                <td><code>dw_social_linkedin</code></td>
            </tr>
            <tr>
                <td><?php _e('TikTok', 'dasom-church'); ?></td>
                <td><code>dw_social_tiktok</code></td>
            </tr>
            <tr>
                <td><?php _e('KakaoTalk', 'dasom-church'); ?></td>
                <td><code>dw_social_kakaotalk</code></td>
            </tr>
            <tr>
                <td><?php _e('KakaoTalk Channel', 'dasom-church'); ?></td>
                <td><code>dw_social_kakaotalk_channel</code></td>
            </tr>
        </tbody>
    </table>
    
    <p style="color:#666;">
        <?php _e('※ 교회설정은 WordPress 옵션으로 저장되며, Elementor에서 Site Settings 또는 Custom Fields로 접근할 수 있습니다.', 'dasom-church'); ?>
    </p>
    
    <?php elseif ($active_tab == 'user_role_control'): ?>
    <!-- 사용자 권한 관리 탭 -->
    <h2>👥 <?php _e('사용자 권한 관리', 'dasom-church'); ?></h2>
    <p><?php _e('Author와 Editor 역할의 사용자가 볼 수 있는 메뉴를 관리할 수 있습니다.', 'dasom-church'); ?></p>
    
    <?php
    // Get current settings
    $menu_visibility_settings = get_option('dw_menu_visibility_settings', array());
    
    // Default menu items for Author/Editor
    $default_menus = array(
        'dashboard' => array('name' => '대시보드', 'default_author' => true, 'default_editor' => true),
        'sermon' => array('name' => '설교', 'default_author' => true, 'default_editor' => true),
        'column' => array('name' => '목회컬럼', 'default_author' => true, 'default_editor' => true),
        'bulletin' => array('name' => '교회주보', 'default_author' => true, 'default_editor' => true),
        'album' => array('name' => '교회앨범', 'default_author' => true, 'default_editor' => true),
        'event' => array('name' => '이벤트', 'default_author' => true, 'default_editor' => true),
        'banner' => array('name' => '배너', 'default_author' => true, 'default_editor' => true),
        'settings' => array('name' => '설정', 'default_author' => true, 'default_editor' => true),
        'posts' => array('name' => 'Posts', 'default_author' => true, 'default_editor' => true),
        'pages' => array('name' => 'Pages', 'default_author' => true, 'default_editor' => true),
        'media' => array('name' => 'Media', 'default_author' => true, 'default_editor' => true),
        'users' => array('name' => 'Users', 'default_author' => true, 'default_editor' => true),
        'profile' => array('name' => '프로필', 'default_author' => true, 'default_editor' => true),
        'logout' => array('name' => '로그아웃', 'default_author' => true, 'default_editor' => true),
    );
    
    // Handle form submission
    if (isset($_POST['save_menu_visibility']) && wp_verify_nonce($_POST['menu_visibility_nonce'], 'save_menu_visibility')) {
        $new_settings = array();
        
        foreach ($default_menus as $menu_key => $menu_data) {
            $new_settings[$menu_key] = array(
                'author' => isset($_POST['menu_visibility'][$menu_key]['author']) ? true : false,
                'editor' => isset($_POST['menu_visibility'][$menu_key]['editor']) ? true : false,
            );
        }
        
        update_option('dw_menu_visibility_settings', $new_settings);
        echo '<div class="notice notice-success"><p>' . __('설정이 저장되었습니다.', 'dasom-church') . '</p></div>';
        
        // Refresh settings
        $menu_visibility_settings = $new_settings;
    }
    ?>
    
    <form method="post" action="">
        <?php wp_nonce_field('save_menu_visibility', 'menu_visibility_nonce'); ?>
        
        <table class="widefat striped" style="max-width:800px;">
            <thead>
                <tr>
                    <th style="width:200px;"><?php _e('메뉴 항목', 'dasom-church'); ?></th>
                    <th style="width:100px;text-align:center;"><?php _e('Author', 'dasom-church'); ?></th>
                    <th style="width:100px;text-align:center;"><?php _e('Editor', 'dasom-church'); ?></th>
                    <th><?php _e('설명', 'dasom-church'); ?></th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($default_menus as $menu_key => $menu_data): ?>
                    <?php
                    $author_visible = isset($menu_visibility_settings[$menu_key]['author']) 
                        ? $menu_visibility_settings[$menu_key]['author'] 
                        : $menu_data['default_author'];
                    $editor_visible = isset($menu_visibility_settings[$menu_key]['editor']) 
                        ? $menu_visibility_settings[$menu_key]['editor'] 
                        : $menu_data['default_editor'];
                    ?>
                    <tr>
                        <td><strong><?php echo esc_html($menu_data['name']); ?></strong></td>
                        <td style="text-align:center;">
                            <input type="checkbox" 
                                   name="menu_visibility[<?php echo esc_attr($menu_key); ?>][author]" 
                                   value="1" 
                                   <?php checked($author_visible, true); ?> />
                        </td>
                        <td style="text-align:center;">
                            <input type="checkbox" 
                                   name="menu_visibility[<?php echo esc_attr($menu_key); ?>][editor]" 
                                   value="1" 
                                   <?php checked($editor_visible, true); ?> />
                        </td>
                        <td>
                            <?php
                            switch($menu_key) {
                                case 'dashboard':
                                    echo __('DW 교회관리 대시보드', 'dasom-church');
                                    break;
                                case 'sermon':
                                    echo __('설교 관리', 'dasom-church');
                                    break;
                                case 'column':
                                    echo __('목회컬럼 관리', 'dasom-church');
                                    break;
                                case 'bulletin':
                                    echo __('교회주보 관리', 'dasom-church');
                                    break;
                                case 'album':
                                    echo __('교회앨범 관리', 'dasom-church');
                                    break;
                                case 'event':
                                    echo __('이벤트 관리', 'dasom-church');
                                    break;
                                case 'banner':
                                    echo __('배너 관리', 'dasom-church');
                                    break;
                                case 'settings':
                                    echo __('DW 교회관리 설정', 'dasom-church');
                                    break;
                                case 'posts':
                                    echo __('WordPress Posts 관리', 'dasom-church');
                                    break;
                                case 'pages':
                                    echo __('WordPress Pages 관리', 'dasom-church');
                                    break;
                                case 'media':
                                    echo __('미디어 라이브러리', 'dasom-church');
                                    break;
                                case 'users':
                                    echo __('사용자 관리', 'dasom-church');
                                    break;
                                case 'profile':
                                    echo __('프로필 (관리자 바 숨김 시에만 표시)', 'dasom-church');
                                    break;
                                case 'logout':
                                    echo __('로그아웃 (관리자 바 숨김 시에만 표시)', 'dasom-church');
                                    break;
                                default:
                                    echo __('기타 메뉴', 'dasom-church');
                            }
                            ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        
        <div style="background:#f0f7ff;padding:15px;border-left:4px solid #2271b1;margin:20px 0;">
            <h3 style="margin-top:0;">💡 <?php _e('사용 방법:', 'dasom-church'); ?></h3>
            <ul style="margin-bottom:0;">
                <li><?php _e('체크된 메뉴는 해당 역할의 사용자가 볼 수 있습니다.', 'dasom-church'); ?></li>
                <li><?php _e('체크 해제된 메뉴는 해당 역할의 사용자에게 숨겨집니다.', 'dasom-church'); ?></li>
                <li><?php _e('새로 추가된 플러그인 메뉴는 기본적으로 숨겨집니다.', 'dasom-church'); ?></li>
                <li><?php _e('Administrator는 모든 메뉴에 접근할 수 있습니다.', 'dasom-church'); ?></li>
            </ul>
        </div>
        
        <input type="hidden" name="save_menu_visibility" value="1" />
        <?php submit_button(__('설정 저장', 'dasom-church')); ?>
    </form>
    
    <?php elseif ($active_tab == 'github_update'): ?>
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
    
    <?php elseif ($active_tab == 'widgets'): ?>
    <!-- 위젯 설정 탭 -->
    <h2><?php _e('위젯 관리', 'dasom-church'); ?></h2>
    <p class="description" style="margin-bottom:20px;">
        <?php _e('DW 교회관리 시스템에서 제공하는 위젯의 사용 여부를 관리할 수 있습니다. 위젯은 Elementor, 구텐버그, Kadence Block Pro에서 사용 가능합니다.', 'dasom-church'); ?>
    </p>
    
    <form method="post" action="">
        <?php wp_nonce_field('dasom_church_settings_action', 'dasom_church_settings_nonce'); ?>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="dw_enable_gallery_widget"><?php echo esc_html__('DW Gallery Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_gallery_widget" name="dw_enable_gallery_widget" value="yes" <?php checked(get_option('dw_enable_gallery_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Gallery Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('교회앨범 이미지를 갤러리 형태로 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('Grid / Masonry 레이아웃 선택', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('반응형 컬럼 설정 (1-6 컬럼)', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('이미지 크기 선택 (Thumbnail, Medium, Large, Full)', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('Elementor, 구텐버그, Kadence Block Pro 지원', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_sermon_widget"><?php echo esc_html__('DW Recent Sermons Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_sermon_widget" name="dw_enable_sermon_widget" value="yes" <?php checked(get_option('dw_enable_sermon_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Recent Sermons Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('최근 설교 목록 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('Grid / List 레이아웃 선택', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('설교일, 설교자, 썸네일 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('반응형 컬럼 설정', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_single_sermon_widget"><?php echo esc_html__('DW Sermon Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_single_sermon_widget" name="dw_enable_single_sermon_widget" value="yes" <?php checked(get_option('dw_enable_single_sermon_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Sermon Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('단일 설교 상세 정보 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('설교 제목, 설교자, 성경구절', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('설교 썸네일 및 메타 정보', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('현재 포스트 / 최신 포스트 / 수동 선택', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_bulletin_widget"><?php echo esc_html__('DW Recent Bulletin Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_bulletin_widget" name="dw_enable_bulletin_widget" value="yes" <?php checked(get_option('dw_enable_bulletin_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Recent Bulletin Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('최근 주보 목록 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('PDF 다운로드 링크', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('주보 이미지 썸네일', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('날짜순 정렬', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_single_bulletin_widget"><?php echo esc_html__('DW Single Bulletin Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_single_bulletin_widget" name="dw_enable_single_bulletin_widget" value="yes" <?php checked(get_option('dw_enable_single_bulletin_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Single Bulletin Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('특정 주보 선택 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('주보 날짜 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('PDF 다운로드 버튼', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('주보 이미지 전체 크기로 순서대로 표시', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_column_widget"><?php echo esc_html__('DW Pastoral Columns Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_column_widget" name="dw_enable_column_widget" value="yes" <?php checked(get_option('dw_enable_column_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Pastoral Columns Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('최근 목회컬럼 목록 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('컬럼 썸네일 및 발췌문', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('Grid 레이아웃', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('반응형 컬럼 설정', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_banner_slider_widget"><?php echo esc_html__('DW Banner Slider Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_banner_slider_widget" name="dw_enable_banner_slider_widget" value="yes" <?php checked(get_option('dw_enable_banner_slider_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Banner Slider Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('배너 슬라이더 (Swiper.js)', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('카테고리별 필터링 (메인/서브)', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('자동재생, 네비게이션, 페이지네이션', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('배너 링크 및 타겟 설정', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_pastoral_column_widget"><?php echo esc_html__('DW Pastoral Column Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_pastoral_column_widget" name="dw_enable_pastoral_column_widget" value="yes" <?php checked(get_option('dw_enable_pastoral_column_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Pastoral Column Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('단일 목회 컬럼 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('상단 이미지, 제목, 날짜, 내용, 하단 이미지, YouTube', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('Query: Current Post, Latest Post, Manual Selection', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="dw_enable_pastoral_columns_grid_widget"><?php echo esc_html__('DW Pastoral Columns Recent Grid Widget', 'dasom-church'); ?></label>
                </th>
                <td>
                    <fieldset>
                        <label>
                            <input type="checkbox" id="dw_enable_pastoral_columns_grid_widget" name="dw_enable_pastoral_columns_grid_widget" value="yes" <?php checked(get_option('dw_enable_pastoral_columns_grid_widget', 'yes'), 'yes'); ?> />
                            <?php echo esc_html__('DW Pastoral Columns Recent Grid Widget 사용', 'dasom-church'); ?>
                        </label>
                        <p class="description" style="margin-top:10px;">
                            <strong><?php echo esc_html__('기능:', 'dasom-church'); ?></strong><br>
                            • <?php echo esc_html__('최근 목회 컬럼 그리드 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('썸네일, 제목, 날짜, 발췌문 표시', 'dasom-church'); ?><br>
                            • <?php echo esc_html__('그리드/리스트 레이아웃, Pagination 지원', 'dasom-church'); ?>
                        </p>
                    </fieldset>
                </td>
            </tr>
        </table>
        
        <div style="background:#f0f7ff;padding:15px;border-left:4px solid #2271b1;margin-top:20px;">
            <h3 style="margin-top:0;">✨ <?php _e('9개의 위젯 사용 가능!', 'dasom-church'); ?></h3>
            <p style="margin-bottom:0;">
                <?php _e('모든 위젯은 Elementor에서 사용할 수 있습니다. 필요에 따라 개별적으로 활성화/비활성화할 수 있습니다.', 'dasom-church'); ?>
            </p>
        </div>
        
        <?php submit_button(); ?>
    </form>
    
    <?php elseif ($active_tab == 'admin_customization'): ?>
    <!-- 관리자 커스터마이징 탭 -->
    <h2>🎨 <?php _e('관리자 커스터마이징', 'dasom-church'); ?></h2>
    <p><?php _e('관리자 바 숨김, 메뉴 스타일링, 관리자 바 제목 설정을 관리할 수 있습니다.', 'dasom-church'); ?></p>
    
    <?php
    // Get current settings
    $admin_bar_hide = get_option('dw_admin_bar_hide', 'no');
    $admin_menu_bg_color = get_option('dw_admin_menu_bg_color', '#1d2327');
    $admin_menu_font_color = get_option('dw_admin_menu_font_color', '#ffffff');
    $admin_bar_title = get_option('dw_admin_bar_title', 'DW 교회관리');
    
    // Handle form submission
    if (isset($_POST['save_admin_customization']) && wp_verify_nonce($_POST['admin_customization_nonce'], 'save_admin_customization')) {
        $admin_bar_hide = sanitize_text_field($_POST['admin_bar_hide']);
        $admin_menu_bg_color = sanitize_hex_color($_POST['admin_menu_bg_color']);
        $admin_menu_font_color = sanitize_hex_color($_POST['admin_menu_font_color']);
        $admin_bar_title = sanitize_text_field($_POST['admin_bar_title']);
        
        update_option('dw_admin_bar_hide', $admin_bar_hide);
        update_option('dw_admin_menu_bg_color', $admin_menu_bg_color);
        update_option('dw_admin_menu_font_color', $admin_menu_font_color);
        update_option('dw_admin_bar_title', $admin_bar_title);
        
        echo '<div class="notice notice-success"><p>' . __('설정이 저장되었습니다.', 'dasom-church') . '</p></div>';
    }
    ?>
    
    <form method="post" action="">
        <?php wp_nonce_field('save_admin_customization', 'admin_customization_nonce'); ?>
        
        <table class="form-table">
            <tr>
                <th scope="row"><?php _e('관리자 바 숨김', 'dasom-church'); ?></th>
                <td>
                    <label>
                        <input type="checkbox" name="admin_bar_hide" value="yes" <?php checked($admin_bar_hide, 'yes'); ?> />
                        <?php _e('관리자 바를 숨깁니다 (프론트엔드 및 백엔드에서)', 'dasom-church'); ?>
                    </label>
                    <p class="description"><?php _e('체크하면 프론트엔드와 백엔드(관리자 영역) 모두에서 관리자 바가 숨겨집니다.', 'dasom-church'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('관리자 메뉴 배경색', 'dasom-church'); ?></th>
                <td>
                    <input type="color" name="admin_menu_bg_color" value="<?php echo esc_attr($admin_menu_bg_color); ?>" />
                    <p class="description"><?php _e('관리자 메뉴의 배경색을 설정합니다.', 'dasom-church'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('관리자 메뉴 폰트색', 'dasom-church'); ?></th>
                <td>
                    <input type="color" name="admin_menu_font_color" value="<?php echo esc_attr($admin_menu_font_color); ?>" />
                    <p class="description"><?php _e('관리자 메뉴의 폰트색을 설정합니다.', 'dasom-church'); ?></p>
                </td>
            </tr>
            
            <tr>
                <th scope="row"><?php _e('관리자 바 제목', 'dasom-church'); ?></th>
                <td>
                    <input type="text" name="admin_bar_title" value="<?php echo esc_attr($admin_bar_title); ?>" class="regular-text" />
                    <p class="description"><?php _e('관리자 바 상단에 표시될 제목을 설정합니다.', 'dasom-church'); ?></p>
                </td>
            </tr>
        </table>
        
        <div style="background:#f0f7ff;padding:15px;border-left:4px solid #2271b1;margin:20px 0;">
            <h3 style="margin-top:0;">💡 <?php _e('사용 방법:', 'dasom-church'); ?></h3>
            <ul style="margin-bottom:0;">
                <li><?php _e('관리자 바 숨김: 프론트엔드와 백엔드(관리자 영역) 모두에서 관리자 바를 완전히 숨깁니다.', 'dasom-church'); ?></li>
                <li><?php _e('메뉴 스타일링: 관리자 메뉴의 배경색과 폰트색을 커스터마이징할 수 있습니다.', 'dasom-church'); ?></li>
                <li><?php _e('관리자 바 제목: 관리자 바 상단에 표시될 브랜드명을 설정할 수 있습니다.', 'dasom-church'); ?></li>
            </ul>
        </div>
        
        <input type="hidden" name="save_admin_customization" value="1" />
        <?php submit_button(__('설정 저장', 'dasom-church')); ?>
    </form>
    
    <?php elseif ($active_tab == 'plugin_settings'): ?>
    <!-- 플러그인 설정 탭 -->
    <h2><?php echo esc_html__('대시보드 설정', 'dasom-church'); ?></h2>
    <table class="form-table">
        <tr>
            <th scope="row">
                <label for="dw_dashboard_fields_visibility"><?php echo esc_html__('커스텀 필드 안내 표시 권한', 'dasom-church'); ?></label>
            </th>
            <td>
                <select id="dw_dashboard_fields_visibility" name="dw_dashboard_fields_visibility">
                    <option value="administrator" <?php selected(get_option('dw_dashboard_fields_visibility', 'administrator'), 'administrator'); ?>><?php echo esc_html__('Administrator (관리자)', 'dasom-church'); ?></option>
                    <option value="editor" <?php selected(get_option('dw_dashboard_fields_visibility', 'administrator'), 'editor'); ?>><?php echo esc_html__('Editor (편집자)', 'dasom-church'); ?></option>
                    <option value="author" <?php selected(get_option('dw_dashboard_fields_visibility', 'administrator'), 'author'); ?>><?php echo esc_html__('Author (작성자)', 'dasom-church'); ?></option>
                    <option value="contributor" <?php selected(get_option('dw_dashboard_fields_visibility', 'administrator'), 'contributor'); ?>><?php echo esc_html__('Contributor (기여자)', 'dasom-church'); ?></option>
                </select>
                <p class="description"><?php echo esc_html__('대시보드에서 "Elementor에서 사용할 커스텀 필드 안내"와 "교회설정 커스텀 필드 안내" 섹션을 볼 수 있는 최소 권한을 설정합니다.', 'dasom-church'); ?></p>
            </td>
        </tr>
    </table>
    
    <h2><?php echo esc_html__('플러그인 삭제 설정', 'dasom-church'); ?></h2>
    <table class="form-table">
        <tr>
            <th scope="row">
                <label for="dw_delete_data_on_uninstall"><?php echo esc_html__('플러그인 삭제 시 데이터 삭제', 'dasom-church'); ?></label>
            </th>
            <td>
                <fieldset>
                    <label>
                        <input type="checkbox" id="dw_delete_data_on_uninstall" name="dw_delete_data_on_uninstall" value="yes" <?php checked(get_option('dw_delete_data_on_uninstall', 'no'), 'yes'); ?> />
                        <?php echo esc_html__('플러그인 삭제 시 모든 데이터 삭제', 'dasom-church'); ?>
                    </label>
                    <p class="description" style="margin-top:10px;">
                        <strong style="color:#dc3545;">⚠️ <?php echo esc_html__('주의:', 'dasom-church'); ?></strong><br>
                        <?php echo esc_html__('이 옵션을 활성화하면 플러그인을 삭제할 때 다음 데이터가 모두 삭제됩니다:', 'dasom-church'); ?><br>
                        • <?php echo esc_html__('모든 포스트 (주보, 설교, 컬럼, 앨범, 배너)', 'dasom-church'); ?><br>
                        • <?php echo esc_html__('모든 커스텀 필드 데이터', 'dasom-church'); ?><br>
                        • <?php echo esc_html__('모든 설정 정보', 'dasom-church'); ?><br>
                        • <?php echo esc_html__('설교자 taxonomy 데이터', 'dasom-church'); ?><br><br>
                        <strong style="color:#2271b1;">💡 <?php echo esc_html__('권장:', 'dasom-church'); ?></strong><br>
                        <?php echo esc_html__('데이터를 보존하려면 이 옵션을 비활성화한 채로 두세요. 플러그인을 다시 설치하면 기존 데이터를 그대로 사용할 수 있습니다.', 'dasom-church'); ?>
                    </p>
                </fieldset>
            </td>
        </tr>
    </table>
    
    <form method="post" action="">
        <?php wp_nonce_field('dasom_church_settings_action', 'dasom_church_settings_nonce'); ?>
        <?php submit_button(); ?>
    </form>
    
    <?php endif; ?>
</div>

