@echo off
echo Clearing Jest cache and running tests...
echo.

call npm run clean:test
if %errorlevel% neq 0 (
    echo Warning: Could not clear cache
)

echo.
echo Running tests with new configuration...
call npm test
