@echo off
REM Uninstall all Tallman Chat HTTPS Services
REM Removes: LDAP Auth HTTPS, Backend API HTTPS, and Frontend UI HTTPS services

echo.
echo ==================================================
echo   TALLMAN CHAT HTTPS SERVICES UNINSTALLER
echo ==================================================
echo.

REM Stop services first
echo [1/4] Stopping HTTPS services...
sc stop "TallmanChatHTTPS" >nul 2>&1
sc stop "TallmanBackendHTTPS" >nul 2>&1
sc stop "TallmanLDAPAuthHTTPS" >nul 2>&1

timeout /t 3 /nobreak >nul

echo.
echo [2/4] Uninstalling HTTPS services...
sc delete "TallmanChatHTTPS" >nul 2>&1
sc delete "TallmanBackendHTTPS" >nul 2>&1
sc delete "TallmanLDAPAuthHTTPS" >nul 2>&1

echo.
echo [3/4] Removing HTTPS firewall rules...
netsh advfirewall firewall delete rule name="Tallman Chat HTTPS UI" >nul 2>&1
netsh advfirewall firewall delete rule name="Tallman LDAP Auth HTTPS" >nul 2>&1
netsh advfirewall firewall delete rule name="Tallman Backend API HTTPS" >nul 2>&1

REM Optional: Clean up SSL certificate backups (ask user)
echo.
set /p CLEAN_SSL="Remove SSL certificate backups? (y/N): "
if /i "%CLEAN_SSL%"=="y" (
    echo [4/4] Removing SSL certificate backups...
    rmdir /s /q "ssl-backups" 2>nul
    echo ✅ SSL backups removed
) else (
    echo [4/4] Keeping SSL certificate backups...
    echo ℹ️ SSL backups preserved in 'ssl-backups' folder
)

echo.
echo ==================================================
echo ✅ TALLMAN CHAT HTTPS SERVICES COMPLETELY REMOVED!
echo ==================================================
echo.
echo Previous HTTPS services have been:
echo   - Stopped and deleted from Windows Services
echo   - Firewall rules removed
echo   - SSL certificate backups optionally cleaned
echo.
echo 🔓 HTTP services still available if needed:
echo   - Use 'install-service.bat' for HTTP deployment
echo   - Switch back anytime with existing HTTP installer
echo.
echo 🧹 HTTPS Multi-Service system cleaned up!
echo.
pause
