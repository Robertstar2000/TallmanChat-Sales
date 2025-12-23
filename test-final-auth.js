#!/usr/bin/env node

const http = require('http');

console.log('🔍 Final LDAP Authentication Test');
console.log('==================================\n');

// Test that Vite proxy works
const postData = JSON.stringify({
    username: 'tallman\\bobm',
    password: 'Rm2214ri#'
});

const options = {
    hostname: 'localhost',
    port: 3200, // Vite dev server
    path: '/api/ldap-auth',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Testing authentication via Vite proxy (port 3200 → 3100)...');
console.log('Username: tallman\\bobm');
console.log('Sending request...\n');

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
        console.log('Received data chunk:', chunk.toString());
    });

    res.on('end', () => {
        console.log('\nFull response:', data);
        try {
            const json = JSON.parse(data);
            console.log('Parsed JSON:', JSON.stringify(json, null, 2));

            if (json.authenticated) {
                console.log('\n✅ SUCCESS: LDAP Authentication working!');
                console.log('User:', json.user?.cn || json.user?.sAMAccountName || 'Unknown');
                console.log('Server:', json.server);
                console.log('Admin:', json.user?.admin ? 'Yes' : 'No');
            } else {
                console.log('\n❌ FAILED: Authentication failed');
                console.log('Error:', json.error);
            }
        } catch (e) {
            console.log('\n❌ JSON Parse Error:', e.message);
        }
        console.log('\n🎉 Test complete!');
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.log('\n❌ Request Error:', error.message);
    console.log('This suggests the Vite proxy is not working or LDAP service is not responding.');
    process.exit(1);
});

req.setTimeout(10000, () => {
    console.log('\n⏰ Timeout - Request took too long');
    req.destroy();
    process.exit(1);
});

req.write(postData);
req.end();
