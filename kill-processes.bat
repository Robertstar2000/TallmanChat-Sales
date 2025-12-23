@echo off
REM Kill Tallman Chat processes with elevated privileges
echo Terminating Tallman Chat processes...

REM Kill Node.js processes on ports 3200 and 3210
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3200" ^| find "LISTENING"') do (
    echo Killing process on port 3200 (PID: %%a)
    taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -aon ^| find ":3210" ^| find "LISTENING"') do (
    echo Killing process on port 3210 (PID: %%a)
    taskkill /F /PID %%a 2>nul
)

REM Kill all Node.js processes related to Tallman Chat
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Tallman*" 2>nul
taskkill /F /IM node.exe /FI "IMAGENAME eq node.exe" 2>nul

echo Process termination complete.
pause