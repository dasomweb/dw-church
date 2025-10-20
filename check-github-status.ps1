# Check GitHub Actions workflow status
Write-Host ""
Write-Host "GitHub Actions Status Check" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Get latest commit info
$gitLog = git log -1 --pretty=format:"%h - %s (%cr)"
Write-Host "Latest Commit:" -ForegroundColor Yellow
Write-Host "  $gitLog" -ForegroundColor White
Write-Host ""

$commitHash = git rev-parse --short HEAD
Write-Host "Commit Hash: $commitHash" -ForegroundColor Yellow
Write-Host ""

# GitHub repository info
$remote = git config --get remote.origin.url
if ($remote -match 'github\.com[:/](.+?)\.git') {
    $repoPath = $matches[1]
    Write-Host "Repository: $repoPath" -ForegroundColor Yellow
    Write-Host ""
    
    $actionsUrl = "https://github.com/$repoPath/actions"
    $commitUrl = "https://github.com/$repoPath/commit/$commitHash"
    
    Write-Host "Links to Check:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  1. All Workflows:" -ForegroundColor Cyan
    Write-Host "     $actionsUrl" -ForegroundColor White
    Write-Host ""
    Write-Host "  2. This Commit:" -ForegroundColor Cyan
    Write-Host "     $commitUrl/checks" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Test Matrix (12 combinations):" -ForegroundColor Yellow
    Write-Host "  PHP 7.4, 8.0, 8.1, 8.2" -ForegroundColor White
    Write-Host "  x" -ForegroundColor White
    Write-Host "  WordPress latest, 6.3, 6.4" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Test Suites:" -ForegroundColor Yellow
    Write-Host "  Plugin Tests: 3 tests" -ForegroundColor White
    Write-Host "  Custom Post Types: 8 tests" -ForegroundColor White
    Write-Host "  Meta Boxes: 4 tests" -ForegroundColor White
    Write-Host "  Widgets: 2 tests" -ForegroundColor White
    Write-Host "  Helper Functions: 4 tests" -ForegroundColor White
    Write-Host "  ================================" -ForegroundColor DarkGray
    Write-Host "  Total: 21 tests per environment" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Tips:" -ForegroundColor Magenta
    Write-Host "  Workflow takes about 5-10 minutes" -ForegroundColor White
    Write-Host "  Green check = Test passed" -ForegroundColor Green
    Write-Host "  Red X = Test failed" -ForegroundColor Red
    Write-Host "  Orange dot = Running" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Opening browser..." -ForegroundColor Cyan
    Start-Process $actionsUrl
    
    Write-Host ""
    Write-Host "Browser opened!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Could not find GitHub repository info" -ForegroundColor Red
}

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""
