#!/usr/bin/env node

/**
 * Test specific user LDAP authentication with username normalization
 * All username formats get normalized to tallman\username format
 * Original Credentials: tallman\bobm / Rm2214ri#
 */

const http = require('http');

// LDAP Auth service configuration
const LDAP_AUTH_HOST = 'localhost';
const LDAP_AUTH_PORT = 3100;

console.log('🔍 Testing LDAP authentication with username normalization');
console.log('========================================================\n');
console.log('All input formats will be normalized to: tallman\\username\n');

// Function to test LDAP authentication via the auth service
function testLdapAuth(username, password) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            username: username,
            password: password
        });

        const options = {
            hostname: LDAP_AUTH_HOST,
            port: LDAP_AUTH_PORT,
            path: '/api/ldap-auth',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log(`📡 Sending authentication request...`);
        console.log(`   Username: ${username}`);
        console.log(`   Server: ${LDAP_AUTH_HOST}:${LDAP_AUTH_PORT}`);

        const req = http.request(options, (res) => {
            console.log(`📶 Response status: ${res.statusCode}`);

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    console.error('❌ Failed to parse response JSON:', error.message);
                    console.error('📄 Raw response:', data);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request error:', error.message);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Test the specific credentials
async function runTest() {
    try {
        // Test LDAP auth service health first
        console.log('🏥 Testing LDAP auth service health...');

        const healthReq = http.get({
            hostname: LDAP_AUTH_HOST,
            port: LDAP_AUTH_PORT,
            path: '/api/health'
        }, (res) => {
            console.log(`✅ Service responded with status: ${res.statusCode}\n`);

            // Now test user authentication
            console.log('🔐 Testing user authentication...');

            testLdapAuth('BobM', 'Rm2214ri#')
                .then((response) => {
                    console.log('\n📊 Authentication Result for BobM:');
                    console.log('=====================================');
                    console.log('Raw response:', JSON.stringify(response, null, 2));

                    if (response.authenticated) {
                        console.log('✅ SUCCESS: User authenticated successfully!');
                        console.log(`   Server: ${response.server}`);
                        console.log(`   User DN: ${response.user?.dn || 'N/A'}`);
                        console.log(`   Admin: ${response.user?.admin ? 'Yes' : 'No'}`);
                        console.log(`   Backdoor: ${response.user?.backdoor ? 'Yes' : 'No'}`);

                        if (response.user) {
                            console.log('   User Details:');
                            console.log(`     - CN: ${response.user.cn || 'N/A'}`);
                            console.log(`     - sAMAccountName: ${response.user.sAMAccountName || 'N/A'}`);
                            console.log(`     - userPrincipalName: ${response.user.userPrincipalName || 'N/A'}`);

                            if (response.user.memberOf && response.user.memberOf.length > 0) {
                                console.log('     - Group Membership:');
                                response.user.memberOf.forEach((group, index) => {
                                    console.log(`       ${index + 1}. ${group}`);
                                });
                            } else {
                                console.log('     - Group Membership: None found');
                            }
                        }
                    } else {
                        console.log('❌ FAILED: Authentication failed');
                        console.log(`   Error: ${response.error || 'Unknown error'}`);
                    }
                })
                .catch((error) => {
                    console.error('❌ Test failed:', error.message);
                    console.error('Stack:', error.stack);
                    // Still try the other format
                    console.log('\n🔄 Also testing tallman\\bobm format...');
                    return testLdapAuth('tallman\\bobm', 'Rm2214ri#');
                })
                .then((response) => {
                    if (response) {
                        console.log('\n📊 Authentication Result for tallman\\bobm:');
                        console.log('==========================================');
                        console.log('Raw response:', JSON.stringify(response, null, 2));

                        if (response.authenticated) {
                            console.log('✅ SUCCESS: User authenticated successfully!');
                            console.log(`   Server: ${response.server}`);
                            console.log(`   User DN: ${response.user?.dn || 'N/A'}`);
                        } else {
                            console.log('❌ FAILED: Authentication failed');
                            console.log(`   Error: ${response.error || 'Unknown error'}`);
                        }
                    }
                })
                .catch((error) => {
                    console.error('❌ tallman\\bobm test failed:', error.message);
                });
        });

        healthReq.on('error', (error) => {
            console.log('❌ Service health check failed:', error.message);
            console.log('💡 Please make sure the LDAP auth service is running on port 3100');
            console.log('   Run: node server/ldap-auth.js');
        });

        healthReq.setTimeout(5000, () => {
            console.log('⏰ Service health check timed out');
            healthReq.destroy();
        });

    } catch (error) {
        console.error('❌ Test setup error:', error.message);
    }
}

// Handle script timeout
setTimeout(() => {
    console.log('\n⏰ Test timed out after 30 seconds');
    process.exit(1);
}, 30000);

// Run the test
runTest();
