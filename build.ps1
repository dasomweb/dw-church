# build.ps1 - DW Church Management System 배포용 ZIP 생성 스크립트

$PluginSlug = "DW Church"
$Version = (Select-String -Path "dasom-church-management.php" -Pattern "Version:\s*(.+)").Matches.Groups[1].Value.Trim()
$BuildDir = "build"
$ZipName = "DW-Church-Management-System-$Version.zip"

Write-Host "🚀 Building $PluginSlug v$Version..." -ForegroundColor Green

# 빌드 디렉토리 생성
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }
New-Item -ItemType Directory -Path "$BuildDir\$PluginSlug" | Out-Null

# 제외할 항목
$Exclude = @(
    ".git", ".github", ".gitignore", ".gitattributes",
    ".vscode", ".idea", ".DS_Store",
    "node_modules", "vendor", "tests", "tmp", "build", "dist", "bin",
    "composer.json", "composer.lock", "package.json", "package-lock.json",
    "phpunit.xml", "phpunit.xml.dist", ".phpunit.result.cache",
    "docker-compose.yml",
    "build.sh", "build.ps1", "*.ps1", "*.log",
    "README.md", "CONTRIBUTING.md", "SETUP-DEVELOPMENT.md", "README-TESTING.md",
    "WORDPRESS-URL-FIX.md", "ELEMENTOR-CACHE-CLEAR-GUIDE.md", "MIGRATION-GUIDE.md",
    "WORDPRESS-PLUGIN-AUTO-UPDATE-GUIDE.md",
    "check-github-status.ps1", "check-widget-version.php", "clear-elementor-cache.php",
    "debug-banner-meta.php", "force-reload-widgets.php",
    "run-tests.ps1", "verify-tests.ps1"
)

# 파일 복사
Write-Host "📦 Copying files..." -ForegroundColor Yellow
Get-ChildItem -Path . | Where-Object {
    $item = $_
    $excluded = $false
    foreach ($pattern in $Exclude) {
        if ($item.Name -like $pattern) {
            $excluded = $true
            break
        }
    }
    -not $excluded
} | Copy-Item -Destination "$BuildDir\$PluginSlug" -Recurse -Force

# ZIP 생성
Write-Host "🗜️  Creating ZIP file..." -ForegroundColor Yellow
Compress-Archive -Path "$BuildDir\$PluginSlug" -DestinationPath $ZipName -Force

# 정리
Remove-Item -Recurse -Force $BuildDir

Write-Host "✅ Build complete: $ZipName" -ForegroundColor Green
Write-Host "📊 Size: $([math]::Round((Get-Item $ZipName).Length / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 ZIP 파일이 생성되었습니다!" -ForegroundColor Green
Write-Host "🚀 GitHub Release에 업로드하여 배포하세요." -ForegroundColor Green

