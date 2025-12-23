# SSL Certificate Renewal Script for Tallman Chat Services
# Run this script every 30 days to renew certificates before expiration
# Requires administrator privileges

param(
    [string]$Country = "US",
    [string]$State = "Indiana",
    [string]$City = "Columbus",
    [string]$Organization = "Tallman Equipment Co., Inc.",
    [string]$OrganizationalUnit = "IT Department",
    [string]$CommonName = "chat.tallman.com",
    [string]$Email = "admin@tallman.com",
    [int]$ValidityDays = 365
)

# Ensure we're running as administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "This script requires administrator privileges. Please run as administrator."
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  TALLMAN CHAT SSL CERTIFICATE RENEWAL" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$certPath = Join-Path $scriptDir "tallman-chat-server.pem"
$keyPath = Join-Path $scriptDir "tallman-chat-server-key.pem"

# Backup existing certificates
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $scriptDir "ssl-backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

Write-Host "🔄 Backing up existing certificates..." -ForegroundColor Yellow

if (Test-Path $certPath) {
    Copy-Item $certPath (Join-Path $backupDir "tallman-chat-server-$timestamp.pem") -Force
}
if (Test-Path $keyPath) {
    Copy-Item $keyPath (Join-Path $backupDir "tallman-chat-server-key-$timestamp.pem") -Force
}

Write-Host "✅ Backup created in: $backupDir" -ForegroundColor Green
Write-Host ""

# Create OpenSSL configuration file
$opensslConf = @"
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = $Country
ST = $State
L = $City
O = $Organization
OU = $OrganizationalUnit
CN = $CommonName
emailAddress = $Email

[v3_req]
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $CommonName
DNS.2 = chat.tallman.com
DNS.3 = localhost
IP.1 = 127.0.0.1
IP.2 = 10.10.20.9
"@

$configPath = Join-Path $scriptDir "openssl-renewal.conf"
$opensslConf | Out-File -FilePath $configPath -Encoding UTF8 -Force

Write-Host "🔑 Generating new SSL certificate..." -ForegroundColor Yellow
Write-Host "   Subject: CN=$CommonName, O=$Organization" -ForegroundColor Gray
Write-Host "   Validity: $ValidityDays days" -ForegroundColor Gray
Write-Host "   Alt Names: chat.tallman.com, localhost, 127.0.0.1, 10.10.20.9" -ForegroundColor Gray
Write-Host ""

try {
    # Generate private key
    $keyGenResult = & openssl genrsa -out $keyPath 2048 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to generate private key: $keyGenResult"
    }

    # Generate certificate signing request and certificate
    $certResult = & openssl req -new -x509 -key $keyPath -out $certPath -days $ValidityDays -config $configPath -extensions v3_req 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to generate certificate: $certResult"
    }

    Write-Host "✅ SSL certificate generated successfully!" -ForegroundColor Green
    Write-Host ""

    # Verify certificate
    Write-Host "🔍 Verifying certificate..." -ForegroundColor Yellow
    $verifyResult = & openssl x509 -in $certPath -text -noout | Select-String -Pattern "Subject:|Issuer:|Not Before:|Not After:|DNS:|IP Address:"
    $verifyResult | ForEach-Object { Write-Host "   $($_.Line.Trim())" -ForegroundColor Gray }

    Write-Host ""
    Write-Host "✅ Certificate verification complete!" -ForegroundColor Green

    # Clean up config file
    Remove-Item $configPath -Force

} catch {
    Write-Error "Failed to generate SSL certificate: $_"
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  RENEWAL COMPLETE - SERVICES MUST RESTART" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 Certificate Files:" -ForegroundColor White
Write-Host "   Certificate: $certPath" -ForegroundColor Gray
Write-Host "   Private Key: $keyPath" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  IMPORTANT - Restart HTTPS Services:" -ForegroundColor Yellow
Write-Host "   1. Stop services: uninstall-https-services.bat" -ForegroundColor White
Write-Host "   2. Start services: https-service.bat" -ForegroundColor White
Write-Host ""
Write-Host "Or manually restart:" -ForegroundColor White
Write-Host "   net stop TallmanChatHTTPS" -ForegroundColor Gray
Write-Host "   net stop TallmanBackendHTTPS" -ForegroundColor Gray
Write-Host "   net stop TallmanLDAPAuthHTTPS" -ForegroundColor Gray
Write-Host "   net start TallmanLDAPAuthHTTPS" -ForegroundColor Gray
Write-Host "   net start TallmanBackendHTTPS" -ForegroundColor Gray
Write-Host "   net start TallmanChatHTTPS" -ForegroundColor Gray
Write-Host ""
Write-Host "🔒 Next renewal needed: $((Get-Date).AddDays(30).ToString('yyyy-MM-dd'))" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 SSL Certificate renewal completed successfully!" -ForegroundColor Green
