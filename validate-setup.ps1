# MD Reader Pro - Setup Validation Script
# Run FIRST: .\validate-setup.ps1

Write-Host "🔍 MD Reader Pro - Setup Validation" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

$validationPassed = $true

Write-Host "`n🔧 Checking Prerequisites..." -ForegroundColor Magenta

# Check Git
try {
    $gitVersion = git --version
    Write-Host "✅ Git installed: $gitVersion" -ForegroundColor Green
    
    # Check Git config
    try {
        $gitUser = git config user.name
        $gitEmail = git config user.email
        if ($gitUser -and $gitEmail) {
            Write-Host "✅ Git configured: $gitUser <$gitEmail>" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Git user not configured" -ForegroundColor Yellow
            Write-Host "   Run: git config --global user.name 'Your Name'" -ForegroundColor Gray
            Write-Host "   Run: git config --global user.email 'your@email.com'" -ForegroundColor Gray
        }
    } catch { }
} catch {
    Write-Host "❌ Git not found - Install from: https://git-scm.com" -ForegroundColor Red
    $validationPassed = $false
}

# Check Node.js
try {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace '^v(\d+)\..*', '$1')
    
    if ($majorVersion -ge 18) {
        Write-Host "✅ Node.js compatible: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Node.js $nodeVersion (v18+ recommended)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Node.js not found - Install from: https://nodejs.org" -ForegroundColor Yellow
    Write-Host "   (Optional but recommended for development)" -ForegroundColor Gray
}

# Check GitHub CLI (optional)
try {
    $ghVersion = gh --version | Select-Object -First 1
    Write-Host "✅ GitHub CLI available: $ghVersion" -ForegroundColor Green
    Write-Host "   Can create repositories automatically!" -ForegroundColor Gray
} catch {
    Write-Host "ℹ️  GitHub CLI not found (optional)" -ForegroundColor Cyan
    Write-Host "   Install from: https://cli.github.com for auto repo creation" -ForegroundColor Gray
}

Write-Host "`n📁 Checking Environment..." -ForegroundColor Magenta

$currentDir = Get-Location
Write-Host "ℹ️  Current directory: $currentDir" -ForegroundColor Cyan

# Check for conflicts
$conflicts = @("package.json", ".git", "src", "docs") | Where-Object { Test-Path $_ }
if ($conflicts) {
    Write-Host "⚠️  Existing files found: $($conflicts -join ', ')" -ForegroundColor Yellow
    Write-Host "   These will be updated/merged" -ForegroundColor Gray
} else {
    Write-Host "✅ Directory clean - ready for new project" -ForegroundColor Green
}

Write-Host "`n📋 VALIDATION RESULTS" -ForegroundColor Blue -BackgroundColor Black
Write-Host "=====================" -ForegroundColor Blue -BackgroundColor Black

if ($validationPassed) {
    Write-Host "`n🎉 VALIDATION PASSED!" -ForegroundColor Green -BackgroundColor Black
    Write-Host "✅ All required prerequisites available" -ForegroundColor Green
    Write-Host "🚀 Ready for deployment!" -ForegroundColor Green
    
    Write-Host "`n💡 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Run: .\deploy.ps1 -GitHubUsername 'yourusername' -CreateRepo" -ForegroundColor White
    Write-Host "2. Wait for magic to happen! ✨" -ForegroundColor White
    
} else {
    Write-Host "`n❌ VALIDATION FAILED" -ForegroundColor Red -BackgroundColor Black
    Write-Host "Please install missing prerequisites above" -ForegroundColor Red
}

Write-Host "`n🎭 DEMO TIP:" -ForegroundColor Magenta
Write-Host "This validation shows your system is ready for a professional" -ForegroundColor White  
Write-Host "GitHub deployment with modern CI/CD, testing, and documentation!" -ForegroundColor White
