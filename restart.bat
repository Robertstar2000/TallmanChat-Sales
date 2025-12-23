@echo off
echo Restarting Tallman Chat Services...

REM Kill existing processes
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3200" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3210" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

echo Starting Backend (Port 3210)...
start "Backend" cmd /k "cd server && npm start"

timeout /t 3 /nobreak >nul

echo Starting Frontend (Port 3200)...
start "Frontend" cmd /k "npm start"

echo Services restarted.
echo Backend: http://localhost:3210/api/health
echo Frontend: http://localhost:3200
pause