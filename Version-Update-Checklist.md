# 플러그인 버전 업데이트 체크리스트

## 중요: 버전 불일치 방지

플러그인 버전을 업데이트할 때 **반드시 다음 세 곳을 모두 업데이트**해야 합니다. 하나라도 빠뜨리면 버전 불일치로 인해 업데이트 감지 및 활성화 문제가 발생할 수 있습니다.

---

## 필수 업데이트 위치

### 1. Plugin Header (dw-church.php)

**위치**: `dw-church.php` 파일의 맨 위 (line 5)

```php
/**
 * Plugin Name: DW Church
 * Description: DW Church Management System
 * Version: 2.62.XX  ← 여기 업데이트
 * Author: DasomWeb
 * ...
 */
```

### 2. Version Constant (dw-church.php)

**위치**: `dw-church.php` 파일 내부 (line 37)

```php
define('DASOM_CHURCH_VERSION', '2.62.XX');  ← 여기 업데이트
```

### 3. Readme.txt Stable Tag

**위치**: `readme.txt` 파일 (line 8)

```
Stable tag: 2.62.XX  ← 여기 업데이트
```

---

## 버전 업데이트 체크리스트

버전 업데이트 시 다음 순서로 확인하세요:

- [ ] `dw-church.php` - Plugin Header `Version:` 업데이트
- [ ] `dw-church.php` - `DASOM_CHURCH_VERSION` 상수 업데이트
- [ ] `readme.txt` - `Stable tag:` 업데이트
- [ ] `readme.txt` - Changelog 섹션에 새 버전 항목 추가
- [ ] 세 곳 모두 **동일한 버전 번호**인지 확인

---

## 버전 불일치로 인한 문제

만약 버전이 일치하지 않으면:

1. **업데이트 감지 실패**: WordPress가 새 버전을 감지하지 못함
2. **활성화 문제**: 업데이트 후 플러그인이 비활성화될 수 있음
3. **마이그레이션 실패**: 버전 비교 로직이 제대로 작동하지 않음
4. **캐시 문제**: 업데이트 캐시가 올바르게 갱신되지 않음

---

## 버전 확인 방법

릴리즈 전에 다음 명령어로 버전이 일치하는지 확인하세요:

```bash
# dw-church.php에서 버전 확인
grep -E "Version:|DASOM_CHURCH_VERSION" dw-church.php

# readme.txt에서 버전 확인
grep "Stable tag:" readme.txt
```

출력 결과에서 세 곳의 버전 번호가 모두 동일한지 확인하세요.

---

## 예시: 버전 2.62.30 업데이트

### 1. dw-church.php (Plugin Header)
```php
 * Version: 2.62.30
```

### 2. dw-church.php (Version Constant)
```php
define('DASOM_CHURCH_VERSION', '2.62.30');
```

### 3. readme.txt (Stable Tag)
```
Stable tag: 2.62.30
```

### 4. readme.txt (Changelog)
```
== Changelog ==

= 2.62.30 =
* Fix: ...
```

---

## 주의사항

- **절대 한 곳만 업데이트하지 마세요**: 세 곳 모두 업데이트해야 합니다
- **버전 번호 오타 확인**: 세 곳 모두 정확히 같은 번호인지 확인
- **릴리즈 전 검증**: 커밋 전에 반드시 버전 일치 여부 확인

---

## 자동화 제안

향후 버전 업데이트를 자동화하려면:

1. 스크립트로 세 곳을 한 번에 업데이트
2. Git pre-commit hook으로 버전 일치 검증
3. CI/CD 파이프라인에서 버전 검증 단계 추가

---

## 결론

**버전 업데이트는 세 곳 모두 일치해야 합니다. 하나라도 빠뜨리면 업데이트 후 활성화 문제가 발생할 수 있습니다.**

항상 이 체크리스트를 확인하고 릴리즈하세요!





