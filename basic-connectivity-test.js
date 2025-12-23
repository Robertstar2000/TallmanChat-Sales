#!/usr/bin/env node

/**
 * Basic Network Connectivity Test
 */

const net = require('net');
const dns = require('dns');

console.log('🔍 Testing basic network connectivity to LDAP servers...\n');

// Test DNS resolution and port connectivity
const servers = [
    { name: 'dc02.tallman.com', port: 389 },
    { name: '10.10.20.253', port: 389 },
    { name: 'DC02', port: 389 }
];

function testServer(serverInfo) {
    return new Promise((resolve) => {
        console.log(`Testing ${serverInfo.name}:${serverInfo.port}`);

        // Test DNS resolution
        dns.lookup(serverInfo.name, (err, address) => {
            if (err) {
                console.log(`❌ DNS lookup failed for ${serverInfo.name}: ${err.message}`);
                resolve({ server: serverInfo.name, dns: false, port: false, error: err.message });
                return;
            }

            console.log(`✅ DNS resolved: ${serverInfo.name} -> ${address}`);

            // Test port connectivity
            const client = new net.Socket();
            const timeout = setTimeout(() => {
                client.destroy();
                console.log(`❌ Port ${serverInfo.port} timeout on ${serverInfo.name}`);
                resolve({ server: serverInfo.name, dns: true, port: false, error: 'Connection timeout' });
            }, 3000);

            client.on('connect', () => {
                clearTimeout(timeout);
                client.destroy();
                console.log(`✅ Port ${serverInfo.port} open on ${serverInfo.name}`);
                resolve({ server: serverInfo.name, dns: true, port: true, error: null });
            });

            client.on('error', (err) => {
                clearTimeout(timeout);
                console.log(`❌ Port ${serverInfo.port} error on ${serverInfo.name}: ${err.message}`);
                resolve({ server: serverInfo.name, dns: true, port: false, error: err.message });
            });

            client.connect(serverInfo.port, address);
        });
    });
}

async function runTests() {
    const results = [];

    for (const server of servers) {
        const result = await testServer(server);
        results.push(result);
    }

    console.log('\n📊 Connectivity Test Results');
    console.log('===========================');

    results.forEach(result => {
        console.log(`\n${result.server}:`);
        console.log(`   DNS Resolution: ${result.dns ? '✅' : '❌'}`);
        console.log(`   Port ${result.port ? 'Open' : 'Closed'}: ${result.port ? '✅' : '❌'}`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });

    const workingServers = results.filter(r => r.dns && r.port);
    if (workingServers.length > 0) {
        console.log('\n✅ Working servers:');
        workingServers.forEach(server => {
            console.log(`   - ${server.server}:${server.port}`);
        });
    } else {
        console.log('\n❌ No servers are reachable');
        console.log('🔧 Troubleshooting suggestions:');
        console.log('   1. Check if LDAP servers are running');
        console.log('   2. Verify firewall settings');
        console.log('   3. Check network connectivity');
        console.log('   4. Verify DNS resolution');
    }
}

runTests().catch(console.error);
