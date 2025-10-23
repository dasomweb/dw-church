# WordPress Plugin Auto-Update via GitHub - 개발 가이드라인

## 목차
1. [개요](#개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [핵심 구현 사항](#핵심-구현-사항)
4. [단계별 구현 가이드](#단계별-구현-가이드)
5. [주요 함수 설명](#주요-함수-설명)
6. [문제 해결 가이드](#문제-해결-가이드)
7. [보안 고려사항](#보안-고려사항)
8. [테스트 방법](#테스트-방법)

---

## 개요

### 작동 원리
GitHub Releases를 WordPress의 플러그인 업데이트 시스템과 연동하여 자동 업데이트를 구현합니다.

### 주요 특징
- ✅ **Public/Private 저장소 모두 지원** - GitHub Token으로 비공개 저장소 접근
- ✅ **자동 캐싱 시스템** - 12시간 캐시로 API 호출 최소화
- ✅ **플러그인 활성화 상태 유지** - 업데이트 후 자동 재활성화
- ✅ **폴더명 자동 수정** - GitHub zipball의 폴더명 자동 변환
- ✅ **상세한 에러 메시지** - 디버깅이 쉬운 에러 핸들링
- ✅ **WordPress 표준 준수** - WordPress 업데이트 API 완벽 호환

---

## 시스템 아키텍처

### 1. 업데이트 체크 플로우

```
WordPress Admin
    ↓
pre_set_site_transient_update_plugins (필터)
    ↓
캐시 확인 (12시간)
    ↓
GitHub API 호출 (/repos/{owner}/{repo}/releases/latest)
    ↓
버전 비교 (version_compare)
    ↓
업데이트 정보 반환
    ↓
WordPress 플러그인 페이지 표시
```

### 2. 다운로드 및 설치 플로우

```
"지금 업데이트" 클릭
    ↓
upgrader_pre_download (필터)
    ↓
GitHub Token으로 인증된 다운로드
    ↓
임시 파일 저장
    ↓
upgrader_source_selection (필터)
    ↓
폴더명 변경 (GitHub 폴더명 → 플러그인 폴더명)
    ↓
설치 완료
    ↓
upgrader_process_complete (액션)
    ↓
캐시 삭제 & 플러그인 재활성화
```

---

## 핵심 구현 사항

### 필수 WordPress 후크 (Hooks)

| 후크 | 타입 | 용도 |
|------|------|------|
| `pre_set_site_transient_update_plugins` | Filter | 업데이트 확인 |
| `plugins_api` | Filter | 플러그인 상세 정보 제공 |
| `upgrader_pre_download` | Filter | 인증된 다운로드 |
| `upgrader_source_selection` | Filter | 폴더명 수정 |
| `upgrader_pre_install` | Filter | 활성화 상태 저장 |
| `upgrader_process_complete` | Action | 설치 후 처리 (캐시 삭제, 재활성화) |

### 필수 플러그인 헤더

```php
/**
 * Plugin Name: Your Plugin Name
 * Version: 1.0.0
 * GitHub Plugin URI: username/repository-name
 * GitHub Branch: main
 */
```

---

## 단계별 구현 가이드

### Step 1: 플러그인 상수 정의

```php
// 메인 플러그인 파일 상단
define('YOUR_PLUGIN_VERSION', '1.0.0');
define('YOUR_PLUGIN_FILE', __FILE__);
```

### Step 2: GitHub API 헤더 함수

```php
/**
 * GitHub API 인증 헤더 생성
 * Private 저장소는 Token 필요, Public은 선택사항
 */
function your_plugin_get_github_headers() {
    $headers = array(
        'Accept' => 'application/vnd.github.v3+json',
        'User-Agent' => 'WordPress/' . get_bloginfo('version') . '; ' . get_bloginfo('url')
    );
    
    // Private 저장소용 Token 가져오기
    $github_token = get_option('your_plugin_github_token', '');
    
    if (!empty($github_token)) {
        $headers['Authorization'] = 'token ' . $github_token;
    }
    
    return $headers;
}
```

**💡 설명:**
- `User-Agent` 헤더는 GitHub API 요구사항
- Token은 WordPress options에 저장
- Public 저장소는 Token 없이도 작동

### Step 3: 업데이트 체크 함수 (핵심)

```php
/**
 * GitHub에서 최신 릴리스 확인
 * WordPress가 자동으로 호출
 */
function your_plugin_check_for_updates($transient) {
    // 체크할 플러그인이 없으면 종료
    if (empty($transient->checked)) {
        return $transient;
    }
    
    // 플러그인 설정
    $plugin_slug = plugin_basename(YOUR_PLUGIN_FILE);
    $github_username = 'your-username';
    $github_repo = 'your-repo-name';
    
    // ⭐ 캐싱 시스템 (12시간)
    $cache_key = 'your_plugin_update_' . md5($github_username . $github_repo);
    $cached_data = get_transient($cache_key);
    
    if ($cached_data !== false) {
        $release = $cached_data;
    } else {
        // GitHub API 호출
        $response = wp_remote_get(
            "https://api.github.com/repos/{$github_username}/{$github_repo}/releases/latest",
            array(
                'timeout' => 15,
                'headers' => your_plugin_get_github_headers()
            )
        );
        
        // 에러 체크
        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            return $transient;
        }
        
        $release = json_decode(wp_remote_retrieve_body($response), true);
        
        // ⭐ 12시간 캐싱
        set_transient($cache_key, $release, 12 * HOUR_IN_SECONDS);
    }
    
    // 버전 비교
    if (isset($release['tag_name']) && isset($release['zipball_url'])) {
        $latest_version = ltrim($release['tag_name'], 'v'); // v1.0.0 → 1.0.0
        $current_version = YOUR_PLUGIN_VERSION;
        
        if (version_compare($latest_version, $current_version, '>')) {
            // ⭐ zipball_url 사용 (Private 저장소 지원)
            $download_url = $release['zipball_url'];
            
            $plugin_data = array(
                'slug' => dirname($plugin_slug),
                'plugin' => $plugin_slug,
                'new_version' => $latest_version,
                'url' => "https://github.com/{$github_username}/{$github_repo}",
                'package' => $download_url,
                'tested' => '6.8',
                'requires_php' => '7.4',
                'compatibility' => new stdClass(),
            );
            
            // ⭐ WordPress에 업데이트 정보 전달
            $transient->response[$plugin_slug] = (object) $plugin_data;
        }
    }
    
    return $transient;
}

// 후크 등록
add_filter('pre_set_site_transient_update_plugins', 'your_plugin_check_for_updates');
```

**🔑 핵심 포인트:**
1. **캐싱 필수**: API 호출 제한 방지
2. **zipball_url 사용**: Private 저장소 인증 지원
3. **version_compare**: 버전 비교 함수
4. **ltrim($tag, 'v')**: GitHub 태그의 'v' 제거

### Step 4: 플러그인 상세 정보 제공

```php
/**
 * "세부 정보 보기" 클릭 시 표시될 정보
 */
function your_plugin_info($result, $action, $args) {
    $plugin_slug = dirname(plugin_basename(YOUR_PLUGIN_FILE));
    
    // 이 플러그인이 아니면 건너뛰기
    if ($action !== 'plugin_information' || !isset($args->slug) || $args->slug !== $plugin_slug) {
        return $result;
    }
    
    $github_username = 'your-username';
    $github_repo = 'your-repo-name';
    
    // 캐싱
    $cache_key = 'your_plugin_info_' . md5($github_username . $github_repo);
    $cached_info = get_transient($cache_key);
    
    if ($cached_info !== false) {
        return $cached_info;
    }
    
    // GitHub API 호출
    $response = wp_remote_get(
        "https://api.github.com/repos/{$github_username}/{$github_repo}/releases/latest",
        array(
            'timeout' => 15,
            'headers' => your_plugin_get_github_headers()
        )
    );
    
    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
        return $result;
    }
    
    $release = json_decode(wp_remote_retrieve_body($response), true);
    
    if (isset($release['tag_name']) && isset($release['zipball_url'])) {
        $latest_version = ltrim($release['tag_name'], 'v');
        
        $plugin_info = new stdClass();
        $plugin_info->name = 'Your Plugin Name';
        $plugin_info->slug = $plugin_slug;
        $plugin_info->version = $latest_version;
        $plugin_info->author = '<a href="https://your-site.com">Your Name</a>';
        $plugin_info->homepage = "https://github.com/{$github_username}/{$github_repo}";
        $plugin_info->tested = '6.8';
        $plugin_info->requires = '5.8';
        $plugin_info->requires_php = '7.4';
        $plugin_info->last_updated = $release['published_at'];
        $plugin_info->download_link = $release['zipball_url'];
        
        // ⭐ 릴리스 노트 표시
        $plugin_info->sections = array(
            'description' => 'Your plugin description',
            'installation' => 'Installation instructions',
            'changelog' => !empty($release['body']) ? $release['body'] : 'See full changelog at ' . $release['html_url']
        );
        
        set_transient($cache_key, $plugin_info, 12 * HOUR_IN_SECONDS);
        
        return $plugin_info;
    }
    
    return $result;
}

add_filter('plugins_api', 'your_plugin_info', 20, 3);
```

### Step 5: Private 저장소용 인증 다운로드 ⭐

```php
/**
 * Private 저장소 다운로드에 Token 인증 추가
 * 이 함수가 없으면 Private 저장소 업데이트 실패!
 */
function your_plugin_upgrader_pre_download($reply, $package, $upgrader) {
    // GitHub zipball URL인지 확인
    if (strpos($package, 'api.github.com') === false || strpos($package, 'zipball') === false) {
        return $reply;
    }
    
    // 이 플러그인의 다운로드인지 확인
    if (strpos($package, 'your-username/your-repo-name') === false) {
        return $reply;
    }
    
    // ⭐ GitHub Token 가져오기 (Private 저장소 필수)
    $github_token = get_option('your_plugin_github_token', '');
    
    if (empty($github_token)) {
        return new WP_Error(
            'no_github_token',
            '❌ GitHub Personal Access Token이 필요합니다. 설정에서 토큰을 입력해주세요.'
        );
    }
    
    // ⭐ 인증된 다운로드
    $response = wp_remote_get($package, array(
        'timeout' => 300,
        'headers' => array(
            'Authorization' => 'token ' . $github_token,
            'Accept' => 'application/vnd.github.v3+json',
            'User-Agent' => 'WordPress/' . get_bloginfo('version') . '; ' . get_bloginfo('url')
        )
    ));
    
    if (is_wp_error($response)) {
        return new WP_Error(
            'download_error',
            sprintf('❌ 다운로드 오류: %s', $response->get_error_message())
        );
    }
    
    $code = wp_remote_retrieve_response_code($response);
    if ($code !== 200) {
        return new WP_Error(
            'download_failed',
            sprintf('❌ 다운로드 실패: HTTP %d', $code)
        );
    }
    
    // ⭐ 임시 파일로 저장
    $tmpfname = wp_tempnam($package);
    if (!$tmpfname) {
        return new WP_Error('temp_file_failed', '❌ 임시 파일 생성 실패');
    }
    
    $body = wp_remote_retrieve_body($response);
    if (file_put_contents($tmpfname, $body) === false) {
        @unlink($tmpfname);
        return new WP_Error('file_write_failed', '❌ 파일 쓰기 실패');
    }
    
    // WordPress에 임시 파일 경로 반환
    return $tmpfname;
}

add_filter('upgrader_pre_download', 'your_plugin_upgrader_pre_download', 10, 3);
```

**⚠️ 중요:**
- **Public 저장소**: 이 함수 없이도 작동 가능
- **Private 저장소**: 이 함수 필수! Token 없으면 401 Unauthorized

### Step 6: GitHub 폴더명 자동 수정 ⭐

```php
/**
 * GitHub zipball의 폴더명을 WordPress 플러그인 폴더명으로 변경
 * 
 * GitHub: username-repo-abc1234/
 * WordPress 기대값: your-plugin-folder/
 * 
 * 이 함수가 없으면 플러그인 폴더명이 변경되어 인식 불가!
 */
function your_plugin_fix_update_folder($source, $remote_source, $upgrader, $hook_extra) {
    global $wp_filesystem;
    
    // 이 플러그인 업데이트인지 확인
    $plugin_slug = 'your-plugin-folder-name';
    
    if (!isset($hook_extra['plugin']) || dirname($hook_extra['plugin']) !== $plugin_slug) {
        return $source;
    }
    
    // ⭐ 새 폴더명 생성
    $new_source = trailingslashit($remote_source) . $plugin_slug . '/';
    
    // 이미 올바른 이름이면 반환
    if ($source === $new_source) {
        return $source;
    }
    
    // ⭐ 폴더명 변경
    if ($wp_filesystem->move($source, $new_source)) {
        return $new_source;
    }
    
    return new WP_Error('rename_failed', '폴더명 변경 실패');
}

add_filter('upgrader_source_selection', 'your_plugin_fix_update_folder', 10, 4);
```

**💡 설명:**
- GitHub는 `username-repo-abc1234` 형식으로 압축
- WordPress는 플러그인 폴더명 유지 필요
- 폴더명 불일치 시 플러그인 인식 실패

### Step 7: 플러그인 활성화 상태 유지

```php
/**
 * 업데이트 전 활성화 상태 저장
 */
function your_plugin_save_active_state($response, $hook_extra) {
    if (isset($hook_extra['plugin']) && $hook_extra['plugin'] === plugin_basename(YOUR_PLUGIN_FILE)) {
        $active_plugins = get_option('active_plugins', array());
        if (in_array(plugin_basename(YOUR_PLUGIN_FILE), $active_plugins)) {
            set_transient('your_plugin_was_active', true, 300); // 5분
        }
    }
    return $response;
}

/**
 * 업데이트 후 자동 재활성화
 */
function your_plugin_restore_active_state($upgrader_object, $options) {
    if ($options['action'] === 'update' && $options['type'] === 'plugin') {
        if (isset($options['plugins'])) {
            foreach ($options['plugins'] as $plugin) {
                if ($plugin === plugin_basename(YOUR_PLUGIN_FILE)) {
                    if (get_transient('your_plugin_was_active')) {
                        delete_transient('your_plugin_was_active');
                        activate_plugin($plugin, '', false, true);
                    }
                }
            }
        }
    }
}

add_filter('upgrader_pre_install', 'your_plugin_save_active_state', 10, 2);
add_action('upgrader_process_complete', 'your_plugin_restore_active_state', 20, 2);
```

### Step 8: 업데이트 후 캐시 삭제

```php
/**
 * 업데이트 완료 후 캐시 삭제
 */
function your_plugin_clear_update_cache($upgrader_object, $options) {
    if ($options['action'] === 'update' && $options['type'] === 'plugin') {
        $github_username = 'your-username';
        $github_repo = 'your-repo-name';
        
        // 캐시 삭제
        delete_transient('your_plugin_update_' . md5($github_username . $github_repo));
        delete_transient('your_plugin_info_' . md5($github_username . $github_repo));
    }
}

add_action('upgrader_process_complete', 'your_plugin_clear_update_cache', 10, 2);
```

### Step 9: 강제 업데이트 체크 (디버깅용)

```php
/**
 * URL에 ?force_check_update=1 추가하면 캐시 무시하고 즉시 확인
 * 예: /wp-admin/plugins.php?force_check_update=1
 */
add_action('admin_init', function() {
    if (isset($_GET['force_check_update']) && current_user_can('update_plugins')) {
        $github_username = 'your-username';
        $github_repo = 'your-repo-name';
        
        // 캐시 삭제
        delete_transient('your_plugin_update_' . md5($github_username . $github_repo));
        delete_transient('your_plugin_info_' . md5($github_username . $github_repo));
        delete_site_transient('update_plugins');
        delete_transient('update_plugins');
        
        // WordPress가 업데이트 재확인
        wp_update_plugins();
        
        // 성공 메시지
        add_action('admin_notices', function() {
            echo '<div class="notice notice-success is-dismissible"><p>';
            echo '업데이트 캐시가 삭제되었습니다. 플러그인 목록을 새로고침하세요.';
            echo '</p></div>';
        });
        
        wp_redirect(admin_url('plugins.php'));
        exit;
    }
});
```

---

## 주요 함수 설명

### 1. `version_compare($version1, $version2, $operator)`

```php
// 버전 비교 (Semantic Versioning 지원)
version_compare('1.2.3', '1.2.2', '>');  // true
version_compare('1.2.3', '1.3.0', '>');  // false
version_compare('1.2.3', '1.2.3', '=');  // true
```

### 2. `wp_remote_get($url, $args)`

```php
// WordPress HTTP API
$response = wp_remote_get('https://api.github.com/repos/user/repo/releases/latest', array(
    'timeout' => 15,              // 타임아웃 (초)
    'headers' => array(           // HTTP 헤더
        'Authorization' => 'token xxx',
        'Accept' => 'application/json'
    )
));

// 응답 확인
if (is_wp_error($response)) {
    // 에러 처리
}

$code = wp_remote_retrieve_response_code($response);  // 200, 404, etc.
$body = wp_remote_retrieve_body($response);           // JSON 문자열
```

### 3. Transient API (캐싱)

```php
// 캐시 저장 (12시간)
set_transient('cache_key', $data, 12 * HOUR_IN_SECONDS);

// 캐시 가져오기
$cached = get_transient('cache_key');
if ($cached !== false) {
    // 캐시 사용
}

// 캐시 삭제
delete_transient('cache_key');
```

### 4. GitHub API - Releases

```php
// 최신 릴리스 가져오기
GET https://api.github.com/repos/{owner}/{repo}/releases/latest

// 응답 예시
{
  "tag_name": "v1.0.0",
  "name": "Version 1.0.0",
  "body": "Release notes...",
  "published_at": "2025-01-01T00:00:00Z",
  "zipball_url": "https://api.github.com/repos/{owner}/{repo}/zipball/v1.0.0",
  "tarball_url": "https://api.github.com/repos/{owner}/{repo}/tarball/v1.0.0"
}
```

---

## 문제 해결 가이드

### 문제 1: 업데이트가 표시되지 않음

**원인:**
- 캐시 때문
- GitHub 릴리스가 없음
- 버전 형식 불일치

**해결:**
```php
// 1. 캐시 강제 삭제
/wp-admin/plugins.php?force_check_update=1

// 2. GitHub 릴리스 확인
// - Tag는 v1.0.0 형식
// - Published 상태인지 확인
// - Draft는 API에 안 나옴

// 3. 버전 확인
define('YOUR_PLUGIN_VERSION', '1.0.0');  // 플러그인
// GitHub Tag: v1.0.0
// 일치해야 함!
```

### 문제 2: Private 저장소 업데이트 실패 (401 Unauthorized)

**원인:**
- GitHub Token 없음
- Token 권한 부족
- Token 만료

**해결:**
```php
// 1. Token 생성
// GitHub → Settings → Developer settings → Personal access tokens
// - Scopes: repo (Full control of private repositories) 필수

// 2. Token 저장
update_option('your_plugin_github_token', 'ghp_xxxxxxxxxxxx');

// 3. upgrader_pre_download 필터 필수!
add_filter('upgrader_pre_download', 'your_plugin_upgrader_pre_download', 10, 3);
```

### 문제 3: 업데이트 후 플러그인 비활성화됨

**원인:**
- `upgrader_process_complete` 후크 누락
- 활성화 상태 저장/복원 로직 없음

**해결:**
```php
// upgrader_pre_install와 upgrader_process_complete 둘 다 필요!
add_filter('upgrader_pre_install', 'your_plugin_save_active_state', 10, 2);
add_action('upgrader_process_complete', 'your_plugin_restore_active_state', 20, 2);
```

### 문제 4: 업데이트 후 플러그인 폴더명 변경됨

**원인:**
- GitHub zipball의 폴더명이 `username-repo-abc1234` 형식
- `upgrader_source_selection` 필터 누락

**해결:**
```php
// 폴더명 수정 필터 필수!
add_filter('upgrader_source_selection', 'your_plugin_fix_update_folder', 10, 4);

// 플러그인 slug 일치 필수
$plugin_slug = 'your-plugin-folder-name';
$new_source = trailingslashit($remote_source) . $plugin_slug . '/';
```

### 문제 5: GitHub API Rate Limit 초과

**원인:**
- 캐싱 없음
- 너무 자주 호출

**해결:**
```php
// ⭐ 반드시 캐싱 사용!
$cached = get_transient('cache_key');
if ($cached !== false) {
    return $cached;  // 캐시 사용
}

// API 호출 후 캐싱 (12시간)
set_transient('cache_key', $data, 12 * HOUR_IN_SECONDS);

// GitHub API Rate Limit
// - 인증 없이: 60 requests/hour
// - 인증 사용: 5000 requests/hour
```

---

## 보안 고려사항

### 1. GitHub Token 저장

```php
// ❌ 나쁜 예: 하드코딩
$github_token = 'ghp_xxxxxxxxxxxx';  // 절대 금지!

// ✅ 좋은 예: WordPress Options
update_option('your_plugin_github_token', sanitize_text_field($_POST['token']));
$github_token = get_option('your_plugin_github_token', '');

// ✅ 더 좋은 예: 암호화 저장 (선택사항)
// wp-config.php에 저장
define('YOUR_PLUGIN_GITHUB_TOKEN', 'ghp_xxxxxxxxxxxx');
```

### 2. Input Sanitization

```php
// 사용자 입력 정제
$token = sanitize_text_field($_POST['github_token']);

// Nonce 검증 (CSRF 방지)
if (!wp_verify_nonce($_POST['nonce'], 'save_github_token')) {
    wp_die('Security check failed');
}

// Capability 체크
if (!current_user_can('manage_options')) {
    wp_die('Permission denied');
}
```

### 3. URL 검증

```php
// GitHub API URL만 허용
if (strpos($package, 'api.github.com') === false) {
    return new WP_Error('invalid_url', 'Invalid download URL');
}
```

---

## 테스트 방법

### 1. 로컬 테스트 환경 구축

```bash
# 1. WordPress 설치
# 2. 플러그인 활성화
# 3. GitHub 저장소 생성 (Public 또는 Private)
```

### 2. 릴리스 생성 테스트

```bash
# GitHub 웹사이트에서
# 1. Releases → Draft a new release
# 2. Tag: v1.0.1 (현재 버전보다 높게)
# 3. Title: Version 1.0.1
# 4. Description: Release notes
# 5. Publish release
```

### 3. 업데이트 확인 테스트

```bash
# WordPress Admin
# 1. 플러그인 페이지 방문
# 2. 업데이트 알림 표시 확인
# 3. "세부 정보 보기" 클릭 → 릴리스 노트 확인

# 강제 확인 (캐시 무시)
/wp-admin/plugins.php?force_check_update=1
```

### 4. 다운로드 및 설치 테스트

```bash
# 1. "지금 업데이트" 클릭
# 2. 다운로드 진행 확인
# 3. 설치 완료 메시지 확인
# 4. 플러그인 버전 확인
# 5. 플러그인 활성화 상태 확인
```

### 5. Private 저장소 테스트

```bash
# 1. 저장소를 Private으로 변경
# 2. Token 없이 업데이트 시도 → 에러 확인
# 3. Token 입력
# 4. 업데이트 재시도 → 성공 확인
```

### 6. 디버깅 로그

```php
// wp-config.php에 추가
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);

// 플러그인 코드에 로그 추가
error_log('GitHub API Response: ' . print_r($release, true));

// 로그 위치: wp-content/debug.log
```

---

## 체크리스트

### 구현 완료 체크리스트

- [ ] 플러그인 헤더에 `GitHub Plugin URI` 추가
- [ ] 버전 상수 정의 (`YOUR_PLUGIN_VERSION`)
- [ ] `your_plugin_get_github_headers()` 함수 구현
- [ ] `your_plugin_check_for_updates()` 함수 구현 및 후크 등록
- [ ] `your_plugin_info()` 함수 구현 및 후크 등록
- [ ] `your_plugin_upgrader_pre_download()` 함수 구현 (Private 저장소)
- [ ] `your_plugin_fix_update_folder()` 함수 구현
- [ ] `your_plugin_save_active_state()` 함수 구현
- [ ] `your_plugin_restore_active_state()` 함수 구현
- [ ] `your_plugin_clear_update_cache()` 함수 구현
- [ ] 강제 업데이트 체크 URL 파라미터 추가
- [ ] 12시간 캐싱 시스템 구현
- [ ] GitHub Token 입력 UI 생성 (Private 저장소)
- [ ] 에러 메시지 한글화
- [ ] README.md 업데이트 가이드 작성

### 릴리스 체크리스트

- [ ] 플러그인 파일의 Version 헤더 업데이트
- [ ] 버전 상수 업데이트
- [ ] readme.txt의 Stable tag 업데이트
- [ ] Changelog 작성
- [ ] Git 커밋 및 푸시
- [ ] Git 태그 생성 (`git tag v1.0.0`)
- [ ] Git 태그 푸시 (`git push origin v1.0.0`)
- [ ] GitHub Releases 생성 (Draft → Publish)
- [ ] 테스트 사이트에서 자동 업데이트 테스트

### 테스트 체크리스트

- [ ] Public 저장소에서 업데이트 테스트
- [ ] Private 저장소에서 업데이트 테스트 (Token 없이 → 실패 확인)
- [ ] Private 저장소에서 업데이트 테스트 (Token 있음 → 성공 확인)
- [ ] 캐싱 동작 확인 (12시간)
- [ ] 강제 업데이트 체크 URL 테스트
- [ ] 플러그인 활성화 상태 유지 확인
- [ ] 폴더명 변경 확인
- [ ] "세부 정보 보기" 릴리스 노트 확인
- [ ] 에러 메시지 표시 확인

---

## 참고 링크

- [GitHub REST API - Releases](https://docs.github.com/en/rest/releases)
- [WordPress Plugin API](https://developer.wordpress.org/plugins/plugin-basics/)
- [WordPress HTTP API](https://developer.wordpress.org/plugins/http-api/)
- [WordPress Transients API](https://developer.wordpress.org/apis/transients/)
- [Semantic Versioning](https://semver.org/)

---

## 예제 코드 (완전한 구현)

전체 코드는 이 프로젝트의 `dasom-church-management.php` 파일을 참고하세요.

### 핵심 부분만 요약

```php
<?php
/**
 * Plugin Name: Your Plugin Name
 * Version: 1.0.0
 * GitHub Plugin URI: username/repository-name
 * GitHub Branch: main
 */

define('YOUR_PLUGIN_VERSION', '1.0.0');
define('YOUR_PLUGIN_FILE', __FILE__);

// 1. GitHub API 헤더
function your_plugin_get_github_headers() { /* ... */ }

// 2. 업데이트 체크
function your_plugin_check_for_updates($transient) { /* ... */ }
add_filter('pre_set_site_transient_update_plugins', 'your_plugin_check_for_updates');

// 3. 플러그인 정보
function your_plugin_info($result, $action, $args) { /* ... */ }
add_filter('plugins_api', 'your_plugin_info', 20, 3);

// 4. Private 저장소 다운로드 (필수!)
function your_plugin_upgrader_pre_download($reply, $package, $upgrader) { /* ... */ }
add_filter('upgrader_pre_download', 'your_plugin_upgrader_pre_download', 10, 3);

// 5. 폴더명 수정 (필수!)
function your_plugin_fix_update_folder($source, $remote_source, $upgrader, $hook_extra) { /* ... */ }
add_filter('upgrader_source_selection', 'your_plugin_fix_update_folder', 10, 4);

// 6. 활성화 상태 유지
function your_plugin_save_active_state($response, $hook_extra) { /* ... */ }
function your_plugin_restore_active_state($upgrader_object, $options) { /* ... */ }
add_filter('upgrader_pre_install', 'your_plugin_save_active_state', 10, 2);
add_action('upgrader_process_complete', 'your_plugin_restore_active_state', 20, 2);

// 7. 캐시 삭제
function your_plugin_clear_update_cache($upgrader_object, $options) { /* ... */ }
add_action('upgrader_process_complete', 'your_plugin_clear_update_cache', 10, 2);
```

---

## 패키징 및 배포 가이드

### 배포용 ZIP 파일 생성

WordPress 플러그인 업데이트는 **ZIP 파일**을 통해 이루어집니다. GitHub Release에 업로드된 ZIP 파일을 WordPress가 다운로드하여 설치합니다.

---

### 1. ZIP 파일에 포함할/제외할 파일

#### ✅ 포함해야 할 파일

```
your-plugin/
├── your-plugin.php           (메인 플러그인 파일)
├── readme.txt                (WordPress.org 표준 readme)
├── LICENSE                   (라이선스 파일)
├── includes/                 (플러그인 로직)
├── admin/                    (관리자 페이지)
├── public/                   (프론트엔드)
├── assets/                   (CSS, JS, 이미지)
├── languages/                (번역 파일)
└── uninstall.php            (삭제 시 정리 작업)
```

#### ❌ 제외해야 할 파일

```
# 개발 파일
.git/
.github/
.gitignore
.gitattributes

# IDE 설정
.vscode/
.idea/
*.sublime-*

# 테스트 파일
tests/
phpunit.xml
phpunit.xml.dist
.phpunit.result.cache

# 의존성 관리
composer.json
composer.lock
package.json
package-lock.json
node_modules/
vendor/          (프로덕션 필요 시 포함)

# 빌드 파일
/build/
/dist/
/tmp/

# 문서 (선택)
README.md        (개발자용, readme.txt는 포함)
CONTRIBUTING.md
CHANGELOG.md
*.md             (중요 가이드는 포함 고려)

# 환경 파일
.env
.env.local
docker-compose.yml

# OS 파일
.DS_Store
Thumbs.db
._*

# 로그
*.log
error_log
debug.log

# 스크립트 (선택)
bin/
scripts/
*.sh
*.ps1
```

---

### 2. 수동 패키징 방법

#### 방법 1: Git Archive (추천)

```bash
# 현재 커밋의 플러그인만 ZIP으로 추출
git archive --format=zip --prefix=your-plugin/ -o your-plugin-1.0.0.zip HEAD

# 특정 태그 기준으로 추출
git archive --format=zip --prefix=your-plugin/ -o your-plugin-1.0.0.zip v1.0.0
```

**장점:**
- `.gitignore` 파일 자동 제외
- Git에 추적되는 파일만 포함
- 매우 깨끗한 ZIP 생성

**단점:**
- `.gitignore`에 없는 불필요한 파일도 포함될 수 있음

#### 방법 2: ZIP 명령어 (세밀한 제어)

```bash
# 플러그인 폴더로 이동
cd /path/to/your-plugin

# ZIP 생성 (특정 파일/폴더 제외)
zip -r ../your-plugin-1.0.0.zip . \
  -x "*.git*" \
  -x "*node_modules/*" \
  -x "*vendor/*" \
  -x "*tests/*" \
  -x "*.md" \
  -x "*.sh" \
  -x "*.ps1" \
  -x "*composer.*" \
  -x "*package*.json" \
  -x "*.DS_Store" \
  -x "*phpunit.xml*" \
  -x "*.vscode/*" \
  -x "*.idea/*" \
  -x "*docker-compose.yml"

# Windows (PowerShell)
Compress-Archive -Path . -DestinationPath ..\your-plugin-1.0.0.zip
```

#### 방법 3: GUI 도구 사용

**macOS/Linux:**
- 플러그인 폴더를 복사하여 불필요한 파일 수동 삭제
- 폴더 우클릭 → "압축"

**Windows:**
- 플러그인 폴더를 복사하여 불필요한 파일 수동 삭제
- 폴더 우클릭 → "보내기" → "압축(ZIP) 폴더"

---

### 3. 자동화 스크립트

#### Bash 스크립트 (Linux/macOS)

```bash
#!/bin/bash
# build.sh - 플러그인 배포용 ZIP 생성 스크립트

# 설정
PLUGIN_SLUG="your-plugin"
VERSION=$(grep "Version:" ${PLUGIN_SLUG}.php | awk '{print $3}')
BUILD_DIR="build"
ZIP_NAME="${PLUGIN_SLUG}-${VERSION}.zip"

echo "🚀 Building ${PLUGIN_SLUG} v${VERSION}..."

# 빌드 디렉토리 생성
rm -rf ${BUILD_DIR}
mkdir -p ${BUILD_DIR}/${PLUGIN_SLUG}

# 필요한 파일 복사
echo "📦 Copying files..."
rsync -av --progress . ${BUILD_DIR}/${PLUGIN_SLUG} \
  --exclude .git \
  --exclude .github \
  --exclude .gitignore \
  --exclude .gitattributes \
  --exclude .vscode \
  --exclude .idea \
  --exclude .DS_Store \
  --exclude node_modules \
  --exclude vendor \
  --exclude tests \
  --exclude tmp \
  --exclude build \
  --exclude dist \
  --exclude composer.json \
  --exclude composer.lock \
  --exclude package.json \
  --exclude package-lock.json \
  --exclude phpunit.xml \
  --exclude phpunit.xml.dist \
  --exclude .phpunit.result.cache \
  --exclude docker-compose.yml \
  --exclude '*.sh' \
  --exclude '*.ps1' \
  --exclude '*.log' \
  --exclude '*.md'

# ZIP 생성
echo "🗜️  Creating ZIP file..."
cd ${BUILD_DIR}
zip -r ../${ZIP_NAME} ${PLUGIN_SLUG}
cd ..

# 정리
rm -rf ${BUILD_DIR}

echo "✅ Build complete: ${ZIP_NAME}"
echo "📊 Size: $(du -h ${ZIP_NAME} | cut -f1)"
```

**사용법:**
```bash
chmod +x build.sh
./build.sh
```

#### PowerShell 스크립트 (Windows)

```powershell
# build.ps1 - 플러그인 배포용 ZIP 생성 스크립트

$PluginSlug = "your-plugin"
$Version = (Select-String -Path "$PluginSlug.php" -Pattern "Version:\s*(.+)").Matches.Groups[1].Value.Trim()
$BuildDir = "build"
$ZipName = "$PluginSlug-$Version.zip"

Write-Host "🚀 Building $PluginSlug v$Version..." -ForegroundColor Green

# 빌드 디렉토리 생성
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }
New-Item -ItemType Directory -Path "$BuildDir\$PluginSlug" | Out-Null

# 제외할 항목
$Exclude = @(
    ".git", ".github", ".gitignore", ".gitattributes",
    ".vscode", ".idea", ".DS_Store",
    "node_modules", "vendor", "tests", "tmp", "build", "dist",
    "composer.json", "composer.lock", "package.json", "package-lock.json",
    "phpunit.xml", "phpunit.xml.dist", ".phpunit.result.cache",
    "docker-compose.yml", "*.sh", "*.ps1", "*.log", "*.md"
)

# 파일 복사
Write-Host "📦 Copying files..." -ForegroundColor Yellow
Get-ChildItem -Path . -Exclude $Exclude | Copy-Item -Destination "$BuildDir\$PluginSlug" -Recurse -Force

# ZIP 생성
Write-Host "🗜️  Creating ZIP file..." -ForegroundColor Yellow
Compress-Archive -Path "$BuildDir\$PluginSlug" -DestinationPath $ZipName -Force

# 정리
Remove-Item -Recurse -Force $BuildDir

Write-Host "✅ Build complete: $ZipName" -ForegroundColor Green
Write-Host "📊 Size: $((Get-Item $ZipName).Length / 1MB) MB" -ForegroundColor Cyan
```

**사용법:**
```powershell
.\build.ps1
```

#### GitHub Actions 자동화 (권장)

```yaml
# .github/workflows/release.yml
name: Create Release Package

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Get version from tag
      id: get_version
      run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
    
    - name: Create distribution ZIP
      run: |
        mkdir -p build
        rsync -av --progress . build/your-plugin \
          --exclude .git \
          --exclude .github \
          --exclude .gitignore \
          --exclude .vscode \
          --exclude .idea \
          --exclude .DS_Store \
          --exclude node_modules \
          --exclude vendor \
          --exclude tests \
          --exclude build \
          --exclude '*.sh' \
          --exclude '*.md' \
          --exclude phpunit.xml \
          --exclude composer.json \
          --exclude package.json \
          --exclude docker-compose.yml
        cd build
        zip -r ../your-plugin-${{ steps.get_version.outputs.VERSION }}.zip your-plugin
    
    - name: Create GitHub Release
      uses: softprops/action-gh-release@v1
      with:
        files: your-plugin-*.zip
        body: |
          ## Version ${{ steps.get_version.outputs.VERSION }}
          
          ### Changes
          - See CHANGELOG.md for details
          
          ### Installation
          1. Download the ZIP file
          2. Go to WordPress Admin → Plugins → Add New → Upload Plugin
          3. Upload and activate
        draft: false
        prerelease: false
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**작동 방식:**
1. `git tag v1.0.0` → `git push origin v1.0.0`
2. GitHub Actions가 자동으로 ZIP 생성
3. GitHub Release 자동 생성
4. ZIP 파일 자동 업로드

---

### 4. .gitattributes 활용 (추천)

`.gitattributes` 파일로 `git archive` 시 제외할 파일 지정:

```gitattributes
# .gitattributes
# git archive 시 자동 제외할 파일/폴더

.git* export-ignore
.github/ export-ignore
.vscode/ export-ignore
.idea/ export-ignore
.DS_Store export-ignore
tests/ export-ignore
bin/ export-ignore
node_modules/ export-ignore
vendor/ export-ignore
composer.json export-ignore
composer.lock export-ignore
package.json export-ignore
package-lock.json export-ignore
phpunit.xml export-ignore
phpunit.xml.dist export-ignore
docker-compose.yml export-ignore
*.sh export-ignore
*.ps1 export-ignore
*.md export-ignore
README.md export-ignore
```

**사용:**
```bash
git archive --format=zip --prefix=your-plugin/ -o your-plugin-1.0.0.zip HEAD
```

---

### 5. ZIP 파일 구조 검증

생성된 ZIP 파일의 구조를 확인하세요:

```bash
# ZIP 내용 확인
unzip -l your-plugin-1.0.0.zip

# 또는
zipinfo your-plugin-1.0.0.zip
```

**올바른 구조:**
```
your-plugin-1.0.0.zip
└── your-plugin/
    ├── your-plugin.php
    ├── readme.txt
    ├── LICENSE
    ├── includes/
    ├── admin/
    ├── assets/
    └── ...
```

**❌ 잘못된 구조:**
```
# 루트에 바로 파일 (폴더 없음)
your-plugin-1.0.0.zip
├── your-plugin.php
├── readme.txt
└── ...

# 중복 폴더
your-plugin-1.0.0.zip
└── your-plugin/
    └── your-plugin/
        └── ...
```

---

### 6. GitHub Release 생성

#### 방법 1: GitHub 웹사이트

```bash
1. GitHub 저장소로 이동
2. Releases → "Draft a new release" 클릭
3. 입력 사항:
   - Tag: v1.0.0 (새 태그 생성 또는 기존 태그 선택)
   - Release title: Version 1.0.0 또는 v1.0.0 - Feature Description
   - Description: 릴리스 노트 작성 (Markdown 지원)
   - Attach binaries: 생성한 ZIP 파일 업로드
4. "Publish release" 클릭
```

**릴리스 노트 예시:**
```markdown
## v1.0.0 - Initial Release

### Features
- ✨ User authentication system
- 📊 Dashboard with analytics
- 🎨 Customizable themes

### Improvements
- ⚡ 50% faster page load
- 🔒 Enhanced security measures

### Bug Fixes
- 🐛 Fixed login redirect issue
- 🐛 Resolved CSS conflict with theme

### Technical
- Requires WordPress 5.8+
- Requires PHP 7.4+
- Tested up to WordPress 6.8
```

#### 방법 2: GitHub CLI

```bash
# GitHub CLI 설치 (https://cli.github.com/)
# macOS
brew install gh

# Windows
winget install GitHub.cli

# 인증
gh auth login

# 릴리스 생성
gh release create v1.0.0 \
  your-plugin-1.0.0.zip \
  --title "Version 1.0.0" \
  --notes "See CHANGELOG.md for details"
```

#### 방법 3: Git 명령어

```bash
# 1. 로컬에서 태그 생성
git tag -a v1.0.0 -m "Version 1.0.0 - Initial Release"

# 2. 태그 푸시
git push origin v1.0.0

# 3. GitHub 웹사이트에서 Release 생성 (위 방법 1)
```

---

### 7. 완전 자동화 워크플로우 (권장)

#### 전체 프로세스

```bash
# 1. 코드 완성 및 테스트
git add .
git commit -m "feat: Add new feature"
git push origin main

# 2. 버전 업데이트
# - your-plugin.php의 Version 헤더 업데이트
# - readme.txt의 Stable tag 업데이트
# - CHANGELOG.md 작성

# 3. 태그 생성
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 4. GitHub Actions가 자동으로:
#    - ZIP 파일 생성
#    - GitHub Release 생성
#    - ZIP 파일 업로드

# 5. WordPress 사이트에서 자동 업데이트 알림 표시
```

#### package.json Scripts (선택)

```json
{
  "name": "your-plugin",
  "version": "1.0.0",
  "scripts": {
    "build": "bash build.sh",
    "release": "npm version patch && git push && git push --tags",
    "release:minor": "npm version minor && git push && git push --tags",
    "release:major": "npm version major && git push && git push --tags"
  }
}
```

**사용:**
```bash
npm run release        # 1.0.0 → 1.0.1 (patch)
npm run release:minor  # 1.0.0 → 1.1.0 (minor)
npm run release:major  # 1.0.0 → 2.0.0 (major)
```

---

### 8. 배포 전 체크리스트

#### 코드 체크
- [ ] 모든 기능이 정상 작동하는지 테스트
- [ ] PHP 에러/경고 없음 (WP_DEBUG = true)
- [ ] JavaScript 콘솔 에러 없음
- [ ] 다양한 브라우저에서 테스트 (Chrome, Firefox, Safari)
- [ ] 모바일 반응형 확인

#### 버전 체크
- [ ] 플러그인 헤더의 Version 업데이트
- [ ] 버전 상수 업데이트 (`define('PLUGIN_VERSION', '1.0.0')`)
- [ ] readme.txt의 Stable tag 업데이트
- [ ] Changelog 작성 (readme.txt 또는 CHANGELOG.md)

#### 문서 체크
- [ ] README.md 업데이트
- [ ] readme.txt 업데이트 (WordPress 표준)
- [ ] 스크린샷 업데이트 (필요 시)
- [ ] 릴리스 노트 작성

#### 파일 체크
- [ ] 불필요한 파일 제거 (console.log, 테스트 코드, 주석)
- [ ] 민감한 정보 제거 (API 키, 비밀번호, 이메일)
- [ ] 라이선스 파일 포함
- [ ] 번역 파일 업데이트 (.pot 파일)

#### 호환성 체크
- [ ] 최소 WordPress 버전 확인 (Requires at least)
- [ ] 최신 WordPress 버전 테스트 (Tested up to)
- [ ] 최소 PHP 버전 확인 (Requires PHP)
- [ ] 주요 테마와 호환성 테스트
- [ ] 주요 플러그인과 충돌 없음 (Elementor, WooCommerce 등)

#### 보안 체크
- [ ] 모든 사용자 입력 sanitize
- [ ] 모든 출력 escape
- [ ] Nonce 검증 (폼 제출)
- [ ] Capability 체크 (권한 확인)
- [ ] SQL Injection 방지 (prepare 사용)

#### ZIP 파일 체크
- [ ] 올바른 폴더 구조 (플러그인명/파일들)
- [ ] 불필요한 파일 제외됨 (.git, node_modules 등)
- [ ] ZIP 파일명 형식: `plugin-name-1.0.0.zip`
- [ ] ZIP 파일 크기 확인 (대용량 파일 없음)

#### Git 체크
- [ ] 모든 변경사항 커밋됨
- [ ] 태그 생성 (`git tag v1.0.0`)
- [ ] 태그 푸시 (`git push origin v1.0.0`)

#### GitHub Release 체크
- [ ] Release 생성 완료
- [ ] ZIP 파일 업로드됨
- [ ] 릴리스 노트 작성됨
- [ ] Published 상태 (Draft 아님)

#### 최종 테스트
- [ ] ZIP 파일 다운로드 및 압축 해제 테스트
- [ ] 깨끗한 WordPress에 설치 테스트
- [ ] 자동 업데이트 알림 표시 확인
- [ ] 실제 업데이트 테스트 완료

---

### 9. 배포 후 확인사항

```bash
# 1. GitHub Release 확인
https://github.com/username/repo/releases/latest

# 2. ZIP 다운로드 가능 확인
curl -I https://github.com/username/repo/releases/download/v1.0.0/plugin-1.0.0.zip

# 3. GitHub API 확인
curl https://api.github.com/repos/username/repo/releases/latest

# 4. WordPress 사이트에서 업데이트 확인
# - 플러그인 페이지 방문
# - 업데이트 알림 표시 확인
# - "세부 정보 보기" 클릭하여 릴리스 노트 확인
# - "지금 업데이트" 클릭하여 설치 테스트
```

---

### 10. 문제 해결

#### 문제: ZIP 파일이 너무 큼

**원인:**
- node_modules, vendor 포함
- 대용량 이미지 파일
- 테스트 파일 포함

**해결:**
```bash
# ZIP 내용 확인
unzip -l plugin.zip | sort -k4 -rn | head -20

# 큰 파일 제외
--exclude "node_modules/*" \
--exclude "vendor/*" \
--exclude "*.psd" \
--exclude "*.ai"
```

#### 문제: GitHub Release ZIP과 자동 생성 ZIP 충돌

**설명:**
- GitHub는 자동으로 Source code (zip) 생성
- 우리는 수동으로 플러그인 ZIP 업로드
- WordPress는 수동 업로드한 ZIP 사용

**해결:**
- `upgrader_pre_download`에서 zipball_url 사용
- 또는 Releases Assets의 첫 번째 ZIP 사용

#### 문제: 폴더 구조가 잘못됨

**원인:**
- ZIP 루트에 폴더 없음
- 중복 폴더 구조

**해결:**
```bash
# 올바른 구조로 ZIP 생성
cd /path/to/plugins
zip -r plugin-1.0.0.zip plugin-name/

# 잘못된 방법 (X)
cd plugin-name
zip -r ../plugin-1.0.0.zip .  # 폴더 없이 파일만
```

---

### 11. 고급 팁

#### Composer Dependencies 포함

```bash
# 프로덕션 의존성만 설치
composer install --no-dev --optimize-autoloader

# vendor 폴더 포함하여 ZIP 생성
zip -r plugin.zip plugin/ --include "plugin/vendor/*"
```

#### 빌드 단계 포함 (Webpack/Gulp)

```bash
#!/bin/bash
# build-with-compile.sh

# 1. 의존성 설치
npm ci

# 2. 자산 빌드 (CSS/JS 압축)
npm run build

# 3. Composer 설치
composer install --no-dev

# 4. ZIP 생성
zip -r plugin.zip plugin/ \
  --exclude "*node_modules/*" \
  --exclude "*src/*" \
  --exclude "*webpack.config.js"
```

#### 다중 환경 빌드

```bash
# 개발용 (모든 파일 포함)
npm run build:dev

# 프로덕션용 (최적화, 불필요한 파일 제외)
npm run build:prod

# 디버그용 (소스맵 포함)
npm run build:debug
```

---

### 12. 참고 자료

- [WordPress Plugin Handbook](https://developer.wordpress.org/plugins/)
- [Git Archive Documentation](https://git-scm.com/docs/git-archive)
- [GitHub Releases Documentation](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

## 마무리

이 가이드는 실제 운영 중인 플러그인에서 사용하는 방법을 바탕으로 작성되었습니다.

### 주요 장점

1. **Public/Private 저장소 모두 지원** - GitHub Token으로 비공개 저장소 접근
2. **완벽한 WordPress 통합** - WordPress 플러그인 페이지에서 기본 플러그인처럼 업데이트
3. **안정성** - 캐싱, 에러 핸들링, 폴더명 수정, 활성화 상태 유지
4. **사용자 경험** - "지금 업데이트" 버튼 클릭만으로 자동 업데이트
5. **자동화된 배포** - GitHub Actions로 완전 자동화 가능

### 권장 워크플로우

```bash
# 개발
git add . && git commit -m "feat: New feature"
git push

# 릴리스 (완전 자동화)
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions가 자동으로:
# 1. ZIP 파일 생성
# 2. GitHub Release 생성
# 3. WordPress 자동 업데이트 활성화
```

### 추가 개선 아이디어

- **자동 백업**: 업데이트 전 플러그인 파일 백업
- **롤백 기능**: 이전 버전으로 되돌리기
- **업데이트 로그**: 업데이트 이력 저장
- **Beta 채널**: 베타 버전 선택적 업데이트
- **알림 시스템**: 새 버전 릴리스 시 이메일 알림
- **A/B 테스팅**: 점진적 배포 (10% → 50% → 100%)
- **자동 버전 bump**: package.json과 플러그인 헤더 동기화

---

**작성일:** 2025-10-21  
**버전:** 1.1.0  
**프로젝트:** DW Church Management System  
**작성자:** Cursor AI Assistant

