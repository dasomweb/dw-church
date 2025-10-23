#!/bin/bash
# build.sh - DW Church Management System 배포용 ZIP 생성 스크립트

# 설정
PLUGIN_SLUG="dasom-church-management-system"
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
  --exclude 'README.md' \
  --exclude 'CONTRIBUTING.md' \
  --exclude 'SETUP-DEVELOPMENT.md' \
  --exclude 'README-TESTING.md' \
  --exclude 'WORDPRESS-URL-FIX.md' \
  --exclude 'ELEMENTOR-CACHE-CLEAR-GUIDE.md' \
  --exclude 'MIGRATION-GUIDE.md' \
  --exclude 'WORDPRESS-PLUGIN-AUTO-UPDATE-GUIDE.md' \
  --exclude 'check-github-status.ps1' \
  --exclude 'check-widget-version.php' \
  --exclude 'clear-elementor-cache.php' \
  --exclude 'debug-banner-meta.php' \
  --exclude 'force-reload-widgets.php' \
  --exclude 'run-tests.ps1' \
  --exclude 'verify-tests.ps1' \
  --exclude 'bin'

# ZIP 생성
echo "🗜️  Creating ZIP file..."
cd ${BUILD_DIR}
zip -r ../${ZIP_NAME} ${PLUGIN_SLUG}
cd ..

# 정리
rm -rf ${BUILD_DIR}

echo "✅ Build complete: ${ZIP_NAME}"
echo "📊 Size: $(du -h ${ZIP_NAME} | cut -f1)"
echo ""
echo "📦 ZIP 파일이 생성되었습니다!"
echo "🚀 GitHub Release에 업로드하여 배포하세요."

