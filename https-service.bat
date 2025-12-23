@echo off
REM Install Tallman Chat HTTPS Services as Windows Services using NSSM
REM Creates SSL-enabled services: LDAP Auth (3891), Backend API (3007), Frontend UI (449)
REM Uses existing SSL certificates from setup-ssl.ps1

echo.
echo ========================================
echo  TALLMAN CHAT HTTPS MULTI-SERVICE INSTALLER
echo ========================================
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
echo [1/6] Building application for production...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to build application
    pause
    exit /b 1
)

echo.
echo [2/6] Stopping existing services if running...
%NSSM_EXE% stop "TallmanLDAPAuthHTTPS" >nul 2>&1
%NSSM_EXE% stop "TallmanBackendHTTPS" >nul 2>&1
%NSSM_EXE% stop "TallmanChatHTTPS" >nul 2>&1

%NSSM_EXE% remove "TallmanLDAPAuthHTTPS" confirm >nul 2>&1
%NSSM_EXE% remove "TallmanBackendHTTPS" confirm >nul 2>&1
%NSSM_EXE% remove "TallmanChatHTTPS" confirm >nul 2>&1

echo.
echo [3/6] Installing LDAP Authentication HTTPS Service (Port 3891)...
%NSSM_EXE% install "TallmanLDAPAuthHTTPS" "C:\Program Files\nodejs\node.exe" "%SERVICE_DIR%server\https-ldap-auth.js"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install LDAP Auth HTTPS service
    pause
    exit /b 1
)

%NSSM_EXE% set "TallmanLDAPAuthHTTPS" AppDirectory "%SERVICE_DIR%"
%NSSM_EXE% set "TallmanLDAPAuthHTTPS" AppExit Default Restart
%NSSM_EXE% set "TallmanLDAPAuthHTTPS" AppRestartDelay 3000
%NSSM_EXE% set "TallmanLDAPAuthHTTPS" DisplayName "Tallman LDAP Authentication (HTTPS)"
%NSSM_EXE% set "TallmanLDAPAuthHTTPS" Description "Tallman Chat LDAP Authentication Service - HTTPS enabled - Handles user authentication against Active Directory"
%NSSM_EXE% set "TallmanLDAPAuthHTTPS" ObjectName LocalSystem
%NSSM_EXE% set "TallmanLDAPAuthHTTPS" Start SERVICE_AUTO_START

echo.
echo [4/6] Installing Backend API HTTPS Service (Port 3007)...
%NSSM_EXE% install "TallmanBackendHTTPS" "C:\Program Files\nodejs\node.exe" "%SERVICE_DIR%server\https-backend-server.js"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install Backend HTTPS service
    %NSSM_EXE% remove "TallmanLDAPAuthHTTPS" confirm >nul 2>&1
    pause
    exit /b 1
)

%NSSM_EXE% set "TallmanBackendHTTPS" AppDirectory "%SERVICE_DIR%"
%NSSM_EXE% set "TallmanBackendHTTPS" AppExit Default Restart
%NSSM_EXE% set "TallmanBackendHTTPS" AppRestartDelay 5000
%NSSM_EXE% set "TallmanBackendHTTPS" DisplayName "Tallman Backend API (HTTPS)"
%NSSM_EXE% set "TallmanBackendHTTPS" Description "Tallman Chat Backend API Service - HTTPS enabled - Handles API endpoints, chat, and database operations"
%NSSM_EXE% set "TallmanBackendHTTPS" ObjectName LocalSystem
%NSSM_EXE% set "TallmanBackendHTTPS" Start SERVICE_AUTO_START

echo.
echo [5/6] Installing Frontend UI HTTPS Service (Port 449)...
%NSSM_EXE% install "TallmanChatHTTPS" "C:\Program Files\nodejs\node.exe" "%SERVICE_DIR%server\https-main-server.js"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install Frontend HTTPS service
    %NSSM_EXE% remove "TallmanLDAPAuthHTTPS" confirm >nul 2>&1
    %NSSM_EXE% remove "TallmanBackendHTTPS" confirm >nul 2>&1
    pause
    exit /b 1
)

%NSSM_EXE% set "TallmanChatHTTPS" AppDirectory "%SERVICE_DIR%"
%NSSM_EXE% set "TallmanChatHTTPS" AppExit Default Restart
%NSSM_EXE% set "TallmanChatHTTPS" AppRestartDelay 5000
%NSSM_EXE% set "TallmanChatHTTPS" DisplayName "Tallman Chat UI (HTTPS)"
%NSSM_EXE% set "TallmanChatHTTPS" Description "Tallman Chat Frontend UI Service - HTTPS enabled - Serves React UI and proxies API calls"
%NSSM_EXE% set "TallmanChatHTTPS" ObjectName LocalSystem
%NSSM_EXE% set "TallmanChatHTTPS" Start SERVICE_AUTO_START

echo.
echo [6/6] Configuring service dependencies and firewall...
REM Set service dependencies (LDAP → Backend → Frontend)
%NSSM_EXE% set "TallmanBackendHTTPS" AppDependOnService "TallmanLDAPAuthHTTPS"
%NSSM_EXE% set "TallmanChatHTTPS" AppDependOnService "TallmanBackendHTTPS"

REM Configure firewall rules for HTTPS access
netsh advfirewall firewall add rule name="Tallman Chat HTTPS UI" dir=in action=allow protocol=TCP localport=449
netsh advfirewall firewall add rule name="Tallman LDAP Auth HTTPS" dir=in action=allow protocol=TCP localport=3891
netsh advfirewall firewall add rule name="Tallman Backend API HTTPS" dir=out action=allow protocol=TCP localport=3007 profile=private

echo.
echo ========================================
echo 🎉 SUCCESS: Tallman Chat HTTPS services installed!
echo ========================================
echo.
echo 📊 HTTPS Service Details:
echo.
echo 🟢 TallmanLDAPAuthHTTPS (Active Directory Authentication - SSL)
echo   - Name: TallmanLDAPAuthHTTPS
echo   - Display: Tallman LDAP Authentication (HTTPS)
echo   - Port: 3891 (HTTPS External/Internal Access)
echo   - Certificate: tallman-chat-server.pem
echo.
echo 🔵 TallmanBackendHTTPS (API Server - SSL)
echo   - Name: TallmanBackendHTTPS
echo   - Display: Tallman Backend API (HTTPS)
echo   - Port: 3007 (HTTPS Internal Only)
echo   - Certificate: tallman-chat-server.pem
echo.
echo 🟡 TallmanChatHTTPS (UI Server - SSL - Main Access)
echo   - Name: TallmanChatHTTPS
echo   - Display: Tallman Chat UI (HTTPS)
echo   - Port: 449 (HTTPS External Access)
echo   - UI URL: https://10.10.20.9:449
echo   - Certificate: tallman-chat-server.pem
echo.
echo 🔄 Service Dependency Chain:
echo   LDAP HTTPS → Backend HTTPS → Frontend HTTPS
echo.
echo 🛡️ SSL Certificates:
echo   - Certificate: %SERVICE_DIR%tallman-chat-server.pem
echo   - Private Key: %SERVICE_DIR%tallman-chat-server-key.pem
echo   - Generated via: setup-ssl.ps1
echo.
echo 🚀 Service Commands:
echo   Start all:  net start TallmanLDAPAuthHTTPS && net start TallmanBackendHTTPS && net start TallmanChatHTTPS
echo   Stop all:   net stop TallmanChatHTTPS && net stop TallmanBackendHTTPS && net stop TallmanLDAPAuthHTTPS
echo   Status:     sc query TallmanLDAPAuthHTTPS && sc query TallmanBackendHTTPS && sc query TallmanChatHTTPS
echo.
echo 📄 Service Logs (NSSM):
echo   LDAP:  nssm view TallmanLDAPAuthHTTPS AppStdout
echo   Backend: nssm view TallmanBackendHTTPS AppStdout
echo   Frontend: nssm view TallmanChatHTTPS AppStdout
echo.
echo 🛑 To uninstall HTTPS services: uninstall-https-services.bat
echo.
echo 🔐 SSL Notes:
echo   - Certificate must be renewed before expiration
echo   - DNS A record required: chat.tallman.com → %COMPUTERNAME%
echo   - Browsers may show certificate warnings for IP access
echo.
pause
