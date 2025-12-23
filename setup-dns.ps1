# DNS Setup for chat.tallman.com
# Add these records to your DNS provider:

# A Record: chat.tallman.com -> [Your Server IP]
# CNAME Record: www.chat.tallman.com -> chat.tallman.com

Write-Host "DNS Records needed:"
Write-Host "A Record: chat.tallman.com -> $(Invoke-RestMethod -Uri 'https://api.ipify.org')"
Write-Host "CNAME: www.chat.tallman.com -> chat.tallman.com"