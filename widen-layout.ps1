# widen-layout.ps1
#
# Run this from inside your existing family-dashboard folder (the same one
# you've been pushing from). It replaces the narrow max-w-3xl container
# width with max-w-6xl across all the relevant files, then you push as usual.
#
# Usage:
#   .\widen-layout.ps1

$ErrorActionPreference = "Stop"

$files = Get-ChildItem -Path .\src -Recurse -Include *.tsx | Select-String -Pattern "max-w-3xl" -List | Select-Object -ExpandProperty Path

if (-not $files) {
    Write-Host "No files found containing max-w-3xl - it may already be fixed." -ForegroundColor Yellow
    exit 0
}

foreach ($file in $files) {
    (Get-Content $file -Raw) -replace "max-w-3xl", "max-w-6xl" | Set-Content $file -NoNewline
    Write-Host "Updated: $file" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done. Now push with:" -ForegroundColor Cyan
Write-Host '.\push-to-github.ps1 -RepoUrl "https://github.com/anewintegration/FAMILY-HUDDLE.git"'
