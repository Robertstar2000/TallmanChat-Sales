@echo off
REM Uninstall Tallman Chat Windows Service
REM Usage: uninstall-service.bat [service-name]

if "%1"=="" (
    set SERVICE_NAME=TallmanChat
) else (
    set SERVICE_NAME=%1
)

echo Uninstalling Tallman Chat service: %SERVICE_NAME%

REM Check if NSSM is available in PATH
nssm version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: NSSM is not found in PATH
    echo Please install NSSM from https://nssm.cc/ and add it to your PATH
    echo Or download nssm.exe and place it in the same directory as this batch file
    pause
    exit /b 1
)

echo [1/2] Stopping service...
nssm stop "%SERVICE_NAME%" >nul 2>&1

echo [2/2] Removing service...
nssm remove "%SERVICE_NAME%" confirm >nul 2>&1

if %ERRORLEVEL% equ 0 (
    echo.
    echo SUCCESS: Service "%SERVICE_NAME%" has been uninstalled
    echo The application files and data remain intact.
    echo.
) else (
    echo.
    echo ERROR: Failed to remove service "%SERVICE_NAME%"
    echo Service may not exist or you may need administrator privileges.
    echo.
)

pause
