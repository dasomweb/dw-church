# Quick Edit Status 필드 문제 해결

## 문제 개요

WordPress 관리자 페이지에서 설교(sermon) 포스트 타입의 Quick Edit 기능을 사용할 때, Status 필드에 "Published" 옵션이 표시되지 않거나 올바르게 선택되지 않는 문제가 발생했습니다.

## 문제 증상

1. Quick Edit를 열었을 때 Status 필드에 "Published" 옵션이 보이지 않음
2. Published 상태인 포스트인데도 Status 필드에 "Scheduled" 또는 다른 상태가 표시됨
3. Status 필드의 값이 null로 반환됨

## 문제 원인

### 1. 중복 옵션 문제
- Status select에 같은 값의 옵션이 여러 개 존재
- 예: `publish:Published`가 여러 개, `future:Scheduled`가 여러 개
- WordPress가 Quick Edit를 동적으로 생성하면서 중복 옵션이 생김

### 2. 여러 옵션이 selected 상태
- 여러 옵션이 동시에 selected 상태
- jQuery의 `.val()` 메서드가 여러 옵션이 selected일 때 null을 반환

### 3. jQuery와 Native DOM 불일치
- `ensurePublishedOption()` 함수가 jQuery로 `publish` 옵션을 추가
- 하지만 Native DOM에는 반영되지 않음
- `selectElement.selectedIndex`로 선택하려고 해도 옵션이 없어서 실패

## 해결 방법

### 1. 중복 옵션 제거
```javascript
// 중복 옵션 제거 (같은 value를 가진 옵션 중 첫 번째만 유지)
var seenValues = {};
statusSelect.find('option').each(function() {
    var opt = $(this);
    var val = opt.val();
    if (seenValues[val]) {
        opt.remove(); // 중복 옵션 제거
    } else {
        seenValues[val] = true;
    }
});
```

### 2. 모든 옵션 unselect
```javascript
// 선택하기 전에 모든 옵션을 unselect
statusSelect.find('option').prop('selected', false);
```

### 3. Native DOM에 직접 publish 옵션 추가
```javascript
// Native DOM에 publish 옵션이 없으면 직접 추가
if (targetIndex < 0 && targetStatus === 'publish') {
    var publishOption = document.createElement('option');
    publishOption.value = 'publish';
    publishOption.text = 'Published';
    // 맨 앞에 삽입
    selectElement.insertBefore(publishOption, selectElement.options[0]);
    targetIndex = 0;
}
```

### 4. Native DOM API 사용
```javascript
// jQuery .val() 대신 Native DOM API 사용
selectElement.selectedIndex = targetIndex;
```

## 최종 해결 코드

```javascript
// 1. 중복 옵션 제거
var seenValues = {};
statusSelect.find('option').each(function() {
    var opt = $(this);
    var val = opt.val();
    if (seenValues[val]) {
        opt.remove();
    } else {
        seenValues[val] = true;
    }
});

// 2. ensurePublishedOption() 호출
ensurePublishedOption();

// 3. Native DOM 요소 재조회
statusSelect = $('select[name="_status"]');
var selectElement = statusSelect[0];

// 4. 모든 옵션 unselect
statusSelect.find('option').prop('selected', false);

// 5. 타겟 옵션 인덱스 찾기
var targetIndex = -1;
for (var i = 0; i < selectElement.options.length; i++) {
    if (selectElement.options[i].value === targetStatus) {
        targetIndex = i;
        break;
    }
}

// 6. Native DOM에 publish 옵션이 없으면 직접 추가
if (targetIndex < 0 && targetStatus === 'publish') {
    var publishOption = document.createElement('option');
    publishOption.value = 'publish';
    publishOption.text = 'Published';
    selectElement.insertBefore(publishOption, selectElement.options[0]);
    targetIndex = 0;
}

// 7. Native DOM API로 선택
if (targetIndex >= 0) {
    selectElement.selectedIndex = targetIndex;
    statusSelect.trigger('change');
}
```

## 핵심 포인트

1. **WordPress Quick Edit의 동적 생성**: Status select는 동적으로 생성되므로 jQuery와 Native DOM이 동기화되지 않을 수 있음

2. **Native DOM API 사용**: jQuery `.val()` 대신 Native DOM API (`selectedIndex`, `insertBefore`)를 직접 사용하는 것이 더 안정적

3. **중복 옵션 처리**: 중복 옵션과 여러 selected 상태를 정리한 후 선택해야 함

4. **옵션 추가**: jQuery로 추가한 옵션이 Native DOM에 반영되지 않을 수 있으므로, 필요시 Native DOM에 직접 추가

## 관련 파일

- `admin/class-dw-church-columns.php` - Quick Edit 스크립트가 포함된 파일
- `dasom_church_get_quick_edit_script()` 함수 - Quick Edit JavaScript 코드

## 버전 정보

- 문제 발견: v2.64.x
- 해결 완료: v2.65.5
- 최종 수정일: 2025-01-XX

## 참고사항

이 문제는 WordPress의 Quick Edit 기능이 동적으로 생성되는 특성 때문에 발생했습니다. jQuery와 Native DOM의 동기화 문제를 해결하기 위해 Native DOM API를 직접 사용하는 방식으로 해결했습니다.

