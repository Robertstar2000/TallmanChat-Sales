# SAWS Deployment Script
param(
    [string]$Domain = "SuperAgent.tallman.com",
    [string]$Email = "admin@tallman.com"
)

# Configuration
$Config = @{
    SiteName = "SuperAgent"
    MainPort = 3200
    OllamaPort = 11434
    DeploymentPath = "C:\inetpub\wwwroot\superagent"
    ServicePath = "C:\Services\SuperAgent"
}

$BuildPath = $PSScriptRoot

# Utility Functions
function Write-Step($message) { Write-Host "==> $message" -ForegroundColor Cyan }
function Write-Success($message) { Write-Host "[OK] $message" -ForegroundColor Green }
function Write-Error($message) { Write-Host "✗ $message" -ForegroundColor Red }

# Main Deployment Function
function Deploy-SAWS {
    Write-Step "Starting SAWS Deployment"
    
    try {
        Install-Prerequisites
        Install-Ollama
        Setup-Backend
        Configure-IIS
        Test-Deployment
        Write-Success "SAWS deployment completed successfully!"
        Write-Host "Access at: http://localhost:3200" -ForegroundColor Yellow
    }
    catch {
        Write-Error "Deployment failed: $_"
        exit 1
    }
}

function Install-Prerequisites {
    Write-Step "Installing Prerequisites"
    
    # Check Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js not found. Install from nodejs.org"
        exit 1
    }
    
    # Enable IIS with ARR
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-HttpErrors, IIS-HttpLogging, IIS-RequestFiltering, IIS-StaticContent, IIS-DefaultDocument -All
    
    # Install URL Rewrite and ARR
    $rewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
    $arrUrl = "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi"
    
    $rewriteInstaller = "$env:TEMP\urlrewrite.msi"
    $arrInstaller = "$env:TEMP\arr.msi"
    
    Invoke-WebRequest -Uri $rewriteUrl -OutFile $rewriteInstaller -UseBasicParsing
    Invoke-WebRequest -Uri $arrUrl -OutFile $arrInstaller -UseBasicParsing
    
    Start-Process msiexec.exe -ArgumentList "/i", $rewriteInstaller, "/quiet" -Wait
    Start-Process msiexec.exe -ArgumentList "/i", $arrInstaller, "/quiet" -Wait
    
    Remove-Item $rewriteInstaller, $arrInstaller -Force
    
    Write-Success "Prerequisites installed"
}

function Install-Ollama {
    Write-Step "Installing Ollama"
    
    if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
        $ollamaUrl = "https://ollama.ai/download/ollama-windows-amd64.exe"
        $ollamaInstaller = "$env:TEMP\ollama-installer.exe"
        Invoke-WebRequest -Uri $ollamaUrl -OutFile $ollamaInstaller -UseBasicParsing
        Start-Process -FilePath $ollamaInstaller -ArgumentList "/S" -Wait
        Remove-Item $ollamaInstaller -Force
    }
    
    # Start Ollama service
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 5
    
    # Pull model
    & ollama pull llama3.1
    
    Write-Success "Ollama installed and configured"
}

function Setup-Backend {
    Write-Step "Setting up Backend Service"
    
    # Create directories
    New-Item -ItemType Directory -Path $Config.ServicePath -Force | Out-Null
    
    # Copy server files
    if (Test-Path "$BuildPath\server") {
        Copy-Item -Path "$BuildPath\server\*" -Destination $Config.ServicePath -Recurse -Force
    }
    
    # Create .env file
    $envContent = @"
JWT_SECRET=your-production-secret-key
PORT=$($Config.MainPort)
OLLAMA_URL=http://localhost:$($Config.OllamaPort)
NODE_ENV=production
"@
    
    $envContent | Out-File -FilePath "$($Config.ServicePath)\.env" -Encoding UTF8 -Force
    
    # Install dependencies
    if (Test-Path "$($Config.ServicePath)\package.json") {
        Push-Location $Config.ServicePath
        npm install --production
        Pop-Location
    }
    
    # Start backend service
    Push-Location $Config.ServicePath
    Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Hidden
    Pop-Location
    
    Write-Success "Backend service configured"
}

function Configure-IIS {
    Write-Step "Configuring IIS"
    
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    
    # Create deployment directory
    New-Item -ItemType Directory -Path $Config.DeploymentPath -Force | Out-Null
    
    # Remove existing site
    if (Get-Website -Name $Config.SiteName -ErrorAction SilentlyContinue) {
        Remove-Website -Name $Config.SiteName
    }
    
    # Create website with domain binding
    New-Website -Name $Config.SiteName -Port 80 -PhysicalPath $Config.DeploymentPath -Force
    
    # Add domain binding if not localhost
    if ($Domain -ne "localhost") {
        New-WebBinding -Name $Config.SiteName -Protocol http -Port 80 -HostHeader $Domain
    }
    
    # Create web.config with reverse proxy
    $webConfigPath = Join-Path $Config.DeploymentPath "web.config"
    $webConfigContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="Reverse Proxy" stopProcessing="true">
                    <match url="(.*)" />
                    <action type="Rewrite" url="http://localhost:$($Config.MainPort)/{R:1}" />
                    <serverVariables>
                        <set name="HTTP_X_FORWARDED_PROTO" value="http" />
                    </serverVariables>
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
"@
    
    $webConfigContent | Out-File -FilePath $webConfigPath -Encoding UTF8 -Force
    
    Write-Success "IIS configured with reverse proxy"
}

function Test-Deployment {
    Write-Step "Testing Deployment"
    
    Start-Sleep -Seconds 5
    
    $endpoints = @(
        @{Url="http://localhost:$($Config.OllamaPort)/api/tags"; Name="Ollama API"},
        @{Url="http://localhost:$($Config.MainPort)/api/health"; Name="Backend Health"},
        @{Url="http://localhost"; Name="IIS Frontend"}
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri $endpoint.Url -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Success "$($endpoint.Name) - OK"
            }
        }
        catch {
            Write-Error "$($endpoint.Name) - Failed: $_"
        }
    }
}

# Run deployment
Deploy-SAWS