@echo off
echo Checking LDAP service on port 3100...
curl -s http://localhost:3100/api/health || echo LDAP service not responding
echo.
