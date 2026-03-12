# DW Church Plugin - Local build script
# Creates build/dw-church/ and build/dw-church.zip (same structure as GitHub Actions)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$buildDir = Join-Path $root "build"
$pluginDir = Join-Path $buildDir "dw-church"
$zipPath = Join-Path $buildDir "dw-church.zip"

$exclude = @(
    ".git", ".github", "build", "node_modules", "*.zip", "*.log",
    "composer.json", "composer.lock", "package.json", "package-lock.json",
    ".gitignore", "README.md", "CHANGELOG.md", "build.ps1",
    ".DS_Store", "Thumbs.db", "dasomweb-dasom-church-management-system"
)

Write-Host "Building DW Church plugin..." -ForegroundColor Cyan
if (Test-Path $buildDir) { Remove-Item $buildDir -Recurse -Force }
New-Item -ItemType Directory -Path $pluginDir -Force | Out-Null

Get-ChildItem $root -Force | Where-Object {
    $name = $_.Name
    $skip = $false
    foreach ($e in $exclude) {
        if ($e.StartsWith("*")) { if ($name -like $e) { $skip = $true; break } }
        elseif ($name -eq $e -or $name -like "$e*") { $skip = $true; break }
    }
    $name -ne "build" -and -not $skip
} | ForEach-Object {
    $dest = Join-Path $pluginDir $_.Name
    if ($_.PSIsContainer) {
        Copy-Item $_.FullName $dest -Recurse -Force
    } else {
        Copy-Item $_.FullName $dest -Force
    }
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $pluginDir -DestinationPath $zipPath -CompressionLevel Optimal
$size = (Get-Item $zipPath).Length / 1MB
Write-Host "Done: $zipPath ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
