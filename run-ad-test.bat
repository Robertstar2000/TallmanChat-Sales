@echo off
echo ============================================
echo Testing Active Directory Authentication
echo Server: 10.10.20.253:389
echo Service Account: CN=LDAP,DC=tallman,DC=com
echo ============================================
echo.

echo Running authentication test...
echo Results will be displayed below:
echo ============================================

node test-user-auth-direct.cjs

echo.
echo ============================================
echo Test completed!
echo.
echo Results summary:
echo - Step 1: Service account bind
echo - Step 2: User search
echo - Step 3: User authentication
echo.
echo Copy this output and paste it in the chat if needed.
echo ============================================
pause
