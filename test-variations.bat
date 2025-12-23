@echo off
echo ============================================
echo Testing Service Account Variations
echo Server: 10.10.20.253:389
echo Testing multiple DN formats
echo ============================================
echo.

echo Starting variation tests...
echo (Will test 6 different formats)
echo ============================================

node test-service-variations.cjs

echo.
echo ============================================
echo Variations test completed!
echo.
echo If successful, copy the working Bind DN above
echo and update your LDAP server configuration.
echo.
echo If all failed, contact AD administrator for
echo correct service account credentials.
echo ============================================
pause
