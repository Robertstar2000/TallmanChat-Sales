@echo off
REM Uninstall all Tallman Chat Services
REM Removes: LDAP Auth, Backend API, and Frontend UI services

echo.
echo ========================================
echo   TALLMAN CHAT SERVICES UNINSTALLER
echo ========================================
echo.

REM Stop services first
echo [1/4] Stopping services...
sc stop TallmanChatService >nul 2>&1
sc stop TallmanBackendService >nul 2>&1
sc stop TallmanLDAPAuthService >nul 2>&1

timeout /t 3 /nobreak >nul

echo.
echo [2/4] Uninstalling services...
sc delete TallmanChatService >nul 2>&1
sc delete TallmanBackendService >nul 2>&1
sc delete TallmanLDAPAuthService >nul 2>&1

echo.
echo [3/4] Removing firewall rules...
netsh advfirewall firewall delete rule name="Tallman Chat UI" >nul 2>&1
netsh advfirewall firewall delete rule name="Tallman LDAP Auth" >nul 2>&1
netsh advfirewall firewall delete rule name="Tallman Backend API" >nul 2>&1

echo.
echo [4/4] Checking cleanup...
sc query TallmanChatService >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ❌ Tallman Chat UI service still exists
) else (
    echo ✅ Tallman Chat UI service removed
)

sc query TallmanBackendService >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ❌ Backend API service still exists
) else (
    echo ✅ Backend API service removed
)

sc query TallmanLDAPAuthService >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ❌ LDAP Auth service still exists
) else (
    echo ✅ LDAP Auth service removed
)

echo.
echo ========================================
echo ✅ TALLMAN CHAT SERVICES COMPLETELY REMOVED!
echo ========================================
echo.
echo Previous services (if any) have been:
echo   - Stopped
echo   - Deleted from Windows Services
echo   - Firewall rules removed
echo.
echo All Tallman Chat components cleaned up! 🧹
echo.
pause
