#!/usr/bin/env node
/**
 * Test script to verify Tallman Chat network accessibility
 */

const http = require('http');

// Test localhost access
console.log('🔍 Testing network accessibility for Tallman Chat...\n');

function testEndpoint(url, description) {
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log(`✅ ${description}: ${url}`);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Server IP: ${response.serverIP}`);
                    console.log(`   Port: ${response.port}`);
                } catch (e) {
                    console.log(`✅ ${description}: ${url}`);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Response: ${data.substring(0, 100)}...`);
                }
                resolve(true);
            });
        });

        req.on('error', (err) => {
            console.log(`❌ ${description}: ${url}`);
            console.log(`   Error: ${err.message}`);
            resolve(false);
        });

        req.setTimeout(5000, () => {
            console.log(`⏰ ${description}: ${url}`);
            console.log(`   Error: Request timeout`);
            req.destroy();
            resolve(false);
        });
    });
}

async function runTests() {
    console.log('Testing different access methods...\n');

    // Test localhost
    await testEndpoint('http://localhost:3005/api/health', 'Localhost Access');

    console.log('');

    // Test external IP
    await testEndpoint('http://10.10.20.9:3005/api/health', 'External IP Access (10.10.20.9)');

    console.log('');
    console.log('📋 Summary:');
    console.log('- If localhost works but external IP fails, server is binding to localhost only');
    console.log('- If both work, server is accessible from network');
    console.log('- If neither works, server is not running');
    console.log('');
    console.log('🔧 To fix network access:');
    console.log('1. Run: net stop TallmanChat (as Administrator)');
    console.log('2. Run: net start TallmanChat (as Administrator)');
    console.log('3. Check that firewall allows port 3005');
}

runTests().catch(console.error);
