@echo off
REM Fix IIS port configuration
copy /Y web.config.corrected C:\inetpub\TallmanChat\web.config
echo IIS reverse proxy port fixed to 3005
pause
