const ldap = require('ldapjs');

// --- Configuration ---
// This configuration is copied from your server/ldap-auth.js file.
const LDAP_CONFIG = {
    server: 'DC02',
    fallbackServers: ['10.10.20.253', 'dc02.Tallman.com'],
    baseDN: 'DC=Tallman,DC=com',
    bindDN: 'LDAP@Tallman.com',
    bindPassword: 'ebGGAm77kk',
    port: 389,
    timeout: 5000 // 5 second timeout
};

// --- Main Test Function ---
async function runLdapTest(username, password) {
    if (!username || !password) {
        console.error('❌ ERROR: Please provide a username and password.');
        console.log('Usage: node direct-ad-test.js <username> <password>');
        return;
    }

    const serversToTry = [LDAP_CONFIG.server, ...LDAP_CONFIG.fallbackServers];

    for (const server of serversToTry) {
        console.log(`
======================================================`);
        console.log(`▶️  Attempting authentication against server: ${server}`);
        console.log(`======================================================`);

        const client = ldap.createClient({
            url: `ldap://${server}:${LDAP_CONFIG.port}`,
            timeout: LDAP_CONFIG.timeout,
            connectTimeout: LDAP_CONFIG.timeout,
        });

        try {
            // STEP 1: Bind with the service account
            console.log(`[STEP 1/4] Connecting to server and binding with service account...`);
            console.log(`           Service Account: ${LDAP_CONFIG.bindDN}`);
            
            await new Promise((resolve, reject) => {
                client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindPassword, (err) => {
                    if (err) {
                        return reject(new Error(`Service account bind failed: ${err.message}`));
                    }
                    console.log(`[SUCCESS]  Service account bind was successful.`);
                    resolve();
                });
            });

            // STEP 2: Search for the user to get their Distinguished Name (DN)
            console.log(`
[STEP 2/4] Searching for user '${username}'...`);
            const searchOptions = {
                filter: `(sAMAccountName=${username})`,
                scope: 'sub',
                attributes: ['dn']
            };
            console.log(`           Search Filter: ${searchOptions.filter}`);

            const userEntry = await new Promise((resolve, reject) => {
                client.search(LDAP_CONFIG.baseDN, searchOptions, (err, res) => {
                    if (err) {
                        return reject(new Error(`Search initiation failed: ${err.message}`));
                    }
                    res.on('searchEntry', (entry) => {
                        console.log(`[SUCCESS]  Found user entry.`);
                        resolve(entry);
                    });
                    res.on('error', (err) => reject(new Error(`Search result error: ${err.message}`)));
                    res.on('end', (result) => {
                        if (result.status === 0) {
                           // This is hit after the entry is found, we can ignore it
                        } else {
                           reject(new Error(`User '${username}' not found in directory.`));
                        }
                    });
                });
            });

            const userDN = userEntry.object.dn;
            console.log(`           User's Distinguished Name (DN): ${userDN}`);

            // STEP 3: Attempt to bind with the user's DN and their password
            console.log(`
[STEP 3/4] Verifying password by binding as the user...`);
            console.log(`           Binding with DN: ${userDN}`);
            
            await new Promise((resolve, reject) => {
                client.bind(userDN, password, (err) => {
                    if (err) {
                        return reject(new Error(`User password validation failed: ${err.message}`));
                    }
                    console.log(`[SUCCESS]  Password is correct.`);
                    resolve();
                });
            });

            // STEP 4: Final result
            console.log(`
[STEP 4/4] ✅ Authentication successful for '${username}' on server '${server}'!`);
            client.unbind();
            return; // Exit after first successful authentication

        } catch (error) {
            console.error(`
❌ FAILED on server ${server}: ${error.message}`);
            client.destroy(); // Use destroy on failure
        }
    }
    
    console.log(`
======================================================`);
    console.log(`⏹️  All configured LDAP servers failed.`);
    console.log(`======================================================`);

}

// Get username and password from command line arguments
const [, , username, password] = process.argv;
runLdapTest(username, password);