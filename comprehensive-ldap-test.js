#!/usr/bin/env node

/**
 * Comprehensive LDAP Configuration Test
 * Tests multiple variations to find working LDAP settings
 */

const ldap = require('ldapjs');

console.log('🚀 Comprehensive LDAP Configuration Test');
console.log('========================================\n');

// Test multiple LDAP configurations
const TEST_CONFIGURATIONS = [
    // Original configuration
    {
        name: 'Original Config',
        server: 'dc02.tallman.com',
        port: 389,
        baseDN: 'DC=tallman,DC=com',
        bindDN: 'CN=LDAP,DC=tallman,DC=com',
        bindPassword: 'ebGGAm77kk',
    },
    // Try different Base DNs
    {
        name: 'Users Container',
        server: 'dc02.tallman.com',
        port: 389,
        baseDN: 'CN=Users,DC=tallman,DC=com',
        bindDN: 'CN=LDAP,CN=Users,DC=tallman,DC=com',
        bindPassword: 'ebGGAm77kk',
    },
    {
        name: 'OU=Users Base DN',
        server: 'dc02.tallman.com',
        port: 389,
        baseDN: 'OU=Users,DC=tallman,DC=com',
        bindDN: 'CN=LDAP,OU=Users,DC=tallman,DC=com',
        bindPassword: 'ebGGAm77kk',
    },
    // Try different Bind DNs
    {
        name: 'Administrator Bind',
        server: 'dc02.tallman.com',
        port: 389,
        baseDN: 'DC=tallman,DC=com',
        bindDN: 'CN=Administrator,CN=Users,DC=tallman,DC=com',
        bindPassword: 'ebGGAm77kk',
    },
    {
        name: 'Domain Admin Bind',
        server: 'dc02.tallman.com',
        port: 389,
        baseDN: 'DC=tallman,DC=com',
        bindDN: 'CN=Domain Admins,CN=Users,DC=tallman,DC=com',
        bindPassword: 'ebGGAm77kk',
    },
    // Try IP address instead of hostname
    {
        name: 'IP Address Server',
        server: '10.10.20.253',
        port: 389,
        baseDN: 'DC=tallman,DC=com',
        bindDN: 'CN=LDAP,DC=tallman,DC=com',
        bindPassword: 'ebGGAm77kk',
    },
];

const USERNAME_VARIATIONS = [
    'BobM',
    'tallman\\BobM',
    'BobM@tallman.com',
    'CN=BobM,CN=Users,DC=tallman,DC=com',
];

const SEARCH_FILTERS = [
    '(cn={username})',
    '(uid={username})',
    '(sAMAccountName={username})',
    '(userPrincipalName={username})',
    '(mail={username}*)',
    '(displayName={username})',
    '(name={username})',
];

async function testLdapConfig(config) {
    console.log(`\n🔍 Testing: ${config.name}`);
    console.log(`   Server: ${config.server}:${config.port}`);
    console.log(`   Base DN: ${config.baseDN}`);
    console.log(`   Bind DN: ${config.bindDN}`);

    const client = ldap.createClient({
        url: `ldap://${config.server}:${config.port}`,
        timeout: 8000,
        connectTimeout: 5000,
        strictDN: false,
    });

    return new Promise((resolve) => {
        const results = {
            config: config.name,
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

        console.log(`   🔗 Attempting to bind...`);
        client.bind(config.bindDN, config.bindPassword, (bindErr) => {
            if (bindErr) {
                console.log(`   ❌ Bind failed: ${bindErr.message}`);
                results.errors.push(`Bind: ${bindErr.message}`);
                client.destroy();
                resolve(results);
            }

            console.log(`   ✅ Bind successful`);
            results.canBind = true;

            // Test user searches
            console.log(`   👤 Testing user searches...`);
            testNextUsername(client, config, results, 0);

            function testNextUsername(client, config, results, usernameIndex) {
                if (usernameIndex >= USERNAME_VARIATIONS.length) {
                    client.destroy();
                    resolve(results);
                    return;
                }

                const username = USERNAME_VARIATIONS[usernameIndex];
                console.log(`   🔎 Testing username: ${username}`);

                testNextFilter(client, config, results, username, 0);

                function testNextFilter(client, config, results, username, filterIndex) {
                    if (filterIndex >= SEARCH_FILTERS.length) {
                        testNextUsername(client, config, results, usernameIndex + 1);
                        return;
                    }

                    const filter = SEARCH_FILTERS[filterIndex].replace('{username}', username);

                    const searchOptions = {
                        filter: filter,
                        scope: 'sub',
                        attributes: ['cn', 'dn', 'userPrincipalName', 'sAMAccountName', 'mail', 'displayName'],
                        timeLimit: 5,
                    };

                    console.log(`   🔍 Searching with: ${filter}`);

                    client.search(config.baseDN, searchOptions, (searchErr, res) => {
                        if (searchErr) {
                            console.log(`   ⚠️  Search error: ${searchErr.message}`);
                            testNextFilter(client, config, results, username, filterIndex + 1);
                            return;
                        }

                        let found = false;
                        res.on('searchEntry', (entry) => {
                            found = true;
                            console.log(`   ✅ Found: ${entry.dn}`);
                            console.log(`   📋 Attributes:`, JSON.stringify(entry.object, null, 2));

                            if (!results.usersFound.some(u => u.username === username && u.dn === entry.dn)) {
                                results.usersFound.push({
                                    username: username,
                                    filter: filter,
                                    dn: entry.dn,
                                    attributes: entry.object,
                                });
                            }
                        });

                        res.on('error', (err) => {
                            console.log(`   ⚠️  Search result error: ${err.message}`);
                            testNextFilter(client, config, results, username, filterIndex + 1);
                        });

                        res.on('end', () => {
                            if (found) {
                                console.log(`   ✅ User found with filter: ${filter}`);
                            }
                            testNextFilter(client, config, results, username, filterIndex + 1);
                        });
                    });
                }
            }
        });
    });
}

async function runComprehensiveTests() {
    const results = [];

    for (const config of TEST_CONFIGURATIONS) {
        try {
            const result = await testLdapConfig(config);
            results.push(result);
        } catch (error) {
            console.log(`❌ Test failed for ${config.name}: ${error.message}`);
            results.push({
                config: config.name,
                canConnect: false,
                canBind: false,
                usersFound: [],
                errors: [error.message],
            });
        }
    }

    // Summary
    console.log('\n📊 Comprehensive Test Summary');
    console.log('============================');

    results.forEach(result => {
        console.log(`\n${result.config}:`);
        console.log(`   Can Bind: ${result.canBind ? '✅' : '❌'}`);
        console.log(`   Users Found: ${result.usersFound.length}`);
        if (result.errors.length > 0) {
            console.log(`   Errors: ${result.errors.join(', ')}`);
        }
        if (result.usersFound.length > 0) {
            console.log(`   Found Users:`);
            result.usersFound.forEach(user => {
                console.log(`     - ${user.username} (${user.filter}): ${user.dn}`);
            });
        }
    });

    // Recommendations
    console.log('\n💡 Configuration Recommendations');
    console.log('==============================');

    const workingConfigs = results.filter(r => r.canBind);
    if (workingConfigs.length > 0) {
        console.log('✅ Working configurations:');
        workingConfigs.forEach(config => {
            console.log(`   - ${config.config}`);
        });
    } else {
        console.log('❌ No working configurations found');
        console.log('🔧 Troubleshooting suggestions:');
        console.log('   1. Verify service account DN and password');
        console.log('   2. Check if LDAP server allows service account binding');
        console.log('   3. Verify Base DN is correct');
        console.log('   4. Check LDAP server logs for authentication attempts');
    }

    const foundUsers = results.flatMap(r => r.usersFound);
    if (foundUsers.length > 0) {
        console.log('\n✅ Users successfully found:');
        foundUsers.forEach(user => {
            console.log(`   - ${user.username} via ${user.filter}`);
            console.log(`     DN: ${user.dn}`);
        });
    }
}

// Run the comprehensive tests
runComprehensiveTests().catch(console.error);
