@echo off
REM Fix Tallman Chat Windows Service
REM Run this as Administrator

echo Fixing Tallman Chat Windows Service...

echo Step 1: Removing existing service...
./nssm remove TallmanChat confirm

if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to remove service
    pause
    exit /b 1
)

echo Step 2: Installing new service...
./nssm install TallmanChat "node.exe" "server/production-server.js"

if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install service
    pause
    exit /b 1
)

echo Step 3: Configuring service...
./nssm set TallmanChat AppDirectory "."
./nssm set TallmanChat Start SERVICE_AUTO_START

if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to configure service
    pause
    exit /b 1
)

echo Step 4: Starting service...
net start TallmanChat

echo.
echo SUCCESS: Tallman Chat service installed and started!
echo Service Name: TallmanChat
echo Port: 3001 (http://localhost:3001)
echo IIS Proxy: http://chat.tallman.com (after DNS setup)
echo.
echo Service management:
echo   Status: .\nssm status TallmanChat
echo   Stop:   net stop TallmanChat
echo   Start:  net start TallmanChat
echo.
pause
