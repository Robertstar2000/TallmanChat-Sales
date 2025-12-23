@echo off
echo Starting Backend Service on port 3210...
cd /d "%~dp0server"
set PORT=3210
node backend-server.js
pause