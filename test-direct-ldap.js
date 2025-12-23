#!/usr/bin/env node

// Test LDAP service directly
const http = require('http');

console.log('Testing LDAP service directly on port 3100...');

const req = http.get('http://localhost:3100/api/health', (res) => {
    console.log('✅ LDAP service is responding!');
    console.log('Status:', res.statusCode);

    res.on('data', (chunk) => {
        console.log('Response:', chunk.toString());
    });
});

req.on('error', (err) => {
    console.log('❌ LDAP service not responding:', err.message);
});

req.setTimeout(5000, () => {
    console.log('⏰ Timeout - LDAP service not responding');
    req.destroy();
});
