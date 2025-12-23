// Debug the exact authentication flow used by the API server
console.log('🧪 Debug API Server Authentication Flow\n');

const ldap = require('ldapjs');

const config = {
    server: '10.10.20.253',
    port: 389,
    baseDN: 'DC=tallman,DC=com',
    bindDN: 'LDAP@Tallman.com',
    bindPassword: 'ebGGAm77kk',
};

const testInput = {
    username: 'BobM',  // What comes from frontend after normalization
    password: 'Rm2214ri#',
};

// Format username the same way as API server
const formatUsernameForLDAP = (inputUsername) => {
    let username = inputUsername;
    if (username.includes('@')) {
        username = username.split('@')[0];
    }
    if (username.includes('\\')) {
        username = username.split('\\')[1];
    }
    return `Tallman\\${username}`;
};

console.log(`Testing with input: ${testInput.username}`);
console.log(`Formatted username: ${formatUsernameForLDAP(testInput.username)}`);
console.log(`Server: ${config.server}:${config.port}`);
console.log(`Base DN: ${config.baseDN}`);
console.log('');

// Exact same authentication logic as API server
const authenticateUser = async (username, password, server) => {
    try {
        console.log(`=== AUTHENTICATE_USER FUNCTION STARTED ===`);
        console.log(`Authenticating user: ${username} on server: ${server}`);

        const client = ldap.createClient({
            url: `ldap://${server}:${config.port}`,
            timeout: 10000,
            connectTimeout: 10000,
        });

        let userEntry = null;

        client.on('error', (err) => {
            console.error(`LDAP client error: ${err.message}`);
            if (!userEntry) {
                client.destroy();
            }
        });

        try {
            console.log(`Step 1: Binding with service account...`);
            await new Promise((resolve, reject) => {
                client.bind(config.bindDN, config.bindPassword, (bindErr) => {
                    if (bindErr) {
                        client.destroy();
                        reject(new Error(`Service account bind failed: ${bindErr.message}`));
                        return;
                    }
                    resolve();
                });
            });
            console.log('✅ Service account bind successful');

            console.log(`Step 2: Searching for user...`);
            const ldapUsername = formatUsernameForLDAP(username);
            console.log(`Searching for LDAP formatted username: ${ldapUsername} (from input: ${username})`);

            const plainUsername = ldapUsername.replace('Tallman\\', '');
            const searchOptions = {
                filter: `(sAMAccountName=${plainUsername})`,
                scope: 'sub',
                attributes: ['cn', 'memberOf', 'dn', 'userPrincipalName', 'sAMAccountName'],
            };

            console.log(`🔍 Searching with filter: ${searchOptions.filter}`);

            userEntry = await new Promise((resolve) => {
                let userFound = false;

                client.search(config.baseDN, searchOptions, (searchErr, searchRes) => {
                    if (searchErr) {
                        console.error(`❌ Search error: ${searchErr.message}`);
                        resolve(null);
                        return;
                    }

                    searchRes.on('searchEntry', (entry) => {
                        if (!userFound && entry && entry.object) {
                            userFound = true;
                            console.log(`✅ SUCCESS: Found user`);
                            console.log(`   DN: ${entry.dn}`);
                            console.log(`   sAMAccountName: ${entry.object.sAMAccountName}`);
                            console.log(`   userPrincipalName: ${entry.object.userPrincipalName}`);
                            console.log(`   cn: ${entry.object.cn}`);
                            resolve(entry);
                        }
                    });

                    searchRes.on('error', (err) => {
                        console.error(`❌ Search result error: ${err.message}`);
                        if (!userFound) {
                            resolve(null);
                        }
                    });

                    searchRes.on('end', () => {
                        if (!userFound) {
                            console.log(`ℹ️  User not found`);
                            resolve(null);
                        }
                    });
                });
            });

            if (!userEntry) {
                console.log(`User ${username} not found in LDAP directory`);
                client.destroy();
                return { authenticated: false, error: 'User not found' };
            }

            console.log(`Found user DN: ${userEntry.dn}`);

        } catch (searchError) {
            console.error(`User search failed: ${searchError.message}`);
            client.destroy();
            return { authenticated: false, error: `User lookup failed: ${searchError.message}` };
        }

        console.log(`Step 3: Testing user password authentication...`);

        return new Promise((resolve) => {
            console.log(`Attempting user bind with DN: ${userEntry.dn}`);

            client.bind(userEntry.dn, password, (bindErr) => {
                client.destroy();

                if (bindErr) {
                    console.error(`❌ User bind error: ${bindErr.message}`);
                    console.error(`Full bind error details:`, {
                        code: bindErr.code,
                        name: bindErr.name,
                        message: bindErr.message
                    });
                    resolve({ authenticated: false, error: 'Invalid credentials' });
                    return;
                }

                console.log(`✅ Authentication successful for ${username} using DN bind`);

                const userObject = {
                    cn: userEntry.object.cn || username.replace('\\', ' '),
                    sAMAccountName: userEntry.object.sAMAccountName || username.split('\\')[1] || username,
                    userPrincipalName: userEntry.object.userPrincipalName || `${username.split('\\')[1] || username}@Tallman.com`,
                    memberOf: userEntry.object.memberOf || [],
                    dn: userEntry.dn
                };

                resolve({
                    authenticated: true,
                    user: userObject,
                    dn: userEntry.dn
                });
            });
        });

    } catch (error) {
        console.error(`Authentication error: ${error.message}`);
        return { authenticated: false, error: error.message };
    }
};

async function testAuthentication() {
    console.log(`\n🧪 Testing API server authentication logic with user: ${testInput.username}`);

    const result = await authenticateUser(testInput.username, testInput.password, config.server);

    console.log('\n📋 FINAL RESULT:');
    if (result.authenticated) {
        console.log('✅ SUCCESS: User authentication works');
        console.log('✅ BobM + Rm2214ri# are valid Active Directory credentials');
        console.log(`User details: ${JSON.stringify(result.user, null, 2)}`);
    } else {
        console.log('❌ FAILURE: User authentication failed');
        console.log(`Error: ${result.error}`);
    }

    process.exit(result.authenticated ? 0 : 1);
}

testAuthentication().catch(console.error);
