# PowerShell script to test LDAP authentication
$uri = "http://localhost:3100/api/ldap-auth"
$body = @{
    username = "tallman\bobm"
    password = "Rm2214ri#"
} | ConvertTo-Json

Write-Host "🔍 Testing LDAP authentication for user: tallman\bobm"
Write-Host "================================================`n"

Write-Host "📡 Sending authentication request..."
Write-Host "   Username: tallman\bobm"
Write-Host "   Server: localhost:3100`n"

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
    $jsonResponse = $response.Content | ConvertFrom-Json

    Write-Host "📊 Authentication Result:"
    Write-Host "========================`n"

    if ($jsonResponse.authenticated) {
        Write-Host "✅ SUCCESS: User authenticated successfully!"
        Write-Host "   Server: $($jsonResponse.server)"
        Write-Host "   User DN: $($jsonResponse.user.dn)"
        Write-Host "   Admin: $(if ($jsonResponse.user.admin) { 'Yes' } else { 'No' })"
        Write-Host "   Backdoor: $(if ($jsonResponse.user.backdoor) { 'Yes' } else { 'No' })`n"

        Write-Host "   User Details:"
        Write-Host "     - CN: $($jsonResponse.user.cn)"
        Write-Host "     - sAMAccountName: $($jsonResponse.user.sAMAccountName)"
        Write-Host "     - userPrincipalName: $($jsonResponse.user.userPrincipalName)"

        if ($jsonResponse.user.memberOf -and $jsonResponse.user.memberOf.Length -gt 0) {
            Write-Host "     - Group Membership:"
            $index = 1
            foreach ($group in $jsonResponse.user.memberOf) {
                Write-Host "       $index. $group"
                $index++
            }
        } else {
            Write-Host "     - Group Membership: None found"
        }
    } else {
        Write-Host "❌ FAILED: Authentication failed"
        Write-Host "   Error: $($jsonResponse.error)"
    }
} catch {
    Write-Host "❌ Request failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "HTTP Status Code: $($_.Exception.Response.StatusCode)"
        Write-Host "Status Description: $($_.Exception.Response.StatusDescription)"
    }
}
