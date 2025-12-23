@echo off
REM Add Windows Firewall rule for Tallman Chat LDAP port 389
REM Run this as Administrator

echo Adding Windows Firewall rule for Tallman Chat LDAP port 389...

netsh advfirewall firewall add rule name="Tallman Chat LDAP Port 389" dir=in action=allow protocol=TCP localport=389

if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to add firewall rule
    pause
    exit /b 1
)

echo.
echo SUCCESS: Firewall rule added for port 389
echo LDAP traffic should now be permitted!
echo.
pause
