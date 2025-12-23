# Automated Deployment Pipeline for Tallman Chat

## Overview

This document describes an automated CI/CD pipeline for deploying the Tallman Chat application to the `tallman.com` domain with IIS frontend, Node.js backend services, Ollama integration, and future LDAP authentication.

## Architecture Components

### Frontend
- **Technology**: React/TypeScript with Vite
- **Hosting**: IIS (Internet Information Services)
- **Domain**: `chat.tallman.com`
- **SSL**: Let's Encrypt with auto-renewal
- **CDN**: Cloudflare for global distribution

### Backend Services
- **Main API Server**: Node.js/Express (Port 3001)
- **LDAP Auth Service**: Node.js/Express (Port 3002) 
- **Ollama Service**: Local AI model server (Port 11434)
- **Service Management**: Windows Services via NSSM

### Infrastructure
- **Web Server**: IIS with reverse proxy
- **SSL/TLS**: Let's Encrypt certificates
- **DNS**: Cloudflare DNS management
- **Monitoring**: Application Insights integration

## Pipeline Stages

### 1. Source Control & Triggers
```yaml
Triggers:
- Push to main branch
- Pull request merge
- Manual deployment trigger
- Scheduled deployments (optional)
```

### 2. Build Stage
```yaml
Build Process:
1. Install Node.js dependencies
2. Run TypeScript compilation
3. Execute Vite build for production
4. Run unit tests
5. Generate build artifacts
6. Create deployment package
```

### 3. Test Stage
```yaml
Testing:
1. Unit tests (Jest/Vitest)
2. Integration tests
3. LDAP connectivity tests
4. Ollama service tests
5. Security scans
6. Performance tests
```

### 4. Deployment Stage
```yaml
Deployment:
1. Stop existing services
2. Backup current deployment
3. Deploy new build artifacts
4. Update IIS configuration
5. Restart Windows services
6. Verify deployment health
7. Update DNS if needed
```

### 5. Post-Deployment
```yaml
Verification:
1. Health checks
2. Smoke tests
3. SSL certificate validation
4. CDN cache invalidation
5. Monitoring alerts setup
```

## Detailed Implementation

### Prerequisites Setup

#### 1. Server Requirements
```powershell
# Windows Server 2019/2022
# IIS with URL Rewrite module
# Node.js 18+ LTS
# Git for Windows
# PowerShell 5.1+
```

#### 2. Required Software Installation
```powershell
# Install Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# Install required software
choco install nodejs git iis-urlrewrite -y
choco install nssm -y  # For Windows service management
```

### Pipeline Configuration Files

#### 1. GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy Tallman Chat

on:
  push:
    branches: [ main ]
  workflow_dispatch:

env:
  NODE_VERSION: '18'
  DEPLOYMENT_PATH: 'C:\inetpub\wwwroot\tallman-chat'
  SERVICE_PATH: 'C:\Services\TallmanChat'

jobs:
  build:
    runs-on: windows-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm ci
        cd server && npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build
    
    - name: Create deployment package
      run: |
        Compress-Archive -Path dist\*, server\*, package.json -DestinationPath tallman-chat-${{ github.sha }}.zip
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v4
      with:
        name: tallman-chat-build
        path: tallman-chat-${{ github.sha }}.zip

  deploy:
    needs: build
    runs-on: self-hosted
    environment: production
    
    steps:
    - name: Download artifacts
      uses: actions/download-artifact@v4
      with:
        name: tallman-chat-build
    
    - name: Deploy to IIS
      run: .\scripts\deploy.ps1
      env:
        GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        LDAP_URL: ${{ secrets.LDAP_URL }}
        LDAP_BIND_DN: ${{ secrets.LDAP_BIND_DN }}
        LDAP_BIND_PASSWORD: ${{ secrets.LDAP_BIND_PASSWORD }}
```

#### 2. Deployment Script
```powershell
# scripts/deploy.ps1
param(
    [string]$BuildPath = ".",
    [string]$DeploymentPath = "C:\inetpub\wwwroot\tallman-chat",
    [string]$ServicePath = "C:\Services\TallmanChat",
    [string]$BackupPath = "C:\Backups\TallmanChat"
)

Write-Host "Starting Tallman Chat deployment..." -ForegroundColor Green

# Create backup
$BackupFolder = "$BackupPath\$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if (Test-Path $DeploymentPath) {
    Write-Host "Creating backup..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $BackupFolder -Force
    Copy-Item -Path "$DeploymentPath\*" -Destination $BackupFolder -Recurse -Force
}

# Stop services
Write-Host "Stopping services..." -ForegroundColor Yellow
Stop-Service -Name "TallmanChatMain" -ErrorAction SilentlyContinue
Stop-Service -Name "TallmanChatLDAP" -ErrorAction SilentlyContinue
Stop-Service -Name "TallmanChatOllama" -ErrorAction SilentlyContinue

# Extract and deploy
Write-Host "Deploying new version..." -ForegroundColor Yellow
$ZipFile = Get-ChildItem -Path $BuildPath -Filter "tallman-chat-*.zip" | Select-Object -First 1
if ($ZipFile) {
    Expand-Archive -Path $ZipFile.FullName -DestinationPath $DeploymentPath -Force
}

# Update service files
Copy-Item -Path "$DeploymentPath\server\*" -Destination $ServicePath -Recurse -Force

# Install/Update services
& "$PSScriptRoot\setup-services.ps1"

# Update IIS configuration
& "$PSScriptRoot\setup-iis.ps1"

# Start services
Write-Host "Starting services..." -ForegroundColor Yellow
Start-Service -Name "TallmanChatMain"
Start-Service -Name "TallmanChatLDAP"
Start-Service -Name "TallmanChatOllama"

# Health check
Write-Host "Performing health checks..." -ForegroundColor Yellow
& "$PSScriptRoot\health-check.ps1"

Write-Host "Deployment completed successfully!" -ForegroundColor Green
```

#### 3. Service Setup Script
```powershell
# scripts/setup-services.ps1
$ServicePath = "C:\Services\TallmanChat"
$NSSMPath = "C:\ProgramData\chocolatey\bin\nssm.exe"

# Ensure service directory exists
New-Item -ItemType Directory -Path $ServicePath -Force

# Main Chat Service
Write-Host "Setting up TallmanChatMain service..." -ForegroundColor Yellow
& $NSSMPath remove TallmanChatMain confirm
& $NSSMPath install TallmanChatMain "C:\Program Files\nodejs\node.exe"
& $NSSMPath set TallmanChatMain Parameters "$ServicePath\production-server.js"
& $NSSMPath set TallmanChatMain AppDirectory $ServicePath
& $NSSMPath set TallmanChatMain DisplayName "Tallman Chat Main Service"
& $NSSMPath set TallmanChatMain Description "Main API service for Tallman Chat application"
& $NSSMPath set TallmanChatMain Start SERVICE_AUTO_START
& $NSSMPath set TallmanChatMain AppStdout "$ServicePath\logs\main-service.log"
& $NSSMPath set TallmanChatMain AppStderr "$ServicePath\logs\main-service-error.log"

# LDAP Auth Service
Write-Host "Setting up TallmanChatLDAP service..." -ForegroundColor Yellow
& $NSSMPath remove TallmanChatLDAP confirm
& $NSSMPath install TallmanChatLDAP "C:\Program Files\nodejs\node.exe"
& $NSSMPath set TallmanChatLDAP Parameters "$ServicePath\ldap-auth.js"
& $NSSMPath set TallmanChatLDAP AppDirectory $ServicePath
& $NSSMPath set TallmanChatLDAP DisplayName "Tallman Chat LDAP Service"
& $NSSMPath set TallmanChatLDAP Description "LDAP authentication service for Tallman Chat"
& $NSSMPath set TallmanChatLDAP Start SERVICE_AUTO_START
& $NSSMPath set TallmanChatLDAP AppStdout "$ServicePath\logs\ldap-service.log"
& $NSSMPath set TallmanChatLDAP AppStderr "$ServicePath\logs\ldap-service-error.log"

# Ollama Service (if not already installed)
Write-Host "Setting up Ollama service..." -ForegroundColor Yellow
if (-not (Get-Service -Name "Ollama" -ErrorAction SilentlyContinue)) {
    # Download and install Ollama
    $OllamaInstaller = "$env:TEMP\ollama-windows-amd64.exe"
    Invoke-WebRequest -Uri "https://ollama.ai/download/ollama-windows-amd64.exe" -OutFile $OllamaInstaller
    Start-Process -FilePath $OllamaInstaller -ArgumentList "/S" -Wait
}

Write-Host "Services setup completed!" -ForegroundColor Green
```

#### 4. IIS Configuration Script
```powershell
# scripts/setup-iis.ps1
Import-Module WebAdministration

$SiteName = "TallmanChat"
$SitePath = "C:\inetpub\wwwroot\tallman-chat"
$Domain = "chat.tallman.com"

Write-Host "Configuring IIS for Tallman Chat..." -ForegroundColor Yellow

# Remove existing site if it exists
if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
    Remove-Website -Name $SiteName
}

# Create new website
New-Website -Name $SiteName -Port 80 -PhysicalPath $SitePath

# Create web.config for reverse proxy
$WebConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="API Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:3001/api/{R:1}" />
                </rule>
                <rule name="LDAP Proxy" stopProcessing="true">
                    <match url="^auth/(.*)" />
                    <action type="Rewrite" url="http://localhost:3002/auth/{R:1}" />
                </rule>
                <rule name="SPA Fallback" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/index.html" />
                </rule>
            </rules>
        </rewrite>
        <staticContent>
            <mimeMap fileExtension=".json" mimeType="application/json" />
            <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
        </staticContent>
        <httpProtocol>
            <customHeaders>
                <add name="X-Frame-Options" value="DENY" />
                <add name="X-Content-Type-Options" value="nosniff" />
                <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
            </customHeaders>
        </httpProtocol>
    </system.webServer>
</configuration>
"@

$WebConfig | Out-File -FilePath "$SitePath\web.config" -Encoding UTF8

Write-Host "IIS configuration completed!" -ForegroundColor Green
```

#### 5. SSL Setup Script
```powershell
# scripts/setup-ssl.ps1
param(
    [string]$Domain = "chat.tallman.com",
    [string]$Email = "admin@tallman.com"
)

Write-Host "Setting up SSL certificate for $Domain..." -ForegroundColor Yellow

# Install Certbot if not present
if (-not (Get-Command certbot -ErrorAction SilentlyContinue)) {
    choco install certbot -y
}

# Stop IIS temporarily
Stop-Service W3SVC

# Request certificate
certbot certonly --standalone --email $Email --agree-tos --no-eff-email -d $Domain

# Start IIS
Start-Service W3SVC

# Import certificate to IIS
$CertPath = "C:\Certbot\live\$Domain"
if (Test-Path $CertPath) {
    $Cert = Import-PfxCertificate -FilePath "$CertPath\fullchain.pem" -CertStoreLocation Cert:\LocalMachine\My
    
    # Bind certificate to IIS site
    Import-Module WebAdministration
    New-WebBinding -Name "TallmanChat" -Protocol https -Port 443
    $Binding = Get-WebBinding -Name "TallmanChat" -Protocol https
    $Binding.AddSslCertificate($Cert.Thumbprint, "my")
}

# Setup auto-renewal
$TaskAction = New-ScheduledTaskAction -Execute "certbot" -Argument "renew --quiet"
$TaskTrigger = New-ScheduledTaskTrigger -Daily -At "2:00AM"
$TaskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "CertbotRenewal" -Action $TaskAction -Trigger $TaskTrigger -Settings $TaskSettings -User "SYSTEM"

Write-Host "SSL setup completed!" -ForegroundColor Green
```

#### 6. Health Check Script
```powershell
# scripts/health-check.ps1
$Endpoints = @(
    "http://localhost:3001/api/health",
    "http://localhost:3002/auth/health",
    "https://chat.tallman.com"
)

Write-Host "Performing health checks..." -ForegroundColor Yellow

foreach ($Endpoint in $Endpoints) {
    try {
        $Response = Invoke-WebRequest -Uri $Endpoint -TimeoutSec 30
        if ($Response.StatusCode -eq 200) {
            Write-Host "✓ $Endpoint - OK" -ForegroundColor Green
        } else {
            Write-Host "✗ $Endpoint - Status: $($Response.StatusCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ $Endpoint - Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Check Windows services
$Services = @("TallmanChatMain", "TallmanChatLDAP")
foreach ($ServiceName in $Services) {
    $Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($Service -and $Service.Status -eq "Running") {
        Write-Host "✓ Service $ServiceName - Running" -ForegroundColor Green
    } else {
        Write-Host "✗ Service $ServiceName - Not running" -ForegroundColor Red
    }
}

Write-Host "Health checks completed!" -ForegroundColor Yellow
```

#### 7. Environment Configuration
```powershell
# scripts/setup-environment.ps1
$ServicePath = "C:\Services\TallmanChat"

# Create environment file for services
$EnvContent = @"
NODE_ENV=production
PORT=3001
LDAP_PORT=3002
OLLAMA_URL=http://localhost:11434
GEMINI_API_KEY=$env:GEMINI_API_KEY
LDAP_URL=$env:LDAP_URL
LDAP_BIND_DN=$env:LDAP_BIND_DN
LDAP_BIND_PASSWORD=$env:LDAP_BIND_PASSWORD
LOG_LEVEL=info
"@

$EnvContent | Out-File -FilePath "$ServicePath\.env" -Encoding UTF8

Write-Host "Environment configuration completed!" -ForegroundColor Green
```

## DNS and CDN Configuration

### Cloudflare Setup
```yaml
DNS Records:
- Type: A
  Name: chat
  Value: [Server IP]
  TTL: Auto
  Proxy: Enabled (Orange Cloud)

- Type: CNAME  
  Name: www.chat
  Value: chat.tallman.com
  TTL: Auto
  Proxy: Enabled

Security Settings:
- SSL/TLS: Full (Strict)
- Always Use HTTPS: On
- HSTS: Enabled
- Minimum TLS Version: 1.2

Performance:
- Caching Level: Standard
- Browser Cache TTL: 4 hours
- Edge Cache TTL: 2 hours
```

## Monitoring and Logging

### Application Insights Integration
```javascript
// Add to production-server.js
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING);
appInsights.start();
```

### Log Aggregation
```yaml
Logs Location:
- IIS Logs: C:\inetpub\logs\LogFiles
- Service Logs: C:\Services\TallmanChat\logs
- Application Logs: Windows Event Log
- Error Logs: Custom log files per service
```

## Security Considerations

### Firewall Rules
```powershell
# Allow only necessary ports
New-NetFirewallRule -DisplayName "Tallman Chat HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Tallman Chat HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
New-NetFirewallRule -DisplayName "Tallman Chat API" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -RemoteAddress LocalSubnet
New-NetFirewallRule -DisplayName "Tallman Chat LDAP" -Direction Inbound -Protocol TCP -LocalPort 3002 -Action Allow -RemoteAddress LocalSubnet
```

### Security Headers
```xml
<!-- Additional security headers in web.config -->
<httpProtocol>
    <customHeaders>
        <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
        <add name="Content-Security-Policy" value="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" />
        <add name="X-Frame-Options" value="DENY" />
        <add name="X-Content-Type-Options" value="nosniff" />
    </customHeaders>
</httpProtocol>
```

## Rollback Strategy

### Automated Rollback
```powershell
# scripts/rollback.ps1
param([string]$BackupVersion)

$BackupPath = "C:\Backups\TallmanChat\$BackupVersion"
$DeploymentPath = "C:\inetpub\wwwroot\tallman-chat"
$ServicePath = "C:\Services\TallmanChat"

if (Test-Path $BackupPath) {
    # Stop services
    Stop-Service -Name "TallmanChatMain", "TallmanChatLDAP" -Force
    
    # Restore files
    Remove-Item -Path "$DeploymentPath\*" -Recurse -Force
    Copy-Item -Path "$BackupPath\*" -Destination $DeploymentPath -Recurse
    
    # Restart services
    Start-Service -Name "TallmanChatMain", "TallmanChatLDAP"
    
    Write-Host "Rollback to $BackupVersion completed!" -ForegroundColor Green
} else {
    Write-Error "Backup version $BackupVersion not found!"
}
```

## Pipeline Execution Flow

1. **Code Commit** → Triggers GitHub Actions workflow
2. **Build Stage** → Compiles TypeScript, builds React app, runs tests
3. **Package Stage** → Creates deployment artifacts
4. **Deploy Stage** → Deploys to self-hosted runner (Windows Server)
5. **Service Update** → Updates Windows services with new code
6. **IIS Update** → Updates web server configuration
7. **Health Check** → Verifies all services are running correctly
8. **Notification** → Sends deployment status to team

## Maintenance Tasks

### Daily
- Health check monitoring
- Log file rotation
- SSL certificate validation

### Weekly  
- Security updates check
- Performance metrics review
- Backup verification

### Monthly
- Full system backup
- Security audit
- Performance optimization review

This pipeline provides a robust, automated deployment solution for the Tallman Chat application with proper security, monitoring, and rollback capabilities.