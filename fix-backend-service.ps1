#Requires -RunAsAdministrator

$serviceName = "TallmanChatBackendService"
$nssmPath = "$PSScriptRoot\nssm.exe"
$servicePath = "$PSScriptRoot\server"

# Stop and remove existing service
Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
& $nssmPath remove $serviceName confirm

# Create new service with correct environment variables
& $nssmPath install $serviceName "C:\Program Files\nodejs\node.exe" "$servicePath\backend-server.js"
& $nssmPath set $serviceName AppDirectory $servicePath
& $nssmPath set $serviceName AppEnvironmentExtra "PORT=3210" "OLLAMA_HOST=10.10.20.24" "LDAP_SERVICE_HOST=10.10.20.253" "LDAP_SERVICE_PORT=3100"
& $nssmPath set $serviceName DisplayName "Tallman Chat Backend Service"
& $nssmPath set $serviceName Start SERVICE_AUTO_START
& $nssmPath set $serviceName AppStdout "$servicePath\backend.log"
& $nssmPath set $serviceName AppStderr "$servicePath\backend-error.log"

# Start service
Start-Service -Name $serviceName

Write-Host "TallmanChatBackendService configured with:" -ForegroundColor Green
Write-Host "  Port: 3210" -ForegroundColor Yellow
Write-Host "  Ollama: 10.10.20.24:11434" -ForegroundColor Yellow
Write-Host "  LDAP: 10.10.20.253:3100" -ForegroundColor Yellow