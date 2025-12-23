#Requires -RunAsAdministrator

# Manual service management
$nssmPath = "$PSScriptRoot\nssm.exe"

# Force remove old service
Write-Host "Removing TallmanBackendService..." -ForegroundColor Yellow
Stop-Service -Name "TallmanBackendService" -Force -ErrorAction SilentlyContinue
& $nssmPath stop "TallmanBackendService"
& $nssmPath remove "TallmanBackendService" confirm

# Install new service
Write-Host "Installing TallmanChatBackendService..." -ForegroundColor Yellow
$servicePath = "$PSScriptRoot\server\backend-server.js"
$nodePath = "C:\Program Files\nodejs\node.exe"

& $nssmPath install "TallmanChatBackendService" $nodePath $servicePath
& $nssmPath set "TallmanChatBackendService" AppDirectory "$PSScriptRoot\server"
& $nssmPath set "TallmanChatBackendService" AppEnvironmentExtra "PORT=3210"
& $nssmPath set "TallmanChatBackendService" DisplayName "Tallman Chat Backend Service"
& $nssmPath set "TallmanChatBackendService" Start SERVICE_AUTO_START

# Start new service
& $nssmPath start "TallmanChatBackendService"

Write-Host "Service operations completed" -ForegroundColor Green