const http = require('http');

console.log('🔍 Testing if LDAP server is responding on port 3100...\n');

const options = {
    hostname: 'localhost',
    port: 3100,
    path: '/api/health',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 5000
};

console.log(`Making HTTP request to: http://${options.hostname}:${options.port}${options.path}`);

const req = http.request(options, (res) => {
    console.log(`Response status: ${res.statusCode}`);
    console.log(`Response headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('✅ LDAP Server is RUNNING and responding!');
            console.log('Response:', data);
        } else {
            console.log('❌ LDAP Server returned error status:', res.statusCode);
            console.log('Response:', data);
        }
    });
});

req.on('error', (err) => {
    console.log('❌ LDAP Server is NOT responding!');
    console.log('Error:', err.message);
    if (err.code === 'ECONNREFUSED') {
        console.log('→ Server is not running on port 3100');
        console.log('→ Start LDAP server with: node server/ldap-auth.js');
    }
});

req.on('timeout', () => {
    console.log('❌ Request timed out - server not responding');
    req.destroy();
});

req.end();
