# PowerShell script to run tests using Docker

Write-Host "🚀 DW Church Management System - Test Runner" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Host "✓ Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not installed" -ForegroundColor Red
    Write-Host "Please install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📦 Starting Docker containers..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "⏳ Waiting for MySQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "📥 Installing Composer dependencies..." -ForegroundColor Yellow
docker-compose exec -T php composer install --no-interaction

Write-Host ""
Write-Host "🔧 Setting up WordPress test environment..." -ForegroundColor Yellow
docker-compose exec -T php bash -c "
    apt-get update -qq && apt-get install -y -qq subversion mysql-client wget > /dev/null 2>&1
    bash bin/install-wp-tests.sh wordpress_test root root mysql latest
"

Write-Host ""
Write-Host "🧪 Running PHPUnit tests..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
docker-compose exec -T php vendor/bin/phpunit --colors=always

$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "✗ Some tests failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
docker-compose down

exit $exitCode

