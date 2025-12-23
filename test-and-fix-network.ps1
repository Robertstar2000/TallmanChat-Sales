# Test and Fix Tallman Chat Network Access
Write-Host "🔍 Testing Tallman Chat Network Access..." -ForegroundColor Cyan

# Test localhost
try {
    $response = Invoke-WebRequest -Method GET -Uri "http://localhost:3005/api/health" -UseBasicParsing -TimeoutSec 5
    $health = $response.Content | ConvertFrom-Json
    Write-Host "✅ Localhost (127.0.0.1:3005): CONNECTED" -ForegroundColor Green
    Write-Host "   Server IP: $($health.serverIP)" -ForegroundColor Gray
    Write-Host "   Port: $($health.port)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Localhost (127.0.0.1:3005): NOT CONNECTED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test external IP
try {
    $response = Invoke-WebRequest -Method GET -Uri "http://10.10.20.9:3005/api/health" -UseBasicParsing -TimeoutSec 5
    $health = $response.Content | ConvertFrom-Json
    Write-Host "✅ Network (10.10.20.9:3005): CONNECTED" -ForegroundColor Green
    Write-Host "   Server IP: $($health.serverIP)" -ForegroundColor Gray
    Write-Host "   Port: $($health.port)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Network (10.10.20.9:3005): NOT CONNECTED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔧 FIX INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow
Write-Host "If network access fails, run these commands as Administrator:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Stop all Node processes:" -ForegroundColor White
Write-Host "   taskkill /f /im node.exe" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Add firewall rule:" -ForegroundColor White
Write-Host "   netsh advfirewall firewall add rule name=`"Tallman Chat Port 3005`" dir=in action=allow protocol=TCP localport=3005" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start server with updated code:" -ForegroundColor White
Write-Host "   cd C:\Users\BobM\Desktop\Tallman-Chat-main\Tallman-Chat-main" -ForegroundColor Gray
Write-Host "   node server/main-server.js" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Test network access:" -ForegroundColor White
Write-Host "   http://10.10.20.9:3005" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Server should now be accessible from all devices on your local network!" -ForegroundColor Green

# Ask if user wants to apply fixes automatically
$response = Read-Host "`nApply fixes automatically? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "🔧 Applying fixes..." -ForegroundColor Cyan

    try {
        # Stop Tallman services
        net stop TallmanDashboard 2>$null
        net stop TallmanLDAPAuth 2>$null
        Write-Host "✅ Tallman services stopped" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Could not stop some services (access denied)" -ForegroundColor Yellow
    }

    try {
        # Try to kill any remaining node processes
        taskkill /f /im node.exe 2>$null
        Start-Sleep -Seconds 2
        Write-Host "✅ Node processes stopped" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Some Node processes may still be running" -ForegroundColor Yellow
    }

    try {
        # Add firewall rule
        netsh advfirewall firewall add rule name="Tallman Chat Port 3005" dir=in action=allow protocol=TCP localport=3005
        Write-Host "✅ Firewall rule added for port 3005" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to add firewall rule. Try running as Administrator." -ForegroundColor Red
    }

    Write-Host "🚀 Starting main Tallman Chat server..." -ForegroundColor Cyan
    Start-Process -NoNewWindow -FilePath "node" -ArgumentList "server/main-server.js" -WorkingDirectory $PWD
    Write-Host "✅ Server started!" -ForegroundColor Green

    Write-Host ""
    Write-Host "⏳ Waiting 3 seconds for server to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3

    Write-Host ""
    Write-Host "🌐 Testing network access:" -ForegroundColor Green
    try {
        $test = Invoke-WebRequest -Method GET -Uri "http://10.10.20.9:3005/api/health" -UseBasicParsing -TimeoutSec 5
        Write-Host "✅ SUCCESS: Server is accessible at http://10.10.20.9:3005" -ForegroundColor Green
    } catch {
        Write-Host "❌ Server not yet accessible. Try:" -ForegroundColor Red
        Write-Host "   http://localhost:3005" -ForegroundColor Gray
        Write-Host "   http://10.10.20.9:3005" -ForegroundColor Gray
    }
}
