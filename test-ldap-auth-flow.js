
const ldap = require('ldapjs');

// --- CONFIGURATION ---
// Replace with the username and password you want to test
const TEST_USERNAME = process.argv[2] || 'testuser';
const TEST_PASSWORD = process.argv[3] || 'testpassword';

// LDAP Configuration from your ldap-auth.js
const LDAP_CONFIG = {
    server: 'DC02', // Primary server
    fallbackServers: ['10.10.20.253', 'dc02.Tallman.com'],
    baseDN: 'DC=Tallman,DC=com',
    bindDN: 'LDAP@Tallman.com',
    bindPassword: 'ebGGAm77kk',
    port: 389,
};

// --- HELPER FUNCTIONS (from your ldap-auth.js) ---

const log = (message) => {
    console.log(`[${new Date().toISOString()}] ${message}`);
};

const createLdapClient = (server) => {
    log(`Creating LDAP client for server: ldap://${server}:${LDAP_CONFIG.port}`);
    return ldap.createClient({
        url: `ldap://${server}:${LDAP_CONFIG.port}`,
        timeout: 5000,
        connectTimeout: 5000,
    });
};

const formatUsernameForLDAP = (inputUsername) => {
    let username = inputUsername;
    if (username.includes('@')) {
        username = username.split('@')[0];
    }
    // Corrected escaping for backslashes
    if (username.includes('\\')) {
        username = username.split('\\')[1];
    } else if (username.includes('\')) {
        username = username.split('\')[1];
    }
    // This script will test both formats, Tallman\user and user
    return username;
};

// --- MAIN TEST FUNCTION ---

async function runTest() {
    log(`--- Starting LDAP Authentication Test ---`);
    log(`Attempting to authenticate user: "${TEST_USERNAME}"`);

    const servers = [LDAP_CONFIG.server, ...LDAP_CONFIG.fallbackServers];

    for (const server of servers) {
        log(`
>>> Trying server: ${server}`);
        const client = createLdapClient(server);

        client.on('error', (err) => {
            log(`❌ LDAP Client Error: ${err.message}`);
        });

        try {
            // STEP 1: Bind with the Service Account
            log(`STEP 1: Binding with Service Account: "${LDAP_CONFIG.bindDN}"`);
            await new Promise((resolve, reject) => {
                client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindPassword, (err) => {
                    if (err) {
                        log(`   [FAIL] Service Account bind failed: ${err.message}`);
                        return reject(err);
                    }
                    log(`   [SUCCESS] Service Account bind successful.`);
                    resolve();
                });
            });

            // STEP 2: Search for the user to get their DN
            const plainUsername = formatUsernameForLDAP(TEST_USERNAME);
            log(`STEP 2: Searching for user with sAMAccountName: "${plainUsername}"`);
            const searchOptions = {
                filter: `(sAMAccountName=${plainUsername})`,
                scope: 'sub',
                attributes: ['dn'],
            };

            const userEntry = await new Promise((resolve, reject) => {
                client.search(LDAP_CONFIG.baseDN, searchOptions, (err, res) => {
                    if (err) {
                        log(`   [FAIL] Search command failed: ${err.message}`);
                        return reject(err);
                    }
                    let foundUser = null;
                    res.on('searchEntry', (entry) => {
                        log(`   [SUCCESS] Found user entry. DN: ${entry.dn}`);
                        foundUser = entry;
                    });
                    res.on('error', (searchErr) => {
                        log(`   [FAIL] Error during search: ${searchErr.message}`);
                        reject(searchErr);
                    });
                    res.on('end', (result) => {
                        if (!foundUser) {
                           log(`   [FAIL] User "${plainUsername}" not found in directory.`);
                           reject(new Error('User not found'));
                        }
                        resolve(foundUser);
                    });
                });
            });

            // STEP 3: Bind with the user's DN and password
            log(`STEP 3: Attempting to bind with user's DN: "${userEntry.dn}"`);
            await new Promise((resolve, reject) => {
                client.bind(userEntry.dn, TEST_PASSWORD, (err) => {
                    if (err) {
                        log(`   [FAIL] User authentication failed: ${err.message} (Invalid credentials)`);
                        return reject(err);
                    }
                    log(`   [SUCCESS] Authentication successful for user "${TEST_USERNAME}"!`);
                    resolve();
                });
            });

            log(`
✅ --- TEST SUCCEEDED on server ${server} --- ✅`);
            client.destroy();
            return; // Exit after first successful server

        } catch (error) {
            log(`❌ --- TEST FAILED on server ${server}: ${error.message} --- ❌`);
            client.destroy(); // Ensure client is destroyed on failure
        }
    }

    log(`
>>> All LDAP servers failed. Please check network connectivity, firewall rules, and credentials.`);
}

if (!process.argv[2] || !process.argv[3]) {
    console.log('---');
    console.log('Please provide a username and password to test.');
    console.log('Usage: node test-ldap-auth-flow.js <username> <password>');
    console.log('Example: node test-ldap-auth-flow.js BobM MySecretPassword123');
    console.log('---');
} else {
    runTest();
}
