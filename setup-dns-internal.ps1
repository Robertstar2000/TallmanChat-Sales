#Requires -RunAsAdministrator
# Internal DNS Setup for chat.tallman.com

param([string]$ServerIP = "10.10.20.9")

Write-Host "==> Adding DNS record to Domain Controller" -ForegroundColor Cyan

# Add DNS A record on domain controller
$dnsServer = "dc02.tallman.com"
$zoneName = "tallman.com"
$recordName = "chat"

try {
    # Remove existing record if present
    Remove-DnsServerResourceRecord -ZoneName $zoneName -Name $recordName -RRType A -ComputerName $dnsServer -Force -ErrorAction SilentlyContinue
    
    # Add new A record
    Add-DnsServerResourceRecordA -ZoneName $zoneName -Name $recordName -IPv4Address $ServerIP -ComputerName $dnsServer
    
    Write-Host "✓ DNS A record added: chat.tallman.com -> $ServerIP" -ForegroundColor Green
} catch {
    Write-Host "Manual DNS setup required:" -ForegroundColor Yellow
    Write-Host "On DC02: Add A record 'chat' pointing to $ServerIP in tallman.com zone"
}

# Test DNS resolution
Start-Sleep 5
$resolved = Resolve-DnsName "chat.tallman.com" -ErrorAction SilentlyContinue
if ($resolved) {
    Write-Host "✓ DNS resolution working: $($resolved.IPAddress)" -ForegroundColor Green
} else {
    Write-Host "⚠ DNS not resolving yet - may need time to propagate" -ForegroundColor Yellow
}