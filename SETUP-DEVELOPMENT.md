# 개발 환경 설정 가이드

## Windows 환경에서 개발 환경 설정하기

### 1. PHP 설치

#### 방법 A: XAMPP 사용 (추천)
1. [XAMPP 다운로드](https://www.apachefriends.org/download.html)
2. 설치 후 시스템 환경 변수에 PHP 경로 추가:
   ```
   C:\xampp\php
   ```

#### 방법 B: PHP 직접 설치
1. [PHP 다운로드](https://windows.php.net/download/)
2. ZIP 파일 압축 해제
3. 시스템 환경 변수 PATH에 PHP 경로 추가

**환경 변수 설정 방법:**
1. `시스템 속성` → `고급` → `환경 변수`
2. `시스템 변수`에서 `Path` 선택 → `편집`
3. `새로 만들기` → PHP 경로 입력 (예: `C:\xampp\php`)
4. 확인 후 PowerShell 재시작

**설치 확인:**
```powershell
php --version
```

### 2. Composer 설치

1. [Composer 다운로드](https://getcomposer.org/Composer-Setup.exe)
2. 설치 프로그램 실행
3. PHP 경로 자동 감지 또는 수동 입력
4. 설치 완료

**설치 확인:**
```powershell
composer --version
```

### 3. MySQL 설치 (테스트용)

#### XAMPP 사용 시:
- XAMPP Control Panel에서 MySQL 시작

#### 별도 설치:
1. [MySQL 다운로드](https://dev.mysql.com/downloads/installer/)
2. 설치 중 root 비밀번호 설정

### 4. 프로젝트 의존성 설치

```powershell
# 프로젝트 디렉토리로 이동
cd H:\GitHub\dasom-church-management-system

# Composer 의존성 설치
composer install
```

### 5. WordPress 테스트 환경 설정

#### Git Bash 사용 (추천)
```bash
# Git Bash 열기
bash bin/install-wp-tests.sh wordpress_test root '' localhost latest
```

#### PowerShell 사용
```powershell
# WSL 또는 Git Bash 필요
# 또는 수동으로 WordPress 테스트 라이브러리 다운로드
```

**파라미터 설명:**
- `wordpress_test`: 테스트 DB 이름
- `root`: MySQL 사용자명
- `''`: MySQL 비밀번호 (비어있으면 빈 문자열)
- `localhost`: MySQL 호스트
- `latest`: WordPress 버전

### 6. 테스트 실행

```powershell
# 전체 테스트 실행
vendor/bin/phpunit

# 또는
composer test

# 특정 테스트만 실행
vendor/bin/phpunit tests/test-plugin.php

# Windows에서 vendor/bin이 작동하지 않으면:
php vendor/phpunit/phpunit/phpunit
```

---

## 대안: Docker 사용 (권장)

Docker를 사용하면 PHP, MySQL 등을 별도로 설치할 필요가 없습니다.

### 1. Docker Desktop 설치
[Docker Desktop 다운로드](https://www.docker.com/products/docker-desktop/)

### 2. docker-compose.yml 파일 사용

```yaml
version: '3.8'

services:
  php:
    image: php:7.4-cli
    volumes:
      - .:/app
    working_dir: /app
    command: tail -f /dev/null
  
  mysql:
    image: mysql:5.7
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: wordpress_test
    ports:
      - "3306:3306"
```

### 3. Docker로 테스트 실행

```powershell
# 컨테이너 시작
docker-compose up -d

# PHP 컨테이너에서 테스트 실행
docker-compose exec php composer install
docker-compose exec php vendor/bin/phpunit

# 완료 후 정리
docker-compose down
```

---

## 가장 간단한 방법: GitHub Actions 사용

로컬 환경 설정이 번거롭다면, GitHub에 push하면 자동으로 테스트가 실행됩니다!

### 확인 방법:
1. GitHub 저장소로 이동
2. `Actions` 탭 클릭
3. 최신 워크플로우 실행 결과 확인

### 장점:
✅ 로컬 환경 설정 불필요
✅ 여러 PHP 버전에서 자동 테스트 (7.4, 8.0, 8.1, 8.2)
✅ 여러 WordPress 버전에서 자동 테스트
✅ Pull Request 시 자동 검증

---

## 트러블슈팅

### PHP 명령어를 찾을 수 없음
```powershell
# 환경 변수 확인
$env:Path -split ';' | Select-String php

# PowerShell 재시작
```

### Composer를 찾을 수 없음
```powershell
# Composer 재설치 또는
# composer.phar 직접 다운로드
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php
php composer.phar install
```

### MySQL 연결 실패
```powershell
# MySQL 서비스 시작 (XAMPP)
# 또는
net start MySQL80

# 연결 테스트
mysql -u root -p
```

### Windows에서 bash 스크립트 실행 불가
**해결책 1: Git Bash 사용**
```bash
# Git Bash 설치
# https://git-scm.com/downloads
bash bin/install-wp-tests.sh wordpress_test root '' localhost latest
```

**해결책 2: WSL (Windows Subsystem for Linux) 사용**
```bash
wsl
bash bin/install-wp-tests.sh wordpress_test root '' localhost latest
```

---

## 빠른 시작 (추천 순서)

### ✅ 초보자 - GitHub Actions
1. 코드 commit & push
2. GitHub Actions 탭에서 결과 확인

### ✅ 중급자 - XAMPP + Composer
1. XAMPP 설치
2. Composer 설치
3. `composer install`
4. Git Bash에서 테스트 환경 설치
5. `vendor/bin/phpunit`

### ✅ 고급자 - Docker
1. Docker Desktop 설치
2. `docker-compose up -d`
3. `docker-compose exec php composer install`
4. `docker-compose exec php vendor/bin/phpunit`

---

## 추가 도움말

문제가 계속 발생하면:
1. [PHP 설치 가이드](https://www.php.net/manual/en/install.windows.php)
2. [Composer 문서](https://getcomposer.org/doc/)
3. [WordPress 테스트 가이드](https://make.wordpress.org/cli/handbook/plugin-unit-tests/)

