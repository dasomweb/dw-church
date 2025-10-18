# Elementor 위젯이 업데이트 안될 때 해결 방법

## 문제
플러그인을 v1.18.2 이상으로 업데이트했는데 Banner Slider와 Banner Grid 위젯에서 Query 설정이 보이지 않는 경우

## 원인
Elementor가 위젯 설정을 캐시하기 때문에 플러그인 업데이트 후에도 이전 버전의 컨트롤이 표시될 수 있습니다.

## 해결 방법

### 방법 1: WordPress 관리자에서 캐시 클리어 (권장)

1. **WordPress 관리자** → **Elementor** → **도구** → **캐시 재생성**
2. "캐시 재생성" 버튼 클릭
3. Elementor 편집기 새로고침 (`Ctrl + Shift + R`)

### 방법 2: 수동으로 캐시 클리어

1. FTP 또는 파일 관리자로 접속
2. 다음 폴더 삭제:
   - `/wp-content/uploads/elementor/css/`
   - `/wp-content/cache/` (있는 경우)
3. WordPress 관리자 → **설정** → **퍼머링크** 페이지 열고 "변경사항 저장" 클릭
4. Elementor 편집기 새로고침

### 방법 3: 스크립트 사용 (고급)

1. 루트 폴더에 있는 `clear-elementor-cache.php` 파일을 WordPress 설치 루트 디렉토리에 업로드
2. 브라우저에서 `https://your-site.com/clear-elementor-cache.php` 접속
3. 안내에 따라 진행
4. **완료 후 반드시 파일 삭제!**

### 방법 4: 위젯 재추가

1. Elementor 편집기에서 기존 Banner 위젯 삭제
2. 새로 위젯 추가
3. 왼쪽 패널에서 다음 섹션 확인:
   - **Banner Slider**: "Settings" 섹션
   - **Banner Grid**: "Query Settings" 섹션

## Query 컨트롤 위치

### DW Banner Slider
**Settings 섹션**에서 다음 항목 확인:
- Banner Category (배너 카테고리)
- Number of Banners (배너 개수)
- Order (정렬 순서: ASC/DESC)
- Order By (정렬 기준: Date/Title/Random/Menu Order)
- Autoplay (자동재생)
- Navigation (네비게이션 표시)
- Pagination (페이지네이션 표시)

### DW Banner Grid
**Query Settings 섹션**에서 다음 항목 확인:
- Banner Category (배너 카테고리)
- Number of Banners (배너 개수)
- Order (정렬 순서: ASC/DESC)
- Order By (정렬 기준: Date/Title/Random/Menu Order)

**Layout Settings 섹션**:
- Columns (열 개수)
- Column Gap (열 간격)
- Row Gap (행 간격)

## 플러그인 버전 확인

WordPress 관리자 → 플러그인 페이지에서 "DW Church Management System" 버전이 **1.18.2 이상**인지 확인하세요.

- v1.18.2: Query 컨트롤 추가
- v1.18.3: "No banners found" 버그 수정
- v1.18.4: 날짜 필터링 로직 개선

## 여전히 문제가 있다면

1. **플러그인 완전 재설치**:
   - 플러그인 비활성화
   - 플러그인 삭제
   - GitHub에서 최신 버전 다운로드 및 재설치

2. **PHP 오류 로그 확인**:
   ```php
   // wp-config.php에 추가
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   ```
   
3. **브라우저 콘솔 확인**:
   - F12 → Console 탭에서 JavaScript 오류 확인

## 참고
Elementor는 성능 최적화를 위해 위젯 설정을 적극적으로 캐시합니다. 플러그인 업데이트 후에는 항상 캐시를 클리어하는 것이 좋습니다.

