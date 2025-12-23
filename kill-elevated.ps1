# PowerShell script to kill Tallman Chat processes with elevated privileges
Write-Host "Terminating Tallman Chat processes with elevated privileges..." -ForegroundColor Yellow

# Function to kill processes by port
function Kill-ProcessByPort {
    param([int]$Port)
    
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        foreach ($pid in $processes) {
            Write-Host "Killing process PID $pid on port $Port" -ForegroundColor Red
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    catch {
        Write-Host "No processes found on port $Port" -ForegroundColor Gray
    }
}

# Kill processes on Tallman Chat ports
Kill-ProcessByPort -Port 3200
Kill-ProcessByPort -Port 3210
Kill-ProcessByPort -Port 3100

# Kill Node.js processes by name pattern
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessName -eq "node" -and 
    ($_.MainWindowTitle -like "*Tallman*" -or $_.CommandLine -like "*backend-server*" -or $_.CommandLine -like "*server*")
} | ForEach-Object {
    Write-Host "Killing Node.js process: $($_.Id)" -ForegroundColor Red
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "Process termination complete." -ForegroundColor Green