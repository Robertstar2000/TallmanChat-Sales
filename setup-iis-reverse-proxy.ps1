# PowerShell script to set up IIS reverse proxy for Tallman Chat
# Run this script as Administrator

Write-Host "Setting up IIS Reverse Proxy for Tallman Chat..." -ForegroundColor Green
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

# Check and install URL Rewrite
Write-Host ""
Write-Host "Step 3: Checking URL Rewrite Module..." -ForegroundColor Cyan
$urlRewritePath = "${env:ProgramFiles}\IIS\Microsoft Web Farm Framework\rewrite.dll"

if (-not (Test-Path $urlRewritePath)) {
    Write-Host "Installing URL Rewrite Module..." -ForegroundColor Yellow

    # Try to install from Microsoft
    try {
        $rewriteMsi = "$env:TEMP\rewrite_amd64_en-US.msi"
        Invoke-WebRequest -Uri "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi" -OutFile $rewriteMsi

        $proc = Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$rewriteMsi`" /quiet /norestart" -Wait -PassThru
        if ($proc.ExitCode -eq 0) {
            Write-Host "URL Rewrite Module installed successfully." -ForegroundColor Green
        } else {
            Write-Host "URL Rewrite Module installation may have failed (Exit code: $($proc.ExitCode))." -ForegroundColor Yellow
        }

        Remove-Item $rewriteMsi -ErrorAction SilentlyContinue
    } catch {
        Write-Host "URL Rewrite Module download failed. Please install manually from:" -ForegroundColor Red
        Write-Host "https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor Yellow
    }
} else {
    Write-Host "URL Rewrite Module is already installed." -ForegroundColor Green
}

# Import WebAdministration module
Write-Host ""
Write-Host "Step 4: Configuring IIS site..." -ForegroundColor Cyan

try {
    Import-Module WebAdministration -ErrorAction Stop
    Write-Host "WebAdministration module imported." -ForegroundColor Green
} catch {
    Write-Host "Failed to import WebAdministration module: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please ensure IIS is properly installed and try again." -ForegroundColor Yellow
    exit 1
}

# Check if site already exists
$existingSite = Get-Website | Where-Object { $_.Name -eq "TallmanChat" }

if ($existingSite) {
    Write-Host "Removing existing TallmanChat site..." -ForegroundColor Yellow
    Remove-Website -Name "TallmanChat" -ErrorAction SilentlyContinue
}

# Create application pool
if (-not (Get-IISAppPool -Name "TallmanChatPool" -ErrorAction SilentlyContinue)) {
    Write-Host "Creating application pool 'TallmanChatPool'..." -ForegroundColor Yellow
    New-WebAppPool -Name "TallmanChatPool" -Force

    # Configure app pool
    Set-ItemProperty -Path "IIS:\AppPools\TallmanChatPool" -Name "managedRuntimeVersion" -Value ""
    Set-ItemProperty -Path "IIS:\AppPools\TallmanChatPool" -Name "enable32BitAppOnWin64" -Value $false
    Set-ItemProperty -Path "IIS:\AppPools\TallmanChatPool" -Name "startMode" -Value "AlwaysRunning"
} else {
    Write-Host "Application pool 'TallmanChatPool' already exists." -ForegroundColor Green
}

# Create physical directory if needed
$sitePhysicalPath = "C:\inetpub\TallmanChat"
if (-not (Test-Path $sitePhysicalPath)) {
    New-Item -ItemType Directory -Path $sitePhysicalPath -Force | Out-Null
    Write-Host "Created physical directory: $sitePhysicalPath" -ForegroundColor Yellow
}

# Create the IIS website
Write-Host "Creating IIS website 'TallmanChat'..." -ForegroundColor Yellow
New-Website -Name "TallmanChat" -PhysicalPath $sitePhysicalPath -ApplicationPool "TallmanChatPool" -HostHeader "chat.tallman.com" -Port 80 -Force

# Configure bindings (HTTP and HTTPS if certificate exists)
Write-Host "Configuring site bindings..." -ForegroundColor Yellow

# Check if SSL certificate exists for tallman.com
$certificate = Get-ChildItem Cert:\LocalMachine\My | Where-Object { $_.Subject -like "*tallman*" -or $_.DnsNameList -like "*tallman*" } | Select-Object -First 1

if ($certificate) {
    Write-Host "Found SSL certificate. Adding HTTPS binding..." -ForegroundColor Green
    New-WebBinding -Name "TallmanChat" -Protocol "https" -Port 443 -HostHeader "chat.tallman.com" -SslFlags 0
    $sslCertHash = $certificate.Thumbprint
    $null = netsh http add sslcert hostnameport="chat.tallman.com:443" certhash=$sslCertHash appid="{4dc3e181-e14b-4a21-b022-59fc669b0914}"
} else {
    Write-Host "No SSL certificate found for tallman.com. HTTPS binding skipped." -ForegroundColor Yellow
    Write-Host "You can add SSL later with proper domain certificate." -ForegroundColor Yellow
}

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
                <rule name="ReverseProxy" stopProcessing="true">
                    <match url="(.*)" />
                    <conditions logicalGrouping="MatchAll" trackAllCaptures="false">
                        <add input="{HTTPS}" pattern="off" />
                    </conditions>
                    <action type="Rewrite" url="http://localhost:3005/{R:1}" />
                </rule>
                <rule name="ReverseProxySSL" stopProcessing="true">
                    <match url="(.*)" />
                    <conditions logicalGrouping="MatchAll" trackAllCaptures="false">
                        <add input="{HTTPS}" pattern="on" />
                    </conditions>
                    <action type="Rewrite" url="http://localhost:3005/{R:1}" />
                </rule>
            </rules>
        </rewrite>
        <defaultDocument>
            <files>
                <clear />
                <add value="index.html" />
            </files>
        </defaultDocument>
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
Write-Host "Starting TallmanChat website..." -ForegroundColor Yellow
Start-Website -Name "TallmanChat"

Write-Host ""
Write-Host "IIS reverse proxy setup completed!" -ForegroundColor Green
Write-Host ""

# DNS configuration reminder
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Configure DNS: Create A record for 'chat.tallman.com' pointing to $($env:COMPUTERNAME)" -ForegroundColor White
Write-Host "2. Firewall: Ensure port 80 (and 443 if SSL) is open for domain traffic" -ForegroundColor White
Write-Host "3. Service: Ensure the Tallman Chat Windows services are running:" -ForegroundColor White
Write-Host "   'net start TallmanChatService' (main UI)" -ForegroundColor White
Write-Host "   'net start TallmanLDAPAuth' (authentication)" -ForegroundColor White
Write-Host ""

# Test URLs
Write-Host "Test the setup:" -ForegroundColor Cyan
Write-Host "  Local: http://localhost:80" -ForegroundColor White
Write-Host "  Domain: http://chat.tallman.com (requires DNS and firewall config)" -ForegroundColor White

if ($certificate) {
    Write-Host "  SSL Domain: https://chat.tallman.com" -ForegroundColor White
}

Write-Host ""
Write-Host "IMPORTANT: The Node.js services must be running on localhost:3005 for the proxy to work." -ForegroundColor Yellow

# Final verification
Write-Host ""
Write-Host "Verification:" -ForegroundColor Cyan
$iisSites = Get-Website
$tallmanSite = $iisSites | Where-Object { $_.Name -eq "TallmanChat" }
if ($tallmanSite) {
    Write-Host "  ✓ IIS site 'TallmanChat' created successfully" -ForegroundColor Green
    Write-Host "  ✓ Site state: $($tallmanSite.State)" -ForegroundColor White
    Write-Host "  ✓ Bindings: $($tallmanSite.Bindings.Collection | Select-Object -ExpandProperty BindingString)" -ForegroundColor White
} else {
    Write-Host "  ✗ IIS site creation failed" -ForegroundColor Red
}

$appPool = Get-IISAppPool -Name "TallmanChatPool" -ErrorAction SilentlyContinue
if ($appPool) {
    Write-Host "  ✓ Application pool 'TallmanChatPool' created successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Application pool creation may have failed" -ForegroundColor Red
}
