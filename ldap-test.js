#!/usr/bin/env node

/**
 * Standalone LDAP Testing Script
 * Tests various LDAP configurations to find working settings
 */

const ldap = require('ldapjs');

// Test configurations based on provided requirements
const TEST_CONFIGS = [
    {
        name: 'Primary Config (dc02.tallman.com)',
        server: 'dc02.tallman.com',
        port: 389,
        baseDN: 'DC=tallman,DC=com',
        bindDN: 'CN=LDAP,DC=tallman,DC=com',
        bindPassword: 'ebGGAm77kk',
        timeout: 10000,
    },
    {
        name: 'IP Address Config (10.10.20.253)',
        server: '10.10.20.253',
        port: 389,
        baseDN: 'DC=tallman,DC=com',
        bindDN: 'CN=LDAP,DC=tallman,DC=com',
        bindPassword: 'ebGGAm77kk',
        timeout: 10000,
    },
    {
        name: 'Short Name Config (DC02)',
        server: 'DC02',
        port: 389,
        baseDN: 'DC=tallman,DC=com',
        bindDN: 'CN=LDAP,DC=tallman,DC=com',
        bindPassword: 'ebGGAm77kk',
        timeout: 10000,
    },
    {
        name: 'Alternative Base DN',
        server: 'dc02.tallman.com',
        port: 389,
        baseDN: 'CN=Users,DC=tallman,DC=com',
        bindDN: 'CN=LDAP,CN=Users,DC=tallman,DC=com',
        bindPassword: 'ebGGAm77kk',
        timeout: 10000,
    },
    {
        name: 'Different Bind User',
        server: 'dc02.tallman.com',
        port: 389,
        baseDN: 'DC=tallman,DC=com',
        bindDN: 'LDAP@tallman.com',
        bindPassword: 'ebGGAm77kk',
        timeout: 10000,
    },
];

const TEST_USERS = [
    'BobM',
    'tallman\\BobM',
    'BobM@tallman.com',
    'BobM@tallman.local',
];

const TEST_PASSWORDS = [
    'Rm2214ri#',
    'ebGGAm77kk', // Service account password
];

const SEARCH_FILTERS = [
    '(cn={username})',
    '(uid={username})',
    '(sAMAccountName={username})',
    '(userPrincipalName={username})',
    '(mail={username}*)',
    '(sAMAccountName={username}*)',
    '(userPrincipalName={username}*)',
];

async function testLdapConnection(config) {
    console.log(`\n🔍 Testing configuration: ${config.name}`);
    console.log(`   Server: ${config.server}:${config.port}`);
    console.log(`   Base DN: ${config.baseDN}`);
    console.log(`   Bind DN: ${config.bindDN}`);

    const client = ldap.createClient({
        url: `ldap://${config.server}:${config.port}`,
        timeout: config.timeout,
        connectTimeout: config.timeout,
        strictDN: false,
    });

    return new Promise((resolve) => {
        const results = {
            config: config.name,
            server: config.server,
            canConnect: false,
            canBind: false,
            usersFound: [],
            errors: [],
        };

        client.on('error', (err) => {
            console.log(`   ❌ Connection error: ${err.message}`);
            results.errors.push(`Connection: ${err.message}`);
            resolve(results);
        });

        // Test 1: Basic connectivity
        console.log(`   📡 Testing basic connectivity...`);

        client.bind(config.bindDN, config.bindPassword, (bindErr) => {
            if (bindErr) {
                console.log(`   ❌ Bind failed: ${bindErr.message}`);
                results.errors.push(`Bind: ${bindErr.message}`);
                client.destroy();
                resolve(results);
            }

            console.log(`   ✅ Bind successful`);
            results.canBind = true;

            // Test 2: Search for users
            console.log(`   🔍 Testing user searches...`);

            const testNextUser = (userIndex) => {
                if (userIndex >= TEST_USERS.length) {
                    client.destroy();
                    resolve(results);
                    return;
                }

                const username = TEST_USERS[userIndex];
                console.log(`   👤 Testing user: ${username}`);

                const testNextFilter = (filterIndex) => {
                    if (filterIndex >= SEARCH_FILTERS.length) {
                        testNextUser(userIndex + 1);
                        return;
                    }

                    const filter = SEARCH_FILTERS[filterIndex].replace('{username}', username);

                    const searchOptions = {
                        filter: filter,
                        scope: 'sub',
                        attributes: ['cn', 'dn', 'userPrincipalName', 'sAMAccountName', 'mail'],
                        timeLimit: 10,
                    };

                    console.log(`   🔎 Searching with filter: ${filter}`);

                    client.search(config.baseDN, searchOptions, (searchErr, res) => {
                        if (searchErr) {
                            console.log(`   ⚠️  Search error: ${searchErr.message}`);
                            testNextFilter(filterIndex + 1);
                            return;
                        }

                        let found = false;
                        res.on('searchEntry', (entry) => {
                            found = true;
                            console.log(`   ✅ Found user: ${entry.dn}`);
                            console.log(`   📋 Attributes:`, entry.object);

                            if (!results.usersFound.some(u => u.username === username)) {
                                results.usersFound.push({
                                    username: username,
                                    dn: entry.dn,
                                    attributes: entry.object,
                                });
                            }
                        });

                        res.on('error', (err) => {
                            console.log(`   ⚠️  Search result error: ${err.message}`);
                            testNextFilter(filterIndex + 1);
                        });

                        res.on('end', () => {
                            if (found) {
                                console.log(`   ✅ User ${username} found with filter ${filter}`);
                            } else {
                                console.log(`   ❌ User ${username} not found with filter ${filter}`);
                            }
                            testNextFilter(filterIndex + 1);
                        });
                    });
                };

                testNextFilter(0);
            };

            testNextUser(0);
        });
    });
}

async function runLdapTests() {
    console.log('🚀 Starting LDAP Server Tests');
    console.log('================================');

    const results = [];

    for (const config of TEST_CONFIGS) {
        try {
            const result = await testLdapConnection(config);
            results.push(result);
        } catch (error) {
            console.log(`❌ Test failed for ${config.name}: ${error.message}`);
            results.push({
                config: config.name,
                server: config.server,
                canConnect: false,
                canBind: false,
                usersFound: [],
                errors: [error.message],
            });
        }
    }

    // Summary
    console.log('\n📊 Test Summary');
    console.log('===============');

    results.forEach(result => {
        console.log(`\n${result.config}:`);
        console.log(`   Can Connect: ${result.canConnect ? '✅' : '❌'}`);
        console.log(`   Can Bind: ${result.canBind ? '✅' : '❌'}`);
        console.log(`   Users Found: ${result.usersFound.length}`);
        if (result.errors.length > 0) {
            console.log(`   Errors: ${result.errors.join(', ')}`);
        }
        if (result.usersFound.length > 0) {
            console.log(`   Found Users:`);
            result.usersFound.forEach(user => {
                console.log(`     - ${user.username}: ${user.dn}`);
            });
        }
    });

    // Recommendations
    console.log('\n💡 Recommendations');
    console.log('==================');

    const workingConfigs = results.filter(r => r.canBind);
    if (workingConfigs.length > 0) {
        console.log('✅ Working configurations found:');
        workingConfigs.forEach(config => {
            console.log(`   - ${config.config}`);
        });
    } else {
        console.log('❌ No working configurations found');
        console.log('🔧 Try these troubleshooting steps:');
        console.log('   1. Verify LDAP server is running and accessible');
        console.log('   2. Check firewall settings on LDAP server');
        console.log('   3. Verify service account credentials');
        console.log('   4. Check Base DN is correct');
        console.log('   5. Ensure LDAP server allows anonymous or service account binding');
    }

    const foundUsers = results.flatMap(r => r.usersFound);
    if (foundUsers.length > 0) {
        console.log('✅ Users found in LDAP:');
        foundUsers.forEach(user => {
            console.log(`   - ${user.username}: ${user.dn}`);
        });
    }
}

// Run the tests
runLdapTests().catch(console.error);
