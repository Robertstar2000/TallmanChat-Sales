#Requires -RunAsAdministrator

# Stop the LDAP service
Stop-Service -Name "TallmanLDAPAuthService" -Force

# Set environment variable for port 3100
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\TallmanLDAPAuthService"
New-ItemProperty -Path $regPath -Name "Environment" -Value @("PORT=3100") -PropertyType MultiString -Force

# Start the service
Start-Service -Name "TallmanLDAPAuthService"

Write-Host "LDAP service updated to use port 3100" -ForegroundColor Green