# PowerShell script to create DNS A record for chat.tallman.com
# Run this script as Administrator on the Domain Controller (dc02.tallman.com)

Write-Host "Setting up DNS record for chat.tallman.com..." -ForegroundColor Green
Write-Host "This script must be run on the Domain Controller (DC02.tallman.com)" -ForegroundColor Yellow
Write-Host ""

# Check if running as administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator on the Domain Controller!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Import DNS server module
Write-Host "Importing DNS Server module..." -ForegroundColor Cyan
try {
    Import-Module DNSServer -ErrorAction Stop
    Write-Host "DNS Server module imported successfully." -ForegroundColor Green
} catch {
    Write-Host "Failed to import DNS Server module: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please ensure you're running this on a Domain Controller with DNS role installed." -ForegroundColor Yellow
    exit 1
}

# Get local server name
$localServer = $env:COMPUTERNAME
Write-Host "Running on server: $localServer" -ForegroundColor Cyan

# Configuration
$zoneName = "tallman.com"
$recordName = "chat"
$recordIP = "10.10.20.9"

Write-Host ""
Write-Host "DNS Configuration:" -ForegroundColor Cyan
Write-Host "Zone: $zoneName" -ForegroundColor White
Write-Host "Record: $recordName" -ForegroundColor White
Write-Host "IP Address: $recordIP" -ForegroundColor White
Write-Host ""

# Check if zone exists
try {
    $zone = Get-DnsServerZone -Name $zoneName -ErrorAction Stop
    Write-Host "Zone '$zoneName' exists: $($zone.ZoneName)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Zone '$zoneName' not found. Please create it first." -ForegroundColor Red
    Write-Host "On the Domain Controller, run: Add-DnsServerPrimaryZone -Name '$zoneName' -ReplicationScope Domain" -ForegroundColor Yellow
    exit 1
}

# Check if record already exists
$existingRecord = Get-DnsServerResourceRecord -ZoneName $zoneName -Name $recordName -RRType A -ErrorAction SilentlyContinue
if ($existingRecord) {
    Write-Host "Existing A record found:" -ForegroundColor Yellow
    $existingRecord | Select-Object HostName, @{Name="IP";Expression={$_.RecordData.IPv4Address}}
    Write-Host ""
    Write-Host "Updating existing record..." -ForegroundColor Yellow
    Remove-DnsServerResourceRecord -ZoneName $zoneName -Name $recordName -RRType A -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "No existing A record found. Creating new record..." -ForegroundColor Green
}

# Create the A record
Write-Host "Creating A record: $recordName.$zoneName -> $recordIP" -ForegroundColor Yellow
try {
    Add-DnsServerResourceRecordA -Name $recordName -ZoneName $zoneName -IPv4Address $recordIP -ErrorAction Stop
    Write-Host "A record created successfully!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to create A record: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verify the record was created
Write-Host ""
Write-Host "Verifying record creation..." -ForegroundColor Cyan
$newRecord = Get-DnsServerResourceRecord -ZoneName $zoneName -Name $recordName -RRType A
if ($newRecord) {
    Write-Host "✓ A record successfully created:" -ForegroundColor Green
    $newRecord | Select-Object HostName, @{Name="IP";Expression={$_.RecordData.IPv4Address}}, TimeToLive
} else {
    Write-Host "✗ Record creation may have failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing DNS resolution..." -ForegroundColor Cyan
try {
    $testResult = Resolve-DnsName -Name "$recordName.$zoneName" -Type A -ErrorAction Stop
    if ($testResult.IP4Address -eq $recordIP) {
        Write-Host "✓ DNS resolution successful: $recordName.$zoneName -> $($testResult.IP4Address)" -ForegroundColor Green
    } else {
        Write-Host "✗ DNS resolution failed or returned wrong IP" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ DNS resolution test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "DNS Record Setup Complete!" -ForegroundColor Green
Write-Host ""

# Final notes
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Verify chat.tallman.com resolves correctly from client machines" -ForegroundColor White
Write-Host "2. Test access: http://chat.tallman.com (should redirect to IIS proxy)" -ForegroundColor White
Write-Host "3. If using SSL: https://chat.tallman.com" -ForegroundColor White
Write-Host ""

Write-Host "Domain Controller: $localServer" -ForegroundColor Cyan
Write-Host "Record Created: $recordName.$zoneName" -ForegroundColor White
Write-Host "IP Address: $recordIP" -ForegroundColor White

#Replication note
Write-Host ""
Write-Host "NOTE: DNS changes may take a few minutes to replicate to other domain controllers," -ForegroundColor Yellow
Write-Host "and up to 15 minutes for client machines to refresh their DNS cache." -ForegroundColor Yellow

Write-Host ""
Write-Host "To force DNS cache refresh on client machines:" -ForegroundColor Cyan
Write-Host "ipconfig /flushdns" -ForegroundColor White
