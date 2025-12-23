@echo off
echo Installing TallmanChatBackendService...

cd /d "%~dp0"

nssm.exe install TallmanChatBackendService "C:\Program Files\nodejs\node.exe" "%~dp0server\backend-server.js"
nssm.exe set TallmanChatBackendService AppDirectory "%~dp0server"
nssm.exe set TallmanChatBackendService AppEnvironmentExtra PORT=3210
nssm.exe set TallmanChatBackendService DisplayName "Tallman Chat Backend Service"
nssm.exe set TallmanChatBackendService Start SERVICE_AUTO_START
nssm.exe start TallmanChatBackendService

echo Service installation complete
pause