# push-to-github.ps1
#
# Run this from inside the family-dashboard folder in PowerShell.
#
# Usage:
#   .\push-to-github.ps1 -RepoUrl "https://github.com/yourusername/family-dashboard.git"

param(
    [Parameter(Mandatory = $true)]
    [string]$RepoUrl
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

Write-Step "Checking for git"
try {
    git --version | Out-Null
} catch {
    Write-Host "Git isn't installed or isn't on your PATH." -ForegroundColor Red
    Write-Host "Install it from https://git-scm.com/download/win and re-run this script."
    exit 1
}

if (-not (Test-Path ".\package.json")) {
    Write-Host "Couldn't find package.json in this folder." -ForegroundColor Red
    Write-Host "Run this script from inside the family-dashboard folder."
    exit 1
}

if (-not (Test-Path ".\.git")) {
    Write-Step "Initializing git repository"
    git init
    git branch -M main
} else {
    Write-Step "Git repository already initialized"
}

Write-Step "Staging files"
git add .

$hasChanges = git status --porcelain
if ($hasChanges) {
    Write-Step "Committing"
    git commit -m "Family dashboard"
} else {
    Write-Host "Nothing new to commit." -ForegroundColor Yellow
}

Write-Step "Setting remote origin"
$existingRemote = git remote 2>$null
if ($existingRemote -contains "origin") {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}

Write-Step "Pushing to GitHub"
$ErrorActionPreference = "Continue"
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "GitHub has an older copy of this project. Replacing it with this version..." -ForegroundColor Yellow
    git push -u origin main --force
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "PUSH FAILED - GitHub did NOT receive this version. Take a screenshot of the messages above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Done. GitHub received this version:" -ForegroundColor Green
Write-Host $RepoUrl
Write-Host "Render will now rebuild automatically (about 2-4 minutes)." -ForegroundColor Green
