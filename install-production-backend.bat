@echo off
REM Install Production Tallman Chat Backend Service
REM Creates TallmanChatBackend service on port 3215
REM Usage: install-production-backend.bat

echo.
echo ============================================
echo  PRODUCTION TALLMAN CHAT BACKEND INSTALLER
echo ============================================
echo.

REM Get the current directory (should be where this batch file is)
set "SERVICE_DIR=%~dp0"
echo Service directory: %SERVICE_DIR%

REM Check if NSSM is available in PATH or locally
nssm version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    REM Try local NSSM if PATH version not found
    if exist "%~dp0nssm.exe" (
        set NSSM_EXE=%~dp0nssm.exe
        set NSSM_FOUND=1
    ) else (
        echo ERROR: NSSM is not found in PATH
        echo Please install NSSM from https://nssm.cc/ and add it to your PATH
        echo Or download nssm.exe and place it in the same directory as this batch file
        pause
        exit /b 1
    )
) else (
    set NSSM_EXE=nssm
    set NSSM_FOUND=1
)

echo.
echo [1/3] Stopping and removing existing TallmanChatBackend service if it exists...
%NSSM_EXE% stop "TallmanChatBackend" >nul 2>&1
%NSSM_EXE% remove "TallmanChatBackend" confirm >nul 2>&1

echo.
echo [2/3] Installing Tallman Chat Backend Service (Port 3215)...

REM Set environment variable for production config
set NODE_ENV=production

%NSSM_EXE% install "TallmanChatBackend" "C:\Program Files\nodejs\node.exe" "%SERVICE_DIR%server\production-server.js"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install TallmanChatBackend service
    pause
    exit /b 1
)

%NSSM_EXE% set "TallmanChatBackend" AppDirectory "%SERVICE_DIR%"
%NSSM_EXE% set "TallmanChatBackend" AppExit Default Restart
%NSSM_EXE% set "TallmanChatBackend" AppRestartDelay 5000
%NSSM_EXE% set "TallmanChatBackend" DisplayName "Tallman Chat Backend (Production)"
%NSSM_EXE% set "TallmanChatBackend" Description "Tallman Chat Production Backend API Service - Handles API endpoints, chat, and database operations on port 3215"
%NSSM_EXE% set "TallmanChatBackend" ObjectName LocalSystem
%NSSM_EXE% set "TallmanChatBackend" Start SERVICE_AUTO_START

REM Set environment variables
%NSSM_EXE% set "TallmanChatBackend" AppEnvironmentExtra NODE_ENV=production
%NSSM_EXE% set "TallmanChatBackend" AppEnvironmentExtra OLLAMA_HOST=10.10.20.24:11434
%NSSM_EXE% set "TallmanChatBackend" AppEnvironmentExtra OLLAMA_MODEL=llama3.3:latest
%NSSM_EXE% set "TallmanChatBackend" AppEnvironmentExtra PORT=3215
%NSSM_EXE% set "TallmanChatBackend" AppEnvironmentExtra LDAP_SERVICE_HOST=127.0.0.1
%NSSM_EXE% set "TallmanChatBackend" AppEnvironmentExtra LDAP_SERVICE_PORT=3100

echo.
echo [3/3] Configuring firewall and starting service...
REM Configure firewall rule for the backend port
netsh advfirewall firewall add rule name="Tallman Chat Backend (3215)" dir=in action=allow protocol=TCP localport=3215

REM Start the service
%NSSM_EXE% start "TallmanChatBackend"
if %ERRORLEVEL% neq 0 (
    echo WARNING: Failed to start service automatically. It may start on next boot.
)

echo.
echo ============================================
echo 🎉 SUCCESS: Tallman Chat Backend service installed!
echo ============================================
echo.
echo 📊 Service Details:
echo.
echo 🔵 TallmanChatBackend (Production API Server)
echo   - Name: TallmanChatBackend
echo   - Display: Tallman Chat Backend (Production)
echo   - Port: 3215 (Backend API endpoint)
echo   - Ollama Model: llama3.3:latest
echo   - LDAP Connection: 127.0.0.1:3100
echo.
echo 🚀 Service Commands:
echo   Start:  net start TallmanChatBackend
echo   Stop:   net stop TallmanChatBackend
echo   Status: sc query TallmanChatBackend
echo.
echo 📄 Service Logs:
echo   View logs: nssm view TallmanChatBackend AppStdout
echo.
echo 🛑 To uninstall: nssm remove TallmanChatBackend confirm
echo.
pause
