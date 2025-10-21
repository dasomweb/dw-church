# DW Church Management System - Testing Guide

## 테스트 환경 설정

### 1. 사전 요구사항

- PHP 7.4 이상
- Composer
- MySQL 또는 MariaDB
- Git

### 2. 설치

#### Composer 의존성 설치
```bash
composer install
```

#### WordPress 테스트 라이브러리 설치
```bash
bash bin/install-wp-tests.sh wordpress_test root 'password' localhost latest
```

**파라미터 설명:**
- `wordpress_test`: 테스트 데이터베이스 이름
- `root`: MySQL 사용자명
- `password`: MySQL 비밀번호
- `localhost`: MySQL 호스트
- `latest`: WordPress 버전 (latest, 6.3, 6.4 등)

### 3. 테스트 실행

#### 전체 테스트 실행
```bash
vendor/bin/phpunit
```

또는

```bash
composer test
```

#### 특정 테스트 파일 실행
```bash
vendor/bin/phpunit tests/test-plugin.php
```

#### 코드 커버리지 리포트 생성
```bash
composer test:coverage
```

커버리지 리포트는 `coverage/` 디렉토리에 HTML 형식으로 생성됩니다.

## 테스트 구조

```
tests/
├── bootstrap.php                  # PHPUnit 부트스트랩
├── test-plugin.php                # 기본 플러그인 테스트
├── test-custom-post-types.php     # 커스텀 포스트 타입 테스트
├── test-meta-boxes.php            # 메타 박스 테스트
├── test-widgets.php               # Elementor 위젯 테스트
└── test-helper-functions.php      # 헬퍼 함수 테스트
```

## 작성된 테스트

### 1. Plugin Tests (`test-plugin.php`)
- ✅ 플러그인 상수 정의 확인
- ✅ 플러그인 버전 형식 검증
- ✅ 플러그인 활성화 함수 존재 확인

### 2. Custom Post Types Tests (`test-custom-post-types.php`)
- ✅ Bulletin 포스트 타입 등록 확인
- ✅ Sermon 포스트 타입 등록 확인
- ✅ Column 포스트 타입 등록 확인
- ✅ Album 포스트 타입 등록 확인
- ✅ Banner 포스트 타입 등록 확인
- ✅ Event 포스트 타입 등록 확인
- ✅ 포스트 타입 capabilities 테스트
- ✅ 포스트 타입 supports 테스트

### 3. Meta Boxes Tests (`test-meta-boxes.php`)
- ✅ Bulletin 메타 저장/불러오기
- ✅ Sermon 메타 저장/불러오기
- ✅ Event 메타 저장/불러오기
- ✅ Banner 메타 저장/불러오기

### 4. Widgets Tests (`test-widgets.php`)
- ✅ 위젯 파일 존재 확인
- ✅ 위젯 클래스 존재 확인

### 5. Helper Functions Tests (`test-helper-functions.php`)
- ✅ 헬퍼 함수 파일 존재 확인
- ✅ 날짜 포맷팅 함수 테스트
- ✅ URL 검증 테스트
- ✅ 이스케이핑 함수 테스트

## GitHub Actions CI/CD

GitHub Actions를 통해 자동으로 테스트가 실행됩니다.

### 테스트 매트릭스
- **PHP 버전**: 7.4, 8.0, 8.1, 8.2
- **WordPress 버전**: latest, 6.3, 6.4

### CI/CD 워크플로우
- Push to `main` 브랜치 시 자동 실행
- Pull Request 생성 시 자동 실행

## 새로운 테스트 추가하기

### 1. 새 테스트 파일 생성
```php
<?php
/**
 * Class Test_Your_Feature
 *
 * @package Dasom_Church
 */

class Test_Your_Feature extends WP_UnitTestCase {
    
    public function test_something() {
        $this->assertTrue(true);
    }
}
```

### 2. 테스트 명명 규칙
- 파일명: `test-{feature-name}.php`
- 클래스명: `Test_{Feature_Name}`
- 메서드명: `test_{what_it_tests}`

### 3. Assertions 예제

```php
// 동일성 테스트
$this->assertEquals($expected, $actual);
$this->assertSame($expected, $actual); // 타입까지 동일

// 참/거짓 테스트
$this->assertTrue($condition);
$this->assertFalse($condition);

// 존재 확인
$this->assertNotNull($variable);
$this->assertEmpty($array);
$this->assertNotEmpty($array);

// 문자열 테스트
$this->assertStringContainsString('needle', 'haystack');
$this->assertMatchesRegularExpression('/pattern/', $string);

// 배열 테스트
$this->assertArrayHasKey('key', $array);
$this->assertCount(5, $array);

// 파일 테스트
$this->assertFileExists($path);
```

## 트러블슈팅

### 테스트 DB 연결 실패
```bash
# MySQL이 실행 중인지 확인
mysql -u root -p

# 테스트 DB 수동 생성
mysql -u root -p -e "CREATE DATABASE wordpress_test;"
```

### WordPress 테스트 라이브러리 재설치
```bash
rm -rf /tmp/wordpress-tests-lib /tmp/wordpress
bash bin/install-wp-tests.sh wordpress_test root 'password' localhost latest
```

### PHP 메모리 부족
```bash
# php.ini 수정 또는 환경변수 설정
php -d memory_limit=256M vendor/bin/phpunit
```

## 추가 리소스

- [WordPress Plugin Unit Tests](https://make.wordpress.org/cli/handbook/plugin-unit-tests/)
- [PHPUnit Documentation](https://phpunit.de/documentation.html)
- [WP_UnitTestCase Reference](https://developer.wordpress.org/reference/classes/wp_unittestcase/)

