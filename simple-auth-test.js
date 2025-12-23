#!/usr/bin/env node

// Simple test to check auth with Vite proxy
const http = require('http');

console.log('🔍 Testing auth via Vite proxy to localhost:3200/api/ldap-auth');

const postData = JSON.stringify({
    username: 'BobM',
    password: 'Rm2214ri#'
});

const options = {
    hostname: 'localhost',
    port: 3200,
    path: '/api/ldap-auth',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Sending request with JSON:', postData);

const req = http.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Raw response:', data);
        try {
            const parsed = JSON.parse(data);
            console.log('Parsed response:', parsed);
        } catch (e) {
            console.log('Failed to parse JSON:', e.message);
        }
    });
});

req.on('error', (error) => {
    console.error('Request failed:', error.message);
});

req.write(postData);
req.end();
