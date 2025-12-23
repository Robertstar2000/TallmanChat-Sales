#Requires -RunAsAdministrator

# Install LDAP service as Windows service
$serviceName = "TallmanChatLDAP"
$serviceDisplayName = "Tallman Chat LDAP Service"
$servicePath = "C:\Services\TallmanChat"
$scriptPath = "$PSScriptRoot\server\ldap-auth.js"
$nodePath = "C:\Program Files\nodejs\node.exe"

# Create service directory
New-Item -ItemType Directory -Path $servicePath -Force | Out-Null

# Copy server files
Copy-Item -Path "$PSScriptRoot\server\*" -Destination $servicePath -Recurse -Force

# Create service using sc command
$binPath = "`"$nodePath`" `"$servicePath\ldap-auth.js`""
$env:PORT = "3100"

# Remove existing service
sc.exe delete $serviceName 2>$null

# Create new service
sc.exe create $serviceName binPath= $binPath DisplayName= $serviceDisplayName start= auto
sc.exe description $serviceName "LDAP authentication service for Tallman Chat on port 3100"

# Set environment variable for port
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$serviceName"
New-ItemProperty -Path $regPath -Name "Environment" -Value @("PORT=3100") -PropertyType MultiString -Force

# Start service
sc.exe start $serviceName

Write-Host "LDAP service installed and started on port 3100"