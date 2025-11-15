# 교회앨범 이미지 개수 제한 및 검증

## 개요

DW Church 플러그인의 교회앨범(Album) 포스트 타입에서는 **최대 15개의 이미지**만 저장할 수 있습니다. 이 제한은 갤러리 로딩 속도 문제를 방지하기 위해 설정되었습니다.

이 기능은 **클라이언트 사이드(JavaScript)**와 **서버 사이드(PHP)** 두 곳에서 검증하여 사용자 경험과 데이터 무결성을 보장합니다.

---

## 이미지 개수 제한

### 제한 개수
- **최대 15개 이미지**
- 15개를 초과하면 저장이 차단됩니다.

### 제한 이유
- 갤러리 로딩 시 속도 문제 방지
- 사용자 경험 개선
- 서버 부하 감소

### 권장사항
사용자에게는 10-15개 정도로 제한하는 것을 권장합니다. 이 메시지는 앨범 이미지 업로드/선택 버튼 아래에 표시됩니다.

---

## 검증 메커니즘

### 1. 클라이언트 사이드 검증 (JavaScript)

**위치**: `assets/js/admin.js` (line 626-654)

**목적**: 폼 제출 전에 이미지 개수를 확인하여 사용자에게 즉시 피드백을 제공합니다.

#### 코드

```javascript
/**
 * 앨범 포스트 폼 제출 전 이미지 개수 검증
 * 폼이 제출되기 전에 실행되어 15개 초과 시 저장을 차단합니다.
 */
$('#post, #post-new').on('submit', function(e) {
    // 현재 편집 중인 포스트 타입 확인
    // #post_type은 숨겨진 input 필드로 포스트 타입을 저장 (예: 'album', 'sermon', 'bulletin')
    var postType = $('#post_type').val();
    
    // 앨범 포스트가 아니면 검증 건너뛰기
    // 다른 포스트 타입에는 이미지 개수 제한이 없으므로 바로 통과
    if (postType !== 'album') {
        return; // Not an album post
    }
    
    /**
     * CRITICAL: DOM preview에서 hidden input으로 동기화
     * 이 단계는 매우 중요합니다. hidden input은 때때로 최신 상태를 반영하지 않을 수 있지만,
     * DOM preview는 사용자가 실제로 화면에서 본 이미지 상태를 정확히 반영합니다.
     */
    var ids = []; // 이미지 ID를 저장할 배열
    
    // DOM에서 실제로 표시된 이미지 썸네일 목록 순회
    // li 요소의 data-id 속성에서 이미지 ID를 추출
    $('#dw_album_images_preview li, #dasom_album_images_preview li').each(function() {
        var id = $(this).data('id'); // data-id 속성에서 이미지 ID 가져오기
        if (id) {
            // ID를 문자열로 변환하여 배열에 추가
            // String() 변환은 ID가 숫자여도 문자열로 통일하여 일관성 유지
            ids.push(String(id));
        }
    });
    
    // DOM에서 읽은 이미지 ID 배열을 JSON 문자열로 변환하여 hidden input에 저장
    // 이렇게 하면 서버로 전송될 때 최신 상태의 이미지 목록이 전달됨
    $('#dw_album_images, #dasom_album_images').val(JSON.stringify(ids));
    
    /**
     * 이미지 개수 제한 검증
     * 15개를 초과하면 폼 제출을 완전히 차단합니다.
     */
    if (ids.length > 15) {
        // 폼 제출 기본 동작 방지 (이벤트 전파 중지)
        e.preventDefault();
        // 다른 이벤트 핸들러 실행도 중지 (우선순위 보장)
        e.stopImmediatePropagation();
        
        // 사용자에게 경고 메시지 표시
        // 한국어와 영어로 이중 언어 메시지 제공
        alert('앨범 이미지는 최대 15개까지만 저장할 수 있습니다. 현재 ' + ids.length + '개의 이미지가 선택되어 있습니다. 이미지를 제거하여 15개 이하로 줄여주세요.\n\n(Album images are limited to 15. Currently ' + ids.length + ' images are selected. Please remove images to reduce to 15 or less.)');
        
        // false 반환으로 추가 안전장치 (일부 브라우저에서 필요)
        return false;
    }
    // 15개 이하이면 검증 통과 - 폼 제출 계속 진행
});
```

#### 작동 방식

1. **이벤트 리스너**: `#post`, `#post-new` 폼의 `submit` 이벤트에 연결
2. **포스트 타입 확인**: 앨범 포스트인지 확인 (다른 포스트 타입은 건너뜀)
3. **DOM 동기화**: 실제 화면에 표시된 이미지(`#dw_album_images_preview li`)에서 이미지 ID를 읽어 hidden input에 동기화
4. **개수 확인**: 이미지 개수가 15개를 초과하는지 확인
5. **차단**: 초과 시 `e.preventDefault()`로 폼 제출 차단 및 alert 메시지 표시

#### 중요 포인트

- **DOM 우선**: hidden input보다 실제 DOM preview를 우선적으로 확인합니다.
- **동기화**: submit 전에 DOM 상태를 hidden input에 동기화하여 정확성을 보장합니다.
- **즉시 피드백**: 사용자가 저장 버튼을 클릭하면 즉시 경고를 표시합니다.

---

### 2. 서버 사이드 검증 (PHP)

**위치**: `admin/class-dw-church-meta-boxes.php` (line 1161-1212)

**목적**: 클라이언트 사이드 검증을 우회하더라도 서버에서 추가 검증을 수행하여 데이터 무결성을 보장합니다.

#### 코드

```php
/**
 * 앨범 이미지 메타 데이터 저장 및 검증
 * POST 데이터에서 이미지 목록을 받아 검증하고 저장합니다.
 */
if (isset($_POST['dw_album_images'])) {
    // WordPress가 자동으로 추가하는 슬래시 제거
    // wp_unslash()는 magic quotes를 처리하여 원본 JSON 문자열 복원
    $images_json = wp_unslash($_POST['dw_album_images']);
    
    /**
     * 빈 문자열 처리
     * 사용자가 모든 이미지를 제거한 경우를 처리
     */
    if (trim($images_json) === '') {
        $images = array(); // 빈 배열로 설정
    } else {
        // JSON 문자열을 PHP 배열로 디코딩
        // true 파라미터로 연관 배열이 아닌 일반 배열로 반환
        $images = json_decode($images_json, true);
        
        /**
         * JSON 파싱 에러 처리
         * 잘못된 JSON 형식이나 손상된 데이터를 안전하게 처리
         */
        if (json_last_error() !== JSON_ERROR_NONE) {
            // 에러 로그 기록 (디버깅용)
            // substr()로 처음 100자만 기록 (너무 긴 데이터 방지)
            error_log('DW Church Album: JSON decode error - ' . json_last_error_msg() . ' for value: ' . substr($images_json, 0, 100));
            // 빈 배열로 fallback하여 안전하게 처리
            $images = array();
        }
    }
    
    /**
     * 배열 타입 보장
     * json_decode()가 실패하거나 null을 반환할 수 있으므로 안전장치
     */
    if (!is_array($images)) {
        $images = array(); // 배열이 아니면 빈 배열로 설정
    }
    
    /**
     * 이미지 개수 제한 검증 (15개 초과 시 차단)
     * 클라이언트 사이드 검증을 우회해도 서버에서 차단합니다.
     */
    if (count($images) > 15) {
        /**
         * 에러 메시지를 transient에 저장
         * transient는 일시적으로 데이터를 저장하는 WordPress 메커니즘
         * 30초 후 자동으로 삭제됨 (30초면 충분히 사용자에게 표시 가능)
         */
        set_transient('dw_church_album_image_error_' . $post_id, sprintf(
            __('앨범 이미지 저장 실패: %d개의 이미지가 선택되어 있습니다. 최대 15개까지만 저장할 수 있습니다. 이미지를 제거하여 15개 이하로 줄여주세요.', 'dw-church'),
            count($images)
        ), 30);
        
        /**
         * 저장 차단 - 함수 종료
         * post meta는 업데이트하지 않지만, 포스트 자체는 저장될 수 있음
         * (이미지만 차단하고 포스트는 저장 가능)
         */
        return;
    }
    
    /**
     * 이미지 ID 정제 및 검증
     * 모든 값을 정수로 변환하고 유효한 값만 남김
     */
    // absint()로 모든 값을 양의 정수로 변환 (음수나 0 제거)
    $images = array_map('absint', $images);
    // array_filter()로 0 값 제거 (유효하지 않은 ID 제거)
    $images = array_filter($images);
    // array_values()로 배열 인덱스 재정렬 (0, 1, 2, ... 순서로)
    $images = array_values($images);
    
    /**
     * Post meta 업데이트
     * 빈 배열도 저장 (이전 이미지를 모두 제거한 경우)
     * wp_json_encode()로 JSON 문자열로 변환하여 저장
     */
    update_post_meta($post_id, 'dw_album_images', wp_json_encode($images));
    
    /**
     * 자동으로 첫 번째 이미지를 Featured Image로 설정
     * 수동으로 YouTube 썸네일을 설정하지 않은 경우에만 실행
     */
    $manual_youtube_thumb_id = get_post_meta($post_id, 'dw_album_thumb_id', true);
    // YouTube 썸네일이 없고 이미지가 있는 경우에만 실행
    if (!$manual_youtube_thumb_id && !empty($images)) {
        $first_image_id = intval($images[0]); // 첫 번째 이미지 ID 가져오기
        if ($first_image_id > 0) {
            // WordPress의 Featured Image로 설정
            // set_post_thumbnail()은 WordPress 코어 함수
            set_post_thumbnail($post_id, $first_image_id);
        }
    }
}
```

#### 작동 방식

1. **POST 데이터 확인**: `$_POST['dw_album_images']`가 존재하는지 확인
2. **JSON 파싱**: JSON 문자열을 배열로 변환 (에러 처리 포함)
3. **개수 확인**: 배열 길이가 15를 초과하는지 확인
4. **저장 차단**: 초과 시 post meta 저장을 차단하고 에러 메시지를 transient에 저장
5. **정상 저장**: 15개 이하일 때만 post meta 업데이트

#### 중요 포인트

- **이중 검증**: 클라이언트 사이드 검증을 우회해도 서버에서 차단합니다.
- **에러 처리**: JSON 파싱 실패 시에도 안전하게 처리합니다.
- **에러 메시지**: transient에 저장된 에러 메시지는 나중에 사용자에게 표시할 수 있습니다.
- **Post는 저장 가능**: 이미지가 저장되지 않더라도 포스트 자체는 저장될 수 있습니다 (이미지만 차단).

---

## 사용자 경험 흐름

### 시나리오 1: 정상 저장 (15개 이하)

1. 사용자가 이미지 선택 (15개 이하)
2. "Publish" 또는 "Update" 버튼 클릭
3. 클라이언트 사이드 검증 통과 ✅
4. 서버 사이드 검증 통과 ✅
5. 이미지가 정상적으로 저장됨 ✅

### 시나리오 2: 개수 초과 (16개 이상)

1. 사용자가 이미지 선택 (16개 이상)
2. "Publish" 또는 "Update" 버튼 클릭
3. 클라이언트 사이드 검증 실패 ❌
4. **Alert 메시지 표시**:
   ```
   앨범 이미지는 최대 15개까지만 저장할 수 있습니다. 
   현재 X개의 이미지가 선택되어 있습니다. 
   이미지를 제거하여 15개 이하로 줄여주세요.
   ```
5. 폼 제출 차단 → 사용자가 이미지 제거 후 다시 시도

### 시나리오 3: 클라이언트 검증 우회 시

1. 사용자가 JavaScript를 비활성화하거나 개발자 도구로 우회 시도
2. 폼 제출 성공
3. 서버 사이드 검증 실행
4. 15개 초과 감지 → 이미지 저장 차단
5. 포스트는 저장되지만 이미지는 저장되지 않음
6. 에러 메시지가 transient에 저장됨 (표시 가능)

---

## Alert 메시지

### 클라이언트 사이드 Alert

**언어**: 한국어 + 영어

**메시지**:
```
앨범 이미지는 최대 15개까지만 저장할 수 있습니다. 
현재 X개의 이미지가 선택되어 있습니다. 
이미지를 제거하여 15개 이하로 줄여주세요.

(Album images are limited to 15. 
Currently X images are selected. 
Please remove images to reduce to 15 or less.)
```

**표시 조건**: 
- 이미지 개수가 15개를 초과할 때
- 폼 submit 이벤트 발생 시

---

## 권장사항 메시지

앨범 이미지 업로드/선택 버튼 아래에 권장사항이 표시됩니다.

**위치**: `admin/class-dw-church-meta-boxes.php` (line 369-371)

```php
<!-- 
    권장사항 메시지 표시
    사용자에게 이미지 개수를 제한하는 것이 좋다는 것을 알림
    style 속성으로 회색 텍스트와 상단 여백 설정
-->
<p class="description" style="margin-top:8px; color:#666;">
    <?php 
    // _e() 함수는 번역 가능한 텍스트를 출력하고 번역
    // 두 번째 파라미터 'dw-church'는 텍스트 도메인 (번역 파일 식별용)
    _e('💡 권장사항: 이미지 개수는 10-15개 정도로 제한하는 것을 권장합니다. 이미지가 많을 경우 갤러리 로딩 시 속도 문제가 발생할 수 있습니다.', 'dw-church'); 
    ?>
</p>
```

**메시지**:
> 💡 권장사항: 이미지 개수는 10-15개 정도로 제한하는 것을 권장합니다. 이미지가 많을 경우 갤러리 로딩 시 속도 문제가 발생할 수 있습니다.

---

## 기술적 세부사항

### DOM 동기화의 중요성

클라이언트 사이드 검증에서 DOM preview를 우선적으로 사용하는 이유:

1. **정확성**: hidden input은 때때로 동기화되지 않을 수 있음
2. **실시간 반영**: 사용자가 썸네일을 삭제한 경우 DOM이 즉시 반영됨
3. **신뢰성**: 실제 화면에 표시된 이미지가 최종 상태를 반영

### JSON 파싱 에러 처리

서버 사이드에서 JSON 파싱 실패 시:

1. 에러 로그 기록
2. 빈 배열로 fallback
3. 저장 차단 대신 안전하게 처리

### Transient 사용

서버 사이드 검증 실패 시 에러 메시지를 transient에 저장:

- **키**: `dw_church_album_image_error_{$post_id}`
- **유효 시간**: 30초
- **용도**: 나중에 사용자에게 에러 메시지 표시 가능

---

## 관련 파일

### 클라이언트 사이드
- `assets/js/admin.js`
  - Line 626-654: 폼 제출 검증 로직
  - Line 328-343: 썸네일 삭제 시 hidden input 업데이트

### 서버 사이드
- `admin/class-dw-church-meta-boxes.php`
  - Line 1161-1212: `dasom_church_save_album_meta` 함수
  - Line 369-371: 권장사항 메시지
  - Line 367: Hidden input 필드

---

## 버전 정보

이 기능은 다음 버전에서 구현/개선되었습니다:

- **v2.62.13**: 초기 15개 제한 검증 구현
- **v2.62.14**: DOM 동기화 개선
- **v2.62.15**: JSON 파싱 에러 처리 강화, 저장 안정성 개선

---

## 문제 해결

### 문제: 15개 선택 후 저장이 안 됨

**원인**: DOM과 hidden input이 동기화되지 않음

**해결**: v2.62.15에서 submit 전 DOM 동기화 로직 추가

### 문제: 썸네일 삭제 후에도 검증 실패

**원인**: 썸네일 삭제 시 hidden input이 업데이트되지 않음

**해결**: submit 시점에 DOM에서 직접 개수를 세도록 개선

### 문제: JSON 파싱 실패로 저장 안 됨

**원인**: 잘못된 JSON 형식 또는 빈 문자열

**해결**: v2.62.15에서 JSON 파싱 에러 처리 및 fallback 로직 추가

---

## 참고사항

1. **15개 제한은 하드 리미트**: 15개를 초과하면 저장이 완전히 차단됩니다.
2. **포스트는 저장 가능**: 이미지만 차단되며 포스트 자체는 저장될 수 있습니다.
3. **멀티사이트 호환**: 멀티사이트 환경에서도 정상 작동합니다.
4. **JavaScript 필수**: 클라이언트 사이드 검증을 위해서는 JavaScript가 필요합니다 (서버 검증은 항상 작동).

