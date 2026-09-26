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
git push -u origin main

Write-Host ""
Write-Host "Done. Your code is on GitHub at:" -ForegroundColor Green
Write-Host $RepoUrl
