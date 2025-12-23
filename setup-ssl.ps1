#Requires -RunAsAdministrator
param([string]$Domain = "chat.tallman.com")

Write-Host "Setting up SSL for $Domain"

# Install Certbot
if (-not (Get-Command certbot -ErrorAction SilentlyContinue)) {
    choco install certbot -y
}

# Stop IIS
Stop-Service W3SVC -Force

try {
    # Get certificate
    certbot certonly --standalone --non-interactive --agree-tos --email admin@tallman.com -d $Domain -d www.$Domain
    
    # Import to Windows certificate store
    $certPath = "C:\Certbot\live\$Domain"
    if (Test-Path "$certPath\fullchain.pem") {
        $cert = Import-Certificate -FilePath "$certPath\fullchain.pem" -CertStoreLocation Cert:\LocalMachine\My
        
        # Bind to IIS
        Import-Module WebAdministration
        New-WebBinding -Name "TallmanChat" -Protocol https -Port 443 -HostHeader $Domain
        $binding = Get-WebBinding -Name "TallmanChat" -Protocol https
        $binding.AddSslCertificate($cert.Thumbprint, "my")
        
        Write-Host "SSL certificate installed for $Domain"
    }
} finally {
    Start-Service W3SVC
}

# Auto-renewal task
$action = New-ScheduledTaskAction -Execute "certbot" -Argument "renew --quiet --post-hook `"iisreset`""
$trigger = New-ScheduledTaskTrigger -Daily -At "2:00AM"
Register-ScheduledTask -TaskName "SSLRenewal" -Action $action -Trigger $trigger -User "SYSTEM" -RunLevel Highest -Force