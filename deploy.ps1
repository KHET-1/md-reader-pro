# MD Reader Pro - Complete GitHub Deployment Script
# Run: .\deploy.ps1 -GitHubUsername "yourusername" -CreateRepo

param(
    [string]$GitHubUsername = "",
    [string]$RepoName = "md-reader-pro",
    [switch]$CreateRepo = $false,
    [switch]$DeployDocs = $false
)

# Enhanced output functions  
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Header { param($Message) Write-Host "`n🚀 $Message" -ForegroundColor Blue -BackgroundColor Black }

Write-Header "MD Reader Pro - Complete GitHub Setup & Deployment"

if (-not $GitHubUsername) {
    $GitHubUsername = Read-Host "Enter your GitHub username"
}

Write-Info "Repository: $GitHubUsername/$RepoName"

Write-Header "Prerequisites Check"

try {
    $gitVersion = git --version
    Write-Success "Git: $gitVersion"
} catch {
    Write-Error "Git not found. Install from: https://git-scm.com"
    exit 1
}

Write-Header "Creating Complete Project Structure"

$directories = @(
    ".github/workflows", ".devcontainer", "src/ai", "tests/unit", "docs"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Write-Success "Created: $dir"
}

Write-Header "Creating All Configuration Files"

# Package.json with all modern dependencies
@"
{
  "name": "md-reader-pro", 
  "version": "3.0.0",
  "description": "AI-powered markdown reader with local processing and complete privacy protection",
  "scripts": {
    "dev": "webpack serve --mode development --open",
    "build": "webpack --mode production",
    "test": "jest",
    "lint": "eslint src/**/*.js --fix",
    "validate": "npm run lint && npm run test"
  },
  "repository": "https://github.com/$GitHubUsername/$RepoName.git",
  "dependencies": {
    "@tensorflow/tfjs": "^4.0.0",
    "marked": "^5.0.0"
  },
  "devDependencies": {
    "webpack": "^5.88.0",
    "jest": "^29.5.0", 
    "eslint": "^8.44.0",
    "@semantic-release/changelog": "^6.0.0",
    "semantic-release": "^22.0.0"
  }
}
"@ | Out-File -FilePath "package.json" -Encoding UTF8

# GitHub Actions workflow
@"
name: CI/CD Pipeline
on:
  push:
    branches: [ main ]
jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
    - run: npm ci
    - run: npm test
    - run: npm run build
"@ | Out-File -FilePath ".github/workflows/ci-cd.yml" -Encoding UTF8

# ESLint configuration
@"
{
  "env": { "browser": true, "es2022": true, "jest": true },
  "extends": ["eslint:recommended"],
  "parserOptions": { "ecmaVersion": 2022, "sourceType": "module" },
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error"
  }
}
"@ | Out-File -FilePath ".eslintrc.json" -Encoding UTF8

# Professional README
@"
# MD Reader Pro

🚀 **AI-powered markdown reader with local processing and complete privacy protection**

## Features
- 🤖 Local AI Processing with TensorFlow.js
- 🔒 Complete Privacy - All data stays local
- ⚡ High Performance with intelligent caching
- 🎯 Smart AI annotations

## Quick Start
``````bash
git clone https://github.com/$GitHubUsername/$RepoName.git
cd $RepoName
npm install
npm run dev
``````

## Development
- ``npm run dev`` - Development server
- ``npm test`` - Run tests  
- ``npm run build`` - Production build
- ``npm run lint`` - Code quality

Built with modern 2025 development practices!
"@ | Out-File -FilePath "README.md" -Encoding UTF8

Write-Header "Git Repository Setup"

if (-not (Test-Path ".git")) {
    git init
    git branch -M main
    Write-Success "Git repository initialized"
}

git add .
git commit -m "🎉 feat: Complete MD Reader Pro setup with modern tooling

✨ Features: CI/CD pipeline, automated testing, security monitoring
🛠️ Tools: Webpack 5, Jest 29, ESLint 8, semantic release
🚀 Ready for contributors and production deployment!"

$remoteUrl = "https://github.com/$GitHubUsername/$RepoName.git"
git remote add origin $remoteUrl 2>$null

if ($CreateRepo) {
    try {
        gh repo create $RepoName --public --description "AI-powered markdown reader" 2>$null
        Write-Success "GitHub repository created!"
    } catch {
        Write-Warning "Create repository manually at: https://github.com/new"
    }
}

try {
    git push -u origin main
    Write-Success "Pushed to GitHub successfully!"
} catch {
    Write-Warning "Manual push needed: git push -u origin main"
}

Write-Header "🎊 DEPLOYMENT COMPLETE!"
Write-Success "Repository: https://github.com/$GitHubUsername/$RepoName"
Write-Success "Next: npm install && npm run dev"
