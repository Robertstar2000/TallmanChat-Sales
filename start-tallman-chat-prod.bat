@echo off
REM Production starter for Tallman Chat
REM Starts Node.js server and handles everything

echo ==========================================
echo TALLMAN CHAT PRODUCTION STARTER
echo ==========================================
echo.

REM Kill any existing Node.js processes
echo [1/2] Stopping existing processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start the production server
echo [2/2] Starting Tallman Chat production server...
echo.

node server/production-server.js

echo.
echo If server doesn't start, run with admin privileges:
echo Right-click this .bat file ^> Run as Administrator
echo.
pause
