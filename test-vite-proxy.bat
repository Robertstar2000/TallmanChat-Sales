@echo off
echo ============================================
echo Testing Vite Proxy Configuration
echo Frontend port 3200 → LDAP server port 3100
echo ============================================
echo.

echo Step 1: Testing if LDAP server is responding directly...
node test-ldap-server.cjs

echo.
echo.
echo Step 2: Testing if Vite server is running...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3200' -Method Head -TimeoutSec 5; Write-Host '✅ Vite server is running on port 3200' } catch { Write-Host '❌ Vite server not responding on port 3200 (start with npm run dev)' }"

echo.
echo.
echo Step 3: Testing Vite proxy forwarding (/api/health)...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3200/api/health' -Method Get -TimeoutSec 5; Write-Host '✅ Vite proxy working!'; Write-Host 'Response:' $response.Content } catch { Write-Host '❌ Vite proxy not working!'; Write-Host 'Error:' $_.Exception.Message }"

echo.
echo.
echo If all steps show ✅, then the proxy configuration is working.
echo If LDAP server test fails, restart LDAP server: node server/ldap-auth.js
echo If Vite server test fails, restart frontend: npm run dev
echo If proxy test fails, check vite.config.ts proxy configuration.
echo.
pause
