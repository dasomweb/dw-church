# GitHub 릴리스 생성 가이드

## 자동 업데이트 작동 방식

이 플러그인은 GitHub Releases를 통해 자동 업데이트를 지원합니다. 새로운 버전을 릴리스하면 WordPress 관리자 페이지의 플러그인 목록에서 자동으로 업데이트 알림이 표시됩니다.

### Public vs Private Repository

- **Public Repository (공개 저장소)**: GitHub Token 없이 자동 업데이트 가능
- **Private Repository (비공개 저장소)**: GitHub Personal Access Token 필요

### Private Repository 설정 방법

비공개 저장소에서 자동 업데이트를 받으려면:

1. **GitHub Personal Access Token 생성**
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - "Generate new token (classic)" 클릭
   - Note: "DW Church Plugin Updates" 입력
   - Expiration: 만료 기간 선택 (권장: No expiration 또는 1 year)
   - Scopes: `repo` 체크 (Full control of private repositories)
   - "Generate token" 클릭 후 토큰 복사

2. **WordPress에 Token 등록**
   - WordPress 관리자 → DW 교회관리 → 설정 → 플러그인 설정
   - "GitHub Personal Access Token" 필드에 토큰 붙여넣기
   - "변경사항 저장" 클릭

3. **업데이트 확인**
   - 플러그인 페이지에서 자동으로 업데이트 확인
   - 또는 "업데이트 강제 확인" 버튼 클릭

## 릴리스 생성 방법

### 1. GitHub 저장소로 이동
https://github.com/dasomweb/dasom-church-management-system

### 2. Releases 페이지로 이동
- 오른쪽 사이드바에서 "Releases" 클릭
- 또는 직접 URL: https://github.com/dasomweb/dasom-church-management-system/releases

### 3. "Draft a new release" 클릭

### 4. 릴리스 정보 입력

#### Tag version (필수)
- 형식: `v1.3.2` (v 접두사 포함)
- 플러그인 버전과 동일하게 설정

#### Release title (선택)
- 예: `v1.3.2 - GitHub 자동 업데이트 기능 개선`

#### Description (권장)
릴리스 노트를 작성합니다. 이 내용은 WordPress 플러그인 업데이트 화면에서 "View details" 클릭 시 표시됩니다.

예시:
```markdown
## v1.3.2 - GitHub 자동 업데이트 기능 개선

### 주요 개선사항
- GitHub API 캐싱 구현 (12시간)
- User-Agent 헤더 추가로 API 안정성 향상
- 업데이트 후 자동 캐시 정리
- 플러그인 정보 상세 표시 개선

### 기능
- WordPress 플러그인 페이지에서 자동으로 업데이트 알림 표시
- 'View details' 링크로 릴리스 정보 확인 가능
- '지금 업데이트' 버튼으로 원클릭 업데이트

### 버그 수정
- GitHub 사용자명 오타 수정

### 기술적 개선
- PHPDoc 주석 추가
- 코드 품질 개선
```

### 5. "Publish release" 클릭

## 자동 업데이트 테스트

### 1. 캐시 강제 새로고침 (선택)
WordPress 관리자 URL에 다음 파라미터 추가:
```
/wp-admin/plugins.php?dasom_check_update=1
```

### 2. 플러그인 페이지 확인
- WordPress 관리자 → 플러그인
- "DW Church Management System" 아래에 업데이트 알림 표시 확인
- "새 버전 1.3.2 이용 가능" 메시지 확인

### 3. 업데이트 세부정보 확인
- "세부 정보 보기" 링크 클릭
- 릴리스 노트 표시 확인

### 4. 업데이트 실행
- "지금 업데이트" 버튼 클릭
- 자동으로 GitHub에서 다운로드 및 설치

## 자동 업데이트 시스템 특징

### 캐싱
- GitHub API 호출 결과를 12시간 동안 캐시
- 불필요한 API 호출 방지
- 업데이트 후 자동으로 캐시 정리

### 보안
- User-Agent 헤더로 WordPress 버전 정보 전송
- GitHub API v3 사용
- 15초 타임아웃 설정

### 호환성
- WordPress 5.8 이상
- PHP 7.4 이상
- WordPress 6.8 테스트 완료

## 문제 해결

### 업데이트가 표시되지 않는 경우

1. **캐시 정리**
   ```
   /wp-admin/plugins.php?dasom_check_update=1
   ```

2. **GitHub 릴리스 확인**
   - 릴리스가 "Published" 상태인지 확인
   - Tag 버전이 `v1.3.2` 형식인지 확인

3. **플러그인 버전 확인**
   - `dasom-church-management.php` 파일의 Version 헤더 확인
   - `DASOM_CHURCH_VERSION` 상수 확인

4. **GitHub API 응답 확인**
   ```
   https://api.github.com/repos/dasomweb/dasom-church-management-system/releases/latest
   ```

### 업데이트 실패 시

1. **수동 업데이트**
   - GitHub Releases에서 ZIP 파일 다운로드
   - WordPress 플러그인 업로드로 설치

2. **로그 확인**
   - WordPress 디버그 로그 확인
   - `WP_DEBUG` 및 `WP_DEBUG_LOG` 활성화

## 버전 관리 체크리스트

새 버전 릴리스 전 확인사항:

- [ ] `dasom-church-management.php`의 Version 헤더 업데이트
- [ ] `DASOM_CHURCH_VERSION` 상수 업데이트
- [ ] `readme.txt`의 Stable tag 업데이트
- [ ] Changelog 작성
- [ ] Git 커밋 및 푸시
- [ ] Git 태그 생성 및 푸시
- [ ] GitHub 릴리스 생성
- [ ] 테스트 사이트에서 자동 업데이트 테스트

## 참고 링크

- GitHub 저장소: https://github.com/dasomweb/dasom-church-management-system
- GitHub Releases: https://github.com/dasomweb/dasom-church-management-system/releases
- GitHub API 문서: https://docs.github.com/en/rest/releases
- WordPress Plugin API: https://developer.wordpress.org/plugins/plugin-basics/

