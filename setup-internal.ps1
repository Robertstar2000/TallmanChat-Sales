#Requires -RunAsAdministrator
param([string]$Domain = "chat.tallman.com")

Write-Host "==> Setting up internal chat.tallman.com" -ForegroundColor Cyan

# 1. Create self-signed certificate
$cert = New-SelfSignedCertificate -DnsName $Domain -CertStoreLocation "cert:\LocalMachine\My" -KeyUsage DigitalSignature,KeyEncipherment -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")

# 2. Setup IIS site
Import-Module WebAdministration
$sitePath = "C:\inetpub\wwwroot\tallman-chat"
New-Item -ItemType Directory -Path $sitePath -Force
Remove-Website -Name "TallmanChat" -ErrorAction SilentlyContinue
New-Website -Name "TallmanChat" -Port 80 -PhysicalPath $sitePath -HostHeader $Domain

# 3. Add HTTPS binding
New-WebBinding -Name "TallmanChat" -Protocol https -Port 443 -HostHeader $Domain
$binding = Get-WebBinding -Name "TallmanChat" -Protocol https
$binding.AddSslCertificate($cert.Thumbprint, "my")

# 4. Create web.config
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
    </system.webServer>
</configuration>
"@
$webConfig | Out-File -FilePath "$sitePath\web.config" -Encoding UTF8

Write-Host "✓ Internal setup complete!" -ForegroundColor Green
Write-Host "Certificate Thumbprint: $($cert.Thumbprint)" -ForegroundColor Yellow