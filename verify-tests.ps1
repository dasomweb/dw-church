# Simple verification script - No PHP required!
Write-Host ""
Write-Host "🔍 DW Church Management System - Test Files Verification" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0
$success = 0

# Check test files
$testFiles = @(
    "tests/bootstrap.php",
    "tests/test-plugin.php",
    "tests/test-custom-post-types.php",
    "tests/test-meta-boxes.php",
    "tests/test-widgets.php",
    "tests/test-helper-functions.php"
)

Write-Host "📁 Checking test files..." -ForegroundColor Yellow
foreach ($file in $testFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
        $success++
    } else {
        Write-Host "  ✗ $file - NOT FOUND" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""
Write-Host "📁 Checking configuration files..." -ForegroundColor Yellow

$configFiles = @(
    "phpunit.xml.dist",
    "composer.json",
    ".github/workflows/tests.yml",
    "docker-compose.yml",
    "bin/install-wp-tests.sh"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
        $success++
    } else {
        Write-Host "  ✗ $file - NOT FOUND" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""
Write-Host "📁 Checking widget files..." -ForegroundColor Yellow

$widgetFiles = @(
    "includes/widgets/elementor/class-dw-elementor-gallery-widget.php",
    "includes/widgets/elementor/class-dw-elementor-event-widget.php",
    "includes/widgets/elementor/class-dw-elementor-event-grid-widget.php",
    "includes/widgets/elementor/class-dw-elementor-banner-slider-widget.php",
    "includes/widgets/elementor/class-dw-elementor-recent-gallery-widget.php"
)

foreach ($file in $widgetFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
        $success++
    } else {
        Write-Host "  ✗ $file - NOT FOUND" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if ($errors -eq 0) {
    Write-Host "✅ All files verified! ($success files)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Check GitHub Actions for full test results:" -ForegroundColor White
    Write-Host "     https://github.com/dasomweb/dasom-church-management-system/actions" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  2. Or install Docker and run: .\run-tests.ps1" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ $errors file(s) missing!" -ForegroundColor Red
    Write-Host "   $success file(s) found." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✨ Test framework is ready to use!" -ForegroundColor Green
Write-Host ""

