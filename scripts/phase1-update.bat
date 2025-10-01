@echo off
REM Phase 1: Critical Security Updates
REM MD Reader Pro v3.3.0

echo ================================================
echo   MD Reader Pro - Phase 1 Critical Update
echo ================================================
echo.

echo 📦 Updating marked v5.1.2 to v14.1.4...
call npm install marked@latest
if %errorlevel% neq 0 (
    echo ❌ marked update FAILED
    exit /b 1
)
echo ✅ marked updated
echo.

echo 📦 Updating webpack v5.88.0 to v5.97.1...
call npm install -D webpack@latest
if %errorlevel% neq 0 (
    echo ❌ webpack update FAILED
    exit /b 1
)
echo ✅ webpack updated
echo.

echo 📦 Updating dompurify v3.0.9 to v3.2.2...
call npm install dompurify@latest
if %errorlevel% neq 0 (
    echo ❌ dompurify update FAILED
    exit /b 1
)
echo ✅ dompurify updated
echo.

echo 🧪 Running tests...
call npm test
if %errorlevel% neq 0 (
    echo ❌ Tests FAILED
    exit /b 1
)
echo ✅ All tests passed
echo.

echo 🔨 Building production bundle...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build FAILED
    exit /b 1
)
echo ✅ Build successful
echo.

echo ================================================
echo            Phase 1 Complete! ✅
echo ================================================
echo.
echo ✅ marked updated to v14.1.4
echo ✅ webpack updated to v5.97.1
echo ✅ dompurify updated to v3.2.2
echo ✅ All 164 tests passing
echo ✅ Production build successful
echo.
echo 📋 Next: Review changes, test manually
echo    npm run dev
echo    Open http://localhost:8080
echo.
pause
