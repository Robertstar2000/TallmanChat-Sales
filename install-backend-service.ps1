#Requires -RunAsAdministrator

$serviceName = "TallmanChatBackendService"
$servicePath = "$PSScriptRoot\server"
$nodePath = "C:\Program Files\nodejs\node.exe"
$nssmPath = "$PSScriptRoot\nssm.exe"

# Stop and remove existing service
Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
& $nssmPath remove $serviceName confirm 2>$null

# Create new backend service on port 3210
& $nssmPath install $serviceName $nodePath "$servicePath\backend-server.js"
& $nssmPath set $serviceName AppDirectory $servicePath
& $nssmPath set $serviceName AppEnvironmentExtra "PORT=3210"
& $nssmPath set $serviceName DisplayName "Tallman Chat Backend Service"
& $nssmPath set $serviceName Description "Backend API service for Tallman Chat on port 3210"
& $nssmPath set $serviceName Start SERVICE_AUTO_START

# Start service
Start-Service -Name $serviceName

Write-Host "Backend service installed and started on port 3210" -ForegroundColor Green