#Requires -RunAsAdministrator
param([string]$Domain = "chat.tallman.com")

Write-Host "==> Setting up chat.tallman.com for production" -ForegroundColor Cyan

# 1. Install prerequisites
Write-Host "Installing IIS and URL Rewrite..."
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures -All
$rewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
$installer = "$env:TEMP\urlrewrite.msi"
Invoke-WebRequest -Uri $rewriteUrl -OutFile $installer
Start-Process msiexec.exe -ArgumentList "/i", $installer, "/quiet" -Wait
Remove-Item $installer

# 2. Create IIS site
Import-Module WebAdministration
$sitePath = "C:\inetpub\wwwroot\tallman-chat"
New-Item -ItemType Directory -Path $sitePath -Force
Remove-Website -Name "TallmanChat" -ErrorAction SilentlyContinue
New-Website -Name "TallmanChat" -Port 80 -PhysicalPath $sitePath -HostHeader $Domain

# 3. Create web.config for reverse proxy
$webConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="Reverse Proxy" stopProcessing="true">
                    <match url="(.*)" />
                    <action type="Rewrite" url="http://localhost:3200/{R:1}" />
                </rule>
            </rules>
        </rewrite>
        <httpRedirect enabled="false" />
    </system.webServer>
</configuration>
"@
$webConfig | Out-File -FilePath "$sitePath\web.config" -Encoding UTF8

# 4. Setup SSL
.\setup-ssl.ps1 -Domain $Domain

# 5. Configure firewall
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Force
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow -Force

Write-Host "✓ Production setup complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure DNS: A record chat.tallman.com -> $(Invoke-RestMethod -Uri 'https://api.ipify.org')"
Write-Host "2. Setup Cloudflare CDN (see cloudflare-setup.md)"
Write-Host "3. Start services: .\start-frontend.bat and .\start-ldap.bat"