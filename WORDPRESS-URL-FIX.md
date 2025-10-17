# WordPress URL 설정 문제 해결

## 🐛 문제
PDF 링크가 `http://0.0.5.88/`로 연결됨 (잘못된 URL)

## 원인
WordPress 설정에서 Site URL이 잘못 설정되어 있음

---

## ✅ 해결 방법

### 방법 1: WordPress 관리자에서 수정

1. **WordPress 관리자 로그인**
2. **설정 (Settings) → 일반 (General)**
3. 다음 두 항목 확인 및 수정:

```
WordPress 주소 (URL):    http://johnk574.sg-host.com
사이트 주소 (URL):       http://johnk574.sg-host.com
```

4. **변경사항 저장**

---

### 방법 2: wp-config.php에서 강제 설정

만약 관리자 화면에서 변경할 수 없다면:

1. **wp-config.php 파일 열기**
2. **다음 코드 추가** (/* That's all, stop editing! */ 위에):

```php
/**
 * WordPress URL 강제 설정
 */
define('WP_HOME', 'http://johnk574.sg-host.com');
define('WP_SITEURL', 'http://johnk574.sg-host.com');
```

3. **파일 저장**
4. **사이트 새로고침**

---

### 방법 3: 데이터베이스에서 직접 수정

phpMyAdmin 또는 MySQL로 접속:

```sql
UPDATE wp_options 
SET option_value = 'http://johnk574.sg-host.com' 
WHERE option_name = 'siteurl';

UPDATE wp_options 
SET option_value = 'http://johnk574.sg-host.com' 
WHERE option_name = 'home';
```

---

## 🔍 현재 설정 확인

WordPress 관리자 → 설정 → 일반에서 확인:

- ❌ **잘못된 설정:** `http://0.0.5.88`
- ✅ **올바른 설정:** `http://johnk574.sg-host.com`

---

## 📝 참고

이 문제는 플러그인이 아닌 **WordPress 기본 설정** 문제입니다.

플러그인 코드:
```php
$url = wp_get_attachment_url($pdf);  // WordPress 함수 사용
```

WordPress의 `wp_get_attachment_url()` 함수는 Site URL 설정을 기반으로 URL을 생성합니다.

---

## ✅ 수정 후 확인

1. 교회주보 목록에서 PDF 링크 클릭
2. 올바른 URL로 연결되는지 확인:
   - ✅ `http://johnk574.sg-host.com/wp-content/uploads/...`
   - ❌ `http://0.0.5.88/...`

