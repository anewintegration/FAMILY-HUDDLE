# push-to-github.ps1
#
# Run this from inside the unzipped family-dashboard folder in PowerShell.
# Before running: create an EMPTY repository on GitHub (no README, no .gitignore,
# no license - just the bare repo) and copy its URL, e.g.:
#   https://github.com/yourusername/family-dashboard.git
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

# 1. Confirm git is installed
Write-Step "Checking for git"
try {
    git --version | Out-Null
} catch {
    Write-Host "Git isn't installed or isn't on your PATH." -ForegroundColor Red
    Write-Host "Install it from https://git-scm.com/download/win and re-run this script."
    exit 1
}

# 2. Confirm we're in the right folder
if (-not (Test-Path ".\package.json")) {
    Write-Host "Couldn't find package.json in this folder." -ForegroundColor Red
    Write-Host "Run this script from inside the unzipped family-dashboard folder."
    exit 1
}

# 3. Initialize git if this isn't already a repo
if (-not (Test-Path ".\.git")) {
    Write-Step "Initializing git repository"
    git init
    git branch -M main
} else {
    Write-Step "Git repository already initialized"
}

# 4. Stage and commit
Write-Step "Staging files"
git add .

$hasChanges = git status --porcelain
if ($hasChanges) {
    Write-Step "Committing"
    git commit -m "Family dashboard"
} else {
    Write-Host "Nothing new to commit." -ForegroundColor Yellow
}

# 5. Set or update the remote
Write-Step "Setting remote origin"
$existingRemote = git remote 2>$null
if ($existingRemote -contains "origin") {
    git remote set-url origin $RepoUrl
} else {
    git remote add origin $RepoUrl
}

# 6. Push
Write-Step "Pushing to GitHub"
git push -u origin main

Write-Host ""
Write-Host "Done. Your code is on GitHub at:" -ForegroundColor Green
Write-Host $RepoUrl
Write-Host ""
Write-Host "Next: go to Render, create a Postgres database, then a Web Service" -ForegroundColor Green
Write-Host "connected to this GitHub repo. See README.md for the exact settings."
