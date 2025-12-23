# PowerShell script to set up IIS for production Tallman Chat
# Frontend served from IIS, backend proxy to port 3215
# Run this script as Administrator

Write-Host "Setting up IIS for Production Tallman Chat..." -ForegroundColor Green
Write-Host "Frontend: IIS Static Files" -ForegroundColor Cyan
Write-Host "Backend: Proxy to localhost:3215" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Checking IIS installation..." -ForegroundColor Cyan
$webServerMgmtInstalled = Get-WindowsOptionalFeature -Online -FeatureName IIS-WebServerManagementTools | Select-Object -ExpandProperty State
$webServerRoleInstalled = Get-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole | Select-Object -ExpandProperty State

if ($webServerMgmtInstalled -ne "Enabled" -or $webServerRoleInstalled -ne "Enabled") {
    Write-Host "IIS not fully installed. Installing IIS..." -ForegroundColor Yellow
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-HttpErrors, IIS-HttpRedirect, IIS-HttpLogging, IIS-RequestFiltering, IIS-StaticContent, IIS-WebServerManagementTools -All
    Write-Host "IIS installation completed. Reboot may be required." -ForegroundColor Green
} else {
    Write-Host "IIS is already installed." -ForegroundColor Green
}

# Check and install Application Request Routing
Write-Host ""
Write-Host "Step 2: Checking Application Request Routing..." -ForegroundColor Cyan
$appRequestRouting = Get-WindowsOptionalFeature -Online -FeatureName IIS-ApplicationRequestRouting | Select-Object -ExpandProperty State

if ($appRequestRouting -ne "Enabled") {
    Write-Host "Installing Application Request Routing..." -ForegroundColor Yellow
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-ApplicationRequestRouting -All
    Write-Host "Application Request Routing installed." -ForegroundColor Green
} else {
    Write-Host "Application Request Routing is already installed." -ForegroundColor Green
}

# Import WebAdministration module
Write-Host ""
Write-Host "Step 3: Configuring IIS site..." -ForegroundColor Cyan

try {
    Import-Module WebAdministration -ErrorAction Stop
    Write-Host "WebAdministration module imported." -ForegroundColor Green
} catch {
    Write-Host "Failed to import WebAdministration module: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please ensure IIS is properly installed and try again." -ForegroundColor Yellow
    exit 1
}

# Check if site already exists
$existingSite = Get-Website | Where-Object { $_.Name -eq "TallmanChatProd" }

if ($existingSite) {
    Write-Host "Removing existing TallmanChatProd site..." -ForegroundColor Yellow
    Remove-Website -Name "TallmanChatProd" -ErrorAction SilentlyContinue
}

# Create application pool
if (-not (Get-IISAppPool -Name "TallmanProdPool" -ErrorAction SilentlyContinue)) {
    Write-Host "Creating application pool 'TallmanProdPool'..." -ForegroundColor Yellow
    New-WebAppPool -Name "TallmanProdPool" -Force

    # Configure app pool
    Set-ItemProperty -Path "IIS:\AppPools\TallmanProdPool" -Name "managedRuntimeVersion" -Value ""
    Set-ItemProperty -Path "IIS:\AppPools\TallmanProdPool" -Name "enable32BitAppOnWin64" -Value $false
    Set-ItemProperty -Path "IIS:\AppPools\TallmanProdPool" -Name "startMode" -Value "AlwaysRunning"
} else {
    Write-Host "Application pool 'TallmanProdPool' already exists." -ForegroundColor Green
}

# Create physical directory if needed
$sitePhysicalPath = "C:\inetpub\TallmanChatProd"
if (-not (Test-Path $sitePhysicalPath)) {
    New-Item -ItemType Directory -Path $sitePhysicalPath -Force | Out-Null
    Write-Host "Created physical directory: $sitePhysicalPath" -ForegroundColor Yellow
}

# Copy built frontend files to IIS directory
$sourcePath = Join-Path $PSScriptRoot "dist"
if (Test-Path $sourcePath) {
    Write-Host "Copying built frontend files to IIS directory..." -ForegroundColor Yellow
    Copy-Item "$sourcePath\*" $sitePhysicalPath -Recurse -Force
    Write-Host "Frontend files copied successfully." -ForegroundColor Green
} else {
    Write-Host "WARNING: dist folder not found. Please run 'npm run build' first." -ForegroundColor Yellow
}

# Create the IIS website
Write-Host "Creating IIS website 'TallmanChatProd'..." -ForegroundColor Yellow
New-Website -Name "TallmanChatProd" -PhysicalPath $sitePhysicalPath -ApplicationPool "TallmanProdPool" -HostHeader "chat.tallman.com" -Port 80 -Force

# Configure reverse proxy rules using URL Rewrite
Write-Host "Setting up reverse proxy rules..." -ForegroundColor Yellow

# Ensure ARR is enabled at server level
Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -location '' -filter "system.webServer/proxy" -name "enabled" -value "true"

# Create web.config for the website
$webConfigContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <proxy enabled="true" />
        <rewrite>
            <rules>
                <rule name="ReverseProxyAPI" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <conditions logicalGrouping="MatchAll" trackAllCaptures="false">
                    </conditions>
                    <action type="Rewrite" url="http://localhost:3215/api/{R:1}" />
                </rule>
            </rules>
        </rewrite>
        <defaultDocument>
            <files>
                <clear />
                <add value="index.html" />
            </files>
        </defaultDocument>
        <staticContent>
            <mimeMap fileExtension=".css" mimeType="text/css" />
            <mimeMap fileExtension=".js" mimeType="application/javascript" />
            <mimeMap fileExtension=".woff" mimeType="font/woff" />
            <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
        </staticContent>
        <security>
            <requestFiltering allowDoubleEscaping="true" />
        </security>
    </system.webServer>
</configuration>
"@

$webConfigPath = Join-Path $sitePhysicalPath "web.config"
$webConfigContent | Out-File -FilePath $webConfigPath -Encoding UTF8 -Force
Write-Host "Created web.config with reverse proxy rules." -ForegroundColor Green

# Start the website
Write-Host "Starting TallmanChatProd website..." -ForegroundColor Yellow
Start-Website -Name "TallmanChatProd"

Write-Host ""
Write-Host "IIS production setup completed!" -ForegroundColor Green
Write-Host ""

# DNS configuration reminder
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Ensure TallmanChatBackend service is running:" -ForegroundColor White
Write-Host "   net start TallmanChatBackend" -ForegroundColor White
Write-Host ""
Write-Host "2. DNS configuration: Create A record for 'chat.tallman.com' pointing to server IP" -ForegroundColor White
Write-Host "3. Firewall: Ensure ports 80 (IIS) and 3215 (backend) are open" -ForegroundColor White
Write-Host ""

# Test URLs
Write-Host "Test the production setup:" -ForegroundColor Cyan
Write-Host "  IIS Frontend: http://localhost" -ForegroundColor White
Write-Host "  Domain: http://chat.tallman.com (requires DNS config)" -ForegroundColor White
Write-Host "  Backend API: http://localhost:3215/api/health (direct backend access)" -ForegroundColor White

Write-Host ""
Write-Host "IMPORTANT: The TallmanChatBackend service must be running on localhost:3215" -ForegroundColor Yellow

# Final verification
Write-Host ""
Write-Host "Verification:" -ForegroundColor Cyan
$iisSites = Get-Website
$tallmanSite = $iisSites | Where-Object { $_.Name -eq "TallmanChatProd" }
if ($tallmanSite) {
    Write-Host "  ✓ IIS site 'TallmanChatProd' created successfully" -ForegroundColor Green
    Write-Host "  ✓ Site state: $($tallmanSite.State)" -ForegroundColor White
    Write-Host "  ✓ Bindings: $($tallmanSite.Bindings.Collection | Select-Object -ExpandProperty BindingString)" -ForegroundColor White
} else {
    Write-Host "  ✗ IIS site creation failed" -ForegroundColor Red
}

$appPool = Get-IISAppPool -Name "TallmanProdPool" -ErrorAction SilentlyContinue
if ($appPool) {
    Write-Host "  ✓ Application pool 'TallmanProdPool' created successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Application pool creation may have failed" -ForegroundColor Red
}

$backendService = Get-Service "TallmanChatBackend" -ErrorAction SilentlyContinue
if ($backendService) {
    Write-Host "  ✓ Backend service 'TallmanChatBackend' installed" -ForegroundColor Green
    Write-Host "  ✓ Service status: $($backendService.Status)" -ForegroundColor White
} else {
    Write-Host "  ⚠ Backend service not found. Run install-production-backend.bat first" -ForegroundColor Yellow
}
