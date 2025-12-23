@echo off
echo Setting up chat.tallman.com for internal use...

REM Run as administrator
powershell -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File setup-internal.ps1' -Verb RunAs -Wait"

REM Setup DNS (requires domain admin)
powershell -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File setup-dns-internal.ps1' -Verb RunAs -Wait"

echo.
echo Setup complete! Access at: https://chat.tallman.com
echo Note: Users may need to accept the self-signed certificate
pause