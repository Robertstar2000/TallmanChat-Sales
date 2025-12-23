#Requires -RunAsAdministrator

# Delete duplicate LDAP services
$servicesToDelete = @("TallmanLDAPAuth", "TallmanDashboard", "TallmanBackendService")

foreach ($service in $servicesToDelete) {
    try {
        Stop-Service -Name $service -Force -ErrorAction SilentlyContinue
        sc.exe delete $service
        Write-Host "Deleted service: $service" -ForegroundColor Green
    } catch {
        Write-Host "Service $service not found or already deleted" -ForegroundColor Yellow
    }
}

# Start the correct LDAP service
Start-Service -Name "TallmanLDAPAuthService"
Write-Host "Started TallmanLDAPAuthService" -ForegroundColor Green

# Check service status
Get-Service -Name "TallmanLDAPAuthService"