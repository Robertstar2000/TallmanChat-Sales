#!/usr/bin/env node

console.log('=== LDAP Environment Check ===');
console.log('LDAP env var:', process.env.LDAP || 'NOT SET');
console.log('LDAP_SERVICE_HOST env var:', process.env.LDAP_SERVICE_HOST || 'NOT SET');
console.log('LDAP_SERVICE_PORT env var:', process.env.LDAP_SERVICE_PORT || 'NOT SET');

const fs = require('fs');
if (fs.existsSync('.env.local')) {
    console.log('\n=== .env.local file contents ===');
    const envContent = fs.readFileSync('.env.local', 'utf8');
    console.log(envContent);
} else {
    console.log('\n=== .env.local file NOT FOUND ===');
}
