# Fix IIS web.config port
$content = Get-Content "C:\inetpub\TallmanChat\web.config"
$content = $content -replace "3001", "3005"
$content | Set-Content "C:\inetpub\TallmanChat\web.config"
Write-Host "Fixed web.config port from 3001 to 3005"
