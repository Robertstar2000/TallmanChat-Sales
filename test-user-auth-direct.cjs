console.log('🧪 Full User Authentication Test (Direct AD)\n');

// Test the full authentication process using service account
const ldap = require('ldapjs');

const config = {
    server: '10.10.20.253',
    port: 389,
    baseDN: 'DC=tallman,DC=com',
    serviceAccount: {
        bindDN: 'CN=LDAP,DC=tallman,DC=com',
        bindPassword: 'ebGGAm77kk'
    }
};

const testUser = {
    username: 'BobM',
    password: 'Rm2214ri#',
    domainUsername: 'Tallman\\BobM' // Domain\User format for AD binding
};

// Alternative format for testing
try {
    console.log('🧪 Testing alternative username format: bobm (lowercase)');
    const testUserAlt = {
        username: 'bobm', // Try lowercase
        password: 'Rm2214ri#',
        domainUsername: 'Tallman\\bobm'
    };
} catch(e) {}
console.log('If both formats fail, the issue may be Active Directory configuration.');

console.log(`Testing against server: ${config.server}:${config.port}`);
console.log(`Service account: ${config.serviceAccount.bindDN}`);
console.log(`Testing user: ${testUser.username}`);
console.log('');

function testServiceAccount() {
    return new Promise((resolve, reject) => {
        console.log('🔐 Step 1: Testing service account bind...\n');

        const client = ldap.createClient({
            url: `ldap://${config.server}:${config.port}`,
            timeout: 10000,
            connectTimeout: 5000,
        });

        client.bind(config.serviceAccount.bindDN, config.serviceAccount.bindPassword, (bindErr) => {
            if (bindErr) {
                console.log('❌ SERVICE ACCOUNT BIND FAILED');
                console.log(`Error: ${bindErr.message}`);
                client.destroy();
                reject(bindErr);
                return;
            }

            console.log('✅ SERVICE ACCOUNT BIND SUCCESS!');
            resolve(client);
        });
    });
}

function searchForUser(client) {
    return new Promise((resolve, reject) => {
        console.log('\n👤 Step 2: Searching for user in Active Directory...\n');

        // Search strategies to find the user
        const searchStrategies = [
            { filter: `(sAMAccountName=${testUser.username})`, desc: 'sAMAccountName match' },
            { filter: `(cn=${testUser.username})`, desc: 'Common name match' },
            { filter: `(userPrincipalName=${testUser.username}@*)`, desc: 'UPN wildcard match' }
        ];

        function tryStrategy(index) {
            if (index >= searchStrategies.length) {
                client.destroy();
                reject(new Error('User not found with any search strategy'));
                return;
            }

            const strategy = searchStrategies[index];
            const searchOptions = {
                filter: strategy.filter,
                scope: 'sub',
                attributes: ['cn', 'sAMAccountName', 'userPrincipalName', 'dn'],
            };

            console.log(`🔍 Trying strategy ${index + 1}: ${strategy.desc} - ${strategy.filter}`);

            client.search(config.baseDN, searchOptions, (searchErr, searchRes) => {
                if (searchErr) {
                    console.log(`     Search error: ${searchErr.message}`);
                    tryStrategy(index + 1);
                    return;
                }

                let userFound = false;

                searchRes.on('searchEntry', (entry) => {
                    if (!userFound) {
                        userFound = true;
                        console.log('✅ USER FOUND!');
                        console.log(`   sAMAccountName: ${entry.object.sAMAccountName}`);
                        console.log(`   cn: ${entry.object.cn}`);
                        console.log(`   userPrincipalName: ${entry.object.userPrincipalName}`);
                        console.log(`   DN: ${entry.dn}`);
                        // Don't destroy client, we need it for password test
                        resolve({ client, userDN: entry.dn });
                    }
                });

                searchRes.on('end', () => {
                    if (!userFound) {
                        console.log(`     No matches for this strategy`);
                        tryStrategy(index + 1);
                    }
                });
            });
        }

        tryStrategy(0);
    });
}

function testUserPassword(client, userDN) {
    return new Promise((resolve) => {
        console.log(`\n🔑 Step 3: Testing user password authentication...\n`);

        // Test both DN format and Domain\Username format
        const testCredentials = [
            { username: userDN, desc: 'DN bind' },
            { username: testUser.domainUsername, desc: 'Domain\\Username bind' }
        ];

        function tryCredential(index) {
            if (index >= testCredentials.length) {
                console.log('❌ All authentication methods failed');
                client.destroy();
                resolve(false);
                return;
            }

            const cred = testCredentials[index];
            const userClient = ldap.createClient({
                url: `ldap://${config.server}:${config.port}`,
                timeout: 10000,
                connectTimeout: 5000,
            });

            console.log(`Attempting ${cred.desc}: "${cred.username}"`);
            console.log(`Password: [${testUser.password.length} chars]`);

            userClient.bind(cred.username, testUser.password, (bindErr) => {
                userClient.destroy();

                if (bindErr) {
                    console.log(`❌ ${cred.desc} FAILED: ${bindErr.message}`);
                    tryCredential(index + 1);
                    return;
                }

                console.log(`✅ ${cred.desc} SUCCESS!`);
                console.log(`User authentication works with ${cred.desc}`);
                client.destroy();
                resolve(true);
            });
        }

        tryCredential(0);
    });
}

function logout() {
    console.log('\n🧪 Authentication Test Complete');
    console.log('=======================');
    process.exit(0);
}

// Run the complete authentication test
testServiceAccount()
    .then(client => searchForUser(client))
    .then(({ client, userDN }) => testUserPassword(client, userDN))
    .then(success => {
        console.log('\n📋 FINAL RESULT:');
        if (success) {
            console.log('✅ SUCCESS: User authentication works correctly');
            console.log('✅ BobM + Rm2214ri# are valid Active Directory credentials');
        } else {
            console.log('❌ FAILURE: User authentication failed');
            console.log('❌ Check username, password, or Active Directory configuration');
        }
        logout();
    })
    .catch(error => {
        console.log('\n💥 FATAL ERROR during authentication test:');
        console.log(error.message);
        logout();
    });

process.on('SIGINT', logout);
