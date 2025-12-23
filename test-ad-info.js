// Test script to get Active Directory information and diagnose the issue
const ldap = require('ldapjs');

// Microsoft Active Directory LDAP Configuration Analysis
const config = {
    server: '10.10.20.253',
    port: 389,
    bindDN: 'LDAP@tallman.com',  // Current UPN format - may be wrong
    bindPassword: 'ebGGAm77kk',
    baseDN: 'DC=tallman,DC=com'
};

// Test different bind DN formats for Active Directory
async function testActiveDirectoryBinding() {
    console.log('🔍 Testing Microsoft Active Directory LDAP Configuration...\n');

    // Potential service account bind DN formats
    const possibleBindDNs = [
        // Current format (UPN)
        'LDAP@tallman.com',

        // Distinguished Name formats (most common for service accounts)
        'CN=LDAP,DC=tallman,DC=com',
        'CN=LDAP,CN=Users,DC=tallman,DC=com',
        'CN=LDAP Service,DC=tallman,DC=com',
        'CN=LDAP Service,CN=Users,DC=tallman,DC=com',

        // Domain formats
        'tallman\\LDAP',

        // Full UPN format
        'LDAP@tallman.com@domain.local'  // if it's a subdomain
    ];

    console.log('Testing different service account bind DN formats...\n');

    for (const bindDN of possibleBindDNs) {
        try {
            console.log(`🔗 Testing bind DN: "${bindDN}"`);

            const client = ldap.createClient({
                url: `ldap://${config.server}:${config.port}`,
                timeout: 10000,
                connectTimeout: 5000,
            });

            // Test bind
            await new Promise((resolve, reject) => {
                client.bind(bindDN, config.bindPassword, (bindErr) => {
                    client.destroy();

                    if (bindErr) {
                        console.log(`❌ FAILED: ${bindErr.message}`);
                        if (bindErr.code) {
                            console.log(`   Error code: ${bindErr.code}`);
                        }
                        reject(new Error(`Bind failed for ${bindDN}`));
                        return;
                    }

                    console.log(`✅ SUCCESS: Service account bind successful with "${bindDN}"`);
                    resolve();
                });
            });

        } catch (error) {
            console.log(`❌ Error testing ${bindDN}: ${error.message}\n`);
            continue;
        }
    }

    console.log('\n🔍 Testing root DSE (Active Directory information)...');

    // Test getting Active Directory information
    try {
        const client = ldap.createClient({
            url: `ldap://${config.server}:${config.port}`,
            timeout: 5000,
        });

        // Try to bind anonymously first to get root DSE
        await new Promise((resolve, reject) => {
            client.bind('', '', (bindErr) => {
                if (bindErr) {
                    // Try with service account
                    client.bind(config.bindDN, config.bindPassword, (bindErr2) => {
                        if (bindErr2) {
                            reject(new Error('Cannot bind to get AD info'));
                            return;
                        }
                        resolve();
                    });
                    return;
                }
                resolve();
            });
        });

        // Search for root DSE
        const searchOptions = {
            scope: 'base',
            attributes: ['*'],
            filter: '(objectClass=*)'
        };

        client.search('', searchOptions, (searchErr, searchRes) => {
            if (searchErr) {
                console.log(`❌ Root DSE search failed: ${searchErr.message}`);
                client.destroy();
                return;
            }

            searchRes.on('searchEntry', (entry) => {
                console.log('📋 Active Directory Root DSE Information:');
                console.log(`   Root Domain Naming Context: ${entry.object.rootDomainNamingContext || 'N/A'}`);
                console.log(`   Default Naming Context: ${entry.object.defaultNamingContext || 'N/A'}`);
                console.log(`   Schema Naming Context: ${entry.object.schemaNamingContext || 'N/A'}`);
                console.log(`   DNS Host Name: ${entry.object.dnsHostName || 'N/A'}`);
                console.log(`   LDAP Service Name: ${entry.object.ldapServiceName || 'N/A'}`);
                console.log(`   Server Name: ${entry.object.serverName || 'N/A'}`);
            });

            searchRes.on('end', () => {
                console.log('\n✅ Root DSE information retrieved');
                client.destroy();
            });
        });

    } catch (error) {
        console.log(`❌ Cannot retrieve Active Directory information: ${error.message}`);
    }

    console.log('\n🎯 Testing User Search Patterns...\n');

    // Test finding the BobM user with different approaches
    const searchTests = [
        { filter: '(sAMAccountName=BobM)', desc: 'Direct sAMAccountName' },
        { filter: '(samAccountName=BobM)', desc: 'Lowercase sAMAccountName' },
        { filter: '(userPrincipalName=BobM@tallman.com)', desc: 'UPN format' },
        { filter: '(cn=BobM)', desc: 'Common Name' },
        { filter: '(name=BobM)', desc: 'Name attribute' },
        { filter: '(|(sAMAccountName=BobM)(userPrincipalName=BobM@*))', desc: 'Combined search' }
    ];

    for (const test of searchTests) {
        try {
            console.log(`🔍 Testing search filter: "${test.filter}" (${test.desc})`);

            const client = ldap.createClient({
                url: `ldap://${config.server}:${config.port}`,
                timeout: 5000,
            });

            await new Promise((resolve, reject) => {
                client.bind(config.bindDN, config.bindPassword, (bindErr) => {
                    if (bindErr) {
                        client.destroy();
                        reject(new Error(`Cannot bind with service account: ${bindErr.message}`));
                        return;
                    }
                    resolve();
                });
            });

            const searchOptions = {
                filter: test.filter,
                scope: 'sub',
                attributes: ['dn', 'sAMAccountName', 'userPrincipalName', 'cn', 'name'],
                sizeLimit: 10,
                timeLimit: 10
            };

            client.search(config.baseDN, searchOptions, (searchErr, searchRes) => {
                if (searchErr) {
                    console.log(`❌ Search error: ${searchErr.message}`);
                    client.destroy();
                    return;
                }

                let found = false;
                searchRes.on('searchEntry', (entry) => {
                    found = true;
                    console.log(`✅ USER FOUND:`);
                    console.log(`   DN: ${entry.dn}`);
                    console.log(`   sAMAccountName: ${entry.object.sAMAccountName}`);
                    console.log(`   userPrincipalName: ${entry.object.userPrincipalName}`);
                    console.log(`   cn: ${entry.object.cn}`);
                    console.log(`   name: ${entry.object.name}`);
                });

                searchRes.on('end', () => {
                    if (!found) {
                        console.log(`ℹ️  No users found with this filter`);
                    }
                    client.destroy();
                });
            });

            // Wait for search to complete
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.log(`❌ Error with search test "${test.filter}": ${error.message}\n`);
            continue;
        }
    }

    console.log('\n🎭 Testing Direct User Bind Patterns...\n');

    // Test different user bind formats
    const userBindTests = [
        { username: 'tallman\\BobM', desc: 'Domain\\Username format' },
        { username: 'BobM@tallman.com', desc: 'UPN format' },
        { username: 'CN=BobM,CN=Users,DC=tallman,DC=com', desc: 'Full DN format (example)' }
    ];

    for (const test of userBindTests) {
        try {
            console.log(`🔗 Testing user bind: "${test.username}" (${test.desc})`);

            // First, find the user's DN by searching
            const searchClient = ldap.createClient({
                url: `ldap://${config.server}:${config.port}`,
                timeout: 5000,
            });

            await new Promise((resolve, reject) => {
                searchClient.bind(config.bindDN, config.bindPassword, (bindErr) => {
                    if (bindErr) {
                        searchClient.destroy();
                        reject(new Error('Cannot bind service account'));
                        return;
                    }
                    resolve();
                });
            });

            // Try to find user
            const userDN = await new Promise((resolve) => {
                const searchOptions = {
                    filter: '(sAMAccountName=BobM)',
                    scope: 'sub',
                    attributes: ['dn']
                };

                searchClient.search(config.baseDN, searchOptions, (searchErr, searchRes) => {
                    if (searchErr) {
                        console.log(`❌ Cannot search for user: ${searchErr.message}`);
                        searchClient.destroy();
                        resolve(null);
                        return;
                    }

                    searchRes.on('searchEntry', (entry) => {
                        resolve(entry.dn);
                    });

                    searchRes.on('end', () => {
                        searchClient.destroy();
                        setTimeout(() => resolve(null), 100); // Delay to allow searchEntry
                    });
                });
            });

            if (!userDN) {
                console.log(`❌ Cannot find user's DN for direct bind test`);
                continue;
            }

            console.log(`📍 Found user DN: "${userDN}"`);

            // Now test binding with different formats and the DN
            const bindClient = ldap.createClient({
                url: `ldap://${config.server}:${config.port}`,
                timeout: 5000,
            });

            await new Promise((resolve, reject) => {
                bindClient.bind(test.username, 'Rm2214ri#', (bindErr) => {
                    bindClient.destroy();

                    if (bindErr) {
                        console.log(`❌ User bind failed: ${bindErr.message}`);
                        if (bindErr.code) {
                            console.log(`   LDAP Error Code: ${bindErr.code}`);
                        }
                        reject(new Error(`User bind failed for ${test.username}`));
                        return;
                    }

                    console.log(`✅ User bind SUCCESSFUL with format: ${test.username}`);
                    resolve();
                });
            });

        } catch (error) {
            console.log(`❌ Error testing user bind "${test.username}": ${error.message}\n`);
            continue;
        }
    }

    console.log('\n🏁 Active Directory LDAP Analysis Complete');
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check which service account bind DN format works');
    console.log('2. Verify the correct user DN format for binding');
    console.log('3. Ensure firewall allows LDAP communication');
    console.log('4. Confirm Active Directory domain and base DN are correct');
}
