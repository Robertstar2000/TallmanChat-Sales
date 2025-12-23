#Requires -RunAsAdministrator

# Remove and recreate the service
$serviceName = "TallmanChatBackendService"
$nssmPath = "$PSScriptRoot\nssm.exe"

# Remove existing service
Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
& $nssmPath remove $serviceName confirm

# Create new service with minimal configuration
& $nssmPath install $serviceName "C:\Program Files\nodejs\node.exe" "$PSScriptRoot\server\backend-server.js"
& $nssmPath set $serviceName AppDirectory "$PSScriptRoot\server"
& $nssmPath set $serviceName AppEnvironmentExtra "PORT=3210"
& $nssmPath set $serviceName AppStdout "$PSScriptRoot\server\backend.log"
& $nssmPath set $serviceName AppStderr "$PSScriptRoot\server\backend-error.log"

# Start service
Start-Service -Name $serviceName

Write-Host "Service recreated" -ForegroundColor Green