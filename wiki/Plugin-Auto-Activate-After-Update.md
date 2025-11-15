# 플러그인 업데이트 후 자동 활성화 유지

## 개요

DW Church 플러그인은 업데이트 후에도 활성화 상태를 자동으로 유지합니다. 이는 두 가지 메커니즘을 통해 구현되었습니다:

1. **활성 상태 저장 및 복원 함수**
2. **폴더 이름 수정 시 활성 플러그인 옵션 업데이트**

---

## 1. 활성 상태 저장 및 복원 함수

### `dw_church_save_active_state`

업데이트 **이전**에 플러그인이 활성화되어 있었는지 확인하고 저장합니다.

**위치**: `dw-church.php` (line 497-505)

```php
/**
 * 플러그인 업데이트 전에 활성 상태를 저장하는 함수
 * 
 * @param mixed $response WordPress upgrader 응답 객체
 * @param array $hook_extra 업데이트 관련 추가 정보 (플러그인 경로 등 포함)
 * @return mixed 원본 $response 객체 반환
 */
function dw_church_save_active_state($response, $hook_extra) {
    // 업데이트 대상이 현재 플러그인인지 확인
    // $hook_extra['plugin']에 플러그인 경로가 포함되어 있음 (예: 'dw-church/dw-church.php')
    if (isset($hook_extra['plugin']) && $hook_extra['plugin'] === plugin_basename(__FILE__)) {
        // WordPress 옵션에서 현재 활성화된 플러그인 목록 가져오기
        $active_plugins = get_option('active_plugins', array());
        
        // 현재 플러그인이 활성화되어 있는지 확인
        if (in_array(plugin_basename(__FILE__), $active_plugins)) {
            // 활성화되어 있다면 transient에 상태 저장 (5분간 유효)
            // 5분(300초)은 업데이트가 완료될 때까지 충분한 시간
            set_transient('dw_church_was_active', true, 300); // 5 minutes
        }
    }
    // 원본 응답 객체를 그대로 반환 (다른 플러그인에 영향을 주지 않음)
    return $response;
}
```

**작동 방식**:
- WordPress의 `upgrader_pre_install` 필터에 연결됨
- 업데이트 대상 플러그인이 현재 활성화되어 있는지 확인
- 활성화되어 있다면 `dw_church_was_active` transient에 `true` 저장 (5분간 유효)

### `dw_church_restore_active_state`

업데이트 **이후**에 저장된 활성 상태를 확인하고 복원합니다.

**위치**: `dw-church.php` (line 513-527)

```php
/**
 * 플러그인 업데이트 후 저장된 활성 상태를 복원하는 함수
 * 
 * @param object $upgrader_object WordPress Upgrader 객체
 * @param array $options 업데이트 옵션 (action, type, plugins 등 포함)
 * @return void
 */
function dw_church_restore_active_state($upgrader_object, $options) {
    // 업데이트 액션이고 플러그인 타입인지 확인
    if ($options['action'] === 'update' && $options['type'] === 'plugin') {
        // 업데이트된 플러그인 목록이 있는지 확인
        if (isset($options['plugins'])) {
            // 업데이트된 각 플러그인을 순회
            foreach ($options['plugins'] as $plugin) {
                // 현재 플러그인이 업데이트된 플러그인 목록에 있는지 확인
                if ($plugin === plugin_basename(__FILE__)) {
                    // 업데이트 전에 저장된 활성 상태 확인
                    // transient에 'dw_church_was_active' 값이 있으면 업데이트 전에 활성화되어 있었던 것
                    if (get_transient('dw_church_was_active')) {
                        // transient 삭제 (한 번만 사용)
                        delete_transient('dw_church_was_active');
                        // 플러그인 자동 활성화
                        // activate_plugin(플러그인경로, 리다이렉트URL, 네트워크활성화여부, silent모드)
                        // silent 모드(true)로 설정하여 리다이렉트 없이 조용히 활성화
                        activate_plugin($plugin, '', false, true);
                    }
                }
            }
        }
    }
}
```

**작동 방식**:
- WordPress의 `upgrader_process_complete` 액션에 연결됨
- 업데이트 완료 후 `dw_church_was_active` transient 확인
- 저장된 값이 `true`이면 `activate_plugin()` 함수로 플러그인 자동 활성화

---

## 2. 폴더 이름 수정 시 활성 플러그인 옵션 업데이트

### `dw_church_fix_folder_name`

플러그인 폴더 이름이 잘못된 경우 (예: 해시가 붙은 경우) 올바른 이름으로 변경하고, 활성 플러그인 옵션도 함께 업데이트합니다.

**위치**: `dw-church.php` (line 898-1014)

**주요 기능**:

1. **잘못된 폴더 이름 감지**
   - `dasomweb-dasom-church-management-system-*`
   - `dasom-church-management-system-*`
   - `dw-church-management-system-*`
   - 기타 해시가 붙은 폴더 이름

2. **폴더 이름 변경**
   - 잘못된 이름 → `dw-church`로 변경

3. **활성 플러그인 옵션 업데이트**
   ```php
   // WordPress 옵션에서 현재 활성화된 플러그인 목록 가져오기
   // active_plugins 옵션은 배열 형태로 플러그인 경로들을 저장 (예: ['dw-church/dw-church.php'])
   $active_plugins = get_option('active_plugins', array());
   
   // 이전 폴더 이름과 새 폴더 이름으로 플러그인 경로 생성
   // 예: 'dasomweb-dasom-church-management-system-abc123/dw-church.php' → 'dw-church/dw-church.php'
   $old_plugin_path = basename($source_dir) . '/dw-church.php';
   $new_plugin_path = 'dw-church/dw-church.php';
   
   // 활성 플러그인 목록을 순회하며 경로 업데이트
   foreach ($active_plugins as $key => $plugin_path) {
       // 이전 경로와 정확히 일치하거나, 이전 폴더 이름으로 시작하는 경로 찾기
       // strpos()로 체크하여 하위 경로도 포함 (예: 'old-folder/dw-church.php', 'old-folder/sub/file.php')
       if ($plugin_path === $old_plugin_path || strpos($plugin_path, basename($source_dir) . '/') === 0) {
           // 새로운 경로로 업데이트
           $active_plugins[$key] = $new_plugin_path;
       }
   }
   
   // 중복 제거 후 옵션 업데이트
   // array_unique()로 중복된 경로 제거 (같은 플러그인이 여러 번 등록되는 것을 방지)
   update_option('active_plugins', array_unique($active_plugins));
   ```

4. **멀티사이트 지원**
   - `active_sitewide_plugins` 옵션도 업데이트

---

## 작동 흐름

### 시나리오 1: 정상 업데이트

1. 사용자가 플러그인 업데이트 시작
2. `dw_church_save_active_state` 실행 → 활성 상태 저장
3. WordPress가 플러그인 업데이트 수행
4. `dw_church_restore_active_state` 실행 → 자동 활성화
5. **결과**: 플러그인이 활성화 상태 유지 ✅

### 시나리오 2: 폴더 이름 변경이 필요한 경우

1. 플러그인 설치/업데이트 시 잘못된 폴더 이름으로 설치됨
2. `dw_church_fix_folder_name` 실행 (init 액션)
3. 폴더 이름을 `dw-church`로 변경
4. 활성 플러그인 옵션의 경로도 업데이트
5. **결과**: 플러그인이 올바른 경로로 활성화 상태 유지 ✅

---

## 필터/액션 연결

이 기능들은 다음 WordPress 훅에 연결되어 있습니다:

```php
// 활성 상태 저장 (업데이트 전)
// WordPress의 upgrader_pre_install 필터에 연결
// 우선순위 10, 2개의 파라미터 ($response, $hook_extra) 전달
add_filter('upgrader_pre_install', 'dw_church_save_active_state', 10, 2);

// 활성 상태 복원 (업데이트 후)
// WordPress의 upgrader_process_complete 액션에 연결
// 우선순위 20 (다른 플러그인보다 나중에 실행), 2개의 파라미터 전달
add_action('upgrader_process_complete', 'dw_church_restore_active_state', 20, 2);

// 폴더 이름 수정 (초기화 시)
// WordPress의 init 액션에 연결 (페이지 로드 시 실행)
add_action('init', function() {
    // transient 키 설정 (중복 실행 방지용)
    $transient_key = 'dw_church_folder_fix_run';
    
    // transient가 없으면 (이전에 실행되지 않았으면) 폴더 이름 수정 실행
    // 이렇게 하면 매 요청마다 실행되는 것을 방지하고 1시간에 한 번만 실행
    if (!get_transient($transient_key)) {
        // 폴더 이름 수정 함수 호출
        dw_church_fix_folder_name();
        // transient 설정 (1시간 유효) - 다음 실행까지 1시간 대기
        set_transient($transient_key, true, HOUR_IN_SECONDS);
    }
});
```

---

## 주의사항

1. **Transient 유효 시간**: 활성 상태는 5분간만 저장됩니다. 업데이트가 5분 이상 걸리면 복원되지 않을 수 있습니다.
2. **Multisite 지원**: 멀티사이트 환경에서도 정상 작동합니다.
3. **폴더 이름 수정**: `init` 액션에서 실행되므로 매 요청마다 실행되지 않도록 transient로 제어합니다.

---

## 관련 파일

- `dw-church.php` - 메인 플러그인 파일
  - Line 320-322: 필터/액션 등록
  - Line 497-505: `dw_church_save_active_state` 함수
  - Line 513-527: `dw_church_restore_active_state` 함수
  - Line 898-1014: `dw_church_fix_folder_name` 함수
  - Line 1017-1023: init 액션 연결

---

## 버전 정보

이 기능은 v2.62.13 이후 버전에서 안정적으로 작동합니다.

