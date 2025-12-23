@echo off
REM Install Tallman Chat Services as Windows Services using NSSM
REM Creates 3 services: LDAP Auth, Backend API, and Frontend UI
REM Usage: install-services.bat

echo.
echo ========================================
echo  TALLMAN CHAT MULTI-SERVICE INSTALLER
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
%NSSM_EXE% stop "TallmanLDAPAuthService" >nul 2>&1
%NSSM_EXE% stop "TallmanBackendService" >nul 2>&1
%NSSM_EXE% stop "TallmanChatService" >nul 2>&1

%NSSM_EXE% remove "TallmanLDAPAuthService" confirm >nul 2>&1
%NSSM_EXE% remove "TallmanBackendService" confirm >nul 2>&1
%NSSM_EXE% remove "TallmanChatService" confirm >nul 2>&1

echo.
echo [3/6] Installing LDAP Authentication Service (Port 3890)...
%NSSM_EXE% install "TallmanLDAPAuthService" "C:\Program Files\nodejs\node.exe" "%SERVICE_DIR%server\ldap-auth.js"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install LDAP Auth service
    pause
    exit /b 1
)

%NSSM_EXE% set "TallmanLDAPAuthService" AppDirectory "%SERVICE_DIR%"
%NSSM_EXE% set "TallmanLDAPAuthService" AppExit Default Restart
%NSSM_EXE% set "TallmanLDAPAuthService" AppRestartDelay 3000
%NSSM_EXE% set "TallmanLDAPAuthService" DisplayName "Tallman LDAP Authentication"
%NSSM_EXE% set "TallmanLDAPAuthService" Description "Tallman Chat LDAP Authentication Service - Handles user authentication against Active Directory"
%NSSM_EXE% set "TallmanLDAPAuthService" ObjectName LocalSystem
%NSSM_EXE% set "TallmanLDAPAuthService" Start SERVICE_AUTO_START

echo.
echo [4/6] Installing Backend API Service (Port 3006)...
%NSSM_EXE% install "TallmanBackendService" "C:\Program Files\nodejs\node.exe" "%SERVICE_DIR%server\backend-server.js"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install Backend service
    %NSSM_EXE% remove "TallmanLDAPAuthService" confirm >nul 2>&1
    pause
    exit /b 1
)

%NSSM_EXE% set "TallmanBackendService" AppDirectory "%SERVICE_DIR%"
%NSSM_EXE% set "TallmanBackendService" AppExit Default Restart
%NSSM_EXE% set "TallmanBackendService" AppRestartDelay 5000
%NSSM_EXE% set "TallmanBackendService" DisplayName "Tallman Backend API"
%NSSM_EXE% set "TallmanBackendService" Description "Tallman Chat Backend API Service - Handles API endpoints, chat, and database operations"
%NSSM_EXE% set "TallmanBackendService" ObjectName LocalSystem
%NSSM_EXE% set "TallmanBackendService" Start SERVICE_AUTO_START

echo.
echo [5/6] Installing Frontend UI Service (Port 3005)...
%NSSM_EXE% install "TallmanChatService" "C:\Program Files\nodejs\node.exe" "%SERVICE_DIR%server\main-server.js"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install Frontend UI service
    %NSSM_EXE% remove "TallmanLDAPAuthService" confirm >nul 2>&1
    %NSSM_EXE% remove "TallmanBackendService" confirm >nul 2>&1
    pause
    exit /b 1
)

%NSSM_EXE% set "TallmanChatService" AppDirectory "%SERVICE_DIR%"
%NSSM_EXE% set "TallmanChatService" AppExit Default Restart
%NSSM_EXE% set "TallmanChatService" AppRestartDelay 5000
%NSSM_EXE% set "TallmanChatService" DisplayName "Tallman Chat UI"
%NSSM_EXE% set "TallmanChatService" Description "Tallman Chat Frontend UI Service - Serves React UI and proxies API calls"
%NSSM_EXE% set "TallmanChatService" ObjectName LocalSystem
%NSSM_EXE% set "TallmanChatService" Start SERVICE_AUTO_START

echo.
echo [6/6] Configuring service dependencies and firewall...
REM Set service dependencies (LDAP → Backend → Frontend)
%NSSM_EXE% set "TallmanBackendService" AppDependOnService "TallmanLDAPAuthService"
%NSSM_EXE% set "TallmanChatService" AppDependOnService "TallmanBackendService"

REM Configure firewall rules for external access
netsh advfirewall firewall add rule name="Tallman Chat UI" dir=in action=allow protocol=TCP localport=3005
netsh advfirewall firewall add rule name="Tallman LDAP Auth" dir=in action=allow protocol=TCP localport=3890
netsh advfirewall firewall add rule name="Tallman Backend API" dir=out action=allow protocol=TCP localport=3006 profile=private

echo.
echo ========================================
echo 🎉 SUCCESS: All Tallman Chat services installed!
echo ========================================
echo.
echo 📊 Service Details:
echo.
echo 🟢 TallmanLDAPAuthService (Active Directory Authentication)
echo   - Name: TallmanLDAPAuthService
echo   - Display: Tallman LDAP Authentication
echo   - Port: 3890 (External/Internal Access)
echo.
echo 🔵 TallmanBackendService (API Server)
echo   - Name: TallmanBackendService
echo   - Display: Tallman Backend API
echo   - Port: 3006 (Internal Only)
echo.
echo 🟡 TallmanChatService (UI Server - Main Access)
echo   - Name: TallmanChatService
echo   - Display: Tallman Chat UI
echo   - Port: 3005 (External Access)
echo   - UI URL: http://10.10.20.9:3005
echo.
echo 🔄 Service Dependency Chain:
echo   LDAP Auth → Backend API → Frontend UI
echo.
echo 🚀 Service Commands:
echo   Start all:  net start TallmanLDAPAuthService && net start TallmanBackendService && net start TallmanChatService
echo   Stop all:   net stop TallmanChatService && net stop TallmanBackendService && net stop TallmanLDAPAuthService
echo   Status:     sc query TallmanLDAPAuthService && sc query TallmanBackendService && sc query TallmanChatService
echo.
echo 📄 Service Logs (NSSM):
echo   LDAP:  nssm view TallmanLDAPAuthService AppStdout
echo   Backend: nssm view TallmanBackendService AppStdout
echo   Frontend: nssm view TallmanChatService AppStdout
echo.
echo 🛑 To uninstall all services: uninstall-services.bat
echo.
pause
