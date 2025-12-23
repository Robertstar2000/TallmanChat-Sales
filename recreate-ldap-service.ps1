#Requires -RunAsAdministrator

$serviceName = "TallmanLDAPAuthService"
$servicePath = "$PSScriptRoot\server"
$nodePath = "C:\Program Files\nodejs\node.exe"
$nssmPath = "$PSScriptRoot\nssm.exe"

# Stop and remove existing service
Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
& $nssmPath remove $serviceName confirm

# Create new service with port 3100
& $nssmPath install $serviceName $nodePath "$servicePath\ldap-auth.js"
& $nssmPath set $serviceName AppDirectory $servicePath
& $nssmPath set $serviceName AppEnvironmentExtra "PORT=3100"
& $nssmPath set $serviceName DisplayName "Tallman LDAP Auth Service"
& $nssmPath set $serviceName Start SERVICE_AUTO_START

# Start service
Start-Service -Name $serviceName

Write-Host "LDAP service recreated on port 3100" -ForegroundColor Green